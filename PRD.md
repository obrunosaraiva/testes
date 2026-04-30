# PRD — Kanban Pro

**Versão:** 1.0  
**Data:** 10/04/2026  
**Stack:** React 19 + Vite · Express.js · Supabase (Postgres, Auth, Realtime, Storage) · Railway (deploy)

---

## 1. Visão Geral

Kanban Pro é uma aplicação web de gerenciamento de tarefas e projetos colaborativo, em tempo real, com suporte a múltiplos usuários, centros de custo, chat com menções, relatórios e notificações push. A interface é responsiva (desktop e mobile) e suporta tema claro e escuro.

---

## 2. Autenticação e Papéis

### 2.1 Autenticação
- Login com email e senha via Supabase Auth
- Cadastro público via tela de signup
- Sessões JWT com auto-refresh
- Convite de usuários por link (admin)

### 2.2 Papéis (RBAC)

| Papel | Permissões |
|-------|-----------|
| **Admin** | Acesso total: gerenciar usuários, papéis, CCs, lixeira, relatório, todas as tarefas |
| **Editor** | Criar e editar tarefas, projetos, templates, recursos. Sem gerência de usuários |
| **Viewer** | Somente leitura |

- Primeiro usuário cadastrado torna-se Admin automaticamente
- Admins podem alterar o papel de outros usuários no Painel Admin
- Permissões verificadas via `can.create`, `can.edit`, `can.delete`, `can.admin`

### 2.3 Perfil de Usuário
- Nome, email, WhatsApp, papel, data de cadastro, último acesso

---

## 3. Tarefas

### 3.1 Campos da Tarefa

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Título | texto | Obrigatório |
| Descrição | texto longo | Auto-expansível |
| Projeto | seleção | Vinculado a um projeto |
| Status (coluna) | enum | backlog · todo · doing · paused · review · done |
| Task Status | enum (10 valores) | Status detalhado de workflow (ver seção 3.2) |
| Responsável | combobox | Membro cadastrado ou texto livre |
| Urgência | enum | Alta · Média · Baixa |
| Data de início | data | |
| Prazo | data + hora | |
| Cor do card | picker | 8 cores + transparente |
| Checklist | lista | Sub-tarefas com status e responsável por item |
| Anexos | arquivos | Upload para Supabase Storage |
| Links | URLs | Lista de referências |
| É Evento | toggle | Ativa campos extras de evento |

### 3.2 Task Status (10 estados de workflow)

| Valor | Emoji | Label |
|-------|-------|-------|
| `pendente` | ⚪ | Pendente |
| `solicitado` | 🟠 | Solicitado |
| `andamento` | 🔵 | Andamento |
| `revisao` | 🩷 | Revisão |
| `correcao` | 🟡 | Correção necessária |
| `concluido` | 🟢 | Concluído |
| `cancelado` | ⚫ | Cancelado |
| `atrasado` | 🔴 | Atrasado |
| `impedimento_interno` | 🟧 | Impedimento Interno |
| `impedimento_externo` | 🟪 | Impedimento Externo |

### 3.3 Operações

- **Criar** — modal de criação; atalho de teclado `N`; criação a partir de template
- **Editar** — modal de edição com autosave (debounce 1,5s para tarefas existentes)
- **Excluir** — soft delete para lixeira (recuperável)
- **Restaurar** — via painel de lixeira
- **Deletar permanentemente** — via painel de lixeira
- **Drag & Drop** — mover entre colunas no Board View
- **Salvar como template** — duplica tarefa como modelo reutilizável
- **Rascunho** — novas tarefas salvam rascunho no localStorage enquanto editadas

### 3.4 Checklist

- Itens com texto, responsável e prazo próprios
- Cada item pode ter seu próprio Task Status
- Barra de progresso visual no card (% de itens concluídos)
- Opção de ocultar itens concluídos no modal

---

## 4. Projetos

- CRUD completo (criar, editar, excluir, restaurar)
- Cada projeto pode ser vinculado a um Centro de Custo
- Exclusão de projeto move o projeto e todas as suas tarefas para a lixeira
- Restauração de projeto recupera todas as tarefas associadas
- Exibidos como abas na barra de projetos com contador de tarefas
- Modo "Combinar": selecionar múltiplos projetos para visão unificada

---

## 5. Centros de Custo (CC)

- Unidades organizacionais para agrupar projetos e recursos
- **Padrão pré-configurados:** IBEC, GH, Leanx, Up3
- **Campos:** chave única, label, cor, privacidade, compartilhamento
- **Privacidade:**
  - Público: visível a todos
  - Privado: visível apenas ao criador e usuários explicitamente compartilhados
