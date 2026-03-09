const API = "http://localhost:8000/api";

// ─── State ────────────────────────────────────────────────────────────────────
let state = {
  dashboard: null,
  inbox: [],
  tasks: [],
  projects: [],
  currentPage: "dashboard",
  clarifyTarget: null,
  clarifyResult: null,
  contextFilter: null,
};

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupNav();
  loadPage("dashboard");
});

function setupNav() {
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.addEventListener("click", () => {
      const page = el.dataset.page;
      loadPage(page);
    });
  });
}

async function loadPage(page) {
  state.currentPage = page;
  document.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.page === page);
  });
  document.querySelectorAll(".page").forEach((el) => {
    el.classList.toggle("active", el.id === `page-${page}`);
  });

  document.getElementById("page-title").textContent = {
    dashboard: "Dashboard",
    inbox: "Caixa de Entrada",
    "next-actions": "Próximas Ações",
    waiting: "Aguardando",
    projects: "Projetos",
    someday: "Algum Dia / Talvez",
    review: "Revisão Semanal",
  }[page] || page;

  switch (page) {
    case "dashboard": await renderDashboard(); break;
    case "inbox": await renderInbox(); break;
    case "next-actions": await renderNextActions(); break;
    case "waiting": await renderWaiting(); break;
    case "projects": await renderProjects(); break;
    case "someday": await renderSomeday(); break;
    case "review": await renderReview(); break;
  }
}

// ─── API helpers ──────────────────────────────────────────────────────────────
async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
async function renderDashboard() {
  const data = await api("/dashboard/");
  state.dashboard = data;

  // Update badges
  document.getElementById("badge-inbox").textContent = data.inbox_count || "";
  document.getElementById("badge-inbox").style.display = data.inbox_count ? "inline" : "none";

  const el = document.getElementById("page-dashboard");

  const urgentDecisions = data.decisions_needed.filter(
    (t) => t.priority === "urgent" || t.priority === "high"
  );

  el.innerHTML = `
    <div class="dashboard-grid">
      <div class="stat-card red">
        <div class="label">Decisões Urgentes</div>
        <div class="value">${urgentDecisions.length}</div>
        <div class="sub">requerem sua atenção hoje</div>
      </div>
      <div class="stat-card orange">
        <div class="label">Aguardando Retorno</div>
        <div class="value">${data.overdue_waiting.length}</div>
        <div class="sub">${data.overdue_waiting.length > 0 ? "⚠️ com atraso" : "em dia"}</div>
      </div>
      <div class="stat-card green">
        <div class="label">Concluído Hoje</div>
        <div class="value">${data.completed_today}</div>
        <div class="sub">${data.total_next_actions} próximas ações</div>
      </div>
    </div>

    ${data.inbox_count > 0 ? `
      <div class="alert-banner">
        📥 <strong>${data.inbox_count} ${data.inbox_count === 1 ? "item" : "itens"} na caixa de entrada</strong> aguardando clarificação.
        <button class="btn btn-sm btn-primary" onclick="loadPage('inbox')" style="margin-left:auto">Processar agora</button>
      </div>
    ` : ""}

    ${urgentDecisions.length > 0 ? `
      <div class="section">
        <div class="section-title">🔴 Requer sua decisão hoje</div>
        ${urgentDecisions.map((t) => taskCard(t, true)).join("")}
      </div>
    ` : ""}

    ${data.overdue_waiting.length > 0 ? `
      <div class="section">
        <div class="section-title">🟡 Aguardando retorno (vencidos)</div>
        ${data.overdue_waiting.map((t) => waitingCard(t, true)).join("")}
      </div>
    ` : ""}

    <div class="section">
      <div class="section-title">📋 Projetos ativos</div>
      ${data.projects.length === 0 ? emptyState("Nenhum projeto ativo") : data.projects.map(projectSummaryCard).join("")}
    </div>

    <div class="section">
      <div class="section-title">🟢 Próximas ações disponíveis — ${data.total_next_actions} total</div>
      ${Object.entries(data.next_actions_by_context).slice(0, 3).map(([ctx, tasks]) => `
        <div style="margin-bottom:12px">
          <div class="tag tag-context" style="display:inline-block;margin-bottom:8px">${ctx}</div>
          ${tasks.slice(0, 2).map((t) => taskCard(t)).join("")}
        </div>
      `).join("")}
      ${data.total_next_actions > 6 ? `<button class="btn btn-secondary" onclick="loadPage('next-actions')">Ver todas as próximas ações →</button>` : ""}
    </div>
  `;
}

