import { INTERVIEW_STEPS } from "./lib/interview.js";
import {
  getHistory,
  deleteHistoryEntry,
  clearHistory,
  getActiveSession,
  setActiveSession,
  clearActiveSession,
  ACTIVE_SESSION_KEY,
  EMPTY_SESSION
} from "./lib/storage.js";

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
const historyBadge = document.getElementById("history-badge");

let state = { ...EMPTY_SESSION };

async function boot() {
  state = await getActiveSession();
  render();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[ACTIVE_SESSION_KEY]) {
    const next = changes[ACTIVE_SESSION_KEY].newValue;
    if (!next) return;
    // Mesclar com EMPTY_SESSION para robustez a mudanças de schema.
    state = { ...EMPTY_SESSION, ...next };
    render();
  }
});

function render() {
  chatEl.innerHTML = "";
  addBot(
    "Oi! Vou te ajudar a transformar sua ideia num PRD pronto para o Claude Code. São 8 perguntas rápidas. Vamos?"
  );

  INTERVIEW_STEPS.forEach((step, i) => {
    const hasAnswer = state.answers[step.id];
    if (i < state.stepIndex) {
      addBotQuestion(step);
      addUser(hasAnswer ?? "");
    } else if (i === state.stepIndex && state.status === "interview") {
      addBotQuestion(step);
    }
  });

  if (state.status === "generating") {
    if (state.prd && state.prd.length > 0) {
      renderStreamingPRD(state.prd);
    } else {
      addTyping();
    }
    addCancelRow();
  }

  if (state.status === "done" && state.prd) {
    renderPRDCard(state.prd);
  }

  if (state.status === "error") {
    addError(state.error || "Erro desconhecido.");
    addRetryRow();
  }

  updateProgress();
  updateComposer();
  updateHistoryBadge();
  scrollToBottom();
}

function updateHistoryBadge() {
  const show = state.status === "generating";
  historyBadge?.classList.toggle("hidden", !show);
  // Se o painel de histórico está aberto, atualiza o topo em tempo real.
  if (!historyPanel.classList.contains("hidden")) {
    openHistory();
  }
}

function updateProgress() {
  const total = INTERVIEW_STEPS.length;
  const done = state.status === "done" ? total : state.stepIndex;
  const pct = Math.min(100, (done / total) * 100);
  progressBar.style.width = `${pct}%`;
  if (state.status === "done") {
    progressLabel.textContent = "PRD pronto ✓";
  } else if (state.status === "generating") {
    progressLabel.textContent = "Gerando em background...";
  } else if (state.status === "error") {
    progressLabel.textContent = "Erro";
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
    inputEl.placeholder = "Gerando em background. Pode fechar o popup — ele continua rodando.";
  } else if (state.status === "error") {
    inputEl.placeholder = "Houve um erro. Use 'Tentar novamente' ou 'Reiniciar'.";
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

function addCancelRow() {
  const row = document.createElement("div");
  row.className = "prd-actions";
  const cancel = document.createElement("button");
  cancel.className = "btn-ghost btn-sm";
  cancel.textContent = "Cancelar geração";
  cancel.onclick = () => {
    chrome.runtime.sendMessage({ type: "ABORT_GENERATION" });
  };
  row.appendChild(cancel);
  chatEl.appendChild(row);
}

function addRetryRow() {
  const row = document.createElement("div");
  row.className = "prd-actions";
  const retry = document.createElement("button");
  retry.className = "btn-primary btn-sm";
  retry.textContent = "Tentar novamente";
  retry.onclick = () => startGeneration();
  row.appendChild(retry);

  const back = document.createElement("button");
  back.className = "btn-ghost btn-sm";
  back.textContent = "Voltar à entrevista";
  back.onclick = async () => {
    await setActiveSession({
      ...state,
      status: "interview",
      error: "",
      prd: ""
    });
  };
  row.appendChild(back);

  chatEl.appendChild(row);
}

function renderStreamingPRD(partial) {
  const card = document.createElement("div");
  card.className = "prd-card";
  const title = document.createElement("h4");
  title.textContent = "Gerando PRD em tempo real...";
  const preview = document.createElement("pre");
  preview.className = "prd-preview";
  const tail = partial.length > 2400 ? partial.slice(-2400) : partial;
  preview.textContent =
    (partial.length > 2400 ? "... (mostrando o final do stream)\n\n" : "") + tail;
  card.append(title, preview);
  chatEl.appendChild(card);
}

function renderPRDCard(prd) {
  const card = document.createElement("div");
  card.className = "prd-card";
  const title = document.createElement("h4");
  title.textContent = "PRD gerado";
  const preview = document.createElement("pre");
  preview.className = "prd-preview";
  preview.textContent =
    prd.slice(0, 2000) + (prd.length > 2000 ? "\n\n... (truncado no preview)" : "");
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
    } catch {
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
    addSystem(`Dê um pouco mais de detalhe (mín. ${step.minLength} caracteres).`);
    return;
  }

  const nextAnswers = { ...state.answers, [step.id]: value };
  const nextIndex = state.stepIndex + 1;
  inputEl.value = "";

  if (nextIndex >= INTERVIEW_STEPS.length) {
    // Encerrou entrevista: salva respostas e chuta a geração no background.
    await setActiveSession({
      ...state,
      answers: nextAnswers,
      stepIndex: nextIndex,
      status: "interview" // background vai mudar para "generating"
    });
    startGeneration();
  } else {
    await setActiveSession({
      ...state,
      answers: nextAnswers,
      stepIndex: nextIndex
    });
  }
}

function startGeneration() {
  chrome.runtime.sendMessage({ type: "START_GENERATION" }, (resp) => {
    if (chrome.runtime.lastError) {
      addError("Não foi possível iniciar o background: " + chrome.runtime.lastError.message);
    }
  });
}

async function reset() {
  chrome.runtime.sendMessage({ type: "ABORT_GENERATION" });
  await clearActiveSession();
}

// Histórico: inclui a sessão ativa no topo se estiver gerando/com erro.
async function openHistory() {
  const list = await getHistory();
  historyList.innerHTML = "";

  const showRunning = state.status === "generating" || state.status === "error";
  if (showRunning) {
    historyList.appendChild(buildRunningItem(state));
  }

  if (list.length === 0 && !showRunning) {
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
      item.onclick = async () => {
        await setActiveSession({
          stepIndex: INTERVIEW_STEPS.length,
          answers: entry.answers || {},
          status: "done",
          prd: entry.prd,
          error: ""
        });
        closeHistory();
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

function buildRunningItem(session) {
  const item = document.createElement("div");
  const isError = session.status === "error";
  item.className = "history-item" + (isError ? "" : " running");

  const info = document.createElement("div");
  info.className = "history-item-info";

  const title = document.createElement("div");
  title.className = "history-item-title";
  title.textContent =
    (session.answers?.idea && firstWords(session.answers.idea, 10)) ||
    "Nova ideia";

  const status = document.createElement("div");
  status.className = "status-pill" + (isError ? " err" : "");
  if (isError) {
    status.textContent = "⚠ erro — clique para ver";
  } else {
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    const label = document.createElement("span");
    const bytes = session.prd ? ` · ${session.prd.length} chars` : "";
    label.textContent = `gerando em background${bytes}`;
    status.append(spinner, label);
  }

  info.append(title, status);
  item.appendChild(info);

  item.onclick = () => {
    // Apenas fecha o painel — o popup principal já está renderizando essa sessão.
    closeHistory();
  };
  return item;
}

function firstWords(s, n) {
  return (s || "PRD").split(/\s+/).slice(0, n).join(" ");
}

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

boot();
