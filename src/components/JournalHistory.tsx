import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Flame,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  Smile,
  Award,
  Trash2,
} from "lucide-react";
import { JournalEntry, UserStats } from "../types";

interface JournalHistoryProps {
  stats: UserStats;
  onClearHistory?: () => void;
}

export const JournalHistory: React.FC<JournalHistoryProps> = ({ stats, onClearHistory }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("aurazen_journal_entries");
      if (stored) {
        setEntries(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Error reading journal entries:", e);
    }
  }, []);

  const handleDeleteEntry = (id: string) => {
    const filtered = entries.filter((e) => e.id !== id);
    setEntries(filtered);
    localStorage.setItem("aurazen_journal_entries", JSON.stringify(filtered));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-widest mb-2 font-light">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <span>Mindfulness Practice Journal</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-light text-white/90 tracking-tight">
          Your Contemplative Journey
        </h1>
        <p className="text-white/50 mt-1 text-sm max-w-xl font-light">
          Review your meditation history, post-session insights, and daily mindfulness streaks.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0e0e11]/80 backdrop-blur-xl border border-white/10 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-light text-white/50">Current Streak</span>
            <Flame className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-light text-white/90">
            {stats.currentStreak} <span className="text-xs font-sans font-light text-white/40">days</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0e0e11]/80 backdrop-blur-xl border border-white/10 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-indigo-400">
            <span className="text-xs font-light text-white/50">Mindful Minutes</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-light text-white/90">
            {stats.totalMinutes} <span className="text-xs font-sans font-light text-white/40">min</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0e0e11]/80 backdrop-blur-xl border border-white/10 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-xs font-light text-white/50">Sessions</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl sm:text-3xl font-serif font-light text-white/90">
            {stats.totalSessions}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0e0e11]/80 backdrop-blur-xl border border-white/10 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-xs font-light text-white/50">Mastery Level</span>
            <Award className="w-4 h-4" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-light text-white/90 truncate">
            {stats.totalMinutes >= 60 ? "Deep Seeker" : stats.totalMinutes >= 20 ? "Mindful Novice" : "Apprentice"}
          </p>
        </div>
      </div>

      {/* Journal Entries List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-serif font-light text-white/90 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Reflections & Session Logs</span>
          </h2>
          <span className="text-xs text-white/40 font-light">{entries.length} recorded entries</span>
        </div>

        {entries.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-[#0e0e11]/40 border border-dashed border-white/10 p-6">
            <BookOpen className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-white/60 text-sm font-light">No reflection logs yet.</p>
            <p className="text-xs text-white/40 mt-1 font-light">
              Complete a guided meditation session and your reflections will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                id={`journal-entry-${entry.id}`}
                className="p-5 rounded-2xl bg-[#0e0e11]/80 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-medium text-white/90">{entry.sessionTitle}</h3>
                    <div className="flex items-center gap-3 text-[11px] text-white/40 font-light">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(entry.completedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span>•</span>
                      <span>{entry.durationMinutes} minutes</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {entry.moodAfter && (
                      <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs font-light flex items-center gap-1">
                        <Smile className="w-3 h-3 text-indigo-400" />
                        {entry.moodAfter}
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-1 text-white/30 hover:text-rose-400 transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {entry.notes && (
                  <p className="text-xs sm:text-sm text-white/70 italic bg-[#121215] p-3.5 rounded-xl border border-white/5 leading-relaxed font-light">
                    "{entry.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