function taskCard(t, showComplete = false) {
  const priorityTag = {
    urgent: `<span class="tag tag-urgent">Urgente</span>`,
    high: `<span class="tag tag-high">Alta</span>`,
    medium: `<span class="tag tag-medium">Média</span>`,
    low: `<span class="tag tag-low">Baixa</span>`,
  }[t.priority] || "";

  return `
    <div class="task-item">
      ${showComplete ? `<div class="task-check" onclick="completeTask(${t.id})"></div>` : ""}
      <div class="task-body">
        <div class="task-title">${t.title}</div>
        <div class="task-meta">
          ${priorityTag}
          ${t.context ? `<span class="tag tag-context">${t.context}</span>` : ""}
          ${t.due_date ? `<span class="tag tag-low">📅 ${formatDate(t.due_date)}</span>` : ""}
        </div>
      </div>
      ${showComplete ? `<div class="task-actions">
        <button class="btn btn-sm btn-success" onclick="completeTask(${t.id})">✓</button>
      </div>` : ""}
    </div>
  `;
}

function waitingCard(t, overdue = false) {
  const initials = (t.assigned_to || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return `
    <div class="waiting-item ${overdue ? "overdue" : ""}">
      <div class="waiting-person">${initials}</div>
      <div class="waiting-body">
        <div class="waiting-title">${t.title}</div>
        <div class="waiting-meta">
          ${t.assigned_to || "Sem responsável"} ·
          ${t.days_waiting !== undefined ? `${t.days_waiting} dias` : ""}
          ${overdue ? " · <span style='color:var(--red)'>⚠️ Vencido</span>" : ""}
        </div>
      </div>
      <button class="btn btn-sm btn-secondary" onclick="completeTask(${t.id})">Recebido</button>
    </div>
  `;
}

function projectSummaryCard(p) {
  const alertIcon = p.alert ? "⚠️ " : "✅ ";
  const deadline = p.days_to_deadline !== null
    ? (p.days_to_deadline < 0 ? `<span style="color:var(--red)">Vencido</span>` : `${p.days_to_deadline}d restantes`)
    : "Sem prazo";

  return `
    <div class="project-card ${p.alert ? "alert" : ""}">
      <div class="project-header">
        <span>${alertIcon}</span>
        <span class="project-title">${p.title}</span>
        <span class="tag ${p.has_next_action ? "tag-medium" : "tag-urgent"}">
          ${p.has_next_action ? "Próxima ação definida" : "SEM PRÓXIMA AÇÃO"}
        </span>
      </div>
      <div class="project-progress">
        <div class="project-progress-bar" style="width:${p.completion_pct}%"></div>
      </div>
      <div class="project-meta">
        <span>${p.completion_pct}% concluído</span>
        <span>${p.pending_tasks} tarefas pendentes</span>
        <span>${deadline}</span>
      </div>
    </div>
  `;
}

// ─── Inbox ────────────────────────────────────────────────────────────────────
async function renderInbox() {
  state.inbox = await api("/inbox/");
  const el = document.getElementById("page-inbox");

  el.innerHTML = `
    <div class="capture-box">
      <input type="text" class="capture-input" id="capture-input" placeholder="Capture qualquer coisa... (Enter para adicionar)" />
      <button class="btn btn-primary" onclick="captureItem()">+ Capturar</button>
    </div>

    <div class="section">
      <div class="section-title">
        📥 Caixa de entrada
        <span class="tag tag-urgent">${state.inbox.length} ${state.inbox.length === 1 ? "item" : "itens"}</span>
      </div>
      ${state.inbox.length === 0
        ? `<div class="empty-state"><div class="empty-icon">✅</div><p>Caixa de entrada vazia! Ótimo trabalho.</p></div>`
        : state.inbox.map((item) => inboxItemCard(item)).join("")
      }
    </div>
  `;

  document.getElementById("capture-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") captureItem();
  });
}

