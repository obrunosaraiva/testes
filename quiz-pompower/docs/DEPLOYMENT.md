# Deployment — Diagnóstico Íntimo

Este documento explica como configurar o ambiente de DEV (Supabase cloud
separado, rodando localmente) e PROD (Supabase + Railway, deploy via GitHub
Actions na branch `quiz-pompower-prod`).

> **Regra de ouro:** **nunca** comite token, senha ou chave neste repo. Tudo
> sensível mora em `.env.local` (gitignored), GitHub Secrets, ou nas Variables
> do Railway.

---

## 1. Branches

| Branch                              | Função                                                |
| ----------------------------------- | ----------------------------------------------------- |
| `claude/setup-quiz-pompower-ZyzLK`  | Branch de DEV/feature ativa. CI roda em todo push.    |
| `quiz-pompower-prod`                | Branch de PROD. Push aqui dispara `deploy-prod`.      |

CI (`.github/workflows/quiz-pompower-ci.yml`) roda em qualquer branch
`quiz-pompower-*` ou `claude/setup-quiz-pompower-*` quando há mudanças em
`quiz-pompower/**`.

Deploy (`.github/workflows/quiz-pompower-deploy-prod.yml`) roda **apenas** em
push para `quiz-pompower-prod` e faz, em sequência:

1. Verifica typecheck + lint + tests
2. Aplica migrations no Supabase PROD (`supabase db push`)
3. Deploya o app no Railway (`railway up`)

---

## 2. Setup do ambiente DEV (uma vez)

### 2.1 Crie um SEGUNDO projeto Supabase para DEV

Você já tem o PROD em `okpdrtngfjfubqrffvtq.supabase.co`. Crie outro projeto
**totalmente separado** pra DEV:

1. https://supabase.com/dashboard → New project
2. Anota o `Project Ref` (parte da URL, ex: `abcdefg...`) e a
   `Database Password` que você definir
3. Em Settings → API, copia a `URL`, a `anon public key` e a
   `service_role key` (essa é secreta)

### 2.2 Aplica as migrations no DEV

Logado localmente (uma vez por máquina):

```bash
cd quiz-pompower
npx supabase login                         # abre o browser
npx supabase link --project-ref <DEV_REF>  # senha do DB DEV
npx supabase db push                       # aplica supabase/migrations/*
```

> Atenção: o `supabase/config.toml` está apontando pro REF do PROD por padrão.
> Quando você roda `supabase link --project-ref <DEV_REF>`, o link local vira
> DEV (sobrescreve a referência ativa). Pra trocar de volta:
> `supabase link --project-ref okpdrtngfjfubqrffvtq`.

### 2.3 Cria o usuário admin (expert) no DEV

No Supabase Dashboard do projeto DEV:

1. Authentication → Users → "Add user" → e-mail + senha
2. Copia o UUID gerado
3. Roda este SQL no SQL Editor (substituindo o UUID e o e-mail):

```sql
insert into public.profiles (id, email, full_name, role)
values (
  '<UUID_DO_USUARIO>',
  'expert@dominio-da-expert.com',
  'Nome da Expert',
  'admin'
);
```

### 2.4 Cria `.env.local`

```bash
cp .env.example .env.local
```

Edita com os valores do DEV:

```
NEXT_PUBLIC_SUPABASE_URL=https://<DEV_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev anon key>
SUPABASE_SERVICE_ROLE_KEY=<dev service key>
RESEND_API_KEY=                            # vazio até a Fase 3
NEXT_PUBLIC_APP_URL=http://localhost:3000
EXPERT_NAME=Nome da Expert
```

### 2.5 Roda local

```bash
npm install
npm run dev
# http://localhost:3000
```

---

## 3. Setup do ambiente PROD (uma vez)

### 3.1 GitHub Secrets

Em https://github.com/obrunosaraiva/testes/settings/secrets/actions adiciona:

