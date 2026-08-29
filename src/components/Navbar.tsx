import React from "react";
import { Sparkles, Compass, PlusCircle, MessageSquareHeart, BookOpen, Volume2, VolumeX, Flame } from "lucide-react";

interface NavbarProps {
  currentTab: "library" | "create" | "player" | "chat" | "journal";
  onSelectTab: (tab: "library" | "create" | "player" | "chat" | "journal") => void;
  activeSessionTitle?: string;
  hasActiveSession: boolean;
  isAmbientPlaying: boolean;
  onToggleAmbient: () => void;
  currentStreak: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  activeSessionTitle,
  hasActiveSession,
  isAmbientPlaying,
  onToggleAmbient,
  currentStreak,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#0a0a0b]/80 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          id="nav-brand-logo"
          onClick={() => onSelectTab("library")}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            <div className="w-4 h-4 border-2 border-white rounded-full opacity-80 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-light tracking-[0.2em] uppercase text-white/90">AuraZen</span>
            <span className="text-[9px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">
              AI Studio
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-3 text-xs tracking-widest uppercase">
          <button
            id="nav-tab-library"
            onClick={() => onSelectTab("library")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              currentTab === "library"
                ? "bg-white/10 text-white border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)] opacity-100"
                : "text-white/60 hover:text-white hover:bg-white/5 opacity-70 hover:opacity-100"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sanctuary</span>
          </button>

          <button
            id="nav-tab-create"
            onClick={() => onSelectTab("create")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              currentTab === "create"
                ? "bg-indigo-600/20 text-indigo-200 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)] opacity-100"
                : "text-white/60 hover:text-white hover:bg-white/5 opacity-70 hover:opacity-100"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Generate</span>
          </button>

          {hasActiveSession && (
            <button
              id="nav-tab-player"
              onClick={() => onSelectTab("player")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all relative ${
                currentTab === "player"
                  ? "bg-purple-600/20 text-purple-200 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)] opacity-100"
                  : "text-white/60 hover:text-white hover:bg-white/5 opacity-70 hover:opacity-100"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
              <span className="hidden lg:inline max-w-[110px] truncate">{activeSessionTitle || "Playing"}</span>
              <span className="lg:hidden">Session</span>
            </button>
          )}

          <button
            id="nav-tab-chat"
            onClick={() => onSelectTab("chat")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              currentTab === "chat"
                ? "bg-white/10 text-white border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)] opacity-100"
                : "text-white/60 hover:text-white hover:bg-white/5 opacity-70 hover:opacity-100"
            }`}
          >
            <MessageSquareHeart className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Zenith Guide</span>
            <span className="md:hidden">Coach</span>
          </button>

          <button
            id="nav-tab-journal"
            onClick={() => onSelectTab("journal")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              currentTab === "journal"
                ? "bg-white/10 text-white border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)] opacity-100"
                : "text-white/60 hover:text-white hover:bg-white/5 opacity-70 hover:opacity-100"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Journal</span>
          </button>
        </nav>

        {/* Right controls: Ambient Toggle & Streak */}
        <div className="flex items-center gap-3">
          {/* Streak pill */}
          <div
            id="user-streak-pill"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-amber-200 text-xs font-light"
            title={`${currentStreak} day mindfulness streak`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-mono text-xs">{currentStreak}d</span>
          </div>

          {/* Quick Ambient soundscape toggle */}
          <button
            id="btn-quick-ambient-toggle"
            onClick={onToggleAmbient}
            className={`p-2.5 rounded-xl border transition-all text-xs flex items-center gap-2 ${
              isAmbientPlaying
                ? "bg-indigo-950/60 text-indigo-300 border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                : "bg-white/5 text-white/50 border-white/10 hover:text-white hover:bg-white/10"
            }`}
            title={isAmbientPlaying ? "Mute Ambient Soundscape" : "Play 432Hz Ambient Soundscape"}
          >
            {isAmbientPlaying ? (
              <>
                <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="hidden sm:inline text-[11px] uppercase tracking-wider font-light">432Hz</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4" />
                <span className="hidden sm:inline text-[11px] uppercase tracking-wider font-light">Ambient</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
