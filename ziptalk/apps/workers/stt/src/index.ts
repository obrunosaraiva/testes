import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { EvolutionClient } from "@ziptalk/evolution-client";
import {
  sttJobSchema,
  type SttJob,
  TRANSCRIPTION_FOOTER,
} from "@ziptalk/shared";
import { GroqSTT } from "./groq-stt.js";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_API_KEY = required("EVOLUTION_API_KEY");
const GROQ_API_KEY = required("GROQ_API_KEY");

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
const evolution = new EvolutionClient({
  baseUrl: EVOLUTION_API_URL,
  apiKey: EVOLUTION_API_KEY,
});
const stt = new GroqSTT(GROQ_API_KEY);

const worker = new Worker<SttJob>(
  "stt-queue",
  async (job: Job<SttJob>) => {
    const data = sttJobSchema.parse(job.data);
    console.log(`[stt] job ${job.id} :: msg=${data.messageId} dur=${data.durationSeconds}s`);

    // 1. Baixa o áudio da Evolution (base64)
    const media = await evolution.getMediaBase64(data.evolutionInstance, data.messageId);
    const buffer = Buffer.from(media.base64, "base64");

    // 2. Transcreve via Groq Whisper
    const t0 = Date.now();
    const result = await stt.transcribe({
      audioBuffer: buffer,
      mimeType: media.mimetype,
    });
    const elapsed = Date.now() - t0;
    console.log(`[stt] transcribed in ${elapsed}ms lang=${result.language} chars=${result.text.length}`);

    // 3. Posta de volta no WhatsApp como reply à mensagem original
    const reply = `${result.text}\n\n${TRANSCRIPTION_FOOTER}`;
    await evolution.sendText(data.evolutionInstance, {
      number: data.fromJid.split("@")[0],
      text: reply,
      quoted: {
        key: { id: data.messageId, remoteJid: data.fromJid, fromMe: data.isFromMe },
      },
    });

    return { transcribed: true, language: result.language, elapsedMs: elapsed };
  },
  { connection, concurrency: 4 },
);

worker.on("completed", (job) => console.log(`[stt] ✓ ${job.id}`));
worker.on("failed", (job, err) => console.error(`[stt] ✗ ${job?.id}:`, err));

console.log("[stt] worker running, listening on stt-queue");
