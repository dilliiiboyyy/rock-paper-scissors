import { AppSettings } from '../types/game';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private ambienceOsc: OscillatorNode | null = null;
  private ambienceSubOsc: OscillatorNode | null = null;
  private unlocked = false;

  private masterVolume = 0.75;
  private sfxVolume = 0.85;
  private ambienceVolume = 0.35;
  private soundEnabled = true;
  private ambienceEnabled = false;

  public unlock(): void {
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.ambienceGain = this.ctx.createGain();

    this.sfxGain.connect(this.masterGain);
    this.ambienceGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.unlocked = true;
    this.applyVolumes();
    if (this.ambienceEnabled && this.soundEnabled) {
      this.startAmbience();
    }
  }

  public syncSettings(settings: Pick<AppSettings, 'masterVolume' | 'sfxVolume' | 'ambienceVolume' | 'soundEnabled' | 'ambienceEnabled'>): void {
    this.masterVolume = settings.masterVolume;
    this.sfxVolume = settings.sfxVolume;
    this.ambienceVolume = settings.ambienceVolume;
    this.soundEnabled = settings.soundEnabled;
    this.ambienceEnabled = settings.ambienceEnabled;

    this.applyVolumes();

    if (this.unlocked) {
      if (this.soundEnabled && this.ambienceEnabled) {
        this.startAmbience();
      } else {
        this.stopAmbience();
      }
    }
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.soundEnabled ? this.masterVolume : 0, now, 0.03);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume, now, 0.03);
    this.ambienceGain.gain.setTargetAtTime(
      this.ambienceEnabled && this.soundEnabled ? this.ambienceVolume * 0.14 : 0,
      now,
      0.08
    );
  }

  private startAmbience(): void {
    if (!this.ctx || !this.ambienceGain || this.ambienceOsc) return;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 190;
    filter.connect(this.ambienceGain);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = 65.41; // C2 warm hum

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 98.0; // G2 fifth

    osc1.connect(filter);
    osc2.connect(filter);
    osc1.start();
    osc2.start();

    this.ambienceOsc = osc1;
    this.ambienceSubOsc = osc2;
  }

  private stopAmbience(): void {
    if (this.ambienceOsc) {
      try {
        this.ambienceOsc.stop();
        this.ambienceOsc.disconnect();
      } catch {
        // ignore
      }
      this.ambienceOsc = null;
    }
    if (this.ambienceSubOsc) {
      try {
        this.ambienceSubOsc.stop();
        this.ambienceSubOsc.disconnect();
      } catch {
        // ignore
      }
      this.ambienceSubOsc = null;
    }
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType = 'triangle',
    gainLevel = 0.25,
    delaySec = 0,
    slideToFreq?: number
  ): void {
    if (!this.unlocked || !this.ctx || !this.sfxGain || !this.soundEnabled) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    const start = this.ctx.currentTime + delaySec;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideToFreq, start + durationSec);
    }

    env.gain.setValueAtTime(0.0001, start);
    env.gain.linearRampToValueAtTime(gainLevel, start + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);

    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(start);
    osc.stop(start + durationSec + 0.02);
  }

  public playCountdownTick(step: 3 | 2 | 1 | 'SHOOT'): void {
    if (step === 'SHOOT') {
      this.playTone(659.25, 0.14, 'triangle', 0.34, 0);
      this.playTone(880, 0.22, 'sine', 0.28, 0.05);
    } else {
      const pitch = step === 3 ? 330 : step === 2 ? 392 : 440;
      this.playTone(pitch, 0.11, 'triangle', 0.22);
    }
  }

  public playGestureLocked(): void {
    this.playTone(523.25, 0.07, 'sine', 0.2, 0);
    this.playTone(783.99, 0.1, 'sine', 0.18, 0.05);
  }

  public playReveal(): void {
    this.playTone(220, 0.09, 'sawtooth', 0.12, 0, 440);
  }

  public playVictory(): void {
    this.playTone(523.25, 0.14, 'triangle', 0.26, 0);
    this.playTone(659.25, 0.14, 'triangle', 0.26, 0.09);
    this.playTone(783.99, 0.28, 'triangle', 0.3, 0.18);
  }

  public playDefeat(): void {
    this.playTone(293.66, 0.16, 'triangle', 0.24, 0);
    this.playTone(220, 0.3, 'sawtooth', 0.14, 0.12);
  }

  public playDraw(): void {
    this.playTone(392, 0.12, 'sine', 0.18, 0);
    this.playTone(392, 0.15, 'sine', 0.14, 0.11);
  }

  public playStreakCelebration(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => this.playTone(n, 0.15, 'triangle', 0.22, idx * 0.07));
  }

  public playTournamentChampion(): void {
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    chord.forEach((n, idx) => this.playTone(n, 0.32, 'triangle', 0.24, idx * 0.08));
  }

  public dispose(): void {
    this.stopAmbience();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.unlocked = false;
  }
}

export const audioManager = new AudioManager();
