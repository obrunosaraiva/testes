/**
 * Smoke test isolado do Groq Whisper.
 * Valida que a chave funciona, o SDK responde e a estrutura é esperada.
 */

import { readFileSync } from "node:fs";
import { GroqSTT } from "./groq-stt.js";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.error("✗ Missing GROQ_API_KEY");
  process.exit(1);
}

const audioPath = process.argv[2] ?? "/usr/lib/libreoffice/share/gallery/sounds/apert.wav";
console.log(`▶ Reading audio: ${audioPath}`);
const buffer = readFileSync(audioPath);
console.log(`  ${(buffer.length / 1024).toFixed(2)} KB`);

const stt = new GroqSTT(GROQ_API_KEY);

console.log(`▶ Calling Groq Whisper Large v3…`);
const t0 = Date.now();
try {
  const result = await stt.transcribe({
    audioBuffer: buffer,
    mimeType: "audio/wav",
  });
  const elapsed = Date.now() - t0;
  console.log(`✓ OK in ${elapsed}ms`);
  console.log(`  language: ${result.language}`);
  console.log(`  duration: ${result.durationSeconds}s`);
  console.log(`  text:     "${result.text}"`);
  console.log(`\n✅ Groq integration works. Key is valid.`);
} catch (err) {
  console.error(`✗ Failed in ${Date.now() - t0}ms:`, err);
  process.exit(1);
}
