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
  authMode: "login",   // "login" | "register"
  user: null,
  isOffline: false,
  notifications: [],
  notifOpen: false,
};

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  registerServiceWorker();
  watchOfflineStatus();

  // Check auth
  const token = localStorage.getItem("gtd_token");
  if (!token) {
    showLoginScreen();
    return;
  }
  // Verify token is still valid
  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("invalid");
    const user = await res.json();
    loginSuccess({ token, user });
  } catch {
    localStorage.removeItem("gtd_token");
    showLoginScreen();
  }
});

// ─── Service Worker ───────────────────────────────────────────────────────────
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    // Listen for navigate messages from SW notification clicks
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.type === "navigate") loadPage(e.data.page);
    });
  }
}

// ─── Offline detection ────────────────────────────────────────────────────────
function watchOfflineStatus() {
  const update = () => {
    state.isOffline = !navigator.onLine;
    const badge = document.getElementById("offline-badge");
    if (badge) badge.style.display = state.isOffline ? "block" : "none";
  };
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function showLoginScreen() {
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("app").style.display = "none";
}

function showApp() {
  document.getElementById("login-screen").style.display = "none";
  const app = document.getElementById("app");
  app.style.display = "flex";
  setupNav();
  loadPage("dashboard");
  // Start notification polling every 3 minutes
  pollNotifications();
  setInterval(pollNotifications, 3 * 60 * 1000);
  // Request browser notification permission
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function loginSuccess({ token, user }) {
  localStorage.setItem("gtd_token", token);
  state.user = user;
  const label = document.getElementById("user-name-label");
  if (label) label.textContent = user.name;
  showApp();
}

function logout() {
  localStorage.removeItem("gtd_token");
  state.user = null;
  showLoginScreen();
}

function switchAuthTab(tab) {
  state.authMode = tab;
  const isRegister = tab === "register";
  document.getElementById("field-name").style.display = isRegister ? "block" : "none";
  document.getElementById("auth-submit").textContent = isRegister ? "Criar conta" : "Entrar";
  document.getElementById("tab-login").style.background = isRegister ? "transparent" : "var(--accent)";
  document.getElementById("tab-login").style.color = isRegister ? "var(--text-muted)" : "#fff";
  document.getElementById("tab-register").style.background = isRegister ? "var(--accent)" : "transparent";
  document.getElementById("tab-register").style.color = isRegister ? "#fff" : "var(--text-muted)";
  document.getElementById("auth-error").style.display = "none";
}

async function submitAuth(e) {
  e.preventDefault();
  const errEl = document.getElementById("auth-error");
  errEl.style.display = "none";

  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const name = document.getElementById("auth-name")?.value.trim();
  const isRegister = state.authMode === "register";

  const body = isRegister ? { name, email, password } : { email, password };
  const endpoint = isRegister ? "/auth/register" : "/auth/login";

  try {
    const res = await fetch(`${API}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.detail || "Erro ao autenticar";
      errEl.style.display = "block";
      return;
    }
    loginSuccess(data);
  } catch {
    errEl.textContent = "Erro de conexão. Verifique se o servidor está rodando.";
    errEl.style.display = "block";
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────
async function pollNotifications() {
  try {
    const data = await api("/notifications/");
    state.notifications = data.alerts || [];
    renderNotifBadge();
  } catch {}
}

function renderNotifBadge() {
  const badge = document.getElementById("notif-badge");
  const count = state.notifications.length;
  if (!badge) return;
  if (count > 0) {
    badge.style.display = "flex";
    badge.textContent = count > 9 ? "9+" : count;
    // Browser notification for urgent items (only if new)
    const urgent = state.notifications.filter((n) => n.severity === "urgent");
    if (urgent.length > 0 && Notification.permission === "granted") {
      new Notification("GTD Manager — Atenção necessária", {
        body: urgent[0].title,
        tag: "gtd-urgent",
      });
    }
  } else {
    badge.style.display = "none";
  }
}

function toggleNotifications() {
  state.notifOpen = !state.notifOpen;
  const dropdown = document.getElementById("notif-dropdown");
  dropdown.style.display = state.notifOpen ? "block" : "none";
  if (state.notifOpen) renderNotifDropdown();

  // Close when clicking outside
  if (state.notifOpen) {
    setTimeout(() => {
      document.addEventListener("click", closeNotifOnOutsideClick, { once: true });
    }, 10);
  }
}

function closeNotifOnOutsideClick(e) {
  const dropdown = document.getElementById("notif-dropdown");
  const btn = document.getElementById("notif-btn");
  if (dropdown && !dropdown.contains(e.target) && !btn.contains(e.target)) {
    dropdown.style.display = "none";
    state.notifOpen = false;
  }
}

function renderNotifDropdown() {
  const dropdown = document.getElementById("notif-dropdown");
  const severityIcon = { urgent: "🔴", high: "🟠", medium: "🟡", low: "⚪" };

  if (state.notifications.length === 0) {
    dropdown.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">✅ Nenhum alerta no momento</div>`;
    return;
  }

  dropdown.innerHTML = `
    <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-size:12px;font-weight:600;color:var(--text-muted)">
      ALERTAS (${state.notifications.length})
    </div>
    ${state.notifications.map((n) => `
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.1s"
        onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background=''"
        onclick="dropdown.style.display='none';state.notifOpen=false;loadPage('${n.action}')">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span>${severityIcon[n.severity] || "⚪"}</span>
          <span style="font-size:13px;font-weight:600">${n.title}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);padding-left:20px">${n.body}</div>
      </div>
    `).join("")}
  `;
}

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
  const token = localStorage.getItem("gtd_token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("gtd_token");
    showLoginScreen();
    throw new Error("Sessão expirada");
  }

  const data = await res.json();
  if (data?.offline) {
    state.isOffline = true;
    const badge = document.getElementById("offline-badge");
    if (badge) badge.style.display = "block";
  }
  if (!res.ok) throw new Error(data?.detail || `API error ${res.status}`);
  return data;
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
    <!-- Capture Tabs -->
    <div class="capture-tabs">
      <div class="capture-tab-bar">
        <div class="capture-tab active" data-tab="text" onclick="switchCaptureTab('text')">
          <span class="tab-icon">✏️</span> Texto
        </div>
        <div class="capture-tab" data-tab="image" onclick="switchCaptureTab('image')">
          <span class="tab-icon">🖼️</span> Print / Imagem
        </div>
        <div class="capture-tab" data-tab="whatsapp" onclick="switchCaptureTab('whatsapp')">
          <span class="tab-icon">💬</span> WhatsApp Bot
        </div>
      </div>

      <!-- Panel: Text -->
      <div class="capture-panel active" id="panel-text">
        <div style="display:flex;gap:10px">
          <input type="text" class="capture-input" id="capture-input"
            placeholder="Capture qualquer coisa... pressione Enter" />
          <button class="btn btn-primary" onclick="captureItem()">+ Capturar</button>
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin-top:8px">
          Sem filtro, sem julgamento — capture tudo agora, classifique depois.
        </p>
      </div>

      <!-- Panel: Image -->
      <div class="capture-panel" id="panel-image">
        <div class="drop-zone" id="drop-zone"
          onclick="document.getElementById('file-input').click()"
          ondragover="onDragOver(event)"
          ondragleave="onDragLeave(event)"
          ondrop="onDrop(event)">
          <div class="drop-icon">📸</div>
          <p><strong>Clique ou arraste prints aqui</strong></p>
          <p class="drop-hint">WhatsApp, Slack, e-mail, reunião, qualquer screenshot — Claude extrai as demandas</p>
        </div>
        <input type="file" id="file-input" accept="image/*" multiple style="display:none"
          onchange="onFileSelect(event)" />
        <div id="image-preview-grid" class="image-preview-grid"></div>
        <div id="image-analysis-result"></div>
        <div id="upload-actions" style="margin-top:12px;display:none">
          <button class="btn btn-primary" onclick="analyzeImages()">🤖 Analisar com Claude</button>
          <button class="btn btn-secondary" onclick="clearImages()" style="margin-left:8px">Limpar</button>
        </div>
      </div>

      <!-- Panel: WhatsApp -->
      <div class="capture-panel" id="panel-whatsapp">
        <div id="wa-status-area">
          <div class="ai-loading">
            <div class="spinner"></div>
            <span>Verificando status do bot...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Inbox list -->
    <div class="section">
      <div class="section-title" style="display:flex;align-items:center;justify-content:space-between">
        <span>📥 Caixa de entrada
          <span class="tag tag-urgent">${state.inbox.length} ${state.inbox.length === 1 ? "item" : "itens"}</span>
        </span>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-sm btn-secondary" onclick="toggleSelectAll()">Selecionar tudo</button>
          <button id="batch-clarify-btn" class="btn btn-sm btn-primary" style="display:none" onclick="batchClarifySelected()">
            🤖 Clarificar selecionados (<span id="batch-count">0</span>)
          </button>
        </div>
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

  // Load WhatsApp status when tab becomes active
  loadWhatsAppStatus();
}

// ─── Capture Tab switching ────────────────────────────────────────────────────
function switchCaptureTab(tab) {
  document.querySelectorAll(".capture-tab").forEach((el) =>
    el.classList.toggle("active", el.dataset.tab === tab)
  );
  document.querySelectorAll(".capture-panel").forEach((el) =>
    el.classList.toggle("active", el.id === `panel-${tab}`)
  );
}

// ─── Image capture ────────────────────────────────────────────────────────────
let pendingImages = []; // { file, previewUrl }

function onDragOver(e) {
  e.preventDefault();
  document.getElementById("drop-zone").classList.add("drag-over");
}

function onDragLeave(e) {
  document.getElementById("drop-zone").classList.remove("drag-over");
}

function onDrop(e) {
  e.preventDefault();
  document.getElementById("drop-zone").classList.remove("drag-over");
  const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
  addImageFiles(files);
}

function onFileSelect(e) {
  const files = Array.from(e.target.files);
  addImageFiles(files);
  e.target.value = "";
}

function addImageFiles(files) {
  files.forEach((file) => {
    const url = URL.createObjectURL(file);
    pendingImages.push({ file, previewUrl: url });
  });
  renderImagePreviews();
}

function renderImagePreviews() {
  const grid = document.getElementById("image-preview-grid");
  const actions = document.getElementById("upload-actions");

  if (pendingImages.length === 0) {
    grid.innerHTML = "";
    actions.style.display = "none";
    return;
  }

  grid.innerHTML = pendingImages.map((img, i) => `
    <div class="image-thumb">
      <img src="${img.previewUrl}" alt="preview" />
      <button class="remove-thumb" onclick="removeImage(${i})">✕</button>
    </div>
  `).join("");

  actions.style.display = "flex";
}

function removeImage(index) {
  pendingImages.splice(index, 1);
  renderImagePreviews();
}

function clearImages() {
  pendingImages = [];
  renderImagePreviews();
  document.getElementById("image-analysis-result").innerHTML = "";
}

async function analyzeImages() {
  if (pendingImages.length === 0) return;

  document.getElementById("image-analysis-result").innerHTML = `
    <div class="ai-loading" style="margin-top:16px">
      <div class="spinner"></div>
      <span>Claude está lendo os prints e extraindo demandas...</span>
    </div>
  `;
  document.getElementById("upload-actions").style.display = "none";

  let totalAdded = 0;
  const allResults = [];

  for (const img of pendingImages) {
    const formData = new FormData();
    formData.append("file", img.file);

    const res = await fetch(`${API}/capture/image`, { method: "POST", body: formData });
    if (!res.ok) continue;
    const result = await res.json();
    totalAdded += result.added || 0;
    if (result.items?.length > 0) allResults.push(result);
  }

  // Render results
  if (allResults.length === 0 || totalAdded === 0) {
    document.getElementById("image-analysis-result").innerHTML = `
      <div class="analysis-result">
        <div class="result-header">📭 Nenhuma demanda encontrada nos prints.</div>
      </div>
    `;
  } else {
    document.getElementById("image-analysis-result").innerHTML = `
      <div class="analysis-result">
        <div class="result-header">
          ✅ ${totalAdded} ${totalAdded === 1 ? "demanda encontrada" : "demandas encontradas"} e adicionadas à inbox
        </div>
        ${allResults.map((r) => `
          <div style="margin-bottom:8px">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">
              ${sourceIcon(r.source_type)} ${r.summary}
            </div>
            ${r.items.slice(0, 3).map((item) => `
              <div class="analysis-item">
                <span class="tag tag-${item.clarification?.priority || "medium"}" style="flex-shrink:0">
                  ${(item.clarification?.priority || "medium")}
                </span>
                <div>
                  <div class="ai-label">${item.clarification?.next_action || ""}</div>
                  <div class="ai-content">${item.content}</div>
                </div>
              </div>
            `).join("")}
            ${r.items.length > 3 ? `<p style="font-size:12px;color:var(--text-muted);padding-left:12px">+${r.items.length - 3} mais...</p>` : ""}
          </div>
        `).join("")}
        <button class="btn btn-secondary btn-sm" onclick="clearImages();renderInbox()">
          Ver inbox →
        </button>
      </div>
    `;
  }

  pendingImages = [];
  await renderInbox();
}

function sourceIcon(type) {
  return { whatsapp: "💬", slack: "💼", email: "📧", meeting: "📅", document: "📄" }[type] || "🖼️";
}

// ─── WhatsApp Status ──────────────────────────────────────────────────────────
async function loadWhatsAppStatus() {
  const area = document.getElementById("wa-status-area");
  if (!area) return;

  let status = { status: "disconnected" };
  let groups = [];

  try {
    const res = await fetch("http://localhost:3001/status");
    if (res.ok) status = await res.json();
  } catch {
    // Bot not running
  }

  if (status.status === "connected") {
    try {
      const gRes = await fetch("http://localhost:3001/groups", { method: "POST" });
      if (gRes.ok) {
        const gData = await gRes.json();
        groups = gData.groups || [];
      }
    } catch {}
  }

  const dotClass = { connected: "connected", qr_pending: "pending" }[status.status] || "disconnected";
  const statusLabel = {
    connected: "Conectado",
    qr_pending: "Aguardando QR code",
    initializing: "Iniciando...",
    disconnected: "Desconectado",
  }[status.status] || "Desconectado";

  area.innerHTML = `
    <div class="wa-status-card">
      <div class="wa-status-dot ${dotClass}"></div>
      <div style="flex:1">
        <div style="font-weight:600">Bot WhatsApp — ${statusLabel}</div>
        <div style="font-size:12px;color:var(--text-muted)">
          ${status.stats ? `${status.stats.added} demandas capturadas · ${status.stats.processed} mensagens lidas` : "Bot não iniciado"}
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="loadWhatsAppStatus()">↻</button>
    </div>

    ${status.status === "disconnected" || !status.status ? `
      <div style="background:var(--surface2);border-radius:10px;padding:16px;font-size:13px">
        <p style="font-weight:600;margin-bottom:8px">Como iniciar o bot:</p>
        <pre style="background:var(--bg);padding:10px;border-radius:6px;font-size:12px;overflow-x:auto">cd whatsapp-bot
npm install
node index.js</pre>
        <p style="color:var(--text-muted);margin-top:8px">Escaneie o QR code com o WhatsApp do celular. O bot ficará monitorando os grupos automaticamente.</p>
      </div>
    ` : ""}

    ${status.status === "qr_pending" ? `
      <div style="background:var(--surface2);border-radius:10px;padding:16px;text-align:center">
        <p style="margin-bottom:12px">Abra o WhatsApp no celular e escaneie o QR code no terminal do bot.</p>
        <p style="font-size:12px;color:var(--text-muted)">O QR code aparece no terminal onde você executou <code>node index.js</code></p>
      </div>
    ` : ""}

    ${status.status === "connected" && groups.length > 0 ? `
      <div>
        <p style="font-size:13px;font-weight:600;margin-bottom:10px">Selecione os grupos a monitorar:</p>
        <div class="wa-groups-list">
          ${groups.map((g) => `
            <div class="wa-group-item">
              <input type="checkbox" id="group-${g.id}"
                ${status.monitored_groups?.includes(g.name) || status.monitored_groups?.length === 0 ? "checked" : ""}
                onchange="updateMonitoredGroups()" />
              <label for="group-${g.id}">
                💬 ${g.name}
                <span style="color:var(--text-muted);font-size:11px"> · ${g.participants} participantes</span>
              </label>
            </div>
          `).join("")}
        </div>
        <button class="btn btn-primary btn-sm" onclick="saveMonitoredGroups()" style="margin-top:12px">
          Salvar configuração
        </button>
      </div>
    ` : ""}
  `;
}

async function saveMonitoredGroups() {
  const checkboxes = document.querySelectorAll(".wa-group-item input[type=checkbox]:checked");
  const selected = Array.from(checkboxes).map((cb) => {
    const label = cb.nextElementSibling.textContent.trim().replace(/·.*$/, "").replace("💬", "").trim();
    return label;
  });
  try {
    await fetch("http://localhost:3001/monitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups: selected }),
    });
    alert(`✅ Monitorando: ${selected.length > 0 ? selected.join(", ") : "todos os grupos"}`);
  } catch {
    alert("Erro ao salvar. Verifique se o bot está rodando.");
  }
}

