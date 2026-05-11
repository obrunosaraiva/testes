# PRD — Clone Ziptalk

**Versão:** 0.1 (draft)
**Data:** 2026-05-11
**Autor:** Bruno Saraiva
**Status:** Em definição

---

## 1. Visão Geral

### 1.1 O Produto
Um SaaS B2C/B2B que se conecta ao número de WhatsApp do usuário e **transcreve automaticamente todo áudio recebido (ou enviado)**, respondendo na mesma conversa com o texto transcrito por IA. Inclui camada de IA adicional (resumo, tradução, assistente virtual) e um painel web para gerenciar dispositivos, consumo, time e assinatura.

### 1.2 Proposta de Valor
"Pare de ouvir áudio. Leia." — Para quem recebe muitos áudios no WhatsApp e perde tempo/produtividade ouvindo mensagens longas em momentos inadequados (reunião, transporte, ambiente barulhento).

### 1.3 Diferencial vs. concorrentes
- Transcrição **dentro da própria conversa** (não em app externo)
- Pacote completo: transcrição + resumo + tradução + assistente
- Suporte multi-número e multi-membro (times)
- Correções de palavras customizadas (jargão, marcas, nomes próprios)

---

## 2. Problema & Oportunidade

### 2.1 Problema
- Áudios longos no WhatsApp consomem tempo desproporcional
- Difícil escutar em contexto inadequado (reuniões, lugares barulhentos, acessibilidade)
- Áudios não são pesquisáveis nem encaminháveis como texto
- Apps externos quebram o fluxo (precisa baixar, exportar, colar)

### 2.2 Oportunidade
- Brasil é um dos maiores mercados de áudio do WhatsApp do mundo
- Profissionais liberais, advogados, vendedores, gestores e atendimento recebem volume alto
- Ticket de R$ 70 a R$ 360/mês é viável para o público alvo

---

## 3. Público-Alvo

### 3.1 Personas
- **P1 — Vendedor/Closer:** recebe áudios de leads e gestores, precisa de velocidade.
- **P2 — Advogado/Contador:** recebe áudios de clientes, precisa de registro escrito.
- **P3 — Pequeno empresário/Gestor:** gerencia time via WhatsApp, precisa de resumo e encaminhamento.
- **P4 — Atendimento/SAC:** alto volume, múltiplos números, precisa colaboração em time.

### 3.2 Mercado
- TAM: profissionais brasileiros ativos no WhatsApp Business (~30M)
- SAM: profissionais que recebem >5 áudios/dia (~5M)
- SOM ano 1: 5k usuários pagantes

---

## 4. Escopo Funcional

### 4.1 Funcionalidades MVP (v1.0)

#### F1 — Conexão de dispositivo (WhatsApp)
- Adicionar número via QR code (whatsapp-web.js / Baileys)
- Listar dispositivos conectados
- Status de conexão (ativo/inativo)
- Desconectar / remover dispositivo
- Limite de dispositivos por plano

#### F2 — Transcrição automática
- Detectar áudio recebido na conversa monitorada
- Enviar áudio para serviço de STT (Whisper / Deepgram / Google STT)
- Responder na mesma conversa com card de transcrição
- Formato do card:
  - Header: "Você" / nome + ícone microfone + "Mensagem de voz (MM:SS)"
  - Corpo: texto transcrito
  - Footer: "⚡ Transcrição com IA por Ziptalk" + horário
- **Não funciona em grupos** (MVP)
- Idioma detectado automaticamente

#### F3 — Painel Web (dashboard)
- Login (email/senha + Google OAuth)
- Página inicial com cards:
  - Dispositivos conectados (count)
  - Status ativo
  - Consumo do mês (min usados / limite) com barra de progresso
  - CTA "Assinar plano" se Free
  - Atalho "Fale com o assistente virtual"
- Menu lateral: Painel, Dispositivos, Correções de palavras, Time, Uso, Assinatura

#### F4 — Correções de palavras
- CRUD de regras `padrão → substituição`
- Aplicadas automaticamente em todas as transcrições do time
- Suporte a múltiplos padrões por substituição

#### F5 — Consumo & Uso
- Tracking de minutos por dispositivo, contato e período
- Página de "Uso Mensal" com:
  - Seletor de período
  - Total de minutos / limite do plano
  - Histórico dos últimos 6 meses
  - Tabela Uso por dispositivo (segundos)
  - Tabela Uso por contato (segundos)
  - Atividade recente (filtrável por dispositivo/contato/tipo) + exportar CSV

