import React, { useState, useEffect } from "react";
import {
  Play,
  Sparkles,
  Clock,
  Wind,
  Music,
  Heart,
  Plus,
  Trash2,
  SlidersHorizontal,
  Compass,
  Mic,
  Eye,
} from "lucide-react";
import { MeditationSession } from "../types";

interface SessionLibraryProps {
  onSelectSession: (session: MeditationSession) => void;
  onCreateNew: () => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

export const SessionLibrary: React.FC<SessionLibraryProps> = ({
  onSelectSession,
  onCreateNew,
  favorites,
  onToggleFavorite,
}) => {
  const [presets, setPresets] = useState<MeditationSession[]>([]);
  const [customSessions, setCustomSessions] = useState<MeditationSession[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "custom" | "presets" | "favorites">("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Load presets from server and custom sessions from localStorage
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/meditation/presets");
        const data = await res.json();
        if (data.presets) {
          setPresets(data.presets);
        }
      } catch (err) {
        console.warn("Presets load notice:", err);
      } finally {
        setLoading(false);
      }

      try {
        const stored = localStorage.getItem("aurazen_custom_sessions");
        if (stored) {
          setCustomSessions(JSON.parse(stored));
        }
      } catch (e) {
        console.warn("Storage read error", e);
      }
    }
    loadData();
  }, []);

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = customSessions.filter((s) => s.id !== id);
    setCustomSessions(filtered);
    localStorage.setItem("aurazen_custom_sessions", JSON.stringify(filtered));
  };

  const allSessions = [...customSessions, ...presets];

  const filteredSessions = allSessions.filter((s) => {
    if (activeFilter === "custom" && !s.isCustom) return false;
    if (activeFilter === "presets" && s.isCustom) return false;
    if (activeFilter === "favorites" && !favorites.includes(s.id)) return false;

    if (selectedTag !== "all") {
      const matchText = `${s.title} ${s.subtitle} ${s.intention}`.toLowerCase();
      if (!matchText.includes(selectedTag.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-[#0e0e11]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-10 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs font-light">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Multimodal Meditation Sanctuary</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-light text-white/90 tracking-tight leading-tight">
            Stillness on Demand.
          </h1>
          <p className="text-white/60 text-sm sm:text-base leading-relaxed font-light">
            Immerse yourself in unique sessions crafted by Google Gemini models — complete with 
            hyper-detailed visual artwork, soothing studio voiceovers, and neuro-acoustic soundscapes.
          </p>
          <div className="pt-3 flex flex-wrap items-center gap-3">
            <button
              id="btn-hero-generate"
              onClick={onCreateNew}
              className="px-6 py-3 rounded-2xl bg-[#f0f0f5] hover:bg-white text-black font-medium text-xs uppercase tracking-widest transition-all shadow-[0_10px_25px_rgba(0,0,0,0.4)] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Generate New Session</span>
            </button>
            {presets[0] && (
              <button
                id="btn-hero-quick-start"
                onClick={() => onSelectSession(presets[0])}
                className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-light text-xs uppercase tracking-wider transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4 text-indigo-400 fill-current" />
                <span>Quick Start: {presets[0].title}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Tags */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        {/* Main tabs */}
        <div className="flex items-center gap-2">
          {[
            { id: "all", label: "All Sessions" },
            { id: "custom", label: `Your Custom (${customSessions.length})` },
            { id: "presets", label: "Curated Presets" },
            { id: "favorites", label: `Favorites (${favorites.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`filter-tab-${tab.id}`}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-light border transition-all ${
                activeFilter === tab.id
                  ? "bg-white/15 border-white/30 text-white shadow-sm"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category focus tag filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {["all", "Sleep", "Anxiety", "Focus", "Forest", "Ocean", "Cosmic"].map((tag) => (
            <button
              key={tag}
              id={`tag-filter-${tag.toLowerCase()}`}
              onClick={() => setSelectedTag(tag === "all" ? "all" : tag)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-light transition-all ${
                (selectedTag === "all" && tag === "all") || selectedTag === tag
                  ? "bg-white/15 text-white border border-white/20"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {tag === "all" ? "All Focus" : `#${tag}`}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Grid */}
      {loading ? (
        <div className="py-20 text-center text-white/40 text-sm flex items-center justify-center gap-2">
          <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
          <span>Tuning into your sanctuary library...</span>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-[#0e0e11]/40 border border-dashed border-white/10 p-8 space-y-3">
          <Compass className="w-10 h-10 text-white/30 mx-auto" />
          <h3 className="text-base font-serif text-white/80 font-light">No sessions found in this view</h3>
          <p className="text-xs text-white/40 max-w-sm mx-auto font-light">
            Design your first tailored meditation session using Gemini AI imagery and voice synthesis.
          </p>
          <button
            onClick={onCreateNew}
            className="mt-2 px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-light hover:bg-white/20 transition-colors inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Session</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map((session) => {
            const isFav = favorites.includes(session.id);
            return (
              <div
                key={session.id}
                id={`session-card-${session.id}`}
                onClick={() => onSelectSession(session)}
                className="group relative rounded-3xl overflow-hidden bg-[#0e0e11]/80 backdrop-blur-xl border border-white/10 hover:border-white/30 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50 flex flex-col cursor-pointer"
              >
                {/* Visual Thumbnail */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0a0a0b]">
                  {session.imageUrl ? (
                    <img
                      src={session.imageUrl}
                      alt={session.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-90"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-indigo-950/40 via-[#121215] to-[#0a0a0b] flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-white/20" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e11] via-[#0e0e11]/20 to-transparent" />

                  {/* Badges on Top */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1.5">
                      {session.isCustom ? (
                        <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/20 text-white text-[10px] font-mono tracking-wider">
                          AI CUSTOM
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-[#0a0a0b]/80 border border-white/10 text-white/70 text-[10px] font-light">
                          PRESET
                        </span>
                      )}

                      {session.imageResolution && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/80 text-[9px] font-mono">
                          {session.imageResolution}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 pointer-events-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(session.id);
                        }}
                        className={`p-1.5 rounded-lg backdrop-blur-md transition-all ${
                          isFav
                            ? "bg-rose-950/80 text-rose-300 border border-rose-500/50"
                            : "bg-[#0a0a0b]/70 text-white/50 hover:text-white border border-white/10"
                        }`}
                        title="Favorite"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-current" : ""}`} />
                      </button>

                      {session.isCustom && (
                        <button
                          onClick={(e) => handleDeleteCustom(session.id, e)}
                          className="p-1.5 rounded-lg bg-[#0a0a0b]/70 text-white/50 hover:text-rose-400 border border-white/10 backdrop-blur-md transition-all"
                          title="Delete custom session"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Play Overlay Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#0a0a0b]/40 backdrop-blur-[1px]">
                    <div className="w-12 h-12 rounded-full bg-[#f0f0f5] text-black flex items-center justify-center shadow-lg shadow-black/60 transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Session Card Info */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-serif font-light text-white/90 group-hover:text-white transition-colors">
                      {session.title}
                    </h3>
                    <p className="text-xs text-white/50 line-clamp-2 leading-relaxed font-light">
                      {session.subtitle || session.intention}
                    </p>
                  </div>

                  {/* Specs Pill Badges */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/50 font-light">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-white/30" />
                        {session.durationMinutes}m
                      </span>
                      <span className="flex items-center gap-1">
                        <Wind className="w-3.5 h-3.5 text-indigo-400" />
                        {session.breathingGuide?.patternName?.split(" ")[0] || "Breath"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-white/70 text-[11px]">
                      <Mic className="w-3 h-3 text-indigo-400" />
                      <span>{session.voiceName || "Kore"}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
