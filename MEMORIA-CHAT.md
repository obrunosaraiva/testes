# Memória do chat — AudioZap (clone conceito Ziptalk)

**Sessão:** 2026-05-11 → 2026-05-12
**Branch:** `claude/review-app-concept-bqoGF`
**Autor:** Bruno Saraiva (bsscontato@gmail.com)

---

## 1. Contexto & entendimento do produto

### 1.1 O concorrente que inspira
**Ziptalk** (https://ziptalk.ai) — SaaS que se conecta ao WhatsApp e transcreve
áudios com IA, respondendo na mesma conversa com um card contendo o texto
transcrito + assinatura "⚡ Transcrição com IA por Ziptalk".

**Modelo mental do produto:**
- Bot pareado ao número do usuário (via QR)
- Toda vez que chega áudio → responde no mesmo chat com transcrição
- Painel web para gerenciar dispositivos, consumo, time, assinatura
- 5 planos: Free (30min), Pro R$70 (960min), Advanced R$120 (1.920min),
  Business R$200 (3.840min), Enterprise R$360 (7.680min)
- Features extras nos planos pagos: resumo IA, tradução, transcrição privada,
  filtro ofensivas, multi-número, encaminhamento automático, assistente virtual

### 1.2 O nosso produto
**AudioZap** — clone do conceito, produto do Bruno.
Projeto Supabase já existe: `audiozap` (`jaaumheftejmuwrknekw`, região us-west-1).

> ⚠️ Ao longo da sessão eu (Claude) chamei tudo de "ziptalk" por engano —
> o usuário corrigiu no fim: **"ziptalk é do concorrente, audiozap é o nosso"**.
> Rename foi feito mas **não foi persistido no git** (ver seção 6).

---

## 2. PRD

Documento em `PRD-Ziptalk-Clone.md` (nome do arquivo mantém referência ao
concorrente por ser um "clone do conceito Ziptalk", mas o produto é AudioZap).

Cobertura em 14 seções:
1. Visão geral + proposta "Pare de ouvir áudio. Leia."
2. Problema & oportunidade (mercado BR)
3. Público-alvo (4 personas: vendedor, advogado/contador, gestor, atendimento)
4. Escopo funcional (F1–F8 MVP + v1.1+ + fora de escopo)
5. User flows (onboarding, uso recorrente, upgrade)
6. Requisitos não-funcionais (performance, segurança/LGPD, escala, i18n)
7. Pricing (5 planos)
8. Arquitetura técnica (fechada — ver seção 3 abaixo)
9. Design system (fechado — ver seção 4)
10. Métricas (North Star: minutos transcritos/mês)
11. Roadmap (4 fases: MVP 8sem → monetização 4sem → times 6sem → crescimento)
12. Riscos & mitigações
13. Perguntas em aberto (algumas resolvidas)
14. Próximos passos

---

## 3. Decisões técnicas fechadas

| Camada | Escolha | Por quê |
|---|---|---|
| Web (painel + landing) | **Next.js 15** + TypeScript | Monorepo Turborepo |
| UI | **Tailwind v4 + shadcn/ui + Lucide** | Base: blocks `dashboard-01` + `sidebar-07` |
| Tipografia | **Plus Jakarta Sans** + JetBrains Mono | Google Fonts |
| Auth | **Supabase Auth** (Google + Email) | Magic links + RLS |
| Banco | **Supabase Postgres + Drizzle ORM** | RLS multi-tenant |
| Realtime | Supabase Realtime | Atualizar consumo ao vivo |
| Storage | Supabase Storage | Áudios temporários TTL 24h |
| Fila/Cache | **Upstash Redis + BullMQ** | Jobs STT, LLM, envio |
| WhatsApp | **Evolution API v2** (Docker) | Ver seção 3.1 |
| STT | **Groq Whisper Large v3** (primário) + OpenAI Whisper (fallback) | Groq ~20× mais barato, sub-segundo |
| LLM | **Claude Sonnet 4.6** + prompt caching | Resumo, tradução, assistente, filtro |
| Pagamento | **Stripe** (cartão) + **Asaas** (Pix/Boleto BR) | Asaas < Pagar.me em taxas |
| Infra | **Vercel** (Next.js) + **Railway** (Evolution + workers) | Evolution precisa container persistente |
| Observabilidade | Sentry + PostHog + Axiom | Erros + analytics + logs |
| Email transacional | Resend | Convites, recibos, alertas |

### 3.1 Decisão Evolution API — **sim, vamos usar**

**Aprovada** vs. Baileys puro / WhatsApp Cloud API oficial.

Motivos:
- REST + Webhooks prontos (sem wrapper próprio)
- Multi-instância nativa (1 time → N dispositivos)
- Suporte RabbitMQ/SQS
- Docker oficial, deploy ~10min
- Comunidade BR ativa
- Open source (Apache 2.0)

Trade-offs aceitos:
- Risco de ban (mitigar com rate limiting + warm-up)
- Atualizações dependem da comunidade
- Migração futura pra WhatsApp Cloud API quando MRR > R$ 30k

**Descartadas:**
- Baileys puro: teríamos que reescrever camada REST/webhook/multi-instância
- WhatsApp Cloud API: inviável pro caso "meu WhatsApp pessoal"
- WPPConnect: comunidade menor

### 3.2 Fluxo end-to-end de transcrição

```
Áudio → Evolution recebe → webhook → API Route Next.js
      → enfileira job stt-queue (BullMQ)
      → STT worker: baixa .ogg → Groq Whisper → aplica word_corrections
      → persiste transcriptions + usage_records
      → decisão pipeline:
           duração > 2min E plano >= Pro → summarize-queue
           idioma ≠ user setting E plano >= Pro → translate-queue
           senão → wa-send-queue
      → WA send worker: monta card + Evolution sendText (quoted)
      → Supabase Realtime atualiza painel
```

---

## 4. Design system fechado (via skill `ui-ux-pro-max`)

- **Estilo:** Dark Mode (OLED) + toques de Glassmorphism em modais
- **Landing pattern:** Hero + Bento Grid + Pricing + CTA
- **Cor primária:** `#0D9488` (teal-600)
- **Accent:** `#14B8A6` (teal-500)
- **CTA:** `#F97316` (orange-500) — botões de upgrade/conversão
- **Fundo:** `#0A0A0A` (app) / `#111111` (cards)
- **Texto:** `#F8FAFC` (dark) / `#134E4A` (light)
- **Tipografia:** Plus Jakarta Sans (300–700) + JetBrains Mono
- **Ícones:** Lucide (24px viewBox, uniforme)
- **Cards:** `border-white/5`, `rounded-xl` (12px)
- **Efeitos:** glow mínimo nos CTAs, transições 200ms
- **Mockup hero:** iPhone com card de transcrição

**Anti-patterns evitar:**
- Light mode como padrão
- Animações > 300ms em micro-interactions
- Emojis como ícones
- Hover com scale (causa layout shift)

**Templates de referência:**
- shadcn/ui blocks `dashboard-01` + `sidebar-07` (idênticos ao print Ziptalk)
- Linear (densidade)
- Cal.com (settings/billing)
- Vercel (cards de uso)
- Resend (landing)

---

## 5. Estado do repo (commits feitos)

Branch **`claude/review-app-concept-bqoGF`** em `obrunosaraiva/testes`.

### Commits pushados
1. `docs: adicionar PRD do clone Ziptalk` — PRD inicial
2. `docs(prd): fechar decisões de stack, arquitetura e design system`
3. `feat: inicializar monorepo Ziptalk (Turborepo)` — estrutura base
4. `feat(spike): pipeline end-to-end Evolution → Groq → WhatsApp`
5. `feat(spike): adicionar smoke-groq + ajustes Linux + busca QR explícita`
6. `feat(supabase): aplicar schema, RLS, auth e clientes no projeto audiozap`

### Estrutura atual (folder ainda chamado `ziptalk/`)
```
ziptalk/
├── apps/
│   ├── web/                     # Next.js 15 + Tailwind + shadcn-ready
│   │   └── src/
│   │       ├── app/
│   │       │   ├── page.tsx                # Landing (hero + features + pricing)
│   │       │   ├── layout.tsx
│   │       │   ├── globals.css             # Design tokens (dark/teal)
│   │       │   ├── login/page.tsx          # Login email+senha + Google OAuth
│   │       │   └── auth/callback/route.ts  # Handler OAuth
│   │       ├── lib/
│   │       │   ├── utils.ts
│   │       │   └── supabase/
│   │       │       ├── server.ts           # Server Components / Route Handlers
│   │       │       ├── client.ts           # Client Components
│   │       │       └── admin.ts            # service_role (workers/webhooks)
│   │       └── middleware.ts               # Protege /app, /dashboard, /settings
│   └── workers/
│       └── stt/                            # Worker BullMQ + spike
│           ├── src/
│           │   ├── groq-stt.ts             # Cliente Groq Whisper
│           │   ├── smoke-groq.ts           # ✅ VALIDADO (404ms)
│           │   ├── spike.ts                # Spike end-to-end
│           │   └── index.ts                # Worker produção
│           └── SPIKE.md                    # Passo a passo 5min
├── packages/
│   ├── db/
│   │   ├── src/schema/index.ts             # 11 tabelas Drizzle
│   │   └── drizzle/
│   │       ├── 0000_last_hellion.sql       # Schema base
│   │       └── 0001_rls_and_triggers.sql   # RLS + auth trigger
│   ├── shared/
│   │   └── src/
│   │       ├── constants.ts                # PLANS, ROLES, TRANSCRIPTION_FOOTER
│   │       └── types.ts                    # Zod schemas
│   ├── ui/                                 # (vazio, esperando shadcn)
│   └── evolution-client/
│       └── src/index.ts                    # Wrapper tipado Evolution v2
├── docker/
│   └── docker-compose.yml                  # Evolution + Postgres + Redis
├── docs/
│   └── SUPABASE-SETUP.md
├── package.json                            # Nome: "ziptalk" (deveria: "audiozap")
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## 6. ⚠️ Pendências não commitadas (perdidas na compactação)

Trabalho feito no fim da sessão que **não foi commitado**:

### 6.1 Rename ziptalk → audiozap (TUDO precisa ser refeito)
- `mv ziptalk/ audiozap/`
- Package names `@ziptalk/*` → `@audiozap/*` em todos os package.json
- `SPIKE_INSTANCE=audiozap_spike` (não `ziptalk_spike`)
- Nome do produto nos textos (landing, login, TRANSCRIPTION_FOOTER)
- Docker container names, network name
- Referências em SPIKE.md, README, SUPABASE-SETUP.md

**Preservar:** `PRD-Ziptalk-Clone.md` mantém "Ziptalk" quando referencia o
concorrente. Explicitar na primeira seção: "AudioZap é nosso produto, clone
do conceito Ziptalk".

### 6.2 Symlink pro Next.js achar o .env
```bash
cd audiozap/apps/web && ln -sf ../../.env .env.local
```
Necessário porque Next.js só lê `.env` do dir do app, não da raiz do monorepo.

### 6.3 Ajustes nas migrations Drizzle
- `.env.local` symlink precisa ser criado
- `drizzle.config.ts` funciona só com DATABASE_URL setada (falta a senha do banco)

---

## 7. Serviços configurados

### 7.1 Supabase — `audiozap` (`jaaumheftejmuwrknekw`)
- **11 tabelas** criadas via Drizzle migration `0000_last_hellion.sql`
- **RLS habilitado** em todas
- **17 policies** isolando por team
- **Trigger `on_auth_user_created`** sincroniza `auth.users` → `public.users`
- **Helper `public.user_team_ids()`** pra uso nas policies

Tabelas: `users`, `teams`, `team_members`, `devices`, `contacts`,
`transcriptions`, `word_corrections`, `subscriptions`, `invoices`,
`usage_records`, `forwarding_rules`.

### 7.2 Evolution API — hosted em `whatsapp.activesales.com.br`
- Servidor **compartilhado** (6 instâncias de outros projetos: `bruno`,
  `ActiveSales`, `tenant-desafiotirabucho`, `tenant-ihf`, `tenant-desafio2-0-spy`,
  `testespy`)
- ⚠️ **Nunca mexer nas outras instâncias**
- Nossa instância: `audiozap_spike` (a `ziptalk_audiozap_spike` criada por
  engano foi deletada + logout limpo)
- Versão: 2.3.7

### 7.3 Groq
- Free tier (usuário confirmou que não tem cartão)
- Chave testada: smoke-test passou em **404ms** ✅
- Modelo: `whisper-large-v3`
- Endpoint: `/openai/v1/audio/transcriptions`

---

## 8. Credenciais (em `audiozap/.env` local, NÃO commitado)

Todas as chaves estão no `.env` da raiz do monorepo (fora do git via `.gitignore`).

**Chaves compartilhadas nesta conversa:**
- Groq API key: `gsk_0CVy…` (recomendei revogar e gerar nova)
- Supabase Personal Access Token: `sbp_df03…` (idem)
- Evolution API URL + Key (hosted em whatsapp.activesales.com.br)

> 🔐 **Recomendação de segurança pendente:** revogar e regerar todas as chaves
> compartilhadas em chat depois do MVP funcionar. Chaves antigas ficam
> potencialmente logadas em telemetria/histórico.

---

## 9. Validações feitas

- ✅ **Smoke test Groq:** transcrição em 404ms, formato OK, chave válida
- ✅ **Evolution health check:** v2.3.7 respondendo, autenticação OK
- ✅ **Docker compose:** Evolution + Postgres + Redis sobem localmente
- ✅ **Supabase migrations:** 11 tabelas + 17 policies + trigger aplicados via
  Management API (não via psql direto — evita precisar senha do banco)
- ✅ **Typecheck monorepo:** 5/5 pacotes passam
- ✅ **Next.js dev:** compila e sobe em localhost:3000 (com .env.local symlink)
- ⏳ **Spike end-to-end WhatsApp:** falta parear celular real com QR
- ⏳ **Screenshots do painel:** tirados mas rejeitados na entrega (tentativa
  com Playwright funcionou mas artefatos foram removidos)

---

## 10. Perguntas em aberto (para o Bruno decidir)

1. **Áudios armazenados 24h ou descartados imediatamente após STT?**
2. **Como funciona "transcrição privada"?** DM com bot dedicado, e-mail ou só painel?
3. **Suporte a grupos WhatsApp:** pós-MVP ou v2?
4. **Pix vs cartão no MVP:** ambos (Asaas + Stripe) ou só Stripe primeiro?
5. **Enterprise:** self-service ou demo agendada?
6. **Onboarding:** wizard inline ou tour guiado?
7. **Bot responde citando (reply) o áudio original ou como mensagem solta abaixo?**

---

## 11. Próximos passos sugeridos (ordem recomendada)

### Imediato (redoing lost work)
1. **Refazer rename ziptalk → audiozap** e commitar
2. **Criar symlink `.env.local`** em `apps/web/`

### Curto prazo (MVP)
3. **Setup Google OAuth** no Supabase (client ID/secret do Google Cloud)
4. **Endpoint `/api/webhook/evolution`** no Next.js (substitui HTTP server do spike)
5. **Layout do painel** com shadcn `dashboard-01` + `sidebar-07`
6. **Onboarding pós-login:** criar time → conectar primeiro WhatsApp (QR flow)
7. **Página `/app/devices`** com CRUD + QR display
8. **Página `/app/usage`** com consumo real + gráficos (Tremor)
9. **Página `/app/settings/team`** com membros + convites
10. **Página `/app/billing`** com Stripe checkout

### Médio prazo (monetização)
11. Worker BullMQ persistindo transcrições no banco (substituir spike)
12. Bifurcação de pipeline: summarize + translate + private mode
13. Filtro de ofensivas + word_corrections aplicando na transcrição
14. Landing page com waitlist + captação de leads

### Longo prazo (escala)
15. Múltiplos números + roles do time
16. Encaminhamento automático
17. Assistente virtual via WhatsApp
18. Plano Enterprise + Pix (Asaas)
19. Migração pra WhatsApp Cloud API oficial (quando MRR > R$ 30k)

---

## 12. Arquivos gerados nesta sessão

Todos em `/home/user/testes/`:

- `PRD-Ziptalk-Clone.md` — PRD completo, 14 seções
- `ziptalk/` (deveria ser `audiozap/`) — monorepo Turborepo completo
- `ziptalk/docs/SUPABASE-SETUP.md` — o que foi aplicado + passos manuais restantes
- `ziptalk/apps/workers/stt/SPIKE.md` — como validar spike em 5min
- `MEMORIA-CHAT.md` — este arquivo

---

## 13. Aprendizados / observações

- **Rename tardio custa muito:** eu chamei tudo de "ziptalk" (que é o
  concorrente) e só descobri no fim que o produto do usuário é "audiozap".
  Deveria ter perguntado o nome real do produto **antes** de criar o monorepo.
- **Sessão longa + compactação:** o rename final não sobreviveu à compactação
  do contexto. Regra pra frente: commitar mudanças estruturais grandes ANTES
  de qualquer outra coisa.
- **Segurança pragmática:** usuário disse "faz tudo pra mim" e colou chaves em
  chat. Aceitei operar assim mas registrei recomendação de rotação.
- **Evolution hosted vs. local:** começamos com Docker local (bom pra dev),
  depois migramos pra Evolution hosted compartilhado (mais realista, mas com
  risco de conflitar com outras instâncias — usei nome único).
- **Sandbox vs. real:** conseguimos validar Groq e migrations do sandbox, mas
  parear WhatsApp precisa da máquina do usuário (QR físico).
