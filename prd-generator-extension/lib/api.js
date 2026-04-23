// Clientes minimos para Anthropic e OpenAI. Sem SDK: fetch direto.
// Em extensoes MV3 com host_permissions, a chamada cross-origin funciona
// normalmente; para Anthropic usamos o header que habilita acesso direto do
// browser.

import { PRD_SYSTEM_PROMPT, buildUserPrompt } from "./prd-template.js";

export async function generatePRD({ settings, interviewSummary, onToken }) {
  const userPrompt = buildUserPrompt(interviewSummary);
  if (settings.provider === "anthropic") {
    return callAnthropic({
      apiKey: settings.anthropicKey,
      model: settings.anthropicModel,
      system: PRD_SYSTEM_PROMPT,
      user: userPrompt,
      onToken
    });
  }
  if (settings.provider === "openai") {
    return callOpenAI({
      apiKey: settings.openaiKey,
      model: settings.openaiModel,
      system: PRD_SYSTEM_PROMPT,
      user: userPrompt,
      onToken
    });
  }
  throw new Error(`Provedor desconhecido: ${settings.provider}`);
}

async function callAnthropic({ apiKey, model, system, user, onToken }) {
  if (!apiKey) throw new Error("Faltando API key da Anthropic. Configure em Opções.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system,
      stream: true,
      messages: [{ role: "user", content: user }]
    })
  });
  if (!res.ok || !res.body) {
    const text = await safeText(res);
    throw new Error(`Anthropic ${res.status}: ${text}`);
  }
  return await readSSE(res.body, (evt) => {
    if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
      onToken?.(evt.delta.text);
      return evt.delta.text;
    }
    return "";
  });
}

async function callOpenAI({ apiKey, model, system, user, onToken }) {
  if (!apiKey) throw new Error("Faltando API key da OpenAI. Configure em Opções.");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });
  if (!res.ok || !res.body) {
    const text = await safeText(res);
    throw new Error(`OpenAI ${res.status}: ${text}`);
  }
  return await readSSE(res.body, (evt) => {
    const delta = evt.choices?.[0]?.delta?.content;
    if (delta) {
      onToken?.(delta);
      return delta;
    }
    return "";
  });
}

async function readSSE(body, extract) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const evt = JSON.parse(data);
        out += extract(evt) || "";
      } catch {
        // ignora chunk malformado
      }
    }
  }
  return out;
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "(sem corpo)";
  }
}
