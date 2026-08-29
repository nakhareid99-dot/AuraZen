import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Wind,
  Bell,
  Sliders,
  CheckCircle,
  Heart,
  ChevronRight,
  ChevronLeft,
  Share2,
  Music,
  Mic,
  Smile,
} from "lucide-react";
import confetti from "canvas-confetti";
import { MeditationSession, JournalEntry } from "../types";
import { ambientSynth } from "../utils/audioSynthesizer";
import { ttsPlayer } from "../utils/ttsVoicePlayer";

interface MeditationPlayerProps {
  session: MeditationSession;
  onFinishSession: (entry: JournalEntry) => void;
  onToggleFavorite?: (sessionId: string) => void;
  isFavorite?: boolean;
}

export const MeditationPlayer: React.FC<MeditationPlayerProps> = ({
  session,
  onFinishSession,
  onToggleFavorite,
  isFavorite = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(session.durationSeconds || 300);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Audio mix controls
  const [voiceVolume, setVoiceVolume] = useState(0.85);
  const [ambientVolume, setAmbientVolume] = useState(0.45);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isAmbientMuted, setIsAmbientMuted] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [solfeggioHz, setSolfeggioHz] = useState(session.ambientSoundscape.solfeggioHz || 432);

  // Breath visualizer state
  const [breathPhase, setBreathPhase] = useState<"inhale" | "hold1" | "exhale" | "hold2">("inhale");
  const [breathPhaseProgress, setBreathPhaseProgress] = useState(0);
  const [breathText, setBreathText] = useState("Inhale...");

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [moodAfter, setMoodAfter] = useState("Peaceful & Centered");
  const [reflectionNotes, setReflectionNotes] = useState("");

  const steps = session.steps || [];
  const currentStep = steps[currentStepIndex] || steps[0] || {
    title: session.title,
    narration: session.intention,
    visualFocus: session.subtitle,
    phase: "Arrival",
    bellChime: true,
  };

  // Breathing loop timer
  const breathing = session.breathingGuide || {
    inhale: 4,
    hold1: 2,
    exhale: 6,
    hold2: 2,
    patternName: "Relaxed Pace",
  };

  const totalCycleSeconds =
    (breathing.inhale || 4) +
    (breathing.hold1 || 0) +
    (breathing.exhale || 4) +
    (breathing.hold2 || 0);

  // Initialize and manage audio
  useEffect(() => {
    // Setup TTS audio player callbacks
    ttsPlayer.setCallbacks(
      (curr, dur) => {
        setCurrentTime(curr);
        if (dur > 0 && dur !== duration) {
          setDuration(dur);
        }
      },
      () => {
        // Voiceover finished
        setIsPlaying(false);
        triggerCompletion();
      }
    );

    if (session.fullAudioUrl) {
      ttsPlayer.loadAudio(session.fullAudioUrl, false);
      ttsPlayer.setVolume(voiceVolume);
    }

    // Start ambient synth
    ambientSynth.startAmbient(
      session.ambientSoundscape?.natureElement || "ocean",
      solfeggioHz,
      session.ambientSoundscape?.binauralHz || 7.83
    );
    ambientSynth.setMasterVolume(ambientVolume);

    // Play initial bell
    setTimeout(() => {
      ambientSynth.playBellChime(528);
    }, 400);

    return () => {
      ttsPlayer.pause();
      ambientSynth.stopAmbient();
    };
  }, [session]);

  // Handle master play / pause toggle
  const togglePlay = () => {
    if (isPlaying) {
      ttsPlayer.pause();
      setIsPlaying(false);
    } else {
      if (session.fullAudioUrl) {
        ttsPlayer.play();
      }
      setIsPlaying(true);
    }
  };

  // Synchronize breathing cycle
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.1;
        if (next >= duration) {
          clearInterval(interval);
          triggerCompletion();
          return duration;
        }

        // Determine current step from timeOffsetSeconds
        if (steps.length > 0) {
          let activeIdx = 0;
          for (let i = steps.length - 1; i >= 0; i--) {
            if (next >= (steps[i].timeOffsetSeconds || 0)) {
              activeIdx = i;
              break;
            }
          }
          if (activeIdx !== currentStepIndex) {
            setCurrentStepIndex(activeIdx);
            if (steps[activeIdx]?.bellChime) {
              ambientSynth.playBellChime(528);
            }
          }
        }

        return next;
      });

      // Calculate breathing phase
      const cyclePos = (currentTime % totalCycleSeconds);
      const inhaleEnd = breathing.inhale;
      const hold1End = inhaleEnd + (breathing.hold1 || 0);
      const exhaleEnd = hold1End + breathing.exhale;

      if (cyclePos < inhaleEnd) {
        setBreathPhase("inhale");
        setBreathPhaseProgress(cyclePos / (breathing.inhale || 1));
        setBreathText("Inhale gently...");
      } else if (cyclePos < hold1End) {
        setBreathPhase("hold1");
        setBreathPhaseProgress((cyclePos - inhaleEnd) / (breathing.hold1 || 1));
        setBreathText("Hold in stillness...");
      } else if (cyclePos < exhaleEnd) {
        setBreathPhase("exhale");
        setBreathPhaseProgress((cyclePos - hold1End) / (breathing.exhale || 1));
        setBreathText("Exhale and let go...");
      } else {
        setBreathPhase("hold2");
        setBreathPhaseProgress((cyclePos - exhaleEnd) / (breathing.hold2 || 1));
        setBreathText("Rest in awareness...");
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, currentTime, duration, steps, currentStepIndex, totalCycleSeconds, breathing]);

  // Volume & Speed Handlers
  const handleVoiceVolume = (val: number) => {
    setVoiceVolume(val);
    ttsPlayer.setVolume(val);
  };

  const handleAmbientVolume = (val: number) => {
    setAmbientVolume(val);
    ambientSynth.setMasterVolume(val);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    ttsPlayer.setPlaybackRate(speed);
  };

  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    ttsPlayer.seek(seconds);
  };

  const handleRingBell = () => {
    ambientSynth.playBellChime(solfeggioHz || 528);
  };

  const triggerCompletion = () => {
    setIsPlaying(false);
    setShowCompletionModal(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#14b8a6", "#38bdf8", "#f59e0b", "#a855f7"],
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleSaveJournal = () => {
    const entry: JournalEntry = {
      id: `journal-${Date.now()}`,
      sessionId: session.id,
      sessionTitle: session.title,
      completedAt: new Date().toISOString(),
      durationMinutes: session.durationMinutes,
      rating,
      moodAfter,
      notes: reflectionNotes,
    };
    onFinishSession(entry);
    setShowCompletionModal(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Breathing circle scale dynamic calculation
  const getCircleScale = () => {
    if (breathPhase === "inhale") {
      return 1.0 + breathPhaseProgress * 0.45;
    } else if (breathPhase === "hold1") {
      return 1.45;
    } else if (breathPhase === "exhale") {
      return 1.45 - breathPhaseProgress * 0.45;
    } else {
      return 1.0;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative min-h-[calc(100vh-5rem)] flex flex-col justify-between overflow-hidden ${
        isFullscreen ? "bg-[#0a0a0b] p-4 sm:p-8" : "max-w-6xl mx-auto px-4 py-6"
      }`}
    >
      {/* Background Visual Art with Slow Ambient Ken Burns Motion */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {session.imageUrl ? (
          <img
            src={session.imageUrl}
            alt={session.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover scale-105 filter brightness-[0.35] blur-[1px] transition-transform duration-[20000ms] ease-out hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-[#0a0a0b] via-indigo-950/20 to-[#0a0a0b]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/75 to-[#0a0a0b]/40 backdrop-blur-[2px]" />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          {session.imageResolution && (
            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-[10px] font-mono tracking-wider">
              {session.imageResolution} AI ART
            </span>
          )}
          {session.voiceName && (
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-[10px] font-light flex items-center gap-1">
              <Mic className="w-3 h-3 text-indigo-400" />
              Voice: {session.voiceName}
            </span>
          )}
          <span className="text-xs text-white/40 font-light hidden sm:inline">
            {breathing.patternName} ({breathing.inhale}s-{breathing.hold1 || 0}s-{breathing.exhale}s
            {breathing.hold2 ? `-${breathing.hold2}s` : ""})
          </span>
        </div>

        {/* Right Header Action Icons */}
        <div className="flex items-center gap-2">
          {onToggleFavorite && (
            <button
              id="btn-favorite-session"
              onClick={() => onToggleFavorite(session.id)}
              className={`p-2 rounded-xl border transition-all ${
                isFavorite
                  ? "bg-rose-950/60 border-rose-500/50 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                  : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
              }`}
              title="Save to favorites"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
            </button>
          )}

          <button
            id="btn-ring-bell"
            onClick={handleRingBell}
            className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 text-xs font-light tracking-wide flex items-center gap-1.5 transition-all"
            title="Sound Tibetan Singing Bowl Chime"
          >
            <Bell className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Singing Bowl</span>
          </button>

          <button
            id="btn-fullscreen-toggle"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Immersion"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Center Stage: Interactive Breathing Pacer & Visual Focus */}
      <div className="relative z-10 my-auto py-8 flex flex-col items-center justify-center text-center">
        {/* Breathing Geometric Sacred Ring Visualizer */}
        <div className="relative flex items-center justify-center my-6">
          {/* Outer Ambient Glow Aura */}
          <div
            className="absolute rounded-full transition-all duration-700 pointer-events-none"
            style={{
              width: "300px",
              height: "300px",
              transform: `scale(${getCircleScale() * 1.18})`,
              background:
                breathPhase === "inhale"
                  ? "radial-gradient(circle, rgba(99,102,241,0.35) 0%, rgba(99,102,241,0) 70%)"
                  : breathPhase === "hold1"
                  ? "radial-gradient(circle, rgba(168,85,247,0.35) 0%, rgba(168,85,247,0) 70%)"
                  : breathPhase === "exhale"
                  ? "radial-gradient(circle, rgba(236,72,153,0.3) 0%, rgba(236,72,153,0) 70%)"
                  : "radial-gradient(circle, rgba(147,197,253,0.25) 0%, rgba(147,197,253,0) 70%)",
            }}
          />

          {/* Inner Pulsing Sacred Geometry Ring */}
          <div
            className="w-56 h-56 sm:w-64 sm:h-64 rounded-full border-2 border-white/20 shadow-[0_0_50px_rgba(99,102,241,0.25)] flex flex-col items-center justify-center transition-transform duration-500 ease-out backdrop-blur-2xl bg-[#0a0a0b]/60"
            style={{
              transform: `scale(${getCircleScale()})`,
              borderColor:
                breathPhase === "inhale"
                  ? "rgba(99,102,241,0.6)"
                  : breathPhase === "hold1"
                  ? "rgba(168,85,247,0.7)"
                  : breathPhase === "exhale"
                  ? "rgba(236,72,153,0.6)"
                  : "rgba(147,197,253,0.5)",
            }}
          >
            {/* Center Breath Status */}
            <Wind
              className={`w-6 h-6 mb-2 transition-colors ${
                breathPhase === "inhale"
                  ? "text-indigo-400 animate-pulse"
                  : breathPhase === "hold1"
                  ? "text-purple-400"
                  : breathPhase === "exhale"
                  ? "text-pink-400"
                  : "text-blue-300"
              }`}
            />
            <span className="text-base sm:text-lg font-light text-white/90 tracking-wide">
              {breathText}
            </span>
            <span className="text-[10px] font-mono text-white/40 mt-1 uppercase tracking-[0.2em]">
              {breathPhase}
            </span>
          </div>
        </div>

        {/* Spoken Narration Caption & Step Context */}
        <div className="max-w-2xl px-4 mt-2">
          <span className="text-[10px] font-light uppercase tracking-[0.2em] text-indigo-300 px-3 py-1 rounded-full bg-indigo-950/40 border border-indigo-500/30 inline-block mb-3">
            Phase {currentStepIndex + 1}: {currentStep.phase || "Guidance"}
          </span>
          <h2 className="text-2xl sm:text-3xl font-light text-white/90 tracking-tight font-serif">
            {currentStep.title}
          </h2>
          <p className="text-white/70 text-sm sm:text-base mt-2 font-light leading-relaxed italic">
            "{currentStep.narration}"
          </p>
          {currentStep.visualFocus && (
            <p className="text-xs text-white/40 mt-2 font-light flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>{currentStep.visualFocus}</span>
            </p>
          )}
        </div>

        {/* Step Navigation Dots */}
        {steps.length > 1 && (
          <div className="flex items-center gap-2 mt-6">
            {steps.map((s, idx) => (
              <button
                key={idx}
                id={`step-dot-${idx}`}
                onClick={() => {
                  setCurrentStepIndex(idx);
                  handleSeek(s.timeOffsetSeconds || 0);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  currentStepIndex === idx
                    ? "w-8 bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]"
                    : idx < currentStepIndex
                    ? "w-3 bg-white/40"
                    : "w-2 bg-white/10 hover:bg-white/20"
                }`}
                title={`Jump to: ${s.title}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Audio Mixing & Playback Console */}
      <div className="relative z-10 p-5 sm:p-6 rounded-[28px] bg-[#0e0e11]/90 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-4">
        {/* Scrubber Progress Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-white/40">
            <span>{formatTime(currentTime)}</span>
            <span className="text-white/60 truncate max-w-[240px] text-center font-sans tracking-wide text-xs">
              {session.title}
            </span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            id="session-progress-slider"
            type="range"
            min={0}
            max={duration || 300}
            step={0.5}
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white focus:outline-none"
          />
        </div>

        {/* Master Playback Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Speed selector */}
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <span className="hidden sm:inline mr-1 text-[10px] uppercase tracking-widest text-white/40">Speed</span>
            {[0.8, 1.0, 1.2].map((s) => (
              <button
                key={s}
                id={`btn-speed-${s}`}
                onClick={() => handleSpeedChange(s)}
                className={`px-2.5 py-1 rounded-xl text-xs font-light border transition-all ${
                  playbackSpeed === s
                    ? "bg-white/15 border-white/30 text-white shadow-sm"
                    : "bg-white/5 border-white/10 text-white/50 hover:text-white"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Center: Play/Pause Button */}
          <div className="flex items-center gap-3">
            <button
              id="btn-restart-session"
              onClick={() => handleSeek(0)}
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/10"
              title="Restart session from beginning"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              id="btn-master-play-pause"
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-[#f0f0f5] hover:bg-white text-black flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
            </button>

            <button
              id="btn-complete-early"
              onClick={triggerCompletion}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-light transition-all border border-white/10 flex items-center gap-1.5"
              title="Finish meditation & log reflection"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Complete</span>
            </button>
          </div>

          {/* Right: Dual Audio Layer Mixing (Voiceover Volume + Ambient Soundscape Volume) */}
          <div className="flex items-center gap-4 text-xs">
            {/* Voiceover Volume */}
            <div className="flex items-center gap-1.5 text-white/50">
              <Mic className="w-3.5 h-3.5 text-indigo-400" title="Voiceover Guidance Volume" />
              <input
                id="slider-voiceover-volume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={voiceVolume}
                onChange={(e) => handleVoiceVolume(parseFloat(e.target.value))}
                className="w-16 sm:w-20 h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                title="Voiceover Volume"
              />
            </div>

            {/* Ambient Soundscape Volume */}
            <div className="flex items-center gap-1.5 text-white/50">
              <Music className="w-3.5 h-3.5 text-purple-400" title="Ambient Soundscape Volume" />
              <input
                id="slider-ambient-volume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={ambientVolume}
                onChange={(e) => handleAmbientVolume(parseFloat(e.target.value))}
                className="w-16 sm:w-20 h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-purple-400"
                title="Ambient Soundscape Volume"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Post-Session Reflection & Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a0b]/80 backdrop-blur-md">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-[#0e0e11] border border-white/10 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-light text-white/90">Session Complete</h3>
              <p className="text-xs text-white/50 font-light">
                You dedicated {session.durationMinutes} mindful minutes to centering your mind and body.
              </p>
            </div>

            {/* Mood After Rating */}
            <div>
              <label className="block text-xs font-light text-white/70 mb-2">
                How do you feel right now?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  "Peaceful & Centered",
                  "Deeply Relaxed",
                  "Grounded & Clear",
                  "Rejuvenated",
                ].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMoodAfter(m)}
                    className={`p-2 rounded-xl text-xs font-light border transition-all text-center ${
                      moodAfter === m
                        ? "bg-white/15 border-white/30 text-white shadow-sm"
                        : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Reflection Note */}
            <div>
              <label className="block text-xs font-light text-white/70 mb-1.5">
                Mindful Reflection or Gratitude Note (Optional)
              </label>
              <textarea
                id="input-reflection-note"
                rows={3}
                value={reflectionNotes}
                onChange={(e) => setReflectionNotes(e.target.value)}
                placeholder="What insights or feelings arose during this meditation?..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#121215] border border-white/10 text-white placeholder-white/30 text-xs focus:outline-none focus:border-indigo-500/60 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                id="btn-save-journal-entry"
                type="button"
                onClick={handleSaveJournal}
                className="w-full px-6 py-3.5 rounded-xl bg-[#f0f0f5] hover:bg-white text-black font-medium text-xs uppercase tracking-widest transition-all shadow-[0_10px_30px_rgba(0,0,0,0.4)] flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Save to Mindfulness Journal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
