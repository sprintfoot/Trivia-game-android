// Writes every line the host can say to a JSON file: [{ id, text }].
// Usage: node scripts/voice/texts.mjs out.json
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const m = await server.ssrLoadModule('/src/audio/voiceTexts.ts');
  const texts = m.allVoiceTexts().map((text) => ({ id: m.clipId(text), text }));
  writeFileSync(process.argv[2] ?? 'voice-texts.json', JSON.stringify(texts, null, 1));
  console.log(`${texts.length} lines`);
} finally {
  await server.close();
}
