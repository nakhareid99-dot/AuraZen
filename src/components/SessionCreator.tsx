import React, { useState } from "react";
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Mic,
  Music,
  Wind,
  Clock,
  Volume2,
  Play,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sliders,
  ChevronDown,
  Info,
} from "lucide-react";
import {
  MeditationSession,
  MeditationSessionCreateParams,
  ImageResolution,
  AspectRatio,
  GeminiVoiceName,
  GeminiModelType,
} from "../types";

interface SessionCreatorProps {
  onSessionCreated: (session: MeditationSession, startImmediately?: boolean) => void;
  initialParams?: Partial<MeditationSessionCreateParams>;
}

const THEME_PRESETS = [
  {
    name: "Deep Restorative Sleep",
    goal: "Surrender insomnia, slow heart rate, and drift into lucid dreams",
    duration: 10,
    breathing: "relax" as const,
    style: "Deep violet stardust nebula, floating peaceful moonlit temple",
    ambient: "cosmic-drone" as const,
    solfeggio: 396,
  },
  {
    name: "Anxiety & Panic Relief",
    goal: "Soothe nervous system overload and ground body in safety",
    duration: 5,
    breathing: "calm" as const,
    style: "Gentle pastel watercolor ocean shore, misty turquoise tide, soft foam",
    ambient: "ocean" as const,
    solfeggio: 432,
  },
  {
    name: "Clarity & Deep Focus",
    goal: "Sharpen working memory and eliminate mental brain fog",
    duration: 7,
    breathing: "box" as const,
    style: "Minimalist Japanese Zen rock garden, smooth black river stones, bamboo shadows",
    ambient: "forest-stream" as const,
    solfeggio: 528,
  },
  {
    name: "Morning Vitality & Radiance",
    goal: "Awaken cellular energy, gratitude, and optimistic perspective",
    duration: 5,
    breathing: "deep" as const,
    style: "Ethereal golden hour mountain sunrise, rolling morning mist, wildflowers",
    ambient: "rain" as const,
    solfeggio: 639,
  },
  {
    name: "Inner Peace & Self-Compassion",
    goal: "Heal self-judgment, open the heart center, and breathe in kindness",
    duration: 8,
    breathing: "calm" as const,
    style: "Luminous glowing lotus pond at twilight, warm floating lanterns, sacred geometry",
    ambient: "tibetan-bowl" as const,
    solfeggio: 528,
  },
];

const VOICE_OPTIONS: { id: GeminiVoiceName; name: string; description: string; previewSample: string }[] = [
  {
    id: "Kore",
    name: "Kore (Warm & Grounding)",
    description: "Soothing feminine tone, ideal for deep somatic relaxation and grounding.",
    previewSample: "Take a gentle breath in... and let every muscle soften as you exhale.",
  },
  {
    id: "Puck",
    name: "Puck (Inspiring & Gentle)",
    description: "Uplifting and warm masculine cadence for focus and mindful morning clarity.",
    previewSample: "Welcome to this moment of stillness. You are exactly where you need to be.",
  },
  {
    id: "Aoede",
    name: "Aoede (Ethereal & Serene)",
    description: "Soft, melodic, and luminous voice tailored for visualization journeys.",
    previewSample: "Feel the warm golden light expanding effortlessly throughout your entire body.",
  },
  {
    id: "Zephyr",
    name: "Zephyr (Calm & Breathy)",
    description: "Whisper-soft, airy vocal style for nighttime sleep induction.",
    previewSample: "Let your thoughts drift away like clouds across the night sky... rest now.",
  },
  {
    id: "Fenrir",
    name: "Fenrir (Deep & Resonant)",
    description: "Deep baritone with steady presence, excellent for anxiety dissipation.",
    previewSample: "You are firmly anchored to the earth. No storm can shake your inner sanctuary.",
  },
  {
    id: "Charon",
    name: "Charon (Reflective & Meditative)",
    description: "Slow-paced, contemplative cadence for Zen inquiry and body scans.",
    previewSample: "Notice the subtle space between your breaths... stillness is already here.",
  },
];