function inboxItemCard(item) {
  return `
    <div class="task-item" id="inbox-${item.id}">
      <div class="task-body">
        <div class="task-title">${item.content}</div>
        <div class="task-meta">
          <span class="tag tag-low">${formatDate(item.created_at)}</span>
          <span class="tag tag-low">${item.source}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn btn-sm btn-primary" onclick="openClarify(${item.id}, \`${escapeJs(item.content)}\`)">
          🤖 Clarificar
        </button>
        <button class="btn btn-sm btn-secondary" onclick="deleteInboxItem(${item.id})">🗑</button>
      </div>
    </div>
  `;
}

async function captureItem() {
  const input = document.getElementById("capture-input");
  const content = input.value.trim();
  if (!content) return;
  await api("/inbox/", { method: "POST", body: JSON.stringify({ content }) });
  input.value = "";
  await renderInbox();
  // Update badge
  document.getElementById("badge-inbox").textContent = state.inbox.length;
  document.getElementById("badge-inbox").style.display = state.inbox.length ? "inline" : "none";
}

async function deleteInboxItem(id) {
  await api(`/inbox/${id}`, { method: "DELETE" });
  await renderInbox();
}

// ─── Clarification Modal ──────────────────────────────────────────────────────
async function openClarify(id, content) {
  state.clarifyTarget = { id, content };
  state.clarifyResult = null;

  showModal(`
    <div class="modal-header">
      <div style="font-size:20px">🤖</div>
      <h3>Clarificação GTD com IA</h3>
    </div>
    <div class="modal-body">
      <div class="clarify-item-text">"${content}"</div>
      <div id="clarify-state">
        <div class="ai-loading">
          <div class="spinner"></div>
          <span>Claude está analisando com o método GTD...</span>
        </div>
      </div>
    </div>
    <div class="modal-footer" id="clarify-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    </div>
  `);

  try {
    const result = await api(`/inbox/${id}/clarify`, { method: "POST" });
    state.clarifyResult = result.clarification;
    renderClarifyResult(result.clarification);
  } catch (e) {
    document.getElementById("clarify-state").innerHTML = `<p style="color:var(--red)">Erro ao clarificar. Tente novamente.</p>`;
  }
}

