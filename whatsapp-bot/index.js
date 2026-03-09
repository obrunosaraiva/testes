/**
 * GTD Manager — Bot WhatsApp
 *
 * Monitora grupos do WhatsApp e envia mensagens relevantes
 * para o backend GTD via API, onde Claude classifica cada mensagem.
 *
 * Setup:
 *   npm install
 *   node index.js
 *   → Escaneie o QR code com o WhatsApp do celular
 */

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const express = require("express");

// ─── Config ───────────────────────────────────────────────────────────────────

const GTD_API_URL = process.env.GTD_API_URL || "http://localhost:8000/api";

// Groups to monitor. Empty array = monitor ALL groups.
// Example: ["Projeto Alpha", "Time de Produto", "Demandas Dev"]
let MONITORED_GROUPS = (process.env.MONITORED_GROUPS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Ignore messages from these senders (bots, yourself, etc.)
const IGNORED_SENDERS = (process.env.IGNORED_SENDERS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Minimum message length to consider (avoids stickers, emojis, "ok")
const MIN_MESSAGE_LENGTH = parseInt(process.env.MIN_MESSAGE_LENGTH || "15");

// ─── State ────────────────────────────────────────────────────────────────────

let botStatus = "initializing"; // initializing | qr_pending | connected | disconnected
let qrCode = null;
let processedCount = 0;
let addedCount = 0;

// ─── WhatsApp Client ──────────────────────────────────────────────────────────

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  },
});

client.on("qr", (qr) => {
  botStatus = "qr_pending";
  qrCode = qr;
  console.log("\n📱 Escaneie o QR code com o WhatsApp do seu celular:\n");
  qrcode.generate(qr, { small: true });
  console.log("\nOu acesse http://localhost:3001/qr para ver o QR code.\n");
});

client.on("ready", () => {
  botStatus = "connected";
  qrCode = null;
  console.log(`\n✅ Bot conectado ao WhatsApp!`);
  if (MONITORED_GROUPS.length > 0) {
    console.log(`📋 Monitorando grupos: ${MONITORED_GROUPS.join(", ")}`);
  } else {
    console.log("📋 Monitorando TODOS os grupos");
  }
  console.log(`🔗 GTD API: ${GTD_API_URL}\n`);
});

client.on("disconnected", (reason) => {
  botStatus = "disconnected";
  console.log("❌ Bot desconectado:", reason);
});

client.on("message", async (message) => {
  try {
    await handleMessage(message);
  } catch (err) {
    console.error("Erro ao processar mensagem:", err.message);
  }
});

async function handleMessage(message) {
  // Only process group messages
  if (!message.from.endsWith("@g.us")) return;

  const chat = await message.getChat();
  const groupName = chat.name;

  // Filter by monitored groups if configured
  if (MONITORED_GROUPS.length > 0 && !MONITORED_GROUPS.includes(groupName)) {
    return;
  }

  const body = message.body || "";

  // Skip short messages, stickers, media without caption
  if (body.length < MIN_MESSAGE_LENGTH) return;

  // Skip ignored senders
  const contact = await message.getContact();
  const senderName = contact.pushname || contact.name || message.from;
  if (IGNORED_SENDERS.includes(senderName)) return;

  processedCount++;

  console.log(`📨 [${groupName}] ${senderName}: ${body.slice(0, 60)}...`);

  // Send to GTD API for classification
  const response = await fetch(`${GTD_API_URL}/capture/whatsapp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: body,
      sender: senderName,
      group_name: groupName,
      timestamp: new Date().toISOString(),
      message_id: message.id._serialized,
    }),
  });

  if (!response.ok) {
    console.error(`  ❌ API error: ${response.status}`);
    return;
  }

  const result = await response.json();
  if (result.added) {
    addedCount++;
    console.log(`  ✅ Adicionado à inbox GTD: "${result.content?.slice(0, 60)}"`);
  } else {
    console.log(`  ⏭  Ignorado: ${result.reason || "não relevante"}`);
  }
}

// ─── Express API (status + config) ───────────────────────────────────────────

const app = express();
app.use(express.json());

app.get("/status", (req, res) => {
  res.json({
    status: botStatus,
    monitored_groups: MONITORED_GROUPS,
    stats: { processed: processedCount, added: addedCount },
    gtd_api: GTD_API_URL,
  });
});

app.get("/qr", (req, res) => {
  if (botStatus !== "qr_pending" || !qrCode) {
    return res.json({ message: botStatus === "connected" ? "Já conectado!" : "QR code não disponível ainda." });
  }
  // Return QR as plain text for terminal rendering, or as data for frontend
  res.json({ qr: qrCode, status: botStatus });
});

app.post("/groups", async (req, res) => {
  if (botStatus !== "connected") {
    return res.status(400).json({ error: "Bot não conectado" });
  }
  try {
    const chats = await client.getChats();
    const groups = chats
      .filter((c) => c.isGroup)
      .map((c) => ({ id: c.id._serialized, name: c.name, participants: c.participants?.length || 0 }));
    res.json({ groups });
  } catch {
    res.status(500).json({ error: "Erro ao listar grupos" });
  }
});

app.post("/monitor", (req, res) => {
  const { groups } = req.body;
  if (!Array.isArray(groups)) {
    return res.status(400).json({ error: "groups deve ser um array de nomes" });
  }
  MONITORED_GROUPS = groups;
  console.log(`📋 Grupos monitorados atualizados: ${groups.join(", ") || "todos"}`);
  res.json({ monitored_groups: MONITORED_GROUPS });
});

app.listen(3001, () => {
  console.log("🤖 GTD WhatsApp Bot iniciando...");
  console.log("📡 API de controle em http://localhost:3001");
});

// ─── Start WhatsApp ───────────────────────────────────────────────────────────
client.initialize();
