// Wrappers finos ao redor de chrome.storage.local.

const KEYS = {
  settings: "settings",
  history: "history",
  activeSession: "activeSession"
};

export const EMPTY_SESSION = {
  stepIndex: 0,
  answers: {},
  status: "interview", // "interview" | "generating" | "done" | "error"
  prd: "",
  error: "",
  updatedAt: 0
};

export const DEFAULT_SETTINGS = {
  provider: "anthropic", // "anthropic" | "openai"
  anthropicKey: "",
  openaiKey: "",
  anthropicModel: "claude-sonnet-4-6",
  openaiModel: "gpt-4o"
};

export async function getSettings() {
  const { [KEYS.settings]: s } = await chrome.storage.local.get(KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}

export async function saveSettings(settings) {
  const merged = { ...(await getSettings()), ...settings };
  await chrome.storage.local.set({ [KEYS.settings]: merged });
  return merged;
}

export async function getHistory() {
  const { [KEYS.history]: h } = await chrome.storage.local.get(KEYS.history);
  return Array.isArray(h) ? h : [];
}

export async function addHistoryEntry(entry) {
  const list = await getHistory();
  list.unshift({ ...entry, id: crypto.randomUUID(), createdAt: Date.now() });
  // cap em 50 entradas
  const capped = list.slice(0, 50);
  await chrome.storage.local.set({ [KEYS.history]: capped });
  return capped;
}

export async function deleteHistoryEntry(id) {
  const list = await getHistory();
  const filtered = list.filter((e) => e.id !== id);
  await chrome.storage.local.set({ [KEYS.history]: filtered });
  return filtered;
}

export async function clearHistory() {
  await chrome.storage.local.set({ [KEYS.history]: [] });
}

export async function getActiveSession() {
  const { [KEYS.activeSession]: s } = await chrome.storage.local.get(KEYS.activeSession);
  return { ...EMPTY_SESSION, ...(s || {}) };
}

export async function setActiveSession(session) {
  const value = { ...session, updatedAt: Date.now() };
  await chrome.storage.local.set({ [KEYS.activeSession]: value });
  return value;
}

export async function clearActiveSession() {
  await chrome.storage.local.set({ [KEYS.activeSession]: { ...EMPTY_SESSION, updatedAt: Date.now() } });
}

export const ACTIVE_SESSION_KEY = KEYS.activeSession;
