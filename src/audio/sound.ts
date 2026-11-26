/**
 * All game audio is synthesised live with the Web Audio API: every sound is original,
 * so there are no licensing questions, and nothing has to be downloaded.
 * Recorded samples can be layered in later through playSample() without touching game code.
 */

type Wave = OscillatorType;

interface ToneOpts {
  freq: number;
  to?: number;
  type?: Wave;
  dur: number;
  vol?: number;
  attack?: number;
  at?: number;
  detune?: number;
  filter?: number;
  bus?: GainNode;
}

interface NoiseOpts {
  dur: number;
  vol?: number;
  at?: number;
  filter: BiquadFilterType;
  freq: number;
  to?: number;
  q?: number;
  bus?: GainNode;
}

export type MusicMode = 'off' | 'lobby' | 'question' | 'results';

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// A minor: Am - F - C - G. Bass roots and chord tones as MIDI notes.
const PROGRESSION = [
  { root: 45, chord: [57, 60, 64] },
  { root: 41, chord: [53, 57, 60] },
  { root: 48, chord: [55, 60, 64] },
  { root: 43, chord: [55, 59, 62] },
];
const ARP = [0, 1, 2, 1, 0, 2, 1, 2];

export class Sound {
  enabled = true;
  musicEnabled = true;

  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private musicDuck!: GainNode;
  private noiseBuffer!: AudioBuffer;
  private samples = new Map<string, AudioBuffer>();

  private musicMode: MusicMode = 'off';
  private intensity = 0;
  private step = 0;
  private nextStepTime = 0;
  private scheduler: number | null = null;

  /** Must be called from a user gesture (tap) to satisfy mobile autoplay rules. */
  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx({ latencyHint: 'interactive' });
      this.ctx = ctx;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 12;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      comp.connect(ctx.destination);

      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(comp);

      this.sfxBus = ctx.createGain();
      this.sfxBus.connect(this.master);

      this.musicDuck = ctx.createGain();
      this.musicDuck.connect(this.master);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = this.musicEnabled ? 0.32 : 0;
      this.sfxBus.gain.value = this.enabled ? 1 : 0;
      this.musicBus.connect(this.musicDuck);

