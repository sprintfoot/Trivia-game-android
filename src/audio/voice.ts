import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { LINES, type LineKey } from './lines';
import { sound } from './sound';
import { clipId, questionSpeech, render } from './voiceTexts';

const native = Capacitor.isNativePlatform();
const CLIP_BASE = `${import.meta.env.BASE_URL}voice/`;

/**
 * The game-show host's voice. Lines and questions play from natural-sounding recordings that
 * ship with the game (made with the open Kokoro voice model, see scripts/voice/). Anything
 * without a recording falls back to the device's built-in text-to-speech.
 */
class Voice {
  enabled = true;
  readQuestions = false;
  private last = new Map<LineKey, string>();
  private webVoice: SpeechSynthesisVoice | null = null;
  private clips: Set<string> | null = null;
  private cache = new Map<string, Promise<AudioBuffer | null>>();
  private stopClip: (() => void) | null = null;
  private seq = 0;

  constructor() {
    void fetch(`${CLIP_BASE}index.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((ids: string[]) => (this.clips = new Set(ids)))
      .catch(() => (this.clips = new Set()));
    if (!native && 'speechSynthesis' in window) {
      const pick = () => {
        const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
        this.webVoice =
          voices.find((v) => /natural|neural|premium|enhanced/i.test(v.name)) ??
          voices.find((v) => /google (us|uk) english/i.test(v.name)) ??
          voices.find((v) => v.lang === 'en-US') ??
          voices[0] ??
          null;
      };
      pick();
      speechSynthesis.addEventListener?.('voiceschanged', pick);
    }
  }

  get available(): boolean {
    return true;
  }

  private hasClip(text: string): boolean {
    return !!this.clips?.has(clipId(text));
  }

  /** Says a random line of the given kind, never the same one twice in a row. */
  line(key: LineKey, vars: Record<string, string | number> = {}): void {
    if (!this.enabled) return;
    const all = (LINES[key] as readonly string[]).map((t) => render(t, vars));
    let options = all.filter((t) => this.hasClip(t));
    // A name or number we have no recording for: use a line that doesn't need it.
    const anyKey = `${key}Any` as LineKey;
    if (!options.length && anyKey in LINES) options = (LINES[anyKey] as readonly string[]).filter((t) => this.hasClip(t));
    if (!options.length) options = all;
    const fresh = options.length > 1 ? options.filter((l) => l !== this.last.get(key)) : options;
    const text = fresh[Math.floor(Math.random() * fresh.length)];
    this.last.set(key, text);
    this.say(text);
  }

  /** Reads a question and its answers aloud (optional, for TV play). */
  question(prompt: string, choices: string[]): void {
    if (!this.enabled || !this.readQuestions) return;
    this.say(questionSpeech(prompt, choices), 1.05);
  }

  private load(id: string): Promise<AudioBuffer | null> {
    let p = this.cache.get(id);
    if (!p) {
      p = fetch(`${CLIP_BASE}${id}.mp3`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((b) => sound.decode(b))
        .catch(() => null);
      this.cache.set(id, p);
      // Keep memory in check on long sessions.
      if (this.cache.size > 60) this.cache.delete(this.cache.keys().next().value!);
    }
    return p;
  }

  say(text: string, rate = 1.02): void {
    if (!this.enabled) return;
    this.stop();
    const my = ++this.seq;
    if (this.hasClip(text)) {
      void this.load(clipId(text)).then((buf) => {
        if (my !== this.seq || !this.enabled) return;
        if (buf) this.stopClip = sound.playVoice(buf);
        else this.speak(text, rate);
      });
      return;
    }
    this.speak(text, rate);
  }

  /** The device's built-in text-to-speech, for anything without a recording. */
  private speak(text: string, rate: number): void {
    sound.duckFor(Math.min(9000, 600 + text.length * 65));
    if (native) {
      void TextToSpeech.stop()
        .catch(() => undefined)
        .then(() => TextToSpeech.speak({ text, lang: 'en-US', rate, pitch: 1.05, volume: 1, category: 'playback' }))
        .catch(() => undefined);
      return;
    }
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (this.webVoice) u.voice = this.webVoice;
    u.lang = this.webVoice?.lang ?? 'en-US';
    u.rate = rate;
    u.pitch = 1.05;
    speechSynthesis.speak(u);
  }

  stop(): void {
    this.seq++;
    this.stopClip?.();
    this.stopClip = null;
    if (native) void TextToSpeech.stop().catch(() => undefined);
    else if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
}

export const voice = new Voice();
