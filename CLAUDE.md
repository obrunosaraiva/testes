# CLAUDE.md — Kanban Pro

> Documento de contexto do projeto. Lido automaticamente pelo Claude Code no início de cada sessão.

---

## 1. VISÃO GERAL

**Kanban Pro** é um sistema de gestão de projetos completo, com Board, Lista, Gantt, Chat, Mapa Mental e Relatórios. Desenvolvido em React 19 + Vite, com backend Express.js, banco Supabase e deploy no Railway.

**Repositórios:**
- Produção (Railway conectado): `ziminoze/kanban` — branch `main`
- Trabalho secundário: `obrunosaraiva/testes` — branch `claude/kanban-pro-setup-16LO9`

**URLs:**
- App: `https://kanban-production-523d.up.railway.app`
- Supabase project ref: `imsqnoxztoxlmiumdalu`
- Supabase URL: `https://imsqnoxztoxlmiumdalu.supabase.co`

---

## 2. STACK TECNOLÓGICA

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite 5 + CSS puro (sem Tailwind) |
| Backend | Node.js + Express.js |
| Banco de dados | Supabase (PostgreSQL + Realtime + Auth + Storage) |
| Deploy | Railway (auto-deploy via GitHub push) |
| Auth | Supabase Auth (email/senha, confirm email ativo) |
| Realtime | Supabase Realtime (channels para tasks, projects, cost_centers, messages) |
| Push Notifications | web-push (VAPID keys) |
| Segurança | helmet, express-rate-limit, RLS em todas as tabelas |

---

## 3. ESTRUTURA DE ARQUIVOS

```
/
├── server.js                    # Express API + serve static build
├── package.json                 # Dependencies (root)
├── nixpacks.toml                # Railway build config
├── PRD.md                       # Product Requirements Document
├── design-system.md             # Design system completo
├── CLAUDE.md                    # Este arquivo
├── client/                      # Frontend React
│   ├── vite.config.js
│   ├── package.json
│   ├── index.html
│   ├── public/
│   │   └── sw.js                # Service Worker (push notifications)
│   └── src/
│       ├── main.jsx
│       ├── App.jsx              # Roteamento principal de views
│       ├── App.css              # Estilos do board, colunas, cards
│       ├── index.css            # CSS variables, tema dark/light, mobile
│       ├── context/
│       │   ├── KanbanContext.jsx # Estado global (reducer + Supabase CRUD)
│       │   └── RoleContext.jsx  # Roles (admin/editor/viewer) via profiles
│       ├── hooks/
│       │   ├── useAuth.js       # Login/logout
│       │   ├── useTheme.js      # Dark/light mode
│       │   ├── usePush.js       # Push notifications
│       │   ├── useMobile.js     # Breakpoint detection
│       │   └── useConfirm.js    # Modal de confirmação customizado
│       └── components/
│           ├── Header.jsx       # Header + drawer mobile
│           ├── BottomNav.jsx    # Bottom navigation bar (mobile)
│           ├── MobileDrawer.jsx # Menu lateral mobile
│           ├── ProjectBar.jsx   # Tabs de projetos + filtros CC
│           ├── board/
│           │   ├── BoardView.jsx
│           │   ├── Column.jsx
│           │   ├── TaskCard.jsx
│           │   └── MobileBottomNav.jsx
│           ├── list/
│           │   └── ListView.jsx
│           ├── gantt/
│           │   └── GanttView.jsx
│           ├── mindmap/
│           │   └── MindMapView.jsx
│           ├── chat/
│           │   └── ChatView.jsx
│           └── modals/
│               ├── TaskModal.jsx
│               ├── ReportModal.jsx
│               ├── AdminPanel.jsx
│               ├── TrashPanel.jsx
│               ├── TemplatesModal.jsx
│               ├── ResourceLibrary.jsx
│               ├── LoginScreen.jsx
│               ├── SignupScreen.jsx
│               └── ConfirmModal.jsx
└── supabase/
    └── migrations/
```

---

## 4. BANCO DE DADOS — TABELAS SUPABASE

