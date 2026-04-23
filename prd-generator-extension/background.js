// Service worker: mantém a geração do PRD rodando mesmo com o popup fechado.
// Estado vive em chrome.storage.local (ver lib/storage.js), e o popup renderiza
// reagindo a chrome.storage.onChanged.

import { generatePRD } from "./lib/api.js";
import { buildInterviewContext } from "./lib/interview.js";
import {
  getActiveSession,
  setActiveSession,
  getSettings,
  addHistoryEntry
} from "./lib/storage.js";

const MESSAGES = {
  START: "START_GENERATION",
  ABORT: "ABORT_GENERATION",
  PING: "PING"
};

let currentAbort = null;
let isRunning = false;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === MESSAGES.START) {
        if (isRunning) {
          sendResponse({ ok: true, alreadyRunning: true });
          return;
        }
        sendResponse({ ok: true });
        runGeneration().catch((e) => console.error("[PRD bg] erro:", e));
      } else if (msg?.type === MESSAGES.ABORT) {
        currentAbort?.abort();
        sendResponse({ ok: true });
      } else if (msg?.type === MESSAGES.PING) {
        sendResponse({ ok: true, isRunning });
      } else {
        sendResponse({ ok: false, error: "mensagem desconhecida" });
      }
    } catch (err) {
      sendResponse({ ok: false, error: err?.message || String(err) });
    }
  })();
  return true; // resposta assíncrona
});

// Se o SW foi revivido com uma sessão "generating" parada (ex.: Chrome matou
// durante fetch longo), rebaixamos para "error" para o usuário poder retomar.
chrome.runtime.onStartup.addListener(() => recoverStuckSession());
chrome.runtime.onInstalled.addListener(() => recoverStuckSession());

async function recoverStuckSession() {
  const session = await getActiveSession();
  if (session.status === "generating" && !isRunning) {
    await setActiveSession({
      ...session,
      status: "error",
      error:
        "A geração foi interrompida (extensão recarregada ou navegador reiniciado). Clique em 'Tentar novamente'."
    });
  }
}

async function runGeneration() {
  isRunning = true;
  const session = await getActiveSession();

  const settings = await getSettings();
  const hasKey =
    (settings.provider === "anthropic" && settings.anthropicKey) ||
    (settings.provider === "openai" && settings.openaiKey);

  if (!hasKey) {
    await setActiveSession({
      ...session,
      status: "error",
      error:
        "Nenhuma API key configurada. Abra as Opções (engrenagem) e cole sua chave."
    });
    isRunning = false;
    return;
  }

  const summary = buildInterviewContext(session.answers);
  let partial = "";
  let lastFlush = 0;
  const FLUSH_EVERY_MS = 250;

  currentAbort = new AbortController();

  await setActiveSession({
    ...session,
    status: "generating",
    prd: "",
    error: ""
  });

  try {
    const final = await generatePRD({
      settings,
      interviewSummary: summary,
      signal: currentAbort.signal,
      onToken: async (tok) => {
        partial += tok;
        const now = Date.now();
        if (now - lastFlush > FLUSH_EVERY_MS) {
          lastFlush = now;
          await setActiveSession({
            ...session,
            status: "generating",
            prd: partial,
            error: ""
          });
        }
      }
    });

    await setActiveSession({
      ...session,
      status: "done",
      prd: final,
      error: ""
    });

    const title = extractTitle(final) || firstWords(session.answers?.idea, 8);
    await addHistoryEntry({
      title,
      answers: session.answers,
      prd: final,
      provider: settings.provider,
      model:
        settings.provider === "anthropic"
          ? settings.anthropicModel
          : settings.openaiModel
    });
  } catch (err) {
    const aborted = err?.name === "AbortError";
    await setActiveSession({
      ...session,
      status: aborted ? "interview" : "error",
      prd: aborted ? "" : partial,
      error: aborted ? "" : err?.message || String(err),
      // se abortou, o usuário volta para a última pergunta para ajustar
      stepIndex: aborted
        ? Math.max(0, (session.stepIndex ?? 0) - 1)
        : session.stepIndex
    });
  } finally {
    currentAbort = null;
    isRunning = false;
  }
}

function extractTitle(prd) {
  if (!prd) return null;
  const m = prd.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}
function firstWords(s, n) {
  return (s || "PRD").split(/\s+/).slice(0, n).join(" ");
}
