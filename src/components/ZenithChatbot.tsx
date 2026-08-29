import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  Wand2,
  Brain,
  Zap,
  Flame,
  Lightbulb,
  HeartHandshake,
  Moon,
  Wind,
} from "lucide-react";
import { ChatMessage, GeminiModelType, MeditationSessionCreateParams } from "../types";

interface ZenithChatbotProps {
  onStartSessionFromChat: (params: Partial<MeditationSessionCreateParams>) => void;
}

const COACH_PERSONAS = [
  {
    id: "mindfulness",
    name: "Mindfulness Architect",
    tagline: "Presence, grounding, & compassionate awareness",
    icon: Sparkles,
  },
  {
    id: "sleep",
    name: "Sleep & Somatic Specialist",
    tagline: "Insomnia relief, nervous system down-regulation",
    icon: Moon,
  },
  {
    id: "breath",
    name: "Breathwork Coach",
    tagline: "Vagus nerve stimulation, Pranayama & box breathing",
    icon: Wind,
  },
  {
    id: "zen",
    name: "Zen Philosopher",
    tagline: "Letting go of attachments & radical acceptance",
    icon: HeartHandshake,
  },
];

const PROMPT_SUGGESTIONS = [
  "I have a storm of racing thoughts right now. How can I center myself?",
  "Recommend a 5-minute breathing exercise to lower acute anxiety.",
  "How does 4-7-8 breathing affect the parasympathetic nervous system?",
  "I struggle to fall asleep because I worry about work. Guide me.",
];

