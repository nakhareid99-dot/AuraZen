// Audio playback manager for Gemini TTS audio streams

class TTSVoicePlayer {
  private audio: HTMLAudioElement | null = null;
  private onTimeUpdateCallback: ((currentTime: number, duration: number) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;
  private isMuted = false;
  private volume = 1.0;
  private playbackRate = 1.0;

  constructor() {
    if (typeof window !== "undefined") {
      this.audio = new Audio();
      this.audio.addEventListener("timeupdate", () => {
        if (this.audio && this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback(this.audio.currentTime, this.audio.duration || 0);
        }
      });
      this.audio.addEventListener("ended", () => {
        if (this.onEndedCallback) {
          this.onEndedCallback();
        }
      });
    }
  }

  public setCallbacks(
    onTimeUpdate: (currentTime: number, duration: number) => void,
    onEnded: () => void
  ) {
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onEndedCallback = onEnded;
  }

  public loadAudio(url: string, autoPlay = false) {
    if (!this.audio) return;
    this.audio.src = url;
    this.audio.playbackRate = this.playbackRate;
    this.audio.volume = this.isMuted ? 0 : this.volume;
    if (autoPlay) {
      this.audio.play().catch((e) => console.warn("Autoplay deferred:", e));
    }
  }

  public play() {
    if (this.audio && this.audio.src) {
      return this.audio.play();
    }
    return Promise.resolve();
  }

  public pause() {
    if (this.audio) {
      this.audio.pause();
    }
  }

  public seek(seconds: number) {
    if (this.audio) {
      this.audio.currentTime = seconds;
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audio) {
      this.audio.volume = this.isMuted ? 0 : this.volume;
    }
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
  }

  public isPlaying(): boolean {
    return !!(this.audio && !this.audio.paused && !this.audio.ended && this.audio.readyState > 2);
  }

  public getDuration(): number {
    return this.audio?.duration || 0;
  }

  public getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }
}

export const ttsPlayer = new TTSVoicePlayer();
