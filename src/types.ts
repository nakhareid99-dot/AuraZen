export type ImageResolution = "1K" | "2K" | "4K";
export type AspectRatio = "16:9" | "1:1" | "4:3" | "9:16";
export type GeminiVoiceName = "Kore" | "Puck" | "Aoede" | "Zephyr" | "Fenrir" | "Charon";
export type GeminiModelType = "flash" | "pro" | "lite";

export interface BreathingGuideConfig {
  patternName: string;
  inhale: number;
  hold1: number;
  exhale: number;
  hold2: number;
  description: string;
}

export interface VisualConceptConfig {
  prompt: string;
  aestheticDescription: string;
  palette: string[];
}

export interface AmbientSoundscapeConfig {
  name: string;
  solfeggioHz: number;
  binauralHz: number;
  natureElement: "ocean" | "rain" | "forest-stream" | "tibetan-bowl" | "cosmic-drone" | "silence";
  description: string;
}

export interface MeditationStep {
  timeOffsetSeconds: number;
  phase: string;
  title: string;
  narration: string;
  visualFocus: string;
  bellChime: boolean;
  audioUrl?: string; // Step-specific TTS audio if synthesized
}

export interface MeditationSession {
  id: string;
  title: string;
  subtitle: string;
  intention: string;
  affirmation: string;
  durationMinutes: number;
  durationSeconds: number;
  breathingGuide: BreathingGuideConfig;
  visualConcept: VisualConceptConfig;
  ambientSoundscape: AmbientSoundscapeConfig;
  steps: MeditationStep[];
  imageUrl?: string;
  imageResolution?: ImageResolution;
  aspectRatio?: AspectRatio;
  fullAudioUrl?: string;
  voiceName?: GeminiVoiceName;
  createdAt?: string;
  isCustom?: boolean;
  isFavorite?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  suggestedSessionParams?: Partial<MeditationSessionCreateParams>;
}

export interface MeditationSessionCreateParams {
  theme: string;
  durationMinutes: number;
  goal: string;
  breathingPattern: "box" | "relax" | "calm" | "deep";
  visualStyle: string;
  voicePreference: GeminiVoiceName;
  userNotes: string;
  aspectRatio: AspectRatio;
  imageResolution: ImageResolution;
  modelType: GeminiModelType;
  ambientType: "ocean" | "rain" | "forest-stream" | "tibetan-bowl" | "cosmic-drone";
  solfeggioHz: number;
}

export interface JournalEntry {
  id: string;
  sessionId: string;
  sessionTitle: string;
  completedAt: string;
  durationMinutes: number;
  rating: number;
  moodBefore?: string;
  moodAfter?: string;
  notes?: string;
}

export interface UserStats {
  totalMinutes: number;
  totalSessions: number;
  currentStreak: number;
  lastMeditationDate: string | null;
}
