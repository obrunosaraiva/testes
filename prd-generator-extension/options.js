import { getSettings, saveSettings } from "./lib/storage.js";

const providerEl = document.getElementById("provider");
const anthropicKeyEl = document.getElementById("anthropicKey");
const anthropicModelEl = document.getElementById("anthropicModel");
const openaiKeyEl = document.getElementById("openaiKey");
const openaiModelEl = document.getElementById("openaiModel");
const anthropicBlock = document.getElementById("anthropic-block");
const openaiBlock = document.getElementById("openai-block");
const saveBtn = document.getElementById("save");
const statusEl = document.getElementById("status");

function syncBlocks() {
  const v = providerEl.value;
  anthropicBlock.classList.toggle("hidden", v !== "anthropic");
  openaiBlock.classList.toggle("hidden", v !== "openai");
}

async function load() {
  const s = await getSettings();
  providerEl.value = s.provider;
  anthropicKeyEl.value = s.anthropicKey || "";
  anthropicModelEl.value = s.anthropicModel;
  openaiKeyEl.value = s.openaiKey || "";
  openaiModelEl.value = s.openaiModel;
  syncBlocks();
}

async function save() {
  const provider = providerEl.value;
  const anthropicKey = anthropicKeyEl.value.trim();
  const openaiKey = openaiKeyEl.value.trim();

  if (provider === "anthropic" && !anthropicKey) {
    showStatus("Cole a API key da Anthropic antes de salvar.", true);
    return;
  }
  if (provider === "openai" && !openaiKey) {
    showStatus("Cole a API key da OpenAI antes de salvar.", true);
    return;
  }

  await saveSettings({
    provider,
    anthropicKey,
    openaiKey,
    anthropicModel: anthropicModelEl.value,
    openaiModel: openaiModelEl.value
  });
  showStatus("Salvo ✓", false);
}

function showStatus(text, isError) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", !!isError);
  if (!isError) setTimeout(() => (statusEl.textContent = ""), 2500);
}

providerEl.addEventListener("change", syncBlocks);
saveBtn.addEventListener("click", save);
load();