// ─── Text capture ─────────────────────────────────────────────────────────────
function inboxItemCard(item) {
  const sourceTag = sourceTagHtml(item.source);
  return `
    <div class="task-item" id="inbox-${item.id}">
      <input type="checkbox" class="inbox-check" data-id="${item.id}"
        style="margin-right:10px;flex-shrink:0;width:16px;height:16px;cursor:pointer"
        onchange="updateBatchCount()" />
      <div class="task-body">
        <div class="task-title">${escapeHtml(item.content)}</div>
        <div class="task-meta">
          <span class="tag tag-low">${formatDate(item.created_at)}</span>
          ${sourceTag}
          ${item.status === "clarified" ? `<span class="tag tag-medium">✓ Pré-classificado</span>` : ""}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn btn-sm btn-primary" onclick="openClarify(${item.id}, \`${escapeJs(item.content)}\`)">
          🤖 ${item.status === "clarified" ? "Revisar" : "Clarificar"}
        </button>
        <button class="btn btn-sm btn-secondary" onclick="deleteInboxItem(${item.id})">🗑</button>
      </div>
    </div>
  `;
}

function updateBatchCount() {
  const checked = document.querySelectorAll(".inbox-check:checked");
  const btn = document.getElementById("batch-clarify-btn");
  const count = document.getElementById("batch-count");
  if (!btn) return;
  if (checked.length > 0) {
    btn.style.display = "inline-flex";
    count.textContent = checked.length;
  } else {
    btn.style.display = "none";
  }
}