#### F6 — Time (workspace)
- Criar time com avatar, nome, identificador (slug), fuso horário
- Convidar membros por e-mail (papéis: Proprietário, Admin, Membro)
- Listar membros e remover

#### F7 — Assinatura & Cobrança
- Planos (ver seção 7) com slider de minutos
- Checkout via Stripe (cartão internacional) + integração futura com Pagar.me/Pix (Brasil)
- E-mail de cobrança configurável
- Endereço de cobrança (BR + internacional)
- CNPJ/CPF para nota fiscal
- Histórico de faturas

#### F8 — Perfil
- Avatar, nome, e-mail (com confirmação para troca)
- Autenticação: senha, vínculo Google
- Exclusão de conta (após sair de todos os times)
- Idioma da interface (14 idiomas)
- Tema: sistema / claro / escuro

### 4.2 Funcionalidades v1.1+ (planos pagos)
- **Resumo IA** de transcrições longas (>2 min)
- **Tradução** de transcrições (idioma origem → destino)
- **Transcrições privadas** (texto enviado apenas em chat privado com bot, não na conversa original)
- **Filtro de mensagens ofensivas** (mascarar palavrões)
- **Conexão ilimitada de números**
- **Encaminhamento automático** (regra: áudios de contato X → encaminhar transcrição para contato Y)
- **Assistente virtual** via WhatsApp (comandos: saldo, configurações, suporte, envio de áudio para transcrição manual)

### 4.3 Fora de escopo (MVP)
- Suporte a grupos do WhatsApp
- App mobile nativo (usar PWA)
- Integrações com CRM
- API pública
- Áudios em vídeo (vídeo-chamadas, videos do WhatsApp)
- Transcrição de chamadas de voz

---

## 5. Fluxos de Usuário (User Flows)

### 5.1 Onboarding
1. Usuário acessa ziptalk.ai → "Começar grátis"
2. Cadastro (Google ou e-mail/senha) → recebe 30 min grátis
3. Wizard: cria Time (nome + fuso) → adicionar primeiro WhatsApp
4. Escaneia QR code com WhatsApp → dispositivo conectado
5. Tutorial: envia/recebe um áudio teste → recebe transcrição
6. Redireciona para Painel

### 5.2 Uso recorrente (transcrição)
1. Contato envia áudio no WhatsApp do usuário
2. Bot detecta o áudio → envia para STT
3. Bot posta card de transcrição na mesma conversa, abaixo do áudio
4. Minutos consumidos são deduzidos do saldo do mês
5. Se atingir 80% do limite → enviar e-mail + notificação no painel
6. Se atingir 100% → parar de transcrever + sugerir upgrade

### 5.3 Upgrade de plano
1. Usuário acessa Assinatura
2. Slider para escolher faixa de minutos → mostra plano correspondente
3. Clica em "Assinar" → checkout Stripe
4. Pagamento confirmado → plano ativo imediatamente + recibo por e-mail

---

## 6. Requisitos Não-Funcionais

### 6.1 Performance
- Transcrição de áudio de 1 min em até **10 segundos** (p95)
- Painel web carrega em <2s
- Bot online 99,5% do tempo

### 6.2 Segurança & Privacidade
- LGPD: termos claros sobre armazenamento de áudios
- Áudios processados e **descartados em até 24h** (a menos que o usuário opte por manter histórico)
- Transcrições criptografadas em repouso
- 2FA opcional (v1.1)
- Modo "Transcrição privada": texto não vai na conversa original

### 6.3 Escalabilidade
- Suportar 10k dispositivos conectados simultâneos no ano 1
- Fila de processamento (Redis/SQS) para picos
- Auto-scaling do serviço de STT

### 6.4 Confiabilidade
- Backup diário do banco
- Sessões do WhatsApp persistentes (reconexão automática)
- Retry com backoff exponencial em chamadas de STT

### 6.5 Acessibilidade & i18n
- Interface em 14 idiomas (PT-BR base)
- Contraste AA
- Dark mode nativo

---

## 7. Modelo de Negócio (Pricing)

