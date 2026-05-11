# Ziptalk

Clone do conceito do Ziptalk — SaaS de transcrição automática de áudios do WhatsApp com IA.

## Stack

- **Web:** Next.js 15 + Tailwind + shadcn/ui
- **Banco:** Supabase Postgres + Drizzle ORM
- **Fila:** Redis + BullMQ
- **WhatsApp:** Evolution API v2 (Docker)
- **STT:** Groq Whisper Large v3 (fallback: OpenAI)
- **LLM:** Claude Sonnet 4.6 (resumo, tradução, assistente)
- **Pagamento:** Stripe + Asaas (Pix)

## Estrutura

```
ziptalk/
├── apps/
│   ├── web/                  # Next.js (landing + painel + API routes)
│   └── workers/              # Workers BullMQ
│       ├── stt/              # Speech-to-text (Groq)
│       ├── llm/              # Resumo, tradução, assistente
│       ├── wa-send/          # Envio para WhatsApp via Evolution
│       └── billing/          # Webhooks Stripe/Asaas
├── packages/
│   ├── db/                   # Drizzle schema + migrations
│   ├── shared/               # Tipos, constants, zod schemas
│   ├── ui/                   # Componentes shadcn customizados
│   └── evolution-client/     # Cliente tipado da Evolution API
└── docker/
    └── docker-compose.yml    # Evolution + Postgres + Redis (dev)
```

## Setup local

### Pré-requisitos
- Node.js 20+
- pnpm 10+
- Docker + Docker Compose
- Conta no Supabase (free tier)
- API keys: Groq, Anthropic, Stripe, Asaas, Resend

### Passos

```bash
# 1. Instalar dependências
pnpm install

# 2. Copiar .env
cp .env.example .env
# editar .env com suas chaves

# 3. Subir Evolution + Redis local
pnpm evolution:up

# 4. Rodar migrations no Supabase
pnpm db:push

# 5. Rodar tudo em dev
pnpm dev
```

A landing/painel sobe em http://localhost:3000.
Evolution API em http://localhost:8080.

## Spike — testar transcrição end-to-end

Veja `apps/workers/stt/SPIKE.md` para o passo a passo de criar uma instância no
Evolution, escanear o QR, enviar um áudio e ver a transcrição voltar.

## Comandos úteis

```bash
pnpm dev                # tudo em watch
pnpm build              # build de tudo
pnpm typecheck          # tsc em todos os pacotes
pnpm db:studio          # Drizzle Studio
pnpm evolution:logs     # logs da Evolution
```