### Tabelas principais:
| Tabela | Descrição |
|--------|-----------|
| `kanban_tasks` | Tarefas |
| `kanban_projects` | Projetos |
| `kanban_cost_centers` | Centros de custo + membros (__mbr_ prefix) |
| `kanban_templates` | Templates de tarefas |
| `kanban_resources` | Repositório de links/docs |
| `kanban_trash` | Lixeira (soft delete) |
| `kanban_messages` | Chat (mensagens por canal) |
| `kanban_push_subscriptions` | Push notifications |
| `profiles` | Perfis de usuários |

### Colunas de `kanban_tasks`:
`id`, `title`, `description`, `status` (backlog/todo/doing/done), `task_status`, `project`, `assignee`, `urgency`, `deadline`, `deadline_time`, `start_date`, `card_color`, `checklist` (JSONB), `attachments` (JSONB), `links` (JSONB), `is_event`, `event_type`, `event_start_date`, `event_end_date`, `ticket_goal`, `tickets_sold`, `dependencies` (JSONB), `deleted`, `created_at`

---

## 5. COLUNAS KANBAN (4 colunas)

Backlog · To Do · Doing · Done

---

## 5.1 INTEGRAÇÃO WHATSAPP (Evolution API)

- Instância: `ActiveSales` (número: 5511952136776)
- URL: `https://whatsapp.activesales.com.br`
- Endpoint envio: `POST /message/sendText/ActiveSales`
- Endpoint grupos: `GET /group/fetchAllGroups/ActiveSales`
- Botão "📲 WhatsApp" no ReportModal → seleciona grupo → envia com @menções
- Responsáveis com WhatsApp cadastrado são mencionados automaticamente
- Env vars necessárias: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`

---

## 6. REGRAS CRÍTICAS DE DESENVOLVIMENTO

### Dados
- **ZERO localStorage para dados de app.** Tudo no Supabase. localStorage só para preferências de UI.
- Antes de adicionar qualquer coluna nova no código, verificar se ela existe no banco.
- `saveTaskToDb` faz DB-first: salva no banco → confirma → adiciona ao estado local.

### Deploy
- Push DEVE ir para `ziminoze/kanban` remote (branch main). O Railway monitora esse repo.
- Após push, o Railway faz deploy automático (~2-3 min).
- Agrupar várias correções em um único commit para minimizar downtime.

### Supabase
- RLS está ativo. Políticas: só `authenticated` acessa.
- Realtime habilitado para: kanban_tasks, kanban_projects, kanban_cost_centers, kanban_messages.
- `SKIP_MIGRATIONS=true` no Railway.

### Mobile
- Breakpoint: 768px
- useMobile() hook para detectar
- Modais: bottom-sheet (100vw, sobe da base)
- Board: bottom navigation bar com 4 colunas
- Inputs: font-size 16px (evita zoom iOS)

### Segurança
- Não commitar .env, tokens, keys
- Não criar policies com `USING (true)` para role anon
- Não adicionar DISABLE ROW LEVEL SECURITY

---

## 7. VARIÁVEIS DE AMBIENTE (RAILWAY)

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do Supabase (frontend) |
| `VITE_SUPABASE_ANON_KEY` | Anon key (frontend) |
| `SUPABASE_URL` | URL do Supabase (servidor) |
| `SUPABASE_ANON_KEY` | Anon key (servidor) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin endpoints) |
| `MIGRATE_SECRET` | Secret para /api/db/migrate |
| `SKIP_MIGRATIONS` | `true` |

---

## 8. BUGS CONHECIDOS (PARA NÃO REPETIR)

| Bug | Solução |
|-----|---------|
| Tarefas sumindo ao recarregar | Criar coluna no Supabase ANTES de usar no código |
| Tarefas voltando após deletar | deletedIds ref bloqueia upserts |
| SET_TASKS apagava tarefas locais | Merge preserva localPending |
| Lock do Supabase Auth | Removido getSession manual |
| Projetos sumindo | INSERT/UPDATE/DELETE individuais |
| Invalid Date nos cards | Adicionar +'T00:00:00' |

---

## 9. COMANDOS ÚTEIS

```bash
# Build local
cd client && npm run build

# Commitar e deployar
git add -A && git commit -m "feat: descrição" && git push ziminoze claude/kanban-pro-setup-16LO9:main --force

# Ver remotes
git remote -v
```