- **Filtro na barra de projetos:** ao selecionar um CC, apenas os projetos desse CC aparecem nos tabs; múltiplos CCs acumulam projetos
- CRUD gerenciado por admins

---

## 6. Membros

- Lista de responsáveis/colaboradores atribuíveis às tarefas
- **Campos:** nome, email, WhatsApp, flag de membro virtual
- Membros aparecem no combobox de "Responsável" nas tarefas
- Armazenados como entradas especiais na tabela `kanban_cost_centers` (prefixo `__mbr_`)
- Gerenciados via Painel Admin

---

## 7. Views (Visualizações)

### 7.1 Board View (Kanban)
- 6 colunas: Backlog · To Do · Doing · Pausado · Review · Done
- Drag & Drop entre colunas
- Cards com: título, projeto, responsável, prazo, urgência, cor
- **Mobile:** visão de coluna única com navegação inferior por status

### 7.2 List View
- Tabela compacta estilo Monday.com
- Colunas: Status · Título · Responsável · Prazo · Urgência
- Tarefas agrupadas por projeto com grupos colapsáveis
- Edição de status inline

### 7.3 Gantt View
- Linha do tempo horizontal com barras por tarefa
- Intervalo automático baseado nas datas das tarefas
- Highlights de fins de semana e linha do dia atual
- Disponível apenas no desktop

### 7.4 Chat View
- Ver seção 9

---

## 8. Filtros Globais

| Filtro | Comportamento |
|--------|--------------|
| Projeto ativo | Exibe tarefas do projeto selecionado ou "Todos" |
| Combinar projetos | Exibe tarefas de múltiplos projetos simultâneos |
| Centro de custo | Multi-seleção; filtra projetos e tarefas pelo CC |
| Tipo de visualização | Todos · Tarefas · Eventos |

---

## 9. Chat em Tempo Real

### 9.1 Canais
- **Geral:** canal único do sistema
- **Por Centro de Custo:** um canal por CC visível
- **Por Projeto:** um canal por projeto ativo
- **Por Tarefa:** referência rápida por tarefa

### 9.2 Funcionalidades de Mensagem
- Envio de texto com @menções a usuários
- Upload de arquivos (imagens, áudios, documentos) para Supabase Storage
- Resposta com preview inline da mensagem original
- **Editar mensagem própria** — edição inline com label "(editado)"
- **Apagar mensagem própria** — soft delete com confirmação
- Contagem de mensagens não lidas por canal (badge)

### 9.3 Sistema de Menções
- Badge vermelho com contador no botão "Chat" do header (visível de qualquer view)
- Badge zerado ao entrar na view de chat
- Notificações push enviadas aos usuários mencionados (ver seção 11)

---

## 10. Templates

- Criar template a partir de qualquer tarefa
- **Campos salvos:** título, descrição, projeto, status, responsável, urgência, checklist, links, cor
- Listar, usar e excluir templates via modal
- Aplicar template pré-preenche o formulário de nova tarefa
- Persistido no Supabase com fallback para localStorage

---

## 11. Repositório de Recursos

- Biblioteca centralizada de links, planilhas, documentos
- **Campos:** título, URL, tipo (link/sheet/doc/other), descrição, centros de custo
- Busca por texto (título, URL, descrição)
- Filtro por tipo e por CC ativo
- Copiar link com um clique
- CRUD completo

---

## 12. Notificações Push

- Web Push API com chaves VAPID
- Service Worker para receber notificações em background
- Ativação/desativação via botão 🔔 na sidebar do chat
- **Trigger:** usuário é @mencionado em qualquer mensagem de chat
- Conteúdo: nome do remetente + nome do canal + preview da mensagem
- Subscriptions armazenadas em `kanban_push_subscriptions`
- Remoção automática de subscriptions expiradas (erro 410)

---

## 13. Relatórios

### 13.1 Relatório de Tarefas
- Agrupado por projeto
- **Formato dos itens:**
  - Tarefa sem checklist: `[emoji status] · 📅 [data] · [título] · 👤 [responsável]`
  - Tarefa com checklist (todos concluídos): título simples + itens com `🟢`
  - Tarefa com checklist pendente: `N. Título` + itens com `☐ texto · 👤 · 📅 ⚪`
  - Tarefa com status notável + checklist: `[emoji] · 📅 · título · 👤` + itens abaixo
- Seção de destaques no topo para tarefas atrasadas, com impedimento ou correção
- Legenda de status ao final
- **Filtros:** projeto, status de coluna, incluir concluídas, apenas atrasadas

### 13.2 Relatório de Eventos
- Métricas por evento: meta, vendidos, faltam, % de progresso, pacing diário, dias restantes
- Status de campanha: ✅ Na meta · 🟡 Atenção · 🔴 Fora da meta