| Plano | Preço/mês | Minutos | Recursos extras |
|---|---|---|---|
| **Free** | R$ 0 | 30 min | Transcrição básica |
| **Pro** | R$ 69,99 | 960 min | + Assistente, Resumo, Tradução, Privada, Filtro |
| **Advanced** | R$ 119,99 | 1.920 min | + Números ilimitados, Encaminhamento |
| **Business** | R$ 199,99 | 3.840 min | + Recursos de time |
| **Enterprise** | R$ 359,99 | 7.680 min | + Gestão centralizada, SLA |

**Add-ons (v1.2):**
- Pacote de minutos avulso
- Onboarding/treinamento (Enterprise)

---

## 8. Arquitetura Técnica (decidida)

### 8.1 Stack definitiva

| Camada | Escolha | Observação |
|---|---|---|
| **Web (painel + landing)** | Next.js 15 (App Router) + TypeScript | Monorepo com Turborepo |
| **UI** | Tailwind v4 + shadcn/ui + Lucide icons | Base: blocks `dashboard-01` + `sidebar-07` |
| **Tipografia** | Plus Jakarta Sans (UI) + JetBrains Mono (IDs/códigos) | Google Fonts |
| **Auth** | Supabase Auth (Google + Email/senha) | Magic links + RLS |
| **Banco** | Supabase Postgres + Drizzle ORM | RLS para multi-tenant |
| **Realtime** | Supabase Realtime | Atualizar consumo/transcrição ao vivo no painel |
| **Storage** | Supabase Storage | Áudios temporários (TTL 24h) |
| **Fila/Cache** | Upstash Redis + BullMQ | Jobs de STT, LLM, envio WhatsApp |
| **WhatsApp** | **Evolution API v2** (Docker, self-hosted) | Multi-instância, webhooks |
| **STT** | Groq Whisper Large v3 (primário) + OpenAI Whisper (fallback) | Groq é ~20x mais barato e p95 sub-segundo |
| **LLM** | Claude Sonnet 4.6 via SDK Anthropic + prompt caching | Resumo, tradução, assistente, filtro ofensivas |
| **Pagamento** | Stripe (cartão internacional) + Asaas (Pix/Boleto BR) | Asaas tem taxa menor que Pagar.me |
| **Infra** | Vercel (Next.js) + Railway (Evolution + workers + Redis) | Evolution precisa de container persistente |
| **Observabilidade** | Sentry (erros) + PostHog (analytics) + Axiom (logs) | |
| **Email transacional** | Resend | Convites, recibos, alertas de consumo |
| **CDN/Edge** | Vercel Edge + Cloudflare R2 (assets) | |

### 8.2 Decisão: Evolution API (vs. Baileys puro / Cloud API oficial)

**Escolhido: Evolution API v2**

Motivos:
- REST + Webhooks prontos (não precisamos escrever wrapper)
- **Multi-instância nativa** (1 time → N dispositivos)
- Suporte a RabbitMQ/SQS (encaixa no nosso BullMQ)
- Docker oficial, deploy em ~10min
- Comunidade BR ativa (essencial pro mercado-alvo)
- Open source (Apache 2.0)

Trade-offs aceitos:
- Risco de ban do número (mitigamos com rate limiting + warm-up)
- Atualizações dependentes da comunidade
- Migração futura para WhatsApp Cloud API quando MRR > R$ 30k e selo verde for prioridade

Alternativas descartadas:
- **Baileys puro:** teríamos que reescrever toda a camada REST/webhook/multi-instância
- **WhatsApp Cloud API oficial:** inviável para "transcrever meu próprio WhatsApp pessoal" — exige número Business novo, cobra por conversa, exige templates aprovados
- **WPPConnect:** comunidade menor, menos manutenção

### 8.3 Arquitetura de componentes

```
┌──────────────┐         ┌─────────────────┐
│   Next.js    │────────▶│  API Routes     │
│ (painel+land)│         │  (Next.js)      │
└──────────────┘         └────────┬────────┘
        │                         │
        │ Realtime                ▼
        │              ┌─────────────────────┐
        └──────────────│ Supabase            │
                       │ (Postgres+Auth+RT)  │
                       └────────┬────────────┘
                                │
                  ┌─────────────┼─────────────┐
                  ▼             ▼             ▼
            ┌──────────┐ ┌───────────┐ ┌──────────┐
            │  Redis   │ │  Stripe   │ │  Resend  │
            │ (BullMQ) │ │   Asaas   │ │  Email   │
            └────┬─────┘ └───────────┘ └──────────┘
                 │
   ┌─────────────┼─────────────┬─────────────┐
   ▼             ▼             ▼             ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Evolution │ │   STT    │ │   LLM    │ │ Billing  │
│   API    │ │  Worker  │ │  Worker  │ │  Worker  │
│ (Docker) │ │  (Groq)  │ │ (Claude) │ │          │
└────┬─────┘ └──────────┘ └──────────┘ └──────────┘
     │ webhooks
     ▼
[WhatsApp - via celular do usuário]
```

