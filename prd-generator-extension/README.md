# PRD Generator para Claude Code

Extensão Chrome (Manifest V3) com mini chat de IA que conduz uma entrevista
guiada sobre sua ideia e gera um PRD completo em Markdown, pronto para colar no
Claude Code e construir o sistema de ponta a ponta.

## Destaques

- **Entrevista guiada fixa** em 8 perguntas: ideia, problema, features, stack,
  integrações, dados, segurança, escopo do MVP.
- **PRD denso com 14 seções**: visão, usuários, escopo, critérios de aceitação,
  stack recomendada, arquitetura, modelo de dados, hierarquia de diretórios,
  contratos de API, segurança/compliance, qualidade/testes/observabilidade,
  **roadmap em fases executáveis pelo Claude Code** (cada fase já vem com um
  prompt pronto para colar), riscos, checklist de produção.
- **Provedor configurável**: Anthropic (Claude) ou OpenAI, com streaming SSE.
- **Geração em background**: a chamada à API roda num service worker. Você
  pode fechar o popup que a extensão continua gerando — ao reabrir, o PRD
  aparece pronto (ou o streaming retomando em tempo real).
- **Histórico local** dos últimos 50 PRDs em `chrome.storage.local`, com
  **item "gerando"** no topo da lista enquanto uma geração está em curso, e
  um ponto pulsante no ícone do histórico.
- **Dark theme** nativo, popup de 400×600, sem dependências externas.

## Instalação (modo desenvolvedor)

1. Abra `chrome://extensions`.
2. Ative **Modo desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação** e selecione a pasta
   `prd-generator-extension/`.
4. Fixe o ícone na barra se quiser acesso rápido.

## Configuração

1. Clique no ícone e depois no ícone de engrenagem (ou `chrome://extensions` →
   **Detalhes** → **Opções da extensão**).
2. Escolha o provedor (Anthropic ou OpenAI), cole sua API key e escolha o modelo.
   - Anthropic: <https://console.anthropic.com/settings/keys>
   - OpenAI: <https://platform.openai.com/api-keys>
3. Clique em **Salvar**.

As chaves ficam apenas em `chrome.storage.local` na sua máquina. Nada sai do
navegador além das chamadas diretas para a API do provedor escolhido.

## Uso

1. Clique no ícone da extensão.
2. Responda as 8 perguntas. Enter envia, Shift+Enter quebra linha.
3. Ao final, a extensão gera o PRD e exibe um card com preview.
4. Clique em **Copiar PRD** e cole no Claude Code:
   ```bash
   claude
   > (cole o PRD)
   ```
   Ou abra `claude.ai/code` e cole lá.

## Estrutura

```
prd-generator-extension/
├── manifest.json
├── popup.html / popup.css / popup.js
├── options.html / options.css / options.js
├── lib/
│   ├── api.js            # clients Anthropic + OpenAI (fetch + SSE)
│   ├── interview.js      # roteiro fixo das 8 perguntas
│   ├── prd-template.js   # system prompt com as 14 seções do PRD
│   └── storage.js        # wrappers de chrome.storage.local
├── icons/                # 16/48/128
└── _locales/pt_BR/
```

## Notas técnicas

- **CORS**: em extensões MV3 com `host_permissions`, as chamadas para
  `api.anthropic.com` e `api.openai.com` funcionam direto do popup. Para o
  Anthropic o cliente envia `anthropic-dangerous-direct-browser-access: true`.
- **Streaming**: leitura manual de SSE com `ReadableStream` — sem SDK, zero
  dependências, popup ~15 KB.
- **Persistência**: toda a sessão ativa (respostas, passo atual, streaming do
  PRD) vive em `chrome.storage.local` sob a chave `activeSession`. O popup é
  só uma _view_ que reage a `chrome.storage.onChanged`, então fechar e reabrir
  a janela não perde nada. PRDs finalizados entram também no histórico.
- **Service worker**: `background.js` é um módulo ES que recebe mensagens
  (`START_GENERATION`, `ABORT_GENERATION`) e escreve o progresso no storage a
  cada ~250ms. Se o worker for derrubado pelo Chrome no meio do caminho, na
  próxima inicialização ele marca a sessão como `error` para o usuário tentar
  novamente.

## Licença

MIT.