function toggleSelectAll() {
  const boxes = document.querySelectorAll(".inbox-check");
  const allChecked = Array.from(boxes).every((b) => b.checked);
  boxes.forEach((b) => (b.checked = !allChecked));
  updateBatchCount();
}

async function batchClarifySelected() {
  const checked = document.querySelectorAll(".inbox-check:checked");
  const ids = Array.from(checked).map((b) => parseInt(b.dataset.id));
  if (!ids.length) return;

  const btn = document.getElementById("batch-clarify-btn");
  btn.disabled = true;
  btn.textContent = `⏳ Processando ${ids.length} itens com Claude…`;

  try {
    const data = await api("/inbox/batch-clarify", {
      method: "POST",
      body: JSON.stringify({ item_ids: ids }),
    });

    // Show batch result in a modal for sequential review
    openBatchResultModal(data.results);
  } catch (err) {
    showToast("Erro ao processar em lote: " + err.message, "error");
  } finally {
    btn.disabled = false;
    updateBatchCount();
  }
}

function openBatchResultModal(results) {
  let current = 0;

  function renderStep() {
    if (current >= results.length) {
      closeModal();
      renderInbox();
      showToast(`✅ ${results.length} itens clarificados!`, "success");
      return;
    }
    const item = results[current];
    const cl = item.clarification;
    const remaining = results.length - current;

    const listOptions = ["next_action","waiting","someday","reference","calendar","trash"]
      .map((v) => `<option value="${v}" ${cl.list_type === v ? "selected" : ""}>${v.replace("_", " ")}</option>`)
      .join("");
    const ctxOptions = [null,"@reunião","@email","@decisão","@leitura","@telefone","@computador"]
      .map((v) => `<option value="${v || ""}" ${cl.context === v ? "selected" : ""}>${v || "(sem contexto)"}</option>`)
      .join("");
    const priOptions = ["urgent","high","medium","low"]
      .map((v) => `<option value="${v}" ${cl.priority === v ? "selected" : ""}>${v}</option>`)
      .join("");

    showModal(`
      <div style="min-width:560px;max-width:660px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <h3 style="margin:0">🤖 Lote — item ${current + 1} de ${results.length}</h3>
          <span class="tag tag-medium">${remaining - 1} restantes</span>
        </div>

        <div style="background:var(--surface2);border-radius:10px;padding:12px 16px;font-size:13px;margin-bottom:14px;color:var(--text-muted)">
          ${escapeHtml(cl.next_action || "—")}
        </div>

        <div class="ai-decision">
          <div class="ai-decision-text">${cl.clarification || ""}</div>
        </div>

        <div class="form-row" style="margin-top:14px">
          <div class="form-group">
            <label>Lista</label>
            <select class="form-control" id="bl-list">${listOptions}</select>
          </div>
          <div class="form-group">
            <label>Prioridade</label>
            <select class="form-control" id="bl-priority">${priOptions}</select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Contexto</label>
            <select class="form-control" id="bl-context">${ctxOptions}</select>
          </div>
          <div class="form-group">
            <label>Projeto</label>
            <input type="text" class="form-control" id="bl-project" value="${cl.project_suggestion || ""}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Delegar a</label>
            <input type="text" class="form-control" id="bl-delegate" value="${cl.delegate_to || ""}" />
          </div>
          <div class="form-group">
            <label>Prazo</label>
            <input type="date" class="form-control" id="bl-due" value="${cl.due_date ? cl.due_date.substring(0,10) : ""}" />
          </div>
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button class="btn btn-secondary" onclick="skipBatchItem(${item.id})">Pular →</button>
          <button class="btn btn-primary" onclick="confirmBatchItem(${item.id})">✓ Confirmar e próximo</button>
        </div>
      </div>
    `);
  }

  // Make available to inner functions
  window._batchResults = results;
  window._batchCurrent = () => current;
  window._batchNext = () => { current++; renderStep(); };

  renderStep();
}

