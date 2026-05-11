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

## 8. Arquitetura Técnica (proposta)

### 8.1 Stack sugerida
- **Frontend web:** Next.js 15 + Tailwind + shadcn/ui (já alinhado com o tema dark/teal)
- **Backend API:** Node.js (NestJS) ou Python (FastAPI)
- **Banco:** PostgreSQL (Supabase ou RDS)
- **Cache/Fila:** Redis + BullMQ
- **WhatsApp:** Baileys (TypeScript) — mais leve que whatsapp-web.js
- **STT:** OpenAI Whisper (API) como primário, Deepgram como fallback/idiomas
- **LLM (resumo/tradução/assistente):** Claude Sonnet 4.6 via API Anthropic
- **Auth:** Supabase Auth ou Clerk (Google + Email)
- **Pagamentos:** Stripe + Pagar.me (Pix/Boleto BR)
- **Infra:** Vercel (front) + Fly.io ou Railway (backend + workers)
- **Observabilidade:** Sentry + PostHog

### 8.2 Componentes principais
```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Next.js    │────▶│   API REST   │────▶│  PostgreSQL  │
│  (painel)   │     │  (NestJS)    │     │              │
└─────────────┘     └──────┬───────┘     └──────────────┘
                           │
                    ┌──────▼───────┐
                    │ Redis + Bull │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ WA Workers   │   │ STT Workers  │   │ LLM Workers  │
│  (Baileys)   │   │ (Whisper)    │   │ (Claude)     │
└──────────────┘   └──────────────┘   └──────────────┘
```

### 8.3 Modelo de dados (entidades-chave)
- `users` (id, email, name, avatar_url, locale, theme)
- `teams` (id, name, slug, timezone, owner_id, plan_id)
- `team_members` (team_id, user_id, role)
- `devices` (id, team_id, phone_number, status, session_data)
- `transcriptions` (id, device_id, contact_id, audio_duration, text, language, created_at)
- `word_corrections` (id, team_id, pattern, replacement)
- `usage_records` (id, team_id, device_id, contact_id, type, duration_seconds, created_at)
- `subscriptions` (id, team_id, plan, status, stripe_id, current_period_end)
- `invoices` (id, subscription_id, amount, status, pdf_url)

---

## 9. Design / Identidade Visual

- **Tema:** dark predominante (#0A0A0A bg, #1A1A1A cards)
- **Cor primária:** verde menta/teal (#00E5A8 aprox.)
- **Tipografia:** sans-serif moderna (Inter ou Geist)
- **Ícones:** Lucide
- **Cards** com borda sutil, cantos arredondados (12-16px)
- **Mockup hero:** iPhone mostrando integração WhatsApp + balão de transcrição com selo Ziptalk

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

1. WhatsApp Business API oficial (Meta Cloud API) ou biblioteca não-oficial (Baileys)? Trade-off custo vs. risco.
2. Áudios devem ser **armazenados** ou apenas processados e descartados?
3. Modelo de "Transcrição privada" — texto vai pra onde? Bot privado? E-mail? Painel?
4. Suporte a grupos é prioridade pós-MVP ou v2?
5. Pix vs. Cartão — começar com qual?
6. Self-service vs. demo agendada para Enterprise?

---

## 14. Próximos Passos

1. Validar este PRD com Bruno
2. Wireframes de baixa fidelidade dos fluxos críticos
3. Protótipo de alta fidelidade (Figma)
4. Setup inicial do repo (monorepo: web + api + workers)
5. Spike técnico: Baileys + Whisper end-to-end
6. Landing page para captura de leads
