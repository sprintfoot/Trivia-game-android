import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { LINES, type LineKey } from './lines';
import { sound } from './sound';

const native = Capacitor.isNativePlatform();

/**
 * The game-show host's voice, using the device's built-in text-to-speech
 * (Android's TTS engine in the app, the browser's speech synthesis on the web).
 */
class Voice {
  enabled = true;
  readQuestions = false;
  private last = new Map<LineKey, string>();
  private webVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (!native && 'speechSynthesis' in window) {
      const pick = () => {
        const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
        // Prefer natural-sounding voices where the browser offers them.
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
    return native || 'speechSynthesis' in window;
  }

  /** Says a random line of the given kind, never the same one twice in a row. */
  line(key: LineKey, vars: Record<string, string | number> = {}): void {
    if (!this.enabled) return;
    const options = LINES[key] as readonly string[];
    const fresh = options.length > 1 ? options.filter((l) => l !== this.last.get(key)) : options;
    const text = fresh[Math.floor(Math.random() * fresh.length)];
    this.last.set(key, text);
    this.say(text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')));
  }

  /** Reads a question and its answers aloud (optional, for TV play). */
  question(prompt: string, choices: string[]): void {
    if (!this.enabled || !this.readQuestions) return;
    this.say(`${prompt} ${choices.map((c, i) => `${'ABCD'[i]}: ${c}.`).join(' ')}`, 1.05);
  }

  say(text: string, rate = 1.02): void {
    if (!this.enabled) return;
    // Rough speaking time, so the music can dip underneath.
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
    if (native) void TextToSpeech.stop().catch(() => undefined);
    else if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
}

export const voice = new Voice();