### 8.4 Fluxo end-to-end (transcrição)

1. Áudio chega no WhatsApp do usuário
2. Evolution API recebe via WebSocket persistente
3. Evolution dispara webhook `messages.upsert` → `POST /api/webhook/evolution`
4. API valida assinatura HMAC, identifica o `device_id` e enfileira job `stt-queue`
5. **STT worker:**
   - Baixa o áudio (.ogg/opus) da Evolution
   - Faz upload pro Supabase Storage (TTL 24h)
   - Chama Groq Whisper Large v3 → texto + idioma detectado
   - Aplica `word_corrections` do time (regex)
   - Persiste `transcriptions` + `usage_records`
6. **Decisão de pipeline:**
   - Se duração > 2min E plano >= Pro → enfileira `summarize-queue`
   - Se idioma diferente do user setting E plano >= Pro → enfileira `translate-queue`
   - Senão → vai direto pro `wa-send-queue`
7. **WA send worker:**
   - Monta o card formatado (texto + footer "⚡ Transcrição com IA por Ziptalk")
   - Chama `POST /message/sendText/{instance}` da Evolution
   - Marca `transcriptions.delivered_at`
8. Supabase Realtime notifica o painel → atualiza minutos consumidos ao vivo

### 8.5 Estrutura do monorepo

```
ziptalk/
├── apps/
│   ├── web/              # Next.js (landing + painel)
│   └── workers/          # Node.js workers (BullMQ)
│       ├── stt/
│       ├── llm/
│       ├── wa-send/
│       └── billing/
├── packages/
│   ├── db/               # Drizzle schema + migrations
│   ├── shared/           # Tipos, utils, constants
│   ├── ui/               # shadcn/ui customizado
│   └── evolution-client/ # Wrapper tipado da Evolution API
├── docker/
│   ├── evolution.yml     # Compose da Evolution API
│   └── redis.yml
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

### 8.6 Modelo de dados (entidades-chave)

```sql
-- Auth (gerenciado pelo Supabase)
users (id, email, name, avatar_url, locale, theme, created_at)

-- Multi-tenancy
teams (id, name, slug, timezone, owner_id, plan, plan_minutes, billing_email, created_at)
team_members (team_id, user_id, role) -- role: owner|admin|member

-- WhatsApp
devices (id, team_id, evolution_instance_name, phone_number, status, qr_code, connected_at)
contacts (id, device_id, wa_jid, name, avatar_url) -- cache de contatos

-- Core
transcriptions (
  id, device_id, contact_id,
  message_id, audio_url, audio_duration_seconds,
  language, text, summary, translation,
  is_private, delivered_at, created_at
)
word_corrections (id, team_id, pattern, replacement, created_at)

-- Billing & Usage
subscriptions (id, team_id, plan, status, stripe_id, asaas_id, current_period_end)
invoices (id, subscription_id, amount, currency, status, pdf_url, paid_at)
usage_records (
  id, team_id, device_id, contact_id,
  type, -- transcription|summary|translation
  duration_seconds, tokens_used, created_at
)