      const len = ctx.sampleRate;
      this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (this.ctx) this.sfxBus.gain.value = on ? 1 : 0;
  }

  setMusicEnabled(on: boolean): void {
    this.musicEnabled = on;
    if (this.ctx) this.musicBus.gain.setTargetAtTime(on ? 0.32 : 0, this.ctx.currentTime, 0.1);
  }

  // ---------- building blocks ----------

  private get now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  private tone(o: ToneOpts): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = o.at ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    if (o.detune) osc.detune.value = o.detune;

    const g = ctx.createGain();
    const vol = o.vol ?? 0.3;
    const attack = o.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);

    let node: AudioNode = osc;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.filter;
      osc.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(o.bus ?? this.sfxBus);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  private noise(o: NoiseOpts): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = o.at ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = o.filter;
    f.Q.value = o.q ?? 1;
    f.frequency.setValueAtTime(o.freq, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f).connect(g).connect(o.bus ?? this.sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + o.dur + 0.05);
  }

  /** Briefly lowers the music so a sound effect cuts through. */
  private duck(amount = 0.35, hold = 0.5): void {
    if (!this.ctx || this.held) return;
    const g = this.musicDuck.gain;
    const t = this.now;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(amount, t, 0.02);
    g.setTargetAtTime(1, t + hold, 0.25);
  }

  /** Dips the music for a while (e.g. while the host is talking). */
  duckFor(ms: number): void {
    this.duck(0.3, ms / 1000);
  }

  private held = false;

  /** Silences the background music (e.g. while a Name That Tune melody plays). */
  holdMusic(on: boolean): void {
    this.held = on;
    if (!this.ctx) return;
    const g = this.musicDuck.gain;
    g.cancelScheduledValues(this.now);
    g.setTargetAtTime(on ? 0.0001 : 1, this.now, on ? 0.05 : 0.3);
  }

  /**
   * Plays a melody of [frequency | null (rest), beats] pairs with a soft music-box lead.
   * Returns a stop() that cuts it short. `onEnd` fires when the phrase finishes naturally.
   */
  playMelody(notes: [number | null, number][], bpm: number, onEnd?: () => void): () => void {
    const ctx = this.ctx;
    if (!ctx) return () => {};
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(this.sfxBus);
    // A short echo for a bit of space.
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.22;
    const fb = ctx.createGain();
    fb.gain.value = 0.22;
    out.connect(delay).connect(fb).connect(delay);
    fb.connect(this.sfxBus);

    const beat = 60 / bpm;
    let t = ctx.currentTime + 0.08;
    const oscs: OscillatorNode[] = [];
    for (const [freq, beats] of notes) {
      const dur = beats * beat;
      if (freq) {
        const len = Math.max(0.12, dur * 0.92);
        const voices: [OscillatorType, number, number][] = [['triangle', freq, 0.32], ['sine', freq * 2, 0.07], ['sine', freq / 2, 0.08]];
        for (const [type, f, vol] of voices) {
          const o = ctx.createOscillator();
          o.type = type;
          o.frequency.value = f;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
          g.gain.exponentialRampToValueAtTime(vol * 0.55, t + Math.min(0.15, len * 0.5));
          g.gain.exponentialRampToValueAtTime(0.0001, t + len);
          o.connect(g).connect(out);
          o.start(t);
          o.stop(t + len + 0.05);
          oscs.push(o);
        }
      }
      t += dur;
    }
    const endTimer = window.setTimeout(() => onEnd?.(), (t - ctx.currentTime) * 1000);
    return () => {
      window.clearTimeout(endTimer);
      const now = ctx.currentTime;
      out.gain.setTargetAtTime(0.0001, now, 0.03);
      fb.gain.setTargetAtTime(0.0001, now, 0.03);
      for (const o of oscs) {
        try { o.stop(now + 0.15); } catch { /* already stopped */ }
      }
    };
  }

  async loadSample(name: string, url: string): Promise<void> {
    if (!this.ctx) return;
    const res = await fetch(url);
    this.samples.set(name, await this.ctx.decodeAudioData(await res.arrayBuffer()));
  }

  playSample(name: string, vol = 0.8): boolean {
    const buf = this.samples.get(name);
    if (!this.ctx || !buf) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(this.sfxBus);
    src.start();
    return true;
  }

  // ---------- sound effects ----------

  click(): void {
    this.tone({ freq: 1400, to: 700, type: 'triangle', dur: 0.06, vol: 0.18 });
  }

  toggle(on: boolean): void {
    this.tone({ freq: on ? 660 : 520, to: on ? 990 : 390, type: 'square', dur: 0.08, vol: 0.08, filter: 3000 });
  }

  /** Bright rising chime for the title screen and joining. */
  chime(): void {
    const t = this.now;
    [72, 76, 79, 84].forEach((n, i) => {
      this.tone({ freq: midi(n), type: 'triangle', dur: 0.5, vol: 0.16, at: t + i * 0.06 });
      this.tone({ freq: midi(n + 12), type: 'sine', dur: 0.35, vol: 0.06, at: t + i * 0.06 });
    });
  }

  /** Mechanical clack of the wheel passing a peg; rate rises with speed. */
  wheelTick(speed: number): void {
    const t = this.now;
    this.noise({ dur: 0.03, vol: 0.22, filter: 'bandpass', freq: 3200 + speed * 900, q: 4, at: t });
    this.tone({ freq: 900 + speed * 300, type: 'square', dur: 0.025, vol: 0.05, filter: 2500, at: t });
  }

  /** Air whoosh for cards sweeping in. */
  whoosh(): void {
    this.noise({ dur: 0.35, vol: 0.2, filter: 'bandpass', freq: 400, to: 3500, q: 1.4 });
    this.noise({ dur: 0.3, vol: 0.08, filter: 'highpass', freq: 5000, to: 9000 });
  }

  /** Deep boom plus rising sweep when a category is revealed. */
  categorySting(): void {
    const t = this.now;
    this.duck(0.2, 1);
    this.tone({ freq: 110, to: 38, type: 'sine', dur: 0.7, vol: 0.55, at: t });
    this.noise({ dur: 0.5, vol: 0.18, filter: 'lowpass', freq: 1800, to: 200, at: t });
    [57, 64, 69, 76].forEach((n, i) => {
      this.tone({ freq: midi(n), type: 'sawtooth', dur: 0.9, vol: 0.07, filter: 2400, at: t + 0.05 + i * 0.07, detune: -8 });
      this.tone({ freq: midi(n), type: 'sawtooth', dur: 0.9, vol: 0.07, filter: 2400, at: t + 0.05 + i * 0.07, detune: 8 });
    });
  }

  /** Lock-in thunk when a player taps an answer. */
  lockIn(): void {
    const t = this.now;
    this.tone({ freq: 220, to: 90, type: 'sine', dur: 0.18, vol: 0.45, at: t });
    this.tone({ freq: 880, type: 'square', dur: 0.06, vol: 0.06, filter: 2000, at: t });
    this.noise({ dur: 0.08, vol: 0.15, filter: 'bandpass', freq: 1500, q: 2, at: t });
  }

  /** Clock tick for the last seconds; higher and louder as urgency rises (0..1). */
  clockTick(urgency: number): void {
    const t = this.now;
    this.tone({ freq: 1500 + urgency * 700, type: 'square', dur: 0.05, vol: 0.06 + urgency * 0.06, filter: 4000, at: t });
    this.noise({ dur: 0.03, vol: 0.1, filter: 'highpass', freq: 6000, at: t });
  }

  /** Magic shimmer when a 50/50 hint knocks out two answers. */
  hint(): void {
    const t = this.now;
    [84, 88, 91, 96, 100].forEach((n, i) =>
      this.tone({ freq: midi(n), type: 'sine', dur: 0.25, vol: 0.06, at: t + i * 0.035 }),
    );
    this.noise({ dur: 0.4, vol: 0.12, filter: 'bandpass', freq: 2000, to: 7000, q: 2, at: t });
    this.tone({ freq: 300, to: 120, type: 'triangle', dur: 0.25, vol: 0.15, at: t + 0.15 });
  }

  /** Soft card-flip for picture tiles turning over. */
  tileFlip(): void {
    const t = this.now;
    this.noise({ dur: 0.07, vol: 0.1, filter: 'bandpass', freq: 2400 + Math.random() * 1200, q: 3, at: t });
    this.tone({ freq: 500 + Math.random() * 200, to: 900, type: 'triangle', dur: 0.06, vol: 0.04, at: t });
  }

  /** Bubbly pop for each emoji clue appearing, rising in pitch. */
  pop(n: number): void {
    const t = this.now;
    this.tone({ freq: midi(72 + n * 4), to: midi(84 + n * 4), type: 'sine', dur: 0.12, vol: 0.18, at: t });
    this.noise({ dur: 0.04, vol: 0.06, filter: 'highpass', freq: 4000, at: t });
  }

  /** Rising major arpeggio with sparkle. */
  correct(): void {
    const t = this.now;
    this.duck(0.25, 0.9);
    [60, 64, 67, 72, 76].forEach((n, i) => {
      this.tone({ freq: midi(n), type: 'square', dur: 0.32, vol: 0.09, filter: 3500, at: t + i * 0.055 });
      this.tone({ freq: midi(n + 12), type: 'sine', dur: 0.4, vol: 0.08, at: t + i * 0.055 });
    });
    for (let i = 0; i < 6; i++) {
      this.tone({ freq: midi(88 + ((i * 5) % 12)), type: 'sine', dur: 0.18, vol: 0.04, at: t + 0.28 + i * 0.045 });
    }
    this.noise({ dur: 0.6, vol: 0.05, filter: 'highpass', freq: 7000, at: t + 0.25 });
  }

  /** Detuned descending buzzer. */
  wrong(): void {
    const t = this.now;
    this.duck(0.25, 0.8);
    this.tone({ freq: 196, to: 110, type: 'sawtooth', dur: 0.55, vol: 0.14, filter: 1400, at: t, detune: -15 });
    this.tone({ freq: 185, to: 104, type: 'sawtooth', dur: 0.55, vol: 0.14, filter: 1400, at: t, detune: 15 });
    this.tone({ freq: 70, to: 40, type: 'sine', dur: 0.4, vol: 0.4, at: t });
  }

  /** Time ran out: falling slide plus gong-ish thud. */
  timeUp(): void {
    const t = this.now;
    this.duck(0.25, 0.8);
    this.tone({ freq: 660, to: 120, type: 'triangle', dur: 0.6, vol: 0.18, at: t });
    this.tone({ freq: 82, to: 55, type: 'sine', dur: 0.9, vol: 0.4, at: t + 0.05 });
  }

  /** Short cash-register-ish sparkle for points ticking up. */
  points(): void {
    const t = this.now;
    this.tone({ freq: midi(91), type: 'sine', dur: 0.12, vol: 0.06, at: t });
    this.tone({ freq: midi(96), type: 'sine', dur: 0.16, vol: 0.06, at: t + 0.05 });
  }

  /** Extra punch for streaks. */
  streak(level: number): void {
    const t = this.now;
    const base = 72 + Math.min(level, 6) * 2;
    [0, 4, 7, 12].forEach((iv, i) =>
      this.tone({ freq: midi(base + iv), type: 'sawtooth', dur: 0.2, vol: 0.06, filter: 5000, at: t + 0.45 + i * 0.04 }),
    );
  }

  /** Big drum roll into a brass-ish fanfare for the final results. */
  fanfare(): void {
    const t = this.now;
    this.duck(0.15, 2.5);
    for (let i = 0; i < 14; i++) {
      this.noise({ dur: 0.08, vol: 0.05 + i * 0.012, filter: 'bandpass', freq: 900, q: 1.2, at: t + i * 0.045 });
    }
    const start = t + 0.65;
    const chords = [
      [60, 64, 67],
      [62, 65, 69],
      [64, 67, 72],
    ];
    chords.forEach((ch, i) =>
      ch.forEach((n) => {
        const dur = i === 2 ? 1.6 : 0.28;
        this.tone({ freq: midi(n), type: 'sawtooth', dur, vol: 0.07, filter: 2800, attack: 0.03, at: start + i * 0.22, detune: -6 });
        this.tone({ freq: midi(n), type: 'sawtooth', dur, vol: 0.07, filter: 2800, attack: 0.03, at: start + i * 0.22, detune: 6 });
      }),
    );
    this.tone({ freq: 65, to: 40, type: 'sine', dur: 1.2, vol: 0.5, at: start + 0.44 });
    this.noise({ dur: 1.6, vol: 0.12, filter: 'highpass', freq: 6000, at: start + 0.44 });
  }

  /** Crackle-pop for a firework burst. */
  firework(): void {
    const t = this.now + Math.random() * 0.05;
    this.noise({ dur: 0.5, vol: 0.12, filter: 'lowpass', freq: 1200, to: 150, at: t });
    for (let i = 0; i < 5; i++) {
      this.noise({ dur: 0.04, vol: 0.05, filter: 'highpass', freq: 5000, at: t + 0.1 + Math.random() * 0.4 });
    }
  }

  // ---------- music ----------

  setMusic(mode: MusicMode): void {
    if (mode === this.musicMode) return;
    this.musicMode = mode;
    if (mode === 'off') {
      if (this.scheduler !== null) window.clearInterval(this.scheduler);
      this.scheduler = null;
      return;
    }
    if (!this.ctx) return;
    if (this.scheduler === null) {
      this.step = 0;
      this.nextStepTime = this.now + 0.1;
      this.scheduler = window.setInterval(() => this.schedule(), 25);
    }
  }

  /** 0 = calm, 1 = final seconds. Speeds up and thickens the question music. */
  setIntensity(v: number): void {
    this.intensity = Math.min(1, Math.max(0, v));
  }

  private get bpm(): number {
    switch (this.musicMode) {
      case 'lobby':
        return 100;
      case 'results':
        return 112;
      default:
        return 118 + this.intensity * 34;
    }
  }

  private schedule(): void {
    if (!this.ctx) return;
    while (this.nextStepTime < this.now + 0.12) {
      this.playStep(this.step, this.nextStepTime);
      this.nextStepTime += 60 / this.bpm / 4;
      this.step = (this.step + 1) % 64;
    }
  }

  private playStep(step: number, t: number): void {
    const bar = Math.floor(step / 16) % PROGRESSION.length;
    const { root, chord } = PROGRESSION[bar];
    const s = step % 16;
    const bus = this.musicBus;
    const q = this.musicMode === 'question';
    const lobby = this.musicMode === 'lobby';

    // Bass on 8ths, octave bounce.
    if (s % 2 === 0) {
      const n = s % 4 === 2 ? root + 12 : root;
      this.tone({ freq: midi(n), type: 'sawtooth', dur: 0.2, vol: 0.18, filter: 380 + this.intensity * 500, at: t, bus });
    }
    // Arpeggio on 16ths (8ths in the lobby).
    if (!lobby || s % 2 === 0) {
      const n = chord[ARP[s % ARP.length]] + 12;
      this.tone({ freq: midi(n), type: 'square', dur: 0.12, vol: 0.05, filter: 1600 + this.intensity * 2400, at: t, bus });
    }
    // Pad at the start of each bar.
    if (s === 0) {
      chord.forEach((n) => this.tone({ freq: midi(n), type: 'triangle', dur: 1.8, vol: 0.05, attack: 0.3, at: t, bus }));
    }
    if (q || this.musicMode === 'results') {
      // Kick on quarters.
      if (s % 4 === 0) this.tone({ freq: 140, to: 45, type: 'sine', dur: 0.2, vol: 0.5, at: t, bus });
      // Off-beat hats; 16ths when tension is high.
      if (s % 4 === 2 || (this.intensity > 0.6 && s % 2 === 1)) {
        this.noise({ dur: 0.04, vol: 0.12, filter: 'highpass', freq: 8000, at: t, bus });
      }
      // Clap on 2 and 4.
      if (s === 4 || s === 12) this.noise({ dur: 0.12, vol: 0.18, filter: 'bandpass', freq: 1400, q: 0.8, at: t, bus });
    }
  }
}

export const sound = new Sound();
