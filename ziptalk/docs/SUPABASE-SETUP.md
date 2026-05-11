# Setup Supabase — `audiozap`

> Documenta o que **já está feito** e o que **falta configurar manualmente**.

## ✅ Já configurado automaticamente

### Schema
11 tabelas criadas via Drizzle migrations:
- `users` (sync com `auth.users`)
- `teams` + `team_members`
- `devices` + `contacts` + `transcriptions`
- `word_corrections`
- `subscriptions` + `invoices`
- `usage_records`
- `forwarding_rules`

### Row Level Security
- **RLS habilitado** em todas as 11 tabelas
- **17 policies** ativas garantindo isolamento por time
- Service role bypassa RLS (workers funcionam normalmente)

### Trigger de auth
- `on_auth_user_created` em `auth.users`
- Quando alguém faz signup, cria automaticamente row em `public.users`
  com `id`, `email`, `name` (do Google ou e-mail), `avatar_url`

### Cliente
- `apps/web/src/lib/supabase/server.ts` — Server Components / Route Handlers
- `apps/web/src/lib/supabase/client.ts` — Client Components
- `apps/web/src/lib/supabase/admin.ts` — service_role (workers, webhooks)
- `apps/web/src/middleware.ts` — proteção de rotas + redirect

### Páginas
- `/login` — e-mail/senha + Google OAuth
- `/auth/callback` — handler do retorno do OAuth

---

## ⏳ O que falta configurar (no painel Supabase)

### 1. Habilitar Google OAuth
Acesse: https://supabase.com/dashboard/project/jaaumheftejmuwrknekw/auth/providers

1. Encontre **Google** na lista
2. Toggle ON
3. Você vai precisar de:
   - **Client ID** (Google Cloud Console)
   - **Client Secret** (Google Cloud Console)
4. Copie a **Authorized redirect URI** que o Supabase mostra
   (algo como `https://jaaumheftejmuwrknekw.supabase.co/auth/v1/callback`)

#### Como gerar Client ID/Secret no Google
1. https://console.cloud.google.com/apis/credentials
2. Criar Projeto (ou usar existente)
3. "OAuth consent screen" → External → preencher (nome do app, email)
4. "Credentials" → Create → OAuth Client ID → Web application
5. Authorized redirect URIs: cole a do Supabase
6. Copia Client ID + Secret de volta no Supabase

### 2. Configurar Site URL e Redirect URLs
Acesse: https://supabase.com/dashboard/project/jaaumheftejmuwrknekw/auth/url-configuration

- **Site URL:** `http://localhost:3000` (dev) ou `https://ziptalk.ai` (prod)
- **Redirect URLs:** adicione
  - `http://localhost:3000/auth/callback`
  - `https://ziptalk.ai/auth/callback` (quando subir)

### 3. (Opcional) Personalizar templates de e-mail
Acesse: https://supabase.com/dashboard/project/jaaumheftejmuwrknekw/auth/templates

Customizar:
- "Confirm signup" — assunto e corpo em PT-BR
- "Magic link"
- "Reset password"

---

## Como rodar localmente

```bash
cd ziptalk
pnpm install
pnpm dev    # painel sobe em http://localhost:3000
```

Login funciona imediatamente com **e-mail/senha**. Para Google, complete o passo 1 acima.

## Verificar via SQL

```bash
# Listar tabelas
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT tablename FROM pg_tables WHERE schemaname = '"'"'public'"'"';"}' \
  https://api.supabase.com/v1/projects/jaaumheftejmuwrknekw/database/query

# Ver policies
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT tablename, policyname FROM pg_policies WHERE schemaname = '"'"'public'"'"';"}' \
  https://api.supabase.com/v1/projects/jaaumheftejmuwrknekw/database/query
```