export const SessionCreator: React.FC<SessionCreatorProps> = ({
  onSessionCreated,
  initialParams,
}) => {
  const [theme, setTheme] = useState(initialParams?.theme || "Anxiety & Panic Relief");
  const [goal, setGoal] = useState(initialParams?.goal || "Soothe nervous system overload and ground body in safety");
  const [durationMinutes, setDurationMinutes] = useState(initialParams?.durationMinutes || 5);
  const [breathingPattern, setBreathingPattern] = useState<"box" | "relax" | "calm" | "deep">(
    initialParams?.breathingPattern || "calm"
  );
  const [visualStyle, setVisualStyle] = useState(
    initialParams?.visualStyle || "Gentle pastel watercolor ocean shore, misty turquoise tide, soft foam"
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(initialParams?.aspectRatio || "16:9");
  const [imageResolution, setImageResolution] = useState<ImageResolution>(initialParams?.imageResolution || "2K");
  const [voicePreference, setVoicePreference] = useState<GeminiVoiceName>(initialParams?.voicePreference || "Kore");
  const [ambientType, setAmbientType] = useState<"ocean" | "rain" | "forest-stream" | "tibetan-bowl" | "cosmic-drone">(
    initialParams?.ambientType || "ocean"
  );
  const [solfeggioHz, setSolfeggioHz] = useState<number>(initialParams?.solfeggioHz || 432);
  const [modelType, setModelType] = useState<GeminiModelType>(initialParams?.modelType || "flash");
  const [userNotes, setUserNotes] = useState(initialParams?.userNotes || "");

  // Voice audition state
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [voiceAudioMap, setVoiceAudioMap] = useState<Record<string, string>>({});

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<"idle" | "script" | "image" | "voice" | "done">("idle");
  const [generationProgressMsg, setGenerationProgressMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const applyPreset = (preset: (typeof THEME_PRESETS)[0]) => {
    setTheme(preset.name);
    setGoal(preset.goal);
    setDurationMinutes(preset.duration);
    setBreathingPattern(preset.breathing);
    setVisualStyle(preset.style);
    setAmbientType(preset.ambient);
    setSolfeggioHz(preset.solfeggio);
  };

  // Preview voice sample with gemini-3.1-flash-tts-preview
  const previewVoice = async (voice: (typeof VOICE_OPTIONS)[0]) => {
    try {
      setPreviewingVoice(voice.id);
      setErrorMsg(null);

      // Check cache
      if (voiceAudioMap[voice.id]) {
        const audio = new Audio(voiceAudioMap[voice.id]);
        await audio.play();
        setPreviewingVoice(null);
        return;
      }

      const res = await fetch("/api/meditation/generate-voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: voice.previewSample,
          voice: voice.id,
          styleGuide: "Speak softly, slowly and peacefully as a mindfulness guide.",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.audioUrl) {
        throw new Error(data.error || "Failed to preview voice");
      }

      setVoiceAudioMap((prev) => ({ ...prev, [voice.id]: data.audioUrl }));
      const audio = new Audio(data.audioUrl);
      await audio.play();
      setPreviewingVoice(null);
    } catch (err: any) {
      console.error("Voice preview error:", err);
      setErrorMsg(`Voice audition failed: ${err.message}`);
      setPreviewingVoice(null);
    }
  };

  // Full Session Generation Pipeline
  const handleGenerate = async (startImmediately = true) => {
    setIsGenerating(true);
    setErrorMsg(null);
    setGenerationStep("script");
    setGenerationProgressMsg("Crafting structured meditation architecture & neuroscience pacing...");

    try {
      // Step 1: Generate Session Script
      const scriptRes = await fetch("/api/meditation/generate-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          goal,
          durationMinutes,
          breathingPattern,
          visualStyle,
          voicePreference,
          userNotes,
          modelType,
        }),
      });

      const scriptData = await scriptRes.json();
      if (!scriptRes.ok || !scriptData.session) {
        throw new Error(scriptData.error || "Failed to generate session script");
      }

      const rawSession = scriptData.session;

      // Step 2: Generate High-Quality Image using gemini-3-pro-image-preview
      setGenerationStep("image");
      setGenerationProgressMsg(
        `Rendering ${imageResolution} visual artwork via gemini-3-pro-image-preview...`
      );

      let generatedImageUrl = "";
      try {
        const imageRes = await fetch("/api/meditation/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: rawSession.visualConcept?.prompt || visualStyle,
            aspectRatio,
            imageSize: imageResolution, // "1K" | "2K" | "4K"
          }),
        });
        const imageData = await imageRes.json();
        if (imageRes.ok && imageData.imageUrl) {
          generatedImageUrl = imageData.imageUrl;
        } else {
          console.warn("Image generator notice:", imageData.error);
        }
      } catch (imgErr) {
        console.warn("Could not generate custom image, using fallback serene backdrop:", imgErr);
      }

      if (!generatedImageUrl) {
        generatedImageUrl =
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80";
      }

      // Step 3: Generate Studio TTS Voiceover with gemini-3.1-flash-tts-preview
      setGenerationStep("voice");
      setGenerationProgressMsg(
        `Synthesizing soothing vocal guidance with voice '${voicePreference}' via gemini-3.1-flash-tts-preview...`
      );

      // Concatenate narrations with gentle natural breathing pauses
      const fullScriptNarration = rawSession.steps
        .map((step: any, index: number) => `Phase ${index + 1}: ${step.title}. ${step.narration}`)
        .join(" ... ... ");

      let generatedAudioUrl = "";
      try {
        const ttsRes = await fetch("/api/meditation/generate-voiceover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: fullScriptNarration,
            voice: voicePreference,
            styleGuide: "Speak in a calm, slow, rhythmic, deeply relaxing meditation voice with gentle pauses.",
          }),
        });

        const ttsData = await ttsRes.json();
        if (ttsRes.ok && ttsData.audioUrl) {
          generatedAudioUrl = ttsData.audioUrl;
        }
      } catch (voiceErr) {
        console.warn("Voiceover generation notice:", voiceErr);
      }

      // Assemble complete session object
      const fullSession: MeditationSession = {
        id: `session-custom-${Date.now()}`,
        title: rawSession.title || theme,
        subtitle: rawSession.subtitle || goal,
        intention: rawSession.intention || goal,
        affirmation: rawSession.affirmation || "I am at peace in this present moment.",
        durationMinutes: rawSession.durationMinutes || durationMinutes,
        durationSeconds: rawSession.durationSeconds || durationMinutes * 60,
        breathingGuide: rawSession.breathingGuide || {
          patternName: "Balanced Rhythm",
          inhale: 4,
          hold1: 2,
          exhale: 4,
          hold2: 2,
          description: "Steady rhythm to center conscious awareness.",
        },
        visualConcept: rawSession.visualConcept || {
          prompt: visualStyle,
          aestheticDescription: visualStyle,
          palette: ["#0f766e", "#38bdf8", "#020617"],
        },
        ambientSoundscape: {
          name: rawSession.ambientSoundscape?.name || `${solfeggioHz}Hz Harmony`,
          solfeggioHz: solfeggioHz,
          binauralHz: 7.83,
          natureElement: ambientType,
          description: rawSession.ambientSoundscape?.description || "Curated ambient soundscape for meditation",
        },
        steps: rawSession.steps || [],
        imageUrl: generatedImageUrl,
        imageResolution,
        aspectRatio,
        fullAudioUrl: generatedAudioUrl,
        voiceName: voicePreference,
        createdAt: new Date().toISOString(),
        isCustom: true,
      };

      setGenerationStep("done");
      setIsGenerating(false);

      // Save to localStorage
      try {
        const existing = JSON.parse(localStorage.getItem("aurazen_custom_sessions") || "[]");
        localStorage.setItem("aurazen_custom_sessions", JSON.stringify([fullSession, ...existing]));
      } catch (e) {
        console.warn("Could not save to localStorage", e);
      }

      onSessionCreated(fullSession, startImmediately);
    } catch (err: any) {
      console.error("Session generation failed:", err);
      setErrorMsg(err.message || "An unexpected error occurred during generation.");
      setIsGenerating(false);
      setGenerationStep("idle");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-light uppercase tracking-[0.2em] mb-2">
          <Wand2 className="w-3.5 h-3.5" />
          <span>AI Meditation Studio Architect</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-light text-white/90 tracking-tight">
          Create Your Custom Session
        </h1>
        <p className="text-white/40 mt-1.5 text-sm sm:text-base max-w-2xl font-light">
          Craft bespoke multisensory meditation journeys with tailored AI visuals (up to 4K resolution), 
          soothing studio voiceovers with Gemini TTS, and tuned Solfeggio soundscapes.
        </p>
      </div>

      {/* Preset Quick Chips */}
      <div className="mb-8 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-light text-white/60 tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Quick Inspiration Presets
          </span>
          <span className="text-[10px] text-white/40 tracking-widest uppercase">Tap to auto-fill</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.name}
              id={`preset-chip-${p.name.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => applyPreset(p)}
              className={`px-3.5 py-2 rounded-xl text-xs font-light tracking-wide border transition-all ${
                theme === p.name
                  ? "bg-white/15 border-white/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                  : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {p.name} <span className="opacity-50">({p.duration}m)</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Form Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Main Session & Visual Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Core Theme & Intent */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2 text-white/90 font-light text-sm tracking-wide">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Theme & Meditation Focus</span>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] text-white/50 mb-1.5">Session Title / Theme</label>
              <input
                id="input-session-theme"
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g. Oceanic Calm, Letting Go of Overthinking, Midnight Stardust"
                className="w-full px-4 py-2.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-indigo-500/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] text-white/50 mb-1.5">Meditation Goal & Desired Feeling</label>
              <textarea
                id="input-session-goal"
                rows={2}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe what state of mind you want to cultivate..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-indigo-500/60 transition-colors resize-none"
              />
            </div>

            {/* Duration & Breathing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-white/50 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-white/40" />
                  Duration
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[3, 5, 10, 15].map((d) => (
                    <button
                      key={d}
                      id={`btn-duration-${d}`}
                      type="button"
                      onClick={() => setDurationMinutes(d)}
                      className={`py-2 rounded-xl text-xs font-light tracking-wide border transition-all ${
                        durationMinutes === d
                          ? "bg-white/15 border-white/30 text-white shadow-sm"
                          : "bg-[#0e0e11] border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-white/50 mb-1.5 flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-indigo-400" />
                  Breathing Cadence
                </label>
                <select
                  id="select-breathing-pattern"
                  value={breathingPattern}
                  onChange={(e: any) => setBreathingPattern(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e0e11] border border-white/10 text-white/80 text-xs focus:outline-none focus:border-indigo-500/60"
                >
                  <option value="calm">Tidal Relaxation (4-2-6-2) - Anxiety relief</option>
                  <option value="box">Box Breathing (4-4-4-4) - Balanced focus</option>
                  <option value="relax">4-7-8 Deep Sleep Gate - Deep nervous soothing</option>
                  <option value="deep">Coherence Breath (5-5) - Heart rate variability</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Visual Concept & Resolution Affordance (gemini-3-pro-image-preview) */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/90 font-light text-sm tracking-wide">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span>Visual Sanctuary Artwork</span>
              </div>
              <span className="text-[9px] text-purple-300 font-mono tracking-wider px-2 py-0.5 rounded-full bg-purple-950/40 border border-purple-800/40">
                gemini-3-pro-image-preview
              </span>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] text-white/50 mb-1.5">Visual Scene & Aesthetic Prompt</label>
              <textarea
                id="input-visual-style"
                rows={2}
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                placeholder="Describe your ideal visual environment (e.g. Bioluminescent forest stream, Japanese rock garden, Cosmic stardust aurora)..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#0e0e11] border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-indigo-500/60 transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Image Resolution Selector: 1K, 2K, 4K */}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-white/50 mb-1.5">
                  Resolution Quality
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["1K", "2K", "4K"] as ImageResolution[]).map((res) => (
                    <button
                      key={res}
                      id={`btn-resolution-${res}`}
                      type="button"
                      onClick={() => setImageResolution(res)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all flex flex-col items-center justify-center gap-0.5 ${
                        imageResolution === res
                          ? "bg-white/15 border-white/30 text-white shadow-sm"
                          : "bg-[#0e0e11] border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span>{res}</span>
                      <span className="text-[9px] text-white/40 font-light">
                        {res === "4K" ? "Ultra-HD" : res === "2K" ? "Crisp Quad" : "Standard"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio Selector */}
              <div>
                <label className="block text-[10px] uppercase tracking-[0.15em] text-white/50 mb-1.5">Aspect Ratio</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["16:9", "1:1", "4:3", "9:16"] as AspectRatio[]).map((ratio) => (
                    <button
                      key={ratio}
                      id={`btn-ratio-${ratio.replace(":", "-")}`}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-2 rounded-xl text-xs font-light border transition-all ${
                        aspectRatio === ratio
                          ? "bg-white/15 border-white/30 text-white"
                          : "bg-[#0e0e11] border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Voiceover & Soundscape Engine */}
        <div className="space-y-6">
          {/* Section 3: Voiceover Synthesizer (gemini-3.1-flash-tts-preview) */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/90 font-light text-sm tracking-wide">
                <Mic className="w-4 h-4 text-indigo-400" />
                <span>Voice Guidance</span>
              </div>
              <span className="text-[9px] text-indigo-300 font-mono tracking-wider px-2 py-0.5 rounded-full bg-indigo-950/40 border border-indigo-800/40">
                gemini-3.1-flash-tts
              </span>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {VOICE_OPTIONS.map((v) => (
                <div
                  key={v.id}
                  id={`voice-option-${v.id}`}
                  onClick={() => setVoicePreference(v.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    voicePreference === v.id
                      ? "bg-indigo-600/20 border-indigo-500/40 text-white"
                      : "bg-[#0e0e11] border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white/90">{v.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        previewVoice(v);
                      }}
                      disabled={previewingVoice === v.id}
                      className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] text-indigo-300 flex items-center gap-1 transition-colors"
                      title="Audition voice sample"
                    >
                      {previewingVoice === v.id ? (
                        <span className="animate-spin text-xs">🌀</span>
                      ) : (
                        <Play className="w-3 h-3 fill-current" />
                      )}
                      <span>Audition</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-white/50 mt-1 leading-relaxed font-light">{v.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Ambient Soundscape & Solfeggio */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2 text-white/90 font-light text-sm tracking-wide">
              <Music className="w-4 h-4 text-purple-400" />
              <span>Ambient Soundscape</span>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] text-white/50 mb-1.5">Nature Texture</label>
              <select
                id="select-ambient-texture"
                value={ambientType}
                onChange={(e: any) => setAmbientType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0e0e11] border border-white/10 text-white/80 text-xs focus:outline-none focus:border-indigo-500/60"
              >
                <option value="ocean">🌊 Gentle Ocean Tide Swells</option>
                <option value="rain">🌧️ Warm Summer Rain</option>
                <option value="forest-stream">🍃 Mountain Forest Stream</option>
                <option value="tibetan-bowl">🧘 Tibetan Singing Bowl Resonance</option>
                <option value="cosmic-drone">✨ Deep Space 396Hz Cosmic Drone</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] text-white/50 mb-1.5">
                Solfeggio Frequency (Pure Harmonic)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { hz: 432, label: "432Hz Miracle" },
                  { hz: 528, label: "528Hz Heal" },
                  { hz: 396, label: "396Hz Release" },
                  { hz: 639, label: "639Hz Heart" },
                  { hz: 741, label: "741Hz Awaken" },
                  { hz: 0, label: "Pure Nature" },
                ].map((s) => (
                  <button
                    key={s.hz}
                    id={`btn-solfeggio-${s.hz}`}
                    type="button"
                    onClick={() => setSolfeggioHz(s.hz)}
                    className={`py-1.5 rounded-lg text-[11px] font-light border transition-all ${
                      solfeggioHz === s.hz
                        ? "bg-white/15 border-white/30 text-white shadow-sm"
                        : "bg-[#0e0e11] border-white/10 text-white/60 hover:text-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Selection Bar */}
      <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-white/50 font-light">
          <Info className="w-4 h-4 text-white/40" />
          <span>Gemini Model Engine for Script Architecture:</span>
        </div>
        <div className="flex items-center gap-2">
          {[
            { id: "flash", name: "Gemini 3.5 Flash", tag: "Fast & Balanced" },
            { id: "pro", name: "Gemini 3.1 Pro", tag: "Complex Depth" },
            { id: "lite", name: "Gemini 3.1 Flash Lite", tag: "High Speed" },
          ].map((m) => (
            <button
              key={m.id}
              id={`model-btn-${m.id}`}
              type="button"
              onClick={() => setModelType(m.id as GeminiModelType)}
              className={`px-3 py-1.5 rounded-lg text-xs font-light border transition-all ${
                modelType === m.id
                  ? "bg-white/15 border-white/30 text-white shadow-sm"
                  : "bg-[#0e0e11] border-white/10 text-white/50 hover:text-white/80"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {errorMsg && (
        <div className="mt-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Generation Notice</p>
            <p className="mt-0.5 leading-relaxed font-light">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Loading Progress Visual Pipeline */}
      {isGenerating && (
        <div className="mt-8 p-6 rounded-2xl bg-[#0e0e11]/90 border border-indigo-500/40 shadow-2xl space-y-4 animate-in fade-in duration-300 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
              <span className="font-light text-white/90 text-sm tracking-wide">Generating Personalized Sanctuary...</span>
            </div>
            <span className="text-xs font-mono text-indigo-300">{generationProgressMsg}</span>
          </div>

          {/* Progress Steps Indicator */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                generationStep === "script"
                  ? "bg-indigo-950/80 border-indigo-500 text-indigo-200"
                  : generationStep === "image" || generationStep === "voice" || generationStep === "done"
                  ? "bg-white/5 border-white/10 text-indigo-400"
                  : "bg-white/5 border-white/5 text-white/30"
              }`}
            >
              {generationStep === "image" || generationStep === "voice" || generationStep === "done" ? (
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              ) : (
                <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
              )}
              <span>1. Script Architecture</span>
            </div>

            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                generationStep === "image"
                  ? "bg-purple-950/80 border-purple-500 text-purple-200"
                  : generationStep === "voice" || generationStep === "done"
                  ? "bg-white/5 border-white/10 text-purple-400"
                  : "bg-white/5 border-white/5 text-white/30"
              }`}
            >
              {generationStep === "voice" || generationStep === "done" ? (
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
              ) : generationStep === "image" ? (
                <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-white/20 inline-block" />
              )}
              <span>2. {imageResolution} Visual Rendering</span>
            </div>

            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                generationStep === "voice"
                  ? "bg-indigo-950/80 border-indigo-500 text-indigo-200"
                  : generationStep === "done"
                  ? "bg-white/5 border-white/10 text-indigo-400"
                  : "bg-white/5 border-white/5 text-white/30"
              }`}
            >
              {generationStep === "done" ? (
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              ) : generationStep === "voice" ? (
                <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-white/20 inline-block" />
              )}
              <span>3. Studio Voiceover (TTS)</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="mt-8 flex items-center justify-end gap-4">
        <button
          id="btn-generate-session"
          type="button"
          disabled={isGenerating || !theme.trim()}
          onClick={() => handleGenerate(true)}
          className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-[#f0f0f5] hover:bg-white text-black font-medium text-xs uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(0,0,0,0.4)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
        >
          {isGenerating ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
              <span>Generating Session...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-black fill-current" />
              <span>Generate & Begin Meditation</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