async function confirmBatchItem(itemId) {
  const list_type = document.getElementById("bl-list").value;
  const priority = document.getElementById("bl-priority").value;
  const context = document.getElementById("bl-context").value || null;
  const project_name = document.getElementById("bl-project").value.trim() || null;
  const assigned_to = document.getElementById("bl-delegate").value.trim() || null;
  const due_date = document.getElementById("bl-due").value || null;
  const action = document.getElementById("bl-action")?.value.trim() ||
    window._batchResults[window._batchCurrent()]?.clarification?.next_action || "Verificar item";

  await api(`/inbox/${itemId}/process`, {
    method: "POST",
    body: JSON.stringify({ list_type, next_action: action, context, priority, project_name, assigned_to, due_date }),
  });
  window._batchNext();
}

function skipBatchItem(itemId) {
  window._batchNext();
}

function sourceTagHtml(source) {
  if (!source || source === "manual") return `<span class="tag tag-low">manual</span>`;
  if (source.startsWith("whatsapp:")) return `<span class="tag tag-context">💬 ${source.replace("whatsapp:", "")}</span>`;
  if (source.startsWith("image:")) return `<span class="tag tag-context">🖼️ ${source.replace("image:", "")}</span>`;
  return `<span class="tag tag-low">${source}</span>`;
}