-- Encaminhamento (v1.1)
forwarding_rules (id, team_id, source_contact, target_contact, enabled)
```

### 8.7 Templates de referência

- **Painel:** shadcn/ui `dashboard-01` + `sidebar-07` (sidebar com switcher de time idêntico ao print)
- **Aesthetic:** Linear (densidade), Cal.com (settings/billing), Vercel (cards de uso), Resend (landing)
- **Charts:** Tremor (gráficos de consumo) + shadcn-charts
- **Tabelas:** TanStack Table + shadcn data-table

---

## 9. Design / Identidade Visual (fechado)

**Design system gerado:**

- **Estilo:** Dark Mode (OLED) com toques de Glassmorphism em modais
- **Pattern landing:** Hero + Bento Grid (features) + Pricing + CTA
- **Cor primária:** `#0D9488` (teal-600)
- **Cor secundária/accent:** `#14B8A6` (teal-500)
- **Cor de CTA:** `#F97316` (orange-500) — para botões de upgrade/conversão
- **Fundo:** `#0A0A0A` (app) / `#111111` (cards) / `#F0FDFA` (light mode)
- **Texto:** `#F8FAFC` (dark) / `#134E4A` (light)
- **Tipografia:** Plus Jakarta Sans (300–700) + JetBrains Mono
- **Ícones:** Lucide (uniforme, 24px viewBox)
- **Cards:** borda `border-white/5`, radius `rounded-xl` (12px), sombra sutil
- **Efeitos:** glow mínimo nos CTAs (`text-shadow: 0 0 10px`), transições 200ms
- **Mockup hero:** iPhone com card de transcrição idêntico ao print do WhatsApp

**Anti-patterns a evitar:**
- Light mode como padrão
- Animações lentas (>300ms em micro-interactions)
- Emojis como ícones
- Hover com scale (causa layout shift)

---

## 10. Métricas de Sucesso (North Star + KPIs)

**North Star:** Minutos de áudio transcritos por mês

**KPIs primários:**
- MRR (Monthly Recurring Revenue)
- Conversão Free → Pago (meta: 5%)
- Churn mensal (meta: <5%)
- NPS (meta: >50)

**KPIs secundários:**
- Tempo médio de transcrição (p95)
- Taxa de erro STT (palavras erradas)
- Dispositivos conectados ativos
- Áudios transcritos / usuário / dia

---

## 11. Roadmap

### Fase 1 — MVP (8 semanas)
- Auth + Times + Conexão WhatsApp + Transcrição básica
- Painel web + Dispositivos + Uso
- Plano Free + Pro (Stripe)
- Landing page

### Fase 2 — Monetização (4 semanas)
- Resumo + Tradução + Transcrição privada
- Correções de palavras
- Filtro de ofensivas
- Planos Advanced/Business

### Fase 3 — Times & Escala (6 semanas)
- Múltiplos membros + papéis
- Múltiplos números
- Encaminhamento automático
- Assistente virtual via WhatsApp
- Plano Enterprise + Pix

### Fase 4 — Crescimento (contínuo)
- Suporte a grupos (com consentimento)
- Integrações (CRM, Zapier)
- App mobile (PWA → nativo)
- API pública

---

## 12. Riscos & Mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Bloqueio do número pelo WhatsApp (uso de API não-oficial) | Alto | Rate limiting interno; migrar para WhatsApp Business API oficial quando viável |
| Custo de STT escalando | Médio | Whisper self-hosted em GPU própria para volume; cache de transcrições idênticas |
| LGPD / privacidade | Alto | Política clara; opt-in para armazenamento; deletar áudios em 24h |
| Concorrência (Ziptalk original, outros bots) | Médio | Diferencial em UX, time e correções de palavras |
| Conversão baixa Free → Pago | Médio | Limite Free apertado (30 min); paywall em features premium |

---

## 13. Perguntas em Aberto

1. ~~WhatsApp oficial vs. não-oficial~~ → **Decidido: Evolution API**, migrar pra Cloud API quando MRR > R$ 30k
2. Áudios: armazenar 24h em Supabase Storage e deletar, ou descartar imediatamente após STT?
3. "Transcrição privada" → texto vai pra DM com bot dedicado, e-mail ou só painel?
4. Suporte a grupos pós-MVP ou v2?
5. Pix vs. cartão → ambos no MVP (Asaas + Stripe) ou só Stripe primeiro?
6. Self-service vs. demo agendada para Enterprise?
7. Onboarding: wizard inline ou tour guiado?
8. Bot vai responder com o card **citando** o áudio original (reply) ou só mensagem solta abaixo?

---

## 14. Próximos Passos

1. ✅ PRD inicial validado
2. ✅ Decisões de stack fechadas (Evolution + Next.js + Supabase + Groq + Claude)
3. ⏳ **Setup do monorepo** (Turborepo + Next.js + shadcn + Supabase + Drizzle)
4. ⏳ **Spike técnico:** Evolution API → Groq Whisper → resposta no WhatsApp
5. Wireframes de baixa fidelidade dos fluxos críticos (Excalidraw/Figma)
6. Implementação MVP em fases (ver Roadmap)
7. Landing page com captura de leads + waitlist
