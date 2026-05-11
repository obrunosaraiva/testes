/**
 * Spike end-to-end: cria uma instância na Evolution API,
 * imprime o QR code para o usuário escanear, e fica ouvindo
 * mensagens. Quando chega um áudio, baixa, transcreve via
 * Groq Whisper e responde no WhatsApp com o texto.
 *
 * Uso:
 *   1. pnpm evolution:up (na raiz)
 *   2. cp ../../.env.example ../../.env (preencher chaves)
 *   3. pnpm --filter @ziptalk/worker-stt spike
 *   4. Escanear o QR que aparece no terminal
 *   5. Mandar um áudio pro número conectado e ver a transcrição voltar
 */

import { createServer } from "node:http";
import { EvolutionClient } from "@ziptalk/evolution-client";
import { TRANSCRIPTION_FOOTER } from "@ziptalk/shared";
import { GroqSTT } from "./groq-stt.js";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? "http://localhost:8080";
const EVOLUTION_API_KEY = required("EVOLUTION_API_KEY");
const GROQ_API_KEY = required("GROQ_API_KEY");
const SPIKE_PORT = Number(process.env.SPIKE_PORT ?? 4000);
const SPIKE_PUBLIC_URL = process.env.SPIKE_PUBLIC_URL ?? `http://host.docker.internal:${SPIKE_PORT}`;
const INSTANCE_NAME = process.env.SPIKE_INSTANCE ?? "ziptalk_spike";

function required(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`✗ Missing env: ${key}`);
    process.exit(1);
  }
  return v;
}

const evolution = new EvolutionClient({
  baseUrl: EVOLUTION_API_URL,
  apiKey: EVOLUTION_API_KEY,
});
const stt = new GroqSTT(GROQ_API_KEY);

// === 1. Servidor HTTP simples para receber webhooks da Evolution ===
const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/webhook") {
    res.statusCode = 404;
    return res.end();
  }

  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));

  res.statusCode = 200;
  res.end("ok");

  if (body.event !== "messages.upsert") return;

  const msg = body.data;
  const messageType = msg?.messageType;
  if (messageType !== "audioMessage") return;

  const messageId = msg.key?.id;
  const fromJid = msg.key?.remoteJid;
  const isFromMe = msg.key?.fromMe ?? false;
  const duration = msg.message?.audioMessage?.seconds ?? 0;

  console.log(`\n📥 Audio received: msg=${messageId} from=${fromJid} fromMe=${isFromMe} dur=${duration}s`);

  try {
    await processAudio({ messageId, fromJid, isFromMe });
  } catch (err) {
    console.error("✗ Failed to process audio:", err);
  }
});

async function processAudio(opts: {
  messageId: string;
  fromJid: string;
  isFromMe: boolean;
}) {
  console.log("⬇️  Downloading audio from Evolution…");
  const media = await evolution.getMediaBase64(INSTANCE_NAME, opts.messageId);
  const buffer = Buffer.from(media.base64, "base64");
  console.log(`   ${(buffer.length / 1024).toFixed(1)} KB / ${media.mimetype}`);

  console.log("🧠 Transcribing with Groq Whisper…");
  const t0 = Date.now();
  const result = await stt.transcribe({
    audioBuffer: buffer,
    mimeType: media.mimetype,
  });
  const elapsed = Date.now() - t0;
  console.log(`   ✓ ${elapsed}ms · lang=${result.language} · ${result.text.length} chars`);
  console.log(`   "${result.text.slice(0, 120)}${result.text.length > 120 ? "…" : ""}"`);

  console.log("💬 Replying on WhatsApp…");
  await evolution.sendText(INSTANCE_NAME, {
    number: opts.fromJid.split("@")[0],
    text: `${result.text}\n\n${TRANSCRIPTION_FOOTER}`,
    quoted: {
      key: { id: opts.messageId, remoteJid: opts.fromJid, fromMe: opts.isFromMe },
    },
  });
  console.log("   ✓ Sent\n");
}

// === 2. Boot: cria instância (ou conecta), imprime QR, expõe webhook ===
async function boot() {
  server.listen(SPIKE_PORT, () => {
    console.log(`▶ Webhook server: http://localhost:${SPIKE_PORT}/webhook`);
  });

  console.log(`▶ Setting up Evolution instance "${INSTANCE_NAME}"…`);

  let qrBase64: string | undefined;

  try {
    const created = await evolution.createInstance({
      instanceName: INSTANCE_NAME,
      webhookUrl: `${SPIKE_PUBLIC_URL}/webhook`,
      webhookEvents: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
      qrcode: true,
    });
    qrBase64 = created.qrcode?.base64;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("already exists")) {
      console.log("   (Instance already exists, reusing)");
    } else {
      throw err;
    }
  }

  // Verifica estado atual; se ainda não está conectado, busca QR explicitamente.
  const state = await evolution.getConnectionState(INSTANCE_NAME);
  console.log(`   Current state: ${state.instance.state}`);

  if (state.instance.state === "open") {
    console.log("✅ Already paired with WhatsApp.");
  } else {
    if (!qrBase64) {
      const qr = await evolution.getQrCode(INSTANCE_NAME);
      qrBase64 = qr.base64;
    }
    console.log("\n📱 Scan this QR code with your WhatsApp:\n");
    console.log(`   1. Open: ${EVOLUTION_API_URL}/instance/connect/${INSTANCE_NAME}`);
    console.log(`      (returns JSON with the QR base64; render or use the manager UI)`);
    console.log(`   2. Or open Evolution Manager: ${EVOLUTION_API_URL}/manager`);
    console.log(`      → log in with your apikey, find the instance, scan the QR`);
    if (qrBase64) {
      console.log(`\n   QR base64 length: ${qrBase64.length} chars`);
    }
  }

  console.log("\n✓ Spike ready. Send an audio to the connected number.\n");
}

boot().catch((err) => {
  console.error("✗ Boot failed:", err);
  process.exit(1);
});