| Secret                       | Valor                                                       |
| ---------------------------- | ----------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN`      | PAT da sua conta Supabase (gerar **novo** em Account → Tokens) |
| `SUPABASE_PROJECT_REF`       | `okpdrtngfjfubqrffvtq`                                      |
| `SUPABASE_DB_PASSWORD`       | senha do DB do projeto PROD                                 |
| `RAILWAY_TOKEN`              | token de project do Railway (gerar **novo**)                |
| `RAILWAY_SERVICE_NAME`       | nome do serviço Railway (ex: `quiz-pompower`)               |

> Os tokens vazados anteriormente devem ser revogados em
> https://supabase.com/dashboard/account/tokens e
> https://railway.app/account/tokens. Gere novos e cole **direto no GitHub
> Secrets**, não em chat nem em arquivo.

### 3.2 Railway

1. Em https://railway.com → New Project → Deploy from GitHub repo →
   `obrunosaraiva/testes`
2. **Root Directory:** `quiz-pompower`
3. **Watch Paths:** `quiz-pompower/**`
4. **Branch:** `quiz-pompower-prod`
5. **Builder:** Dockerfile (já detectado via `railway.json`)

Variables (Railway → seu serviço → Variables):

| Variável                      | Valor                                                |
| ----------------------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`    | `https://okpdrtngfjfubqrffvtq.supabase.co`           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `<prod anon key>`                                  |
| `SUPABASE_SERVICE_ROLE_KEY`   | `<prod service role key>` — NUNCA expor publicamente |
| `RESEND_API_KEY`              | (vazio até Fase 3)                                   |
| `NEXT_PUBLIC_APP_URL`         | `https://quizz-pompower-production.up.railway.app`   |
| `EXPERT_NAME`                 | Nome da Expert                                       |
| `PORT`                        | (Railway define automaticamente)                     |

### 3.3 Cria o usuário admin no Supabase PROD

Mesmo processo da seção 2.3, mas no projeto PROD `okpdrtngfjfubqrffvtq`.

---

## 4. Fluxo de trabalho dia a dia

```
1. Você desenvolve em `claude/setup-quiz-pompower-ZyzLK` (ou outra branch dev)
   - npm run dev
   - npm test
   - git push                     → CI valida no GitHub

2. Pronto pra promover pra produção:
   git checkout quiz-pompower-prod
   git merge claude/setup-quiz-pompower-ZyzLK
   git push origin quiz-pompower-prod
                                  → Workflow deploy-prod roda:
                                    a) verify (typecheck/lint/test)
                                    b) supabase db push (PROD)
                                    c) railway up (PROD)
```

Se a etapa (b) falhar, a (c) não roda. Se a (c) falhar, o app continua na
versão anterior no Railway (rollback automático em healthcheck).

---

## 5. Rollback de emergência

### Railway

Em Railway → Deployments → escolhe um deploy anterior → "Redeploy".

### Supabase

Migrations são forward-only. Se uma migration quebrou PROD:

1. Cria uma nova migration que **reverte** a anterior:
   ```bash
   npx supabase migration new revert_001_xxx
   # edita o SQL com `drop table`, `alter table drop column`, etc.
   ```
2. Push pra `quiz-pompower-prod` — o workflow aplica a reversão.

> Nunca edita uma migration já aplicada em PROD. Sempre cria uma nova.

---

## 6. Checklist antes do primeiro deploy PROD

- [ ] 4 tokens vazados em chat foram **revogados** (GitHub × 2, Supabase, Railway)
- [ ] GitHub Secrets configurados (seção 3.1)
- [ ] Projeto Railway criado e linkado ao repo
- [ ] Variables do Railway preenchidas (seção 3.2)
- [ ] Domínio Railway publicado (https://quizz-pompower-production.up.railway.app)
- [ ] Usuário admin criado no Supabase PROD (seção 3.3)
- [ ] Smoke test em DEV: quiz roda, dashboard admin abre
