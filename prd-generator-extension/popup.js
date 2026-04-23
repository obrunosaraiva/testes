import { INTERVIEW_STEPS, buildInterviewContext } from "./lib/interview.js";
import { generatePRD } from "./lib/api.js";
import {
  getSettings,
  getHistory,
  addHistoryEntry,
  deleteHistoryEntry,
  clearHistory
} from "./lib/storage.js";

const SESSION_KEY = "activeSession";

const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send-btn");
const resetBtn = document.getElementById("reset-btn");
const settingsBtn = document.getElementById("settings-btn");
const historyBtn = document.getElementById("history-btn");
const historyPanel = document.getElementById("history-panel");
const historyClose = document.getElementById("history-close");
const historyList = document.getElementById("history-list");
const historyClear = document.getElementById("history-clear");
const progressBar = document.getElementById("progress-bar");
const progressLabel = document.getElementById("progress-label");

let state = {
  stepIndex: 0,
  answers: {},
  status: "interview", // "interview" | "generating" | "done"
  prd: ""
};

function saveSession() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
}
function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) state = JSON.parse(raw);
  } catch {}
}

function render() {
  chatEl.innerHTML = "";
  addBot(
    "Oi! Vou te ajudar a transformar sua ideia num PRD pronto para o Claude Code. São 8 perguntas rápidas. Vamos?"
  );

  INTERVIEW_STEPS.forEach((step, i) => {
    if (i < state.stepIndex) {
      addBotQuestion(step);
      addUser(state.answers[step.id] ?? "");
    } else if (i === state.stepIndex && state.status === "interview") {
      addBotQuestion(step);
    }
  });

  if (state.status === "generating") {
    addTyping();
  }

  if (state.status === "done" && state.prd) {
    renderPRDCard(state.prd);
  }

  updateProgress();
  updateComposer();
  scrollToBottom();
}

function updateProgress() {
  const total = INTERVIEW_STEPS.length;
  const done = state.status === "done" ? total : state.stepIndex;
  const pct = Math.min(100, (done / total) * 100);
  progressBar.style.width = `${pct}%`;
  if (state.status === "done") {
    progressLabel.textContent = "PRD pronto ✓";
  } else if (state.status === "generating") {
    progressLabel.textContent = "Gerando PRD...";
  } else {
    progressLabel.textContent = `${Math.min(state.stepIndex + 1, total)}/${total}`;
  }
}

function updateComposer() {
  const active = state.status === "interview";
  inputEl.disabled = !active;
  sendBtn.disabled = !active;
  if (active) {
    const step = INTERVIEW_STEPS[state.stepIndex];
    inputEl.placeholder = step?.placeholder || "";
    inputEl.focus();
  } else if (state.status === "generating") {
    inputEl.placeholder = "Gerando PRD, aguarde...";
  } else {
    inputEl.placeholder = "Entrevista concluída. Clique em Reiniciar para começar de novo.";
  }
}

function addBot(text) {
  const el = document.createElement("div");
  el.className = "msg bot";
  el.textContent = text;
  chatEl.appendChild(el);
}

function addBotQuestion(step) {
  const el = document.createElement("div");
  el.className = "msg bot";
  el.innerHTML = `<span class="q-title">${escapeHtml(step.title)}</span>${escapeHtml(step.prompt)}`;
  chatEl.appendChild(el);
}

function addUser(text) {
  const el = document.createElement("div");
  el.className = "msg user";
  el.textContent = text;
  chatEl.appendChild(el);
}

function addSystem(text) {
  const el = document.createElement("div");
  el.className = "msg system";
  el.textContent = text;
  chatEl.appendChild(el);
}

function addError(text) {
  const el = document.createElement("div");
  el.className = "error-banner";
  el.textContent = text;
  chatEl.appendChild(el);
}

function addTyping() {
  const el = document.createElement("div");
  el.className = "typing";
  el.id = "typing-indicator";
  el.innerHTML = "<span></span><span></span><span></span>";
  chatEl.appendChild(el);
}
function removeTyping() {
  document.getElementById("typing-indicator")?.remove();
}

