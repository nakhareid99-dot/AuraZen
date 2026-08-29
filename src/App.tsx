import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { SessionLibrary } from "./components/SessionLibrary";
import { SessionCreator } from "./components/SessionCreator";
import { MeditationPlayer } from "./components/MeditationPlayer";
import { ZenithChatbot } from "./components/ZenithChatbot";
import { JournalHistory } from "./components/JournalHistory";
import { MeditationSession, JournalEntry, UserStats, MeditationSessionCreateParams } from "./types";
import { ambientSynth } from "./utils/audioSynthesizer";

export default function App() {
  const [currentTab, setCurrentTab] = useState<"library" | "create" | "player" | "chat" | "journal">("library");
  const [activeSession, setActiveSession] = useState<MeditationSession | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const [creatorInitialParams, setCreatorInitialParams] = useState<Partial<MeditationSessionCreateParams> | undefined>();

  const [stats, setStats] = useState<UserStats>({
    totalMinutes: 0,
    totalSessions: 0,
    currentStreak: 1,
    lastMeditationDate: null,
  });

  // Load user data & statistics
  useEffect(() => {
    try {
      const storedFavs = localStorage.getItem("aurazen_favorites");
      if (storedFavs) {
        setFavorites(JSON.parse(storedFavs));
      }

      const storedStats = localStorage.getItem("aurazen_user_stats");
      if (storedStats) {
        const parsed: UserStats = JSON.parse(storedStats);
        // Calculate streak
        if (parsed.lastMeditationDate) {
          const lastDate = new Date(parsed.lastMeditationDate);
          const today = new Date();
          const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
          if (diffDays > 1) {
            parsed.currentStreak = 1; // Streak reset if missed more than 1 day
          }
        }
        setStats(parsed);
      } else {
        setStats({
          totalMinutes: 24,
          totalSessions: 3,
          currentStreak: 2,
          lastMeditationDate: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn("Error loading user profile state", e);
    }
  }, []);

  // Quick toggle for standalone ambient soundscape
  const handleToggleAmbient = () => {
    if (isAmbientPlaying) {
      ambientSynth.stopAmbient();
      setIsAmbientPlaying(false);
    } else {
      ambientSynth.startAmbient("ocean", 432, 7.83);
      setIsAmbientPlaying(true);
    }
  };

  const handleToggleFavorite = (id: string) => {
    const updated = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem("aurazen_favorites", JSON.stringify(updated));
  };

  const handleSelectSession = (session: MeditationSession) => {
    setActiveSession(session);
    setCurrentTab("player");
  };

  const handleSessionCreated = (session: MeditationSession, startImmediately = true) => {
    setActiveSession(session);
    if (startImmediately) {
      setCurrentTab("player");
    } else {
      setCurrentTab("library");
    }
  };

  const handleStartSessionFromChat = (params: Partial<MeditationSessionCreateParams>) => {
    setCreatorInitialParams(params);
    setCurrentTab("create");
  };

  const handleFinishSession = (entry: JournalEntry) => {
    // 1. Save journal entry
    try {
      const existing: JournalEntry[] = JSON.parse(localStorage.getItem("aurazen_journal_entries") || "[]");
      localStorage.setItem("aurazen_journal_entries", JSON.stringify([entry, ...existing]));
    } catch (e) {
      console.warn("Storage error saving entry", e);
    }

    // 2. Update user stats & streak
    const newStats: UserStats = {
      totalMinutes: stats.totalMinutes + entry.durationMinutes,
      totalSessions: stats.totalSessions + 1,
      currentStreak: stats.currentStreak + 1,
      lastMeditationDate: new Date().toISOString(),
    };
    setStats(newStats);
    localStorage.setItem("aurazen_user_stats", JSON.stringify(newStats));

    // 3. Switch to journal to review
    setCurrentTab("journal");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#e0e0e6] font-sans flex flex-col relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Ambient Atmospheric Glowing Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -right-1/4 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-1/4 left-1/3 w-[400px] h-[400px] bg-indigo-900/15 rounded-full blur-[80px]" />
      </div>

      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === "create") {
            setCreatorInitialParams(undefined);
          }
          setCurrentTab(tab);
        }}
        activeSessionTitle={activeSession?.title}
        hasActiveSession={!!activeSession}
        isAmbientPlaying={isAmbientPlaying}
        onToggleAmbient={handleToggleAmbient}
        currentStreak={stats.currentStreak}
      />

      {/* Main View Router */}
      <main className="flex-1 relative z-10">
        {currentTab === "library" && (
          <SessionLibrary
            onSelectSession={handleSelectSession}
            onCreateNew={() => {
              setCreatorInitialParams(undefined);
              setCurrentTab("create");
            }}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {currentTab === "create" && (
          <SessionCreator
            onSessionCreated={handleSessionCreated}
            initialParams={creatorInitialParams}
          />
        )}

        {currentTab === "player" && activeSession && (
          <MeditationPlayer
            session={activeSession}
            onFinishSession={handleFinishSession}
            onToggleFavorite={handleToggleFavorite}
            isFavorite={favorites.includes(activeSession.id)}
          />
        )}

        {currentTab === "chat" && (
          <ZenithChatbot onStartSessionFromChat={handleStartSessionFromChat} />
        )}

        {currentTab === "journal" && (
          <JournalHistory stats={stats} />
        )}
      </main>

      {/* Subtle Footer */}
      <footer className="h-16 px-6 sm:px-10 flex items-center justify-between border-t border-white/5 relative z-10 text-[10px] text-white/30 tracking-widest uppercase">
        <div>© 2026 AuraZen Labs — Mindful AI Soundscapes</div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          <span className="text-white/40">Engine: Gemini 3.5 Flash & 3.1 Pro</span>
        </div>
      </footer>
    </div>
  );
}