async function captureItem() {
  const input = document.getElementById("capture-input");
  const content = input.value.trim();
  if (!content) return;
  await api("/inbox/", { method: "POST", body: JSON.stringify({ content }) });
  input.value = "";
  await renderInbox();
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
                <div style="display:flex;gap:6px">
                  <button class="btn btn-sm btn-secondary" onclick="openFollowupDraft(${t.id})" title="Redigir cobrança no WhatsApp">
                    💬 Cobrar
                  </button>
                  <button class="btn btn-sm btn-success" onclick="completeTask(${t.id})">Recebido ✓</button>
                </div>
              </div>
            `;
          }).join("")
      }
    </div>
  `;
}

async function openFollowupDraft(taskId) {
  showModal(`
    <div style="min-width:460px">
      <h3 style="margin:0 0 16px">💬 Redigindo cobrança com IA…</h3>
      <div class="ai-loading"><div class="spinner"></div><span>Claude está escrevendo a mensagem…</span></div>
    </div>
  `);

  try {
    const data = await api(`/tasks/${taskId}/draft-followup`, { method: "POST" });
    showModal(`
      <div style="min-width:460px">
        <h3 style="margin:0 0 16px">💬 Mensagem de cobrança</h3>
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:16px;font-size:14px;line-height:1.6;white-space:pre-wrap;color:var(--text)">${escapeHtml(data.message)}</div>
        <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
          <button class="btn btn-secondary" onclick="closeModal()">Fechar</button>
          <button class="btn btn-primary" onclick="copyFollowup(\`${escapeJs(data.message)}\`)">📋 Copiar mensagem</button>
        </div>
      </div>
    `);
  } catch (err) {
    showModal(`<div style="min-width:400px"><p style="color:var(--red)">Erro: ${err.message}</p><button class="btn btn-secondary" onclick="closeModal()">Fechar</button></div>`);
  }
}