function renderPRDCard(prd) {
  const card = document.createElement("div");
  card.className = "prd-card";
  const title = document.createElement("h4");
  title.textContent = "PRD gerado";
  const preview = document.createElement("pre");
  preview.className = "prd-preview";
  preview.textContent = prd.slice(0, 2000) + (prd.length > 2000 ? "\n\n... (truncado no preview)" : "");
  const actions = document.createElement("div");
  actions.className = "prd-actions";

  const copyBtn = document.createElement("button");
  copyBtn.className = "btn-primary btn-sm";
  copyBtn.textContent = "Copiar PRD";
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(prd);
      copyBtn.textContent = "Copiado ✓";
      setTimeout(() => (copyBtn.textContent = "Copiar PRD"), 1600);
    } catch (e) {
      copyBtn.textContent = "Falhou";
    }
  };

  const downloadBtn = document.createElement("button");
  downloadBtn.className = "btn-ghost btn-sm";
  downloadBtn.textContent = "Baixar .md";
  downloadBtn.onclick = () => {
    const blob = new Blob([prd], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PRD-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restartBtn = document.createElement("button");
  restartBtn.className = "btn-ghost btn-sm";
  restartBtn.textContent = "Nova ideia";
  restartBtn.onclick = reset;

  actions.append(copyBtn, downloadBtn, restartBtn);
  card.append(title, preview, actions);
  chatEl.appendChild(card);
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatEl.scrollTop = chatEl.scrollHeight;
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function handleSend() {
  if (state.status !== "interview") return;
  const value = inputEl.value.trim();
  const step = INTERVIEW_STEPS[state.stepIndex];
  if (!value) return;
  if (value.length < (step.minLength ?? 1)) {
    inputEl.focus();
    inputEl.classList.add("shake");
    addSystem(`Dê um pouco mais de detalhe (mín. ${step.minLength} caracteres).`);
    return;
  }

  state.answers[step.id] = value;
  state.stepIndex += 1;
  inputEl.value = "";
  saveSession();

  if (state.stepIndex >= INTERVIEW_STEPS.length) {
    state.status = "generating";
    saveSession();
    render();
    await runGeneration();
  } else {
    render();
  }
}

async function runGeneration() {
  const settings = await getSettings();
  const hasKey =
    (settings.provider === "anthropic" && settings.anthropicKey) ||
    (settings.provider === "openai" && settings.openaiKey);

  if (!hasKey) {
    removeTyping();
    addError(
      "Nenhuma API key configurada. Abra as Opções (ícone de engrenagem) para configurar."
    );
    state.status = "done";
    state.prd = "";
    saveSession();
    updateProgress();
    updateComposer();
    return;
  }

  const summary = buildInterviewContext(state.answers);
  let streamed = "";
  try {
    streamed = await generatePRD({
      settings,
      interviewSummary: summary,
      onToken: (tok) => {
        streamed += tok;
        // feedback visual simples no "typing"
      }
    });
  } catch (err) {
    removeTyping();
    addError(`Erro ao gerar PRD: ${err.message}`);
    state.status = "done";
    state.prd = "";
    saveSession();
    updateProgress();
    updateComposer();
    return;
  }

  removeTyping();
  state.status = "done";
  state.prd = streamed;
  saveSession();

  const title = extractTitle(streamed) || firstWords(state.answers.idea, 8);
  await addHistoryEntry({
    title,
    answers: state.answers,
    prd: streamed,
    provider: settings.provider,
    model:
      settings.provider === "anthropic"
        ? settings.anthropicModel
        : settings.openaiModel
  });

  renderPRDCard(streamed);
  updateProgress();
  updateComposer();
  scrollToBottom();
}

function extractTitle(prd) {
  const m = prd.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}
function firstWords(s, n) {
  return (s || "PRD").split(/\s+/).slice(0, n).join(" ");
}

function reset() {
  state = { stepIndex: 0, answers: {}, status: "interview", prd: "" };
  saveSession();
  render();
}

// Histórico
async function openHistory() {
  const list = await getHistory();
  historyList.innerHTML = "";
  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "Sem PRDs salvos ainda.";
    historyList.appendChild(empty);
  } else {
    for (const entry of list) {
      const item = document.createElement("div");
      item.className = "history-item";
      const info = document.createElement("div");
      info.className = "history-item-info";
      const t = document.createElement("div");
      t.className = "history-item-title";
      t.textContent = entry.title || "Sem título";
      const d = document.createElement("div");
      d.className = "history-item-date";
      d.textContent = new Date(entry.createdAt).toLocaleString("pt-BR");
      info.append(t, d);

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "4px";
      const copy = document.createElement("button");
      copy.className = "btn-ghost btn-sm";
      copy.textContent = "Copiar";
      copy.onclick = async (ev) => {
        ev.stopPropagation();
        await navigator.clipboard.writeText(entry.prd);
        copy.textContent = "✓";
        setTimeout(() => (copy.textContent = "Copiar"), 1200);
      };
      const del = document.createElement("button");
      del.className = "btn-ghost btn-sm";
      del.textContent = "✕";
      del.title = "Remover";
      del.onclick = async (ev) => {
        ev.stopPropagation();
        await deleteHistoryEntry(entry.id);
        openHistory();
      };
      actions.append(copy, del);

      item.append(info, actions);
      item.onclick = () => {
        state = {
          stepIndex: INTERVIEW_STEPS.length,
          answers: entry.answers || {},
          status: "done",
          prd: entry.prd
        };
        saveSession();
        closeHistory();
        render();
      };
      historyList.appendChild(item);
    }
  }
  historyPanel.classList.remove("hidden");
  historyPanel.setAttribute("aria-hidden", "false");
}
function closeHistory() {
  historyPanel.classList.add("hidden");
  historyPanel.setAttribute("aria-hidden", "true");
}

// Eventos
sendBtn.addEventListener("click", handleSend);
resetBtn.addEventListener("click", reset);
settingsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
historyBtn.addEventListener("click", openHistory);
historyClose.addEventListener("click", closeHistory);
historyClear.addEventListener("click", async () => {
  if (confirm("Remover todo o histórico?")) {
    await clearHistory();
    openHistory();
  }
});

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

loadSession();
render();