export const ZenithChatbot: React.FC<ZenithChatbotProps> = ({ onStartSessionFromChat }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "model",
      content:
        "Greetings, peaceful traveler. I am **Zenith**, your AI Mindfulness Guide & Meditation Architect. Whether you seek guidance through a stressful moment, wish to understand contemplative science, or want to design a custom meditation journey, I am here with you. How is your inner state right now?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState(COACH_PERSONAS[0].name);
  const [selectedModel, setSelectedModel] = useState<GeminiModelType>("flash"); // 'flash', 'pro', 'lite'
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputValue;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInputValue("");
    setIsLoading(true);

    try {
      // Build conversation history array for multi-turn chat
      const historyPayload = [...messages, userMessage].map((m) => ({
        role: m.role === "model" ? "model" : "user",
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyPayload,
          modelType: selectedModel,
          persona: selectedPersona,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.reply) {
        throw new Error(data.error || "Could not retrieve coach response");
      }

      const modelMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        role: "model",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "model",
        content: "I apologize, my thought stream was briefly interrupted. Please ask once more, and let us breathe together.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "model",
        content:
          "Welcome back to a fresh space of presence. What would you like to explore or cultivate today?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Convert coach message into session generator parameters
  const handleTurnIntoSession = (msgContent: string) => {
    onStartSessionFromChat({
      theme: "Zenith Mindfulness Sanctuary",
      goal: msgContent.slice(0, 140),
      userNotes: msgContent.slice(0, 300),
      breathingPattern: "calm",
      durationMinutes: 5,
      visualStyle: "Translucent luminous crystals in a serene mountain sanctuary with gentle starlight",
      ambientType: "ocean",
      solfeggioHz: 528,
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-6rem)]">
      {/* Top Header & Settings */}
      <div className="p-4 rounded-2xl bg-[#0e0e11]/80 backdrop-blur-xl border border-white/10 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shadow-sm">
            <Bot className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-serif font-medium text-white/90">Zenith AI Guide</h2>
              <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded bg-white/5 text-white/70 border border-white/10">
                Multi-Turn Gemini
              </span>
            </div>
            <p className="text-xs text-white/40 font-light">{selectedPersona}</p>
          </div>
        </div>

        {/* Controls: Persona & Model Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Persona selector */}
          <select
            id="select-coach-persona"
            value={selectedPersona}
            onChange={(e) => setSelectedPersona(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#121215] border border-white/10 text-white/80 text-xs focus:outline-none focus:border-white/30 font-light"
          >
            {COACH_PERSONAS.map((p) => (
              <option key={p.id} value={p.name} className="bg-[#121215] text-white">
                {p.name}
              </option>
            ))}
          </select>

          {/* Model Switcher (gemini-3.5-flash, gemini-3.1-pro-preview, gemini-3.1-flash-lite) */}
          <div className="flex items-center rounded-xl bg-[#121215] p-0.5 border border-white/10 text-xs font-light">
            <button
              id="model-switch-flash"
              onClick={() => setSelectedModel("flash")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                selectedModel === "flash"
                  ? "bg-white/15 text-white border border-white/20 shadow-sm"
                  : "text-white/40 hover:text-white"
              }`}
              title="gemini-3.5-flash (General Tasks)"
            >
              Flash
            </button>
            <button
              id="model-switch-pro"
              onClick={() => setSelectedModel("pro")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                selectedModel === "pro"
                  ? "bg-white/15 text-white border border-white/20 shadow-sm"
                  : "text-white/40 hover:text-white"
              }`}
              title="gemini-3.1-pro-preview (Complex inquiry & reasoning)"
            >
              Pro
            </button>
            <button
              id="model-switch-lite"
              onClick={() => setSelectedModel("lite")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                selectedModel === "lite"
                  ? "bg-white/15 text-white border border-white/20 shadow-sm"
                  : "text-white/40 hover:text-white"
              }`}
              title="gemini-3.1-flash-lite (Fast speed)"
            >
              Lite
            </button>
          </div>

          <button
            id="btn-reset-chat"
            onClick={handleResetChat}
            className="p-2 rounded-xl bg-[#121215] hover:bg-white/10 text-white/50 hover:text-white transition-colors border border-white/10"
            title="Reset conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 rounded-3xl bg-[#0a0a0b]/50 p-4 sm:p-6 border border-white/5">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 max-w-3xl ${m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-semibold ${
                m.role === "user"
                  ? "bg-[#f0f0f5] text-black shadow-sm"
                  : "bg-white/10 text-white border border-white/15"
              }`}
            >
              {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-indigo-400" />}
            </div>

            <div
              className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-white/10 border border-white/15 text-white rounded-tr-none shadow-sm"
                  : "bg-[#121215]/90 border border-white/10 text-white/80 rounded-tl-none space-y-2 shadow-sm font-light"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>

              {/* Action: Turn into Meditation Session button for AI messages */}
              {m.role === "model" && m.content.length > 50 && (
                <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-white/30 font-mono">{m.timestamp}</span>
                  <button
                    onClick={() => handleTurnIntoSession(m.content)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-[11px] font-light flex items-center gap-1.5 transition-colors"
                  >
                    <Wand2 className="w-3 h-3 text-indigo-400" />
                    <span>Generate Meditation Session</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-xl mr-auto">
            <div className="w-8 h-8 rounded-xl bg-white/10 text-indigo-400 border border-white/15 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="p-4 rounded-2xl bg-[#121215]/90 border border-white/10 rounded-tl-none flex items-center gap-2.5 text-xs text-white/50 font-light">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>Zenith is tuning into your breath and thoughts...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Inquiries */}
      <div className="py-3 overflow-x-auto flex items-center gap-2 no-scrollbar">
        <span className="text-[11px] text-white/40 font-light uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          Prompts:
        </span>
        {PROMPT_SUGGESTIONS.map((p, idx) => (
          <button
            key={idx}
            id={`chat-suggestion-${idx}`}
            onClick={() => handleSendMessage(p)}
            className="px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs whitespace-nowrap transition-all flex-shrink-0 font-light"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="pt-1">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            id="input-chat-message"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask Zenith about mindfulness, breathwork, sleep, or session design..."
            disabled={isLoading}
            className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-[#121215] border border-white/10 text-white placeholder-white/30 text-xs sm:text-sm focus:outline-none focus:border-white/30 transition-colors font-light"
          />
          <button
            id="btn-send-chat-message"
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-2 p-2.5 rounded-xl bg-[#f0f0f5] hover:bg-white text-black disabled:opacity-30 transition-all shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