### 13.3 Resumo Executivo
- Visão por projeto: contagem por status, progresso médio, top responsáveis, atrasadas
- Ideal para WhatsApp ou reuniões de acompanhamento

### 13.4 Exportação
- Texto em Markdown — copiar para área de transferência com um clique
- Preview antes de copiar

---

## 14. Lixeira

- Tarefas e projetos excluídos vão para a lixeira (não são deletados permanentemente)
- Metadados preservados: data de exclusão, usuário, se foi excluído junto com projeto
- **Restaurar:** devolve item à lista ativa
- **Deletar permanentemente:** remove de forma irreversível
- Contador na lixeira visível no header (ícone vermelho quando há itens)
- Exclusão de projeto arrasta todas as tarefas associadas para a lixeira
- Restauração de projeto recupera todas as tarefas associadas

---

## 15. Painel Admin

- **Aba Membros:** CRUD de membros (nome, email, WhatsApp)
- **Aba Usuários:**
  - Listar todos os usuários com email, papel, data de cadastro, último acesso
  - Convidar novo usuário (envia link com papel pré-definido)
  - Alterar papel de usuário
  - Editar nome e WhatsApp
  - Excluir usuário
- Acesso restrito a admins

---

## 16. Sincronização em Tempo Real

- Supabase Realtime via PostgreSQL CDC (Change Data Capture)
- Conexão WebSocket persistente
- **Canais de sync:**
  - `kanban-realtime`: tarefas, projetos, CCs, templates, recursos, lixeira
  - `global-mentions`: menções no chat para badge do header
- **Estratégia de conflito:** tasks pendentes localmente não são sobrescritas por atualizações do DB
- **Fallback:** ao retornar à aba do browser, dados são recarregados do DB
- **Status de conexão:** indicador no header (● Online / ○ Offline / ⚠ Erro)

---

## 17. Eventos (Tipo Especial de Tarefa)

Tarefas marcadas como "É Evento" ganham campos extras:

| Campo | Descrição |
|-------|-----------|
| Tipo de evento | Presencial ou Virtual |
| Data início do evento | |
| Data fim do evento | |
| Meta de ingressos | Número alvo de vendas |
| Ingressos vendidos | Número atual |
| Faltam | Calculado: meta − vendidos |
| Dias restantes | Até a data do evento |
| Pacing diário | Vendas/dia necessárias para bater a meta |

---

## 18. Mobile

- Breakpoint: `768px`
- Header mobile: botão hambúrguer com drawer lateral deslizante
- Board View: coluna única com navegação inferior por status
- Modais: bottom sheet (sobe do rodapé, `border-radius: 20px 20px 0 0`)
- Inputs: `font-size: 16px` para evitar zoom automático no iOS
- Gantt não disponível no mobile
- Touch targets ampliados

---

## 19. Banco de Dados (Supabase / PostgreSQL)

| Tabela | Conteúdo |
|--------|----------|
| `kanban_tasks` | Tarefas |
| `kanban_projects` | Projetos |
| `kanban_cost_centers` | CCs e membros (`__mbr_*`) |
| `kanban_templates` | Templates de tarefa |
| `kanban_resources` | Recursos do repositório |
| `kanban_trash` | Itens excluídos (soft delete) |
| `kanban_messages` | Mensagens do chat |
| `kanban_push_subscriptions` | Subscriptions de push notification |
| `profiles` | Perfis de usuário (nome, WhatsApp, papel) |

- RLS desabilitado nas tabelas do app (controle de acesso feito no front via papéis)
- Migrações automáticas no startup do servidor (via `DATABASE_URL` ou API Supabase)

---

## 20. API Backend (Express.js)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/auth/signup` | POST | Cadastro público |
| `/api/admin/invite` | POST | Convidar usuário (admin) |
| `/api/admin/users` | GET | Listar usuários (admin) |
| `/api/admin/users/:id/role` | POST | Alterar papel (admin) |
| `/api/admin/users/:id` | DELETE | Excluir usuário (admin) |
| `/api/chat/upload` | POST | Upload de arquivo para chat |
| `/api/push/vapid-public-key` | GET | Chave VAPID pública |
| `/api/push/subscribe` | POST | Salvar subscription push |
| `/api/push/subscribe` | DELETE | Remover subscription push |
| `/api/push/notify` | POST | Enviar push para mencionados |
| `/api/db/migrate` | POST | Rodar migrações sob demanda |

---

## 21. Preferências do Usuário (localStorage)

| Chave | Conteúdo |
|-------|----------|
| `kanban_pro_v2` | Projeto ativo, view atual, filtro de view, filtro de CC |
| `kanban_task_draft` | Rascunho da nova tarefa em edição |
| `theme` | `dark` ou `light` |

---

*Kanban Pro — PRD gerado em 10/04/2026*
