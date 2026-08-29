import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy GoogleGenAI client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Convert 24kHz 16-bit Mono PCM raw data buffer to a standard WAV base64 string
function pcmToWavBase64(pcmBase64: string, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): string {
  const pcmBuffer = Buffer.from(pcmBase64, "base64");
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const wavBuffer = Buffer.alloc(headerSize + dataSize);

  // RIFF chunk descriptor
  wavBuffer.write("RIFF", 0);
  wavBuffer.writeUInt32LE(36 + dataSize, 4);
  wavBuffer.write("WAVE", 8);

  // "fmt " sub-chunk
  wavBuffer.write("fmt ", 12);
  wavBuffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  wavBuffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  wavBuffer.writeUInt16LE(numChannels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(byteRate, 28);
  wavBuffer.writeUInt16LE(blockAlign, 32);
  wavBuffer.writeUInt16LE(bitsPerSample, 34);

  // "data" sub-chunk
  wavBuffer.write("data", 36);
  wavBuffer.writeUInt32LE(dataSize, 40);

  // Write PCM data
  pcmBuffer.copy(wavBuffer, 44);

  return wavBuffer.toString("base64");
}

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 1. Generate Structured Meditation Session Script & Visual Concept
app.post("/api/meditation/generate-session", async (req: Request, res: Response) => {
  try {
    const {
      theme = "Inner Calm & Deep Relaxation",
      durationMinutes = 5,
      goal = "Relieve stress and center the mind",
      breathingPattern = "box", // 'box' (4-4-4-4), 'relax' (4-7-8), 'calm' (4-2-6-2), 'deep' (5-5)
      visualStyle = "Ethereal Serene Landscape",
      voicePreference = "Kore",
      userNotes = "",
      modelType = "flash", // 'flash' (gemini-3.5-flash), 'pro' (gemini-3.1-pro-preview), 'lite' (gemini-3.1-flash-lite)
    } = req.body;

    const ai = getAI();
    const primaryModel =
      modelType === "pro"
        ? "gemini-3.1-pro-preview"
        : modelType === "lite"
        ? "gemini-3.1-flash-lite"
        : "gemini-3.5-flash";

    const fallbackModels = [
      primaryModel,
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-3.1-pro-preview",
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    const prompt = `Design an immersive, scientifically grounded, deeply relaxing guided meditation session.
Theme: "${theme}"
Goal: "${goal}"
Duration: ${durationMinutes} minutes (${durationMinutes * 60} seconds total)
Breathing Cadence: ${breathingPattern}
Aesthetic Style: ${visualStyle}
Voice Tone: ${voicePreference}
Additional User Intent: "${userNotes}"

Create a complete session with:
1. Title and poetic subtitle.
2. Core intention & affirmation.
3. Breathing guide configuration (inhale, hold1, exhale, hold2 in seconds).
4. Detailed prompt for generating a transcendent, high-resolution meditation artwork (suitable for Gemini image generation).
5. Ambient soundscape suggestion (Solfeggio frequency e.g. 528Hz, 432Hz, or 396Hz, binaural beat type, and nature elements like gentle rain, singing bowl, ocean, mountain wind).
6. Segmented step-by-step guidance script with precise timestamps (${Math.min(
      8,
      Math.max(4, Math.round(durationMinutes * 1.5))
    )} distinct steps), soothing narration text, whether to sound a gentle bell chime, and visual focal cues.
`;

    const schemaConfig = {
      systemInstruction:
        "You are a master meditation teacher, neuroscientist, and voice-director. You create beautifully structured, poetically spoken, peaceful meditation sessions designed for deep restoration.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          subtitle: { type: Type.STRING },
          intention: { type: Type.STRING },
          affirmation: { type: Type.STRING },
          durationMinutes: { type: Type.INTEGER },
          durationSeconds: { type: Type.INTEGER },
          breathingGuide: {
            type: Type.OBJECT,
            properties: {
              patternName: { type: Type.STRING },
              inhale: { type: Type.NUMBER, description: "Seconds for inhalation" },
              hold1: { type: Type.NUMBER, description: "Seconds for retention after inhale" },
              exhale: { type: Type.NUMBER, description: "Seconds for exhalation" },
              hold2: { type: Type.NUMBER, description: "Seconds for retention after exhale" },
              description: { type: Type.STRING },
            },
            required: ["patternName", "inhale", "hold1", "exhale", "hold2", "description"],
          },
          visualConcept: {
            type: Type.OBJECT,
            properties: {
              prompt: { type: Type.STRING, description: "Detailed visual prompt for high quality image generation" },
              aestheticDescription: { type: Type.STRING },
              palette: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Hex or descriptive color palette",
              },
            },
            required: ["prompt", "aestheticDescription", "palette"],
          },
          ambientSoundscape: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              solfeggioHz: { type: Type.NUMBER, description: "e.g., 432, 528, 639, 741" },
              binauralHz: { type: Type.NUMBER, description: "e.g., 4, 7.83 (Schumann), 10 (Alpha)" },
              natureElement: { type: Type.STRING, description: "e.g., 'tibetan-bowl', 'ocean', 'rain', 'forest-stream', 'cosmic-drone'" },
              description: { type: Type.STRING },
            },
            required: ["name", "solfeggioHz", "binauralHz", "natureElement", "description"],
          },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timeOffsetSeconds: { type: Type.NUMBER },
                phase: { type: Type.STRING, description: "e.g. Arrival, Breath Alignment, Deep Visualization, Release, Awakening" },
                title: { type: Type.STRING },
                narration: { type: Type.STRING, description: "Calm, slow-paced spoken guide instruction" },
                visualFocus: { type: Type.STRING, description: "What the user should imagine or gently gaze at" },
                bellChime: { type: Type.BOOLEAN },
              },
              required: ["timeOffsetSeconds", "phase", "title", "narration", "visualFocus", "bellChime"],
            },
          },
        },
        required: [
          "title",
          "subtitle",
          "intention",
          "affirmation",
          "durationMinutes",
          "durationSeconds",
          "breathingGuide",
          "visualConcept",
          "ambientSoundscape",
          "steps",
        ],
      },
    };

    let responseText = "";
    let lastError: any = null;

    for (const model of fallbackModels) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents: prompt,
          config: schemaConfig,
        });
        if (result.text) {
          responseText = result.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${model} in generate-session notice:`, err?.message);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error("Unable to generate session from Gemini models");
    }

    const parsed = JSON.parse(responseText || "{}");
    res.json({ success: true, session: parsed });
  } catch (error: any) {
    console.error("Error generating meditation session:", error);
    res.status(500).json({ error: error.message || "Failed to generate meditation session" });
  }
});

// Curated library of high-resolution meditation visuals for theme matching
const CURATED_MEDITATION_ARTWORKS = [
  {
    keywords: ["ocean", "wave", "water", "sea", "beach", "tide", "shore", "coastal", "aquatic"],
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=85",
  },
  {
    keywords: ["forest", "trees", "wood", "nature", "green", "jungle", "stream", "creek", "earth"],
    url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=85",
  },
  {
    keywords: ["mountain", "peak", "valley", "alpine", "cliff", "rock", "fog", "mist", "zen"],
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=85",
  },
  {
    keywords: ["cosmos", "galaxy", "stars", "space", "nebula", "universe", "celestial", "starlight", "astral"],
    url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=85",
  },
  {
    keywords: ["sunset", "sunrise", "golden", "dawn", "dusk", "sun", "warm", "amber", "horizon"],
    url: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=1920&q=85",
  },
  {
    keywords: ["aurora", "northern lights", "night", "twilight", "violet", "purple", "mystical", "energy"],
    url: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1920&q=85",
  },
  {
    keywords: ["rain", "raindrop", "cloud", "storm", "soothing", "gray", "silver", "waterfall"],
    url: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1920&q=85",
  },
  {
    keywords: ["zen", "temple", "garden", "lotus", "bamboo", "buddha", "stone", "peace", "calm", "stillness"],
    url: "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1920&q=85",
  },
];

function getCuratedArtworkForPrompt(promptText: string): string {
  const lower = promptText.toLowerCase();
  for (const item of CURATED_MEDITATION_ARTWORKS) {
    if (item.keywords.some((kw) => lower.includes(kw))) {
      return item.url;
    }
  }
  // Default tranquil landscape
  return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=85";
}

// 2. Generate High-Quality Visual Artwork with Multi-Tier Fallback
app.post("/api/meditation/generate-image", async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      aspectRatio = "16:9", // "16:9" | "1:1" | "4:3" | "9:16"
      imageSize = "1K", // "1K" | "2K" | "4K"
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const ai = getAI();
    const enhancedPrompt = `${prompt}, peaceful meditation artwork, ultra high resolution, cinematic soft lighting, atmospheric depth, masterpiece, serene tranquil color grading, zen aesthetics, high detail.`;

    let imageUrl = "";
    let captionText = "";

    // Tier 1: Try gemini-3-pro-image-preview
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-image-preview",
        contents: {
          parts: [{ text: enhancedPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: imageSize as any,
          },
        },
      });

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mime = part.inlineData.mimeType || "image/png";
            imageUrl = `data:${mime};base64,${part.inlineData.data}`;
            break;
          } else if (part.text) {
            captionText += part.text;
          }
        }
      }
    } catch (tier1Err: any) {
      console.warn("Tier 1 image model notice:", tier1Err?.message || tier1Err);

      // Tier 2: Try gemini-3.1-flash-image
      try {
        const response2 = await ai.models.generateContent({
          model: "gemini-3.1-flash-image",
          contents: {
            parts: [{ text: enhancedPrompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
              imageSize: imageSize as any,
            },
          },
        });

        if (response2.candidates?.[0]?.content?.parts) {
          for (const part of response2.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const mime = part.inlineData.mimeType || "image/png";
              imageUrl = `data:${mime};base64,${part.inlineData.data}`;
              break;
            } else if (part.text) {
              captionText += part.text;
            }
          }
        }
      } catch (tier2Err: any) {
        console.warn("Tier 2 image model notice:", tier2Err?.message || tier2Err);

        // Tier 3: Try imagen-3.0-generate-002
        try {
          const response3 = await ai.models.generateImages({
            model: "imagen-3.0-generate-002",
            prompt: enhancedPrompt,
            config: {
              numberOfImages: 1,
              aspectRatio: aspectRatio === "9:16" ? "9:16" : aspectRatio === "1:1" ? "1:1" : aspectRatio === "4:3" ? "4:3" : "16:9",
              outputMimeType: "image/jpeg",
            },
          });

          const base64Bytes = response3.generatedImages?.[0]?.image?.imageBytes;
          if (base64Bytes) {
            imageUrl = `data:image/jpeg;base64,${base64Bytes}`;
          }
        } catch (tier3Err: any) {
          console.warn("Tier 3 image model notice:", tier3Err?.message || tier3Err);
        }
      }
    }

    // If quota or generation limit is reached, seamlessly return curated HD artwork matched to prompt
    if (!imageUrl) {
      imageUrl = getCuratedArtworkForPrompt(prompt);
      return res.json({
        success: true,
        imageUrl,
        isFallback: true,
        caption: captionText || "Serene meditation sanctuary backdrop",
        aspectRatio,
        imageSize,
        notice: "Curated HD meditation artwork loaded.",
      });
    }

    res.json({
      success: true,
      imageUrl,
      caption: captionText,
      aspectRatio,
      imageSize,
    });
  } catch (error: any) {
    console.warn("Image generation fallback activated:", error?.message);
    const fallbackUrl = getCuratedArtworkForPrompt(req.body?.prompt || "meditation");
    res.json({
      success: true,
      imageUrl: fallbackUrl,
      isFallback: true,
      caption: "Serene meditation sanctuary backdrop",
      aspectRatio: req.body?.aspectRatio || "16:9",
      imageSize: req.body?.imageSize || "1K",
    });
  }
});

// 3. Generate Soothing Voiceover with gemini-3.1-flash-tts-preview
app.post("/api/meditation/generate-voiceover", async (req: Request, res: Response) => {
  try {
    const {
      text,
      voice = "Kore", // 'Kore' | 'Puck' | 'Aoede' | 'Zephyr' | 'Fenrir' | 'Charon'
      styleGuide = "Speak slowly, softly, with gentle pauses and a warm, meditative tone.",
    } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required for voiceover generation" });
    }

    const ai = getAI();
    const promptText = `${styleGuide ? `[Tone: ${styleGuide}] ` : ""}${text}`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: promptText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const rawPcmBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (rawPcmBase64) {
        // Convert raw 24kHz PCM to WAV base64 with headers for direct browser playback
        const wavBase64 = pcmToWavBase64(rawPcmBase64, 24000, 1, 16);
        const audioDataUrl = `data:audio/wav;base64,${wavBase64}`;

        return res.json({
          success: true,
          audioUrl: audioDataUrl,
          rawPcm: rawPcmBase64,
          voice,
          sampleRate: 24000,
        });
      }
    } catch (ttsErr: any) {
      console.warn("TTS generation notice (will utilize client voice synthesizer):", ttsErr?.message);
    }

    // Graceful fallback: return 200 with fallbackToBrowserTts flag
    res.json({
      success: true,
      audioUrl: null,
      fallbackToBrowserTts: true,
      voice,
      notice: "Using client studio voice synthesis.",
    });
  } catch (error: any) {
    console.warn("Voiceover fallback activated:", error?.message);
    res.json({
      success: true,
      audioUrl: null,
      fallbackToBrowserTts: true,
      voice: req.body?.voice || "Kore",
      notice: "Using client studio voice synthesis.",
    });
  }
});

// 4. Gemini Chatbot ("Zenith" Mindfulness Coach)
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const {
      messages = [],
      modelType = "flash", // 'flash' (gemini-3.5-flash), 'lite' (gemini-3.1-flash-lite), 'pro' (gemini-3.1-pro-preview)
      persona = "Mindfulness Guide & Wellness Architect",
    } = req.body;

    const ai = getAI();
    const primaryModel =
      modelType === "pro"
        ? "gemini-3.1-pro-preview"
        : modelType === "lite"
        ? "gemini-3.1-flash-lite"
        : "gemini-3.5-flash";

    const fallbackChatModels = [
      primaryModel,
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-3.1-pro-preview",
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    const systemInstruction = `You are 'Zenith', a compassionate, world-class Mindfulness Master, Meditation Guide, and Wellness Architect (${persona}).
Your mission is to help users find stillness, cultivate emotional balance, overcome anxiety, improve sleep, and deepen their meditation practice.
Provide warm, actionable, grounding wisdom. If the user asks for a meditation technique, describe it step-by-step with mindful pacing.
You can also recommend custom meditation parameters (theme, breathing cadence, Solfeggio frequency, visual style) so they can create a personalized session.
Always maintain a gentle, empathetic, and calming presence.`;

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    let replyText = "";
    let usedModel = primaryModel;
    let lastError: any = null;

    for (const model of fallbackChatModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        if (response.text) {
          replyText = response.text;
          usedModel = model;
          break;
        }
      } catch (err: any) {
        console.warn(`Chat model ${model} notice:`, err?.message);
        lastError = err;
      }
    }

    if (!replyText) {
      throw lastError || new Error("Chat response could not be generated");
    }

    res.json({
      success: true,
      reply: replyText,
      modelUsed: usedModel,
    });
  } catch (error: any) {
    console.error("Error in chat endpoint:", error);
    res.status(500).json({ error: error.message || "Chat failed" });
  }
});

// Preset Meditations for Instant Practice
app.get("/api/meditation/presets", (_req: Request, res: Response) => {
  const presets = [
    {
      id: "preset-ocean-calm",
      title: "Ocean Twilight Sanctuary",
      subtitle: "Release tension with tidal breath & 432Hz healing sound",
      intention: "Wash away the worries of the day and return to your natural rhythm.",
      affirmation: "Like the endless tide, I allow all thoughts to ebb and flow with grace.",
      durationMinutes: 5,
      durationSeconds: 300,
      breathingGuide: {
        patternName: "Tidal Relaxation (4-2-6-2)",
        inhale: 4,
        hold1: 2,
        exhale: 6,
        hold2: 2,
        description: "Extended exhale gently stimulates the parasympathetic nervous system.",
      },
      visualConcept: {
        prompt: "A serene minimalist twilight beach with glowing bioluminescent gentle waves, starry pastel sky, glowing moon reflection, hyper-realistic, zen atmosphere, 8k",
        aestheticDescription: "Deep indigo and soft gold bioluminescence along a calm shore.",
        palette: ["#1e1b4b", "#0f766e", "#38bdf8", "#fde047", "#020617"],
      },
      ambientSoundscape: {
        name: "432Hz Tidal Resonance",
        solfeggioHz: 432,
        binauralHz: 7.83,
        natureElement: "ocean",
        description: "Organic ocean swells matched with Earth's natural Schumann resonance.",
      },
      imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
      steps: [
        {
          timeOffsetSeconds: 0,
          phase: "Arrival",
          title: "Sinking into Stillness",
          narration: "Welcome to your sanctuary. Allow your shoulders to drop, soften your jaw, and let the gentle rhythm of the ocean hold your attention.",
          visualFocus: "Gaze into the tranquil horizon where the calm sea meets the starlit sky.",
          bellChime: true,
        },
        {
          timeOffsetSeconds: 60,
          phase: "Breath Alignment",
          title: "Breathing with the Tides",
          narration: "Breathe in deeply as the wave rises up the shore. Pause gently... and breathe out as the water recedes into the deep.",
          visualFocus: "Synchronize your chest with the luminous ebb and flow.",
          bellChime: false,
        },
        {
          timeOffsetSeconds: 160,
          phase: "Deep Visualization",
          title: "Releasing the Weight",
          narration: "Place any lingering tension or heavy thought onto the surface of the water. Watch it dissolve into glowing light, carried far away.",
          visualFocus: "Notice the shimmering bioluminescence dissolving all worry.",
          bellChime: true,
        },
        {
          timeOffsetSeconds: 240,
          phase: "Awakening",
          title: "Grounded Harmony",
          narration: "Feel the calm steadiness beneath you. Carry this open, unshakeable peace into every moment ahead. When you are ready, gently return.",
          visualFocus: "Feel the warm golden glow expanding throughout your entire body.",
          bellChime: true,
        },
      ],
    },
    {
      id: "preset-zen-forest",
      title: "Bioluminescent Ancient Forest",
      subtitle: "528Hz Transformation & Box Breathing for mental clarity",
      intention: "Awaken clarity, restore vitality, and ground yourself in stillness.",
      affirmation: "I am rooted deeply like the ancient cedar, adaptable and centered.",
      durationMinutes: 7,
      durationSeconds: 420,
      breathingGuide: {
        patternName: "Box Breathing (4-4-4-4)",
        inhale: 4,
        hold1: 4,
        exhale: 4,
        hold2: 4,
        description: "Equalized cadence balances the nervous system and sharpens focus.",
      },
      visualConcept: {
        prompt: "A mystical ancient moss-covered redwood forest with glowing green fireflies, soft sun rays piercing emerald foliage, crystal clear mountain stream, 8k",
        aestheticDescription: "Lush emerald greens, sunbeams, and floating soft particles of light.",
        palette: ["#064e3b", "#047857", "#10b981", "#a7f3d0", "#022c22"],
      },
      ambientSoundscape: {
        name: "528Hz Miracle Forest",
        solfeggioHz: 528,
        binauralHz: 10,
        natureElement: "forest-stream",
        description: "Solfeggio frequency of DNA repair and transformation with rustling leaves.",
      },
      imageUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80",
      steps: [
        {
          timeOffsetSeconds: 0,
          phase: "Arrival",
          title: "Rooting in the Earth",
          narration: "Close your eyes and visualize towering ancient trees standing silent and strong around you. Feel their grounding presence.",
          visualFocus: "Observe the deep emerald canopy and soft rays of emerald light.",
          bellChime: true,
        },
        {
          timeOffsetSeconds: 80,
          phase: "Breath Alignment",
          title: "The Four-Sided Breath",
          narration: "Inhale crisp, vital forest air for four... Hold in stillness for four... Release all doubt for four... Rest in pure awareness for four.",
          visualFocus: "Follow the glowing square of light outlining your breath.",
          bellChime: false,
        },
        {
          timeOffsetSeconds: 220,
          phase: "Deep Visualization",
          title: "The Stream of Clarity",
          narration: "A crystalline mountain spring flows beside you. Sip from this cool clarity and feel your thoughts settle into pristine stillness.",
          visualFocus: "The gentle ripple of water washing over smooth pebbles.",
          bellChime: true,
        },
        {
          timeOffsetSeconds: 340,
          phase: "Awakening",
          title: "Carry the Forest Within",
          narration: "Take one final deep breath of vitality. You carry the rooted power of this forest wherever you walk today.",
          visualFocus: "Basking in the golden canopy light.",
          bellChime: true,
        },
      ],
    },
    {
      id: "preset-celestial-sleep",
      title: "Cosmic Nebula Sleep Journey",
      subtitle: "396Hz Liberation & 4-7-8 Sleep Pacing",
      intention: "Surrender conscious thought and drift into deep, restorative rest.",
      affirmation: "I surrender to the silence of the cosmos; I am safe, supported, and at rest.",
      durationMinutes: 10,
      durationSeconds: 600,
      breathingGuide: {
        patternName: "4-7-8 Deep Sleep Gate",
        inhale: 4,
        hold1: 7,
        exhale: 8,
        hold2: 0,
        description: "Natural tranquilizer for the nervous system that induces restful sleep.",
      },
      visualConcept: {
        prompt: "A breathtaking cosmic nebula in deep violet and stardust gold, floating meditative islands, gentle glowing nebulae, ethereal space dust, 8k",
        aestheticDescription: "Deep cosmic violet, soft stardust gold, and velvety obsidian space.",
        palette: ["#2e1065", "#581c87", "#9333ea", "#c084fc", "#030712"],
      },
      ambientSoundscape: {
        name: "396Hz Delta Cosmic Drone",
        solfeggioHz: 396,
        binauralHz: 2.5,
        natureElement: "cosmic-drone",
        description: "Deep delta wave binaural tone to gently guide brainwaves into deep sleep.",
      },
      imageUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1600&q=80",
      steps: [
        {
          timeOffsetSeconds: 0,
          phase: "Arrival",
          title: "Weightlessness",
          narration: "Lie back and let gravity cradle you completely. There is nothing more you need to do today. Let the world softly fade.",
          visualFocus: "A vast, comforting indigo night adorned with gentle starlight.",
          bellChime: true,
        },
        {
          timeOffsetSeconds: 120,
          phase: "Breath Alignment",
          title: "The 4-7-8 Sleep Gate",
          narration: "Inhale gently for four... gently hold for seven... and slowly exhale like a sigh for eight. Let every muscle soften.",
          visualFocus: "The gentle pulsing of a stardust spiral.",
          bellChime: false,
        },
        {
          timeOffsetSeconds: 320,
          phase: "Deep Visualization",
          title: "Drifting Through the Stars",
          narration: "You are floating weightlessly in a warm celestial river. Starlight wraps around you like a soft blanket of total safety.",
          visualFocus: "Swirling clouds of purple and gold stardust.",
          bellChime: false,
        },
        {
          timeOffsetSeconds: 480,
          phase: "Awakening",
          title: "Sublime Rest",
          narration: "Allow yourself to drift into deep, effortless slumber. Rest peacefully.",
          visualFocus: "Gentle fade into peaceful darkness.",
          bellChime: false,
        },
      ],
    },
  ];

  res.json({ success: true, presets });
});

// Vite middleware & Static Serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AuraZen Meditation Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