function renderClarifyResult(c) {
  const listLabels = {
    next_action: "Próximas Ações",
    waiting: "Aguardando",
    someday: "Algum Dia/Talvez",
    reference: "Referência",
    trash: "Lixo",
    calendar: "Agenda",
  };

  document.getElementById("clarify-state").innerHTML = `
    <div class="ai-result">
      <div class="ai-decision">
        <div class="ai-icon">${c.do_now ? "⚡" : c.list_type === "trash" ? "🗑" : c.list_type === "waiting" ? "⏳" : "📋"}</div>
        <div class="ai-text">
          <div class="ai-label">Decisão GTD</div>
          <div class="ai-value">${c.do_now ? "Fazer agora (< 2 min)" : `Mover para: ${listLabels[c.list_type] || c.list_type}`}</div>
        </div>
        <span class="tag tag-${c.priority}">${c.priority}</span>
      </div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px;padding:10px 14px;background:var(--surface2);border-radius:8px">
        💡 ${c.clarification}
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label>Próxima ação</label>
        <input type="text" class="form-control" id="f-action" value="${escapeHtml(c.next_action || "")}">
      </div>
      <div class="form-group">
        <label>Lista</label>
        <select class="form-control" id="f-list">
          <option value="next_action" ${c.list_type === "next_action" ? "selected" : ""}>Próximas Ações</option>
          <option value="waiting" ${c.list_type === "waiting" ? "selected" : ""}>Aguardando</option>
          <option value="someday" ${c.list_type === "someday" ? "selected" : ""}>Algum Dia/Talvez</option>
          <option value="reference" ${c.list_type === "reference" ? "selected" : ""}>Referência</option>
          <option value="calendar" ${c.list_type === "calendar" ? "selected" : ""}>Agenda</option>
          <option value="trash" ${c.list_type === "trash" ? "selected" : ""}>Lixo</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Contexto</label>
        <select class="form-control" id="f-context">
          <option value="">Sem contexto</option>
          ${["@reunião","@email","@decisão","@leitura","@telefone","@computador","@geral"].map(
            (ctx) => `<option value="${ctx}" ${c.context === ctx ? "selected" : ""}>${ctx}</option>`
          ).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Prioridade</label>
        <select class="form-control" id="f-priority">
          ${["urgent","high","medium","low"].map(
            (p) => `<option value="${p}" ${c.priority === p ? "selected" : ""}>${{urgent:"Urgente",high:"Alta",medium:"Média",low:"Baixa"}[p]}</option>`
          ).join("")}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Projeto (opcional)</label>
        <input type="text" class="form-control" id="f-project" value="${escapeHtml(c.project_suggestion || "")}">
      </div>
      <div class="form-group">
        <label>Delegar para</label>
        <input type="text" class="form-control" id="f-delegate" value="${escapeHtml(c.delegate_to || "")}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Prazo da tarefa</label>
        <input type="date" class="form-control" id="f-due" value="${c.due_date ? c.due_date.slice(0,10) : ""}">
      </div>
      <div class="form-group">
        <label>Prazo de retorno (se delegado)</label>
        <input type="date" class="form-control" id="f-waiting" value="${c.waiting_deadline ? c.waiting_deadline.slice(0,10) : ""}">
      </div>
    </div>
  `;

  document.getElementById("clarify-footer").innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="processFromClarify()">✓ Confirmar e processar</button>
  `;
}

async function processFromClarify() {
  const { id } = state.clarifyTarget;
  const body = {
    list_type: document.getElementById("f-list").value,
    next_action: document.getElementById("f-action").value,
    context: document.getElementById("f-context").value || null,
    priority: document.getElementById("f-priority").value,
    project_name: document.getElementById("f-project").value || null,
    assigned_to: document.getElementById("f-delegate").value || null,
    due_date: document.getElementById("f-due").value || null,
    waiting_deadline: document.getElementById("f-waiting").value || null,
  };

  await api(`/inbox/${id}/process`, { method: "POST", body: JSON.stringify(body) });
  closeModal();
  await renderInbox();
}

// ─── Next Actions ─────────────────────────────────────────────────────────────
async function renderNextActions() {
  state.tasks = await api("/tasks/?list_type=next_action");
  const el = document.getElementById("page-next-actions");

  const contexts = [...new Set(state.tasks.map((t) => t.context).filter(Boolean))];

  el.innerHTML = `
    <div class="context-pills">
      <span class="context-pill ${!state.contextFilter ? "active" : ""}" onclick="filterContext(null)">Todos (${state.tasks.length})</span>
      ${contexts.map((ctx) => {
        const count = state.tasks.filter((t) => t.context === ctx).length;
        return `<span class="context-pill ${state.contextFilter === ctx ? "active" : ""}" onclick="filterContext('${ctx}')">${ctx} (${count})</span>`;
      }).join("")}
    </div>

    <div id="next-actions-list">
      ${renderTaskList(state.tasks.filter((t) => !state.contextFilter || t.context === state.contextFilter))}
    </div>
  `;
}

function filterContext(ctx) {
  state.contextFilter = ctx;
  renderNextActions();
}

function renderTaskList(tasks) {
  if (tasks.length === 0) return emptyState("Nenhuma tarefa nesta lista.");
  return tasks.map((t) => `
    <div class="task-item">
      <div class="task-check" onclick="completeTask(${t.id})"></div>
      <div class="task-body">
        <div class="task-title">${t.title}</div>
        <div class="task-meta">
          <span class="tag tag-${t.priority}">${{urgent:"Urgente",high:"Alta",medium:"Média",low:"Baixa"}[t.priority]}</span>
          ${t.context ? `<span class="tag tag-context">${t.context}</span>` : ""}
          ${t.due_date ? `<span class="tag tag-low">📅 ${formatDate(t.due_date)}</span>` : ""}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn btn-sm btn-success" onclick="completeTask(${t.id})">✓ Feito</button>
      </div>
    </div>
  `).join("");
}

// ─── Waiting ──────────────────────────────────────────────────────────────────
async function renderWaiting() {
  const tasks = await api("/tasks/?list_type=waiting");
  const el = document.getElementById("page-waiting");
  const now = new Date();

  el.innerHTML = `
    <div class="section">
      <div class="section-title">⏳ Aguardando retorno</div>
      ${tasks.length === 0
        ? emptyState("Nenhum item aguardando.")
        : tasks.map((t) => {
            const since = t.waiting_since ? new Date(t.waiting_since) : null;
            const days = since ? Math.floor((now - since) / 86400000) : 0;
            const overdue = days >= 5;
            return `
              <div class="waiting-item ${overdue ? "overdue" : ""}">
                <div class="waiting-person">${(t.assigned_to || "?")[0].toUpperCase()}</div>
                <div class="waiting-body">
                  <div class="waiting-title">${t.title}</div>
                  <div class="waiting-meta">
                    ${t.assigned_to || "Sem responsável"} · ${days} dias
                    ${overdue ? " · <span style='color:var(--red)'>⚠️ Cobrar</span>" : ""}
                  </div>
                </div>
                <button class="btn btn-sm btn-success" onclick="completeTask(${t.id})">Recebido ✓</button>
              </div>
            `;
          }).join("")
      }
    </div>
  `;
}

// ─── Projects ─────────────────────────────────────────────────────────────────
async function renderProjects() {
  state.projects = await api("/projects/");
  const el = document.getElementById("page-projects");

  el.innerHTML = `
    <div style="display:flex;gap:10px;margin-bottom:20px">
      <button class="btn btn-primary" onclick="openNewProject()">+ Novo Projeto</button>
    </div>

    <div class="section">
      <div class="section-title">📂 Projetos Ativos</div>
      ${state.projects.filter((p) => p.status === "active").map(projectDetailCard).join("") || emptyState("Nenhum projeto ativo.")}
    </div>

    ${state.projects.filter((p) => p.status !== "active").length > 0 ? `
      <div class="section">
        <div class="section-title" style="color:var(--text-muted)">Concluídos / Em espera</div>
        ${state.projects.filter((p) => p.status !== "active").map(projectDetailCard).join("")}
      </div>
    ` : ""}
  `;
}

function projectDetailCard(p) {
  return `
    <div class="project-card ${!p.has_next_action && p.status === "active" ? "alert" : ""}">
      <div class="project-header">
        <span class="project-title">${p.title}</span>
        ${!p.has_next_action && p.status === "active"
          ? `<span class="tag tag-urgent">⚠️ Sem próxima ação</span>`
          : `<span class="tag tag-medium">✓ Próxima ação</span>`}
      </div>
      <div class="project-progress">
        <div class="project-progress-bar" style="width:${p.completion_pct}%"></div>
      </div>
      <div class="project-meta">
        <span>${p.completion_pct}% concluído</span>
        <span>${p.task_count} tarefas</span>
        ${p.deadline ? `<span>📅 ${formatDate(p.deadline)}</span>` : ""}
      </div>
    </div>
  `;
}

function openNewProject() {
  showModal(`
    <div class="modal-header">
      <div style="font-size:20px">📂</div>
      <h3>Novo Projeto</h3>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Nome do projeto</label>
        <input type="text" class="form-control" id="np-title" placeholder="Ex: Migração de infraestrutura">
      </div>
      <div class="form-group">
        <label>Descrição (opcional)</label>
        <textarea class="form-control" id="np-desc" rows="3" placeholder="Objetivo do projeto..."></textarea>
      </div>
      <div class="form-group">
        <label>Prazo (opcional)</label>
        <input type="date" class="form-control" id="np-deadline">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="createProject()">Criar Projeto</button>
    </div>
  `);
}

async function createProject() {
  const title = document.getElementById("np-title").value.trim();
  if (!title) return;
  await api("/projects/", {
    method: "POST",
    body: JSON.stringify({
      title,
      description: document.getElementById("np-desc").value,
      deadline: document.getElementById("np-deadline").value || null,
    }),
  });
  closeModal();
  await renderProjects();
}

// ─── Someday ──────────────────────────────────────────────────────────────────
async function renderSomeday() {
  const tasks = await api("/tasks/?list_type=someday");
  const el = document.getElementById("page-someday");

  el.innerHTML = `
    <div class="section">
      <div class="section-title">🌙 Algum Dia / Talvez</div>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">Revise estes itens semanalmente. Promova para "Próximas Ações" quando fizer sentido.</p>
      ${tasks.length === 0
        ? emptyState("Nenhum item aqui ainda.")
        : tasks.map((t) => `
            <div class="task-item">
              <div class="task-body">
                <div class="task-title">${t.title}</div>
                <div class="task-meta">
                  <span class="tag tag-low">Adicionado ${formatDate(t.created_at)}</span>
                </div>
              </div>
              <div class="task-actions">
                <button class="btn btn-sm btn-primary" onclick="promoteTask(${t.id})">Promover ↑</button>
                <button class="btn btn-sm btn-secondary" onclick="completeTask(${t.id})">Arquivar</button>
              </div>
            </div>
          `).join("")
      }
    </div>
  `;
}

async function promoteTask(id) {
  await api(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "pending" }),
  });
  // Move to next_action
  await api(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ list_type: "next_action" }),
  });
  await renderSomeday();
}

// ─── Weekly Review ────────────────────────────────────────────────────────────
async function renderReview() {
  const data = await api("/dashboard/weekly-review");
  const el = document.getElementById("page-review");

  el.innerHTML = `
    <div class="section">
      <div class="section-title">📅 Revisão Semanal — ${new Date().toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long" })}</div>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:20px">O ritual GTD mais importante. Reserve 30-60 minutos toda semana.</p>

      <div class="review-step">
        <div class="review-step-header">
          <div class="review-step-num ${data.inbox_count === 0 ? "done" : ""}">1</div>
          <div class="review-step-title">Zerar caixa de entrada</div>
          ${data.inbox_count === 0
            ? `<span class="tag tag-medium">✓ Zerada</span>`
            : `<span class="tag tag-urgent">${data.inbox_count} itens pendentes</span>`}
        </div>
        ${data.inbox_count > 0 ? `<button class="btn btn-primary btn-sm" onclick="loadPage('inbox')">Processar caixa de entrada →</button>` : ""}
      </div>

      <div class="review-step">
        <div class="review-step-header">
          <div class="review-step-num ${data.projects_without_next_action.length === 0 ? "done" : ""}">2</div>
          <div class="review-step-title">Revisar projetos</div>
          ${data.projects_without_next_action.length > 0
            ? `<span class="tag tag-urgent">${data.projects_without_next_action.length} sem próxima ação</span>`
            : `<span class="tag tag-medium">✓ Todos têm próxima ação</span>`}
        </div>
        ${data.projects_without_next_action.map((p) => `
          <div style="padding:8px 12px;background:var(--surface2);border-radius:8px;margin-top:8px;display:flex;align-items:center;gap:10px">
            <span>📂 ${p.title}</span>
            <span class="tag tag-urgent" style="margin-left:auto">Definir próxima ação</span>
          </div>
        `).join("")}
      </div>

      <div class="review-step">
        <div class="review-step-header">
          <div class="review-step-num ${data.overdue_waiting.length === 0 ? "done" : ""}">3</div>
          <div class="review-step-title">Revisar lista "Aguardando"</div>
          ${data.overdue_waiting.length > 0
            ? `<span class="tag tag-urgent">${data.overdue_waiting.length} para cobrar</span>`
            : `<span class="tag tag-medium">✓ Em dia</span>`}
        </div>
        ${data.overdue_waiting.map((t) => `
          <div style="padding:8px 12px;background:var(--surface2);border-radius:8px;margin-top:8px">
            <strong>${t.title}</strong> — ${t.assigned_to || "Sem responsável"} (${t.days} dias)
          </div>
        `).join("")}
      </div>

      <div class="review-step">
        <div class="review-step-header">
          <div class="review-step-num">4</div>
          <div class="review-step-title">Revisar "Algum Dia/Talvez"</div>
          <span class="tag tag-low">${data.someday_items.length} itens</span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="loadPage('someday')" style="margin-top:8px">Ver e promover itens →</button>
      </div>

      <div class="review-step">
        <div class="review-step-header">
          <div class="review-step-num">5</div>
          <div class="review-step-title">Olhar semana que vem</div>
        </div>
        <p style="font-size:13px;color:var(--text-muted)">Verifique sua agenda e prepare as prioridades para os próximos 7 dias.</p>
      </div>
    </div>

    <div class="section">
      <div class="section-title">🤖 Insights com IA</div>
      <button class="btn btn-primary" onclick="loadReviewInsights()">Gerar análise da semana com Claude</button>
      <div id="insights-container" style="margin-top:16px"></div>
    </div>

    <div class="section">
      <div class="section-title">✅ Concluídos esta semana (${data.completed_this_week.length})</div>
      ${data.completed_this_week.length === 0
        ? `<p style="color:var(--text-muted);font-size:13px">Nenhuma tarefa concluída esta semana.</p>`
        : data.completed_this_week.slice(0, 10).map((t) => `
            <div style="padding:8px 12px;display:flex;align-items:center;gap:8px">
              <span style="color:var(--green)">✓</span>
              <span>${t.title}</span>
            </div>
          `).join("")
      }
    </div>
  `;
}

async function loadReviewInsights() {
  document.getElementById("insights-container").innerHTML = `
    <div class="ai-loading">
      <div class="spinner"></div>
      <span>Claude está analisando sua semana...</span>
    </div>
  `;
  try {
    const data = await api("/dashboard/weekly-review/insights", { method: "POST" });
    document.getElementById("insights-container").innerHTML = `
      <div class="insights-box">${data.insights}</div>
    `;
  } catch {
    document.getElementById("insights-container").innerHTML = `<p style="color:var(--red)">Erro ao gerar insights.</p>`;
  }
}

// ─── Task actions ─────────────────────────────────────────────────────────────
async function completeTask(id) {
  await api(`/tasks/${id}/complete`, { method: "POST" });
  await loadPage(state.currentPage);
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function showModal(html) {
  let overlay = document.getElementById("modal-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "modal-overlay";
    overlay.className = "modal-overlay";
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.style.display = "flex";
}

function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  if (overlay) overlay.style.display = "none";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function emptyState(msg) {
  return `<div class="empty-state"><div class="empty-icon">📭</div><p>${msg}</p></div>`;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeJs(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}