function copyFollowup(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast("✅ Mensagem copiada!", "success");
    closeModal();
  });
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
      ${p.status === "active" ? `
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          ${p.task_count === 0 ? `
            <button class="btn btn-sm btn-primary" onclick="decomposeProject(${p.id}, \`${escapeJs(p.title)}\`)">
              🧠 Decompor com IA
            </button>
          ` : ""}
          <button class="btn btn-sm btn-secondary" onclick="suggestNextAction(${p.id})">
            💡 Sugerir ação
          </button>
        </div>
      ` : ""}
    </div>
  `;
}

async function suggestNextAction(projectId) {
  showModal(`
    <div style="min-width:400px">
      <h3 style="margin:0 0 16px">💡 Sugerindo próxima ação…</h3>
      <div class="ai-loading"><div class="spinner"></div><span>Claude está pensando…</span></div>
    </div>
  `);
  try {
    const data = await api(`/projects/${projectId}/suggest-next-action`);
    showModal(`
      <div style="min-width:420px">
        <h3 style="margin:0 0 16px">💡 Próxima ação sugerida</h3>
        <div style="background:var(--surface2);border-radius:10px;padding:16px;font-size:14px;line-height:1.6">
          ${escapeHtml(data.suggestion)}
        </div>
        <div style="text-align:right;margin-top:16px">
          <button class="btn btn-primary" onclick="closeModal()">OK</button>
        </div>
      </div>
    `);
  } catch (err) {
    showModal(`<div><p style="color:var(--red)">${err.message}</p><button class="btn btn-secondary" onclick="closeModal()">Fechar</button></div>`);
  }
}

async function decomposeProject(projectId, projectTitle) {
  showModal(`
    <div style="min-width:480px">
      <h3 style="margin:0 0 16px">🧠 Decompondo "${projectTitle}"…</h3>
      <div class="ai-loading">
        <div class="spinner"></div>
        <span>Claude está criando as tarefas do projeto…</span>
      </div>
    </div>
  `);

  try {
    const data = await api(`/projects/${projectId}/decompose`, { method: "POST" });
    const listIcon = { next_action: "⚡", waiting: "⏳", someday: "🌙" };
    const priTag = { urgent: "tag-urgent", high: "tag-high", medium: "tag-medium", low: "tag-low" };

    showModal(`
      <div style="min-width:540px;max-width:680px">
        <h3 style="margin:0 0 8px">🧠 Projeto decomposto — ${data.tasks_created} tarefas criadas</h3>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">
          As tarefas já foram adicionadas ao sistema. Revise e ajuste conforme necessário.
        </p>
        <div style="display:flex;flex-direction:column;gap:8px;max-height:360px;overflow-y:auto">
          ${data.tasks.map((t, i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface2);border-radius:8px">
              <span style="color:var(--text-muted);font-size:12px;min-width:20px">${i + 1}</span>
              <span>${listIcon[t.list_type] || "•"}</span>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:500">${escapeHtml(t.title)}</div>
                ${t.assigned_to ? `<div style="font-size:12px;color:var(--text-muted)">→ ${t.assigned_to}</div>` : ""}
              </div>
              ${t.context ? `<span class="tag tag-context">${t.context}</span>` : ""}
              <span class="tag ${priTag[t.priority] || "tag-medium"}">${t.priority}</span>
            </div>
          `).join("")}
        </div>
        <div style="text-align:right;margin-top:16px">
          <button class="btn btn-primary" onclick="closeModal();renderProjects()">✓ Fechar</button>
        </div>
      </div>
    `);
  } catch (err) {
    showModal(`
      <div style="min-width:400px">
        <p style="color:var(--red)">Erro ao decompor projeto: ${err.message}</p>
        <button class="btn btn-secondary" onclick="closeModal()">Fechar</button>
      </div>
    `);
  }
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

function showToast(message, type = "info") {
  const existing = document.getElementById("toast-container");
  if (existing) existing.remove();
  const colors = { success: "var(--green)", error: "var(--red)", info: "var(--accent)" };
  const toast = document.createElement("div");
  toast.id = "toast-container";
  toast.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;background:var(--surface);
    border:1px solid ${colors[type] || colors.info};border-radius:10px;padding:12px 18px;
    font-size:14px;color:var(--text);box-shadow:0 4px 20px rgba(0,0,0,0.3);
    animation:slideIn 0.2s ease`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
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
