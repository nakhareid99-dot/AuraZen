// Web Audio API Synthesizer for Ambient Soundscapes, Solfeggio Frequencies, Binaural Beats, and Tibetan Bells

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private solfeggioOsc: OscillatorNode | null = null;
  private solfeggioGain: GainNode | null = null;

  private binauralLeftOsc: OscillatorNode | null = null;
  private binauralRightOsc: OscillatorNode | null = null;
  private binauralGain: GainNode | null = null;

  private noiseNode: AudioNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private currentAmbientType = "ocean";
  private currentSolfeggio = 432;
  private currentVolume = 0.5;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setMasterVolume(vol: number) {
    this.currentVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.currentVolume, this.ctx.currentTime, 0.05);
    }
  }

  public setSolfeggioFrequency(freq: number) {
    this.currentSolfeggio = freq;
    if (this.ctx && this.solfeggioOsc) {
      this.solfeggioOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
    }
    if (this.ctx && this.binauralLeftOsc && this.binauralRightOsc) {
      this.binauralLeftOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
      this.binauralRightOsc.frequency.setTargetAtTime(freq + 7.83, this.ctx.currentTime, 0.1);
    }
  }

  public startAmbient(type: string = "ocean", solfeggioHz: number = 432, binauralHz: number = 7.83) {
    this.initContext();
    if (!this.ctx) return;

    this.stopAmbient();
    this.currentAmbientType = type;
    this.currentSolfeggio = solfeggioHz;
    this.isPlaying = true;

    // Master gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // 1. Solfeggio Pure Tone Generator (Subtle, warm sine tone)
    if (solfeggioHz > 0) {
      this.solfeggioOsc = this.ctx.createOscillator();
      this.solfeggioOsc.type = "sine";
      this.solfeggioOsc.frequency.setValueAtTime(solfeggioHz, this.ctx.currentTime);

      this.solfeggioGain = this.ctx.createGain();
      this.solfeggioGain.gain.setValueAtTime(0.04, this.ctx.currentTime); // Gentle background tone

      this.solfeggioOsc.connect(this.solfeggioGain);
      this.solfeggioGain.connect(this.masterGain);
      this.solfeggioOsc.start();
    }

    // 2. Binaural Beats Engine (Stereo panner)
    if (binauralHz > 0 && this.ctx.createStereoPanner) {
      const baseFreq = 180; // Grounding base frequency for binaural comfort
      this.binauralLeftOsc = this.ctx.createOscillator();
      this.binauralLeftOsc.type = "sine";
      this.binauralLeftOsc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);

      this.binauralRightOsc = this.ctx.createOscillator();
      this.binauralRightOsc.type = "sine";
      this.binauralRightOsc.frequency.setValueAtTime(baseFreq + binauralHz, this.ctx.currentTime);

      const pannerLeft = this.ctx.createStereoPanner();
      pannerLeft.pan.setValueAtTime(-1, this.ctx.currentTime);

      const pannerRight = this.ctx.createStereoPanner();
      pannerRight.pan.setValueAtTime(1, this.ctx.currentTime);

      this.binauralGain = this.ctx.createGain();
      this.binauralGain.gain.setValueAtTime(0.03, this.ctx.currentTime);

      this.binauralLeftOsc.connect(pannerLeft);
      pannerLeft.connect(this.binauralGain);

      this.binauralRightOsc.connect(pannerRight);
      pannerRight.connect(this.binauralGain);

      this.binauralGain.connect(this.masterGain);

      this.binauralLeftOsc.start();
      this.binauralRightOsc.start();
    }

    // 3. Texture / Soundscape generation
    this.createTextureSound(type);
  }

  private createTextureSound(type: string) {
    if (!this.ctx || !this.masterGain) return;

    if (type === "silence") return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Generate Pink / Brown noise for natural texture
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseGain = this.ctx.createGain();

    if (type === "ocean") {
      // Ocean: Low-pass filter modulated by slow LFO sine wave (0.12 Hz ~ 8 second wave cycle)
      this.noiseFilter.type = "lowpass";
      this.noiseFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
      this.noiseFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

      this.noiseGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

      // LFO for wave modulation
      this.lfoOsc = this.ctx.createOscillator();
      this.lfoOsc.type = "sine";
      this.lfoOsc.frequency.setValueAtTime(0.12, this.ctx.currentTime); // ~8 sec ocean swell

      this.lfoGain = this.ctx.createGain();
      this.lfoGain.gain.setValueAtTime(300, this.ctx.currentTime); // Modulate filter between 150Hz and 750Hz

      this.lfoOsc.connect(this.lfoGain);
      this.lfoGain.connect(this.noiseFilter.frequency);
      this.lfoOsc.start();
    } else if (type === "rain") {
      // Gentle rain: Bandpass filter around 1200Hz with soft hiss
      this.noiseFilter.type = "bandpass";
      this.noiseFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      this.noiseFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);
      this.noiseGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    } else if (type === "forest-stream") {
      // Stream: High-pass and resonance
      this.noiseFilter.type = "bandpass";
      this.noiseFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
      this.noiseFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);
      this.noiseGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
    } else if (type === "cosmic-drone" || type === "tibetan-bowl") {
      // Warm low drone
      this.noiseFilter.type = "lowpass";
      this.noiseFilter.frequency.setValueAtTime(220, this.ctx.currentTime);
      this.noiseGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    }

    whiteNoise.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);
    whiteNoise.start();
    this.noiseNode = whiteNoise;
  }

  public stopAmbient() {
    try {
      if (this.solfeggioOsc) {
        this.solfeggioOsc.stop();
        this.solfeggioOsc.disconnect();
        this.solfeggioOsc = null;
      }
      if (this.binauralLeftOsc) {
        this.binauralLeftOsc.stop();
        this.binauralLeftOsc.disconnect();
        this.binauralLeftOsc = null;
      }
      if (this.binauralRightOsc) {
        this.binauralRightOsc.stop();
        this.binauralRightOsc.disconnect();
        this.binauralRightOsc = null;
      }
      if (this.noiseNode) {
        (this.noiseNode as AudioBufferSourceNode).stop?.();
        this.noiseNode.disconnect();
        this.noiseNode = null;
      }
      if (this.lfoOsc) {
        this.lfoOsc.stop();
        this.lfoOsc.disconnect();
        this.lfoOsc = null;
      }
    } catch {
      // Ignore cleanup error if already stopped
    }
    this.isPlaying = false;
  }

  // Meditative Bell Chime / Tibetan Singing Bowl Strike
  public playBellChime(freq = 528) {
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const chimeGain = this.ctx.createGain();
    chimeGain.connect(this.ctx.destination);

    // Harmonic partials for realistic singing bowl bell
    const partials = [
      { ratio: 1.0, gain: 0.35, decay: 5.5 },
      { ratio: 2.02, gain: 0.2, decay: 4.2 },
      { ratio: 3.01, gain: 0.12, decay: 3.0 },
      { ratio: 4.25, gain: 0.06, decay: 2.2 },
    ];

    chimeGain.gain.setValueAtTime(1.0 * this.currentVolume, now);

    partials.forEach((p) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const pGain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * p.ratio, now);

      pGain.gain.setValueAtTime(0, now);
      pGain.gain.linearRampToValueAtTime(p.gain, now + 0.02); // Fast strike attack
      pGain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay); // Natural exponential decay

      osc.connect(pGain);
      pGain.connect(chimeGain);

      osc.start(now);
      osc.stop(now + p.decay + 0.1);
    });
  }

  public getStatus() {
    return {
      isPlaying: this.isPlaying,
      type: this.currentAmbientType,
      solfeggioHz: this.currentSolfeggio,
      volume: this.currentVolume,
    };
  }
}

export const ambientSynth = new AmbientAudioEngine();
