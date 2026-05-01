# Diagnóstico Íntimo — PompoarPower

Quiz gamificado de 15 perguntas que entrega às alunas do PompoarPower um Perfil
Íntimo personalizado (1 de 4 arquétipos: Renascimento, Expansão, Equilíbrio,
Domínio) e captura dados estruturados de dor × idade × ticket × formato pra
guiar o próximo produto da esteira de ascensão.

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS v4** (paleta customizada via `@theme` em `app/globals.css`)
- **Supabase** (Postgres + Auth) — clientes em `lib/supabase/`
- **Resend** (e-mail transacional) — Fase 3
- **Vitest** pros testes do algoritmo de scoring
- Deploy: **Vercel**

## Estado atual — Fase 1

Esta branch contém o setup base:

- Projeto Next.js 15 inicializado, paleta + fontes (Fraunces / Inter)
- Estrutura de pastas pra todas as fases
- Clientes Supabase (browser, server, service-role)
- Migration SQL inicial (`supabase/migrations/001_initial_schema.sql`) com
  schema, RLS e índices
- Definição das 15 perguntas em `lib/quiz/questions.ts`
- Algoritmo de scoring + conteúdo dos 4 perfis em `lib/quiz/scoring.ts` e
  `lib/quiz/profiles.ts`
- 17 testes do scoring passando (`npm test`)

## Próximas fases

- **Fase 2:** server actions (`lib/actions/quiz.ts`) + componentes do quiz +
  páginas (quiz funcional end-to-end com Supabase real)
- **Fase 3:** painel admin, e-mails Resend, OG image, UTMs
- **Fase 4:** deploy Vercel + Supabase production + DNS

## Setup local

```bash
npm install
cp .env.example .env.local
# preencher NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, etc.
npm run dev
```

Verificações:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest
npm run build
```

## Estrutura de pastas

```
app/
  (public)/           rotas públicas (boas-vindas, quiz, resultado)
  (admin)/            rotas autenticadas (dashboard, respostas, sorteio)
  api/og/             geração dinâmica de imagem para Stories
components/
  ui/                 botões, inputs (estilo shadcn)
  quiz/               componentes específicos do quiz
  admin/              widgets do dashboard
lib/
  quiz/               perguntas, scoring, conteúdo dos perfis
  supabase/           clientes (browser, server, service)
  actions/            server actions (Fase 2+)
  email/              Resend + templates (Fase 3)
  utils/              helpers (cn, etc.)
types/
  index.ts            tipos do domínio
  database.ts         tipagem do schema Supabase
supabase/
  migrations/         001_initial_schema.sql
  seed.sql            instruções pra criar a expert (admin)
```

## Database (Supabase)

A migration cria 5 tabelas com RLS estrita:

- `profiles` — admin (expert)
- `respondents` — alunas que responderam
- `answers` — uma linha por pergunta respondida
- `email_logs` — rastreio de envios via Resend
- `favorited_answers` — copy gold marcada pela expert

Toda escrita em `respondents` / `answers` passa por server actions usando o
`service_role` key (server-only). Anônimo não consegue ler nem escrever.
A expert autenticada lê tudo em modo somente leitura.

## Os 4 perfis

Lógica de scoring em `lib/quiz/scoring.ts`. Pesos:

- P1 (dor) → +3 por dor relevante
- P2 (satisfação) → +2 nos extremos (≤4 ou ≥7)
- P7 (área a destravar) → +3 a +4 (peso mais alto)
- P9, P10, P11 → reforço de Domínio em ticket alto / formato premium

Empate é resolvido na ordem: **Equilíbrio > Renascimento > Expansão > Domínio**
(prioriza perfis com sintomas físicos pra não enviar alguém pra produto errado).

Conteúdo dos perfis em `lib/quiz/profiles.ts` — placeholder direcional pra
revisão da expert antes do lançamento.
