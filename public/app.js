/* ================================
   KANBAN PRO - Frontend Logic
   Vanilla JS, no dependencies
================================ */

const COLUMNS = [
  { id: 'todo',       label: 'To Do',       color: '#6366F1' },
  { id: 'inprogress', label: 'In Progress',  color: '#F97316' },
  { id: 'review',     label: 'Review',       color: '#8B5CF6' },
  { id: 'done',       label: 'Done',         color: '#10B981' }
];

let tasks = [];
let draggedId = null;
let deleteTargetId = null;

// ---- DOM refs ----
const board       = document.getElementById('board');
const modalOverlay = document.getElementById('modal-overlay');
const deleteOverlay = document.getElementById('delete-overlay');
const taskForm    = document.getElementById('task-form');
const btnOpenModal = document.getElementById('btn-open-modal');
const btnCancel   = document.getElementById('btn-cancel');
const btnSubmit   = document.getElementById('btn-submit');
const modalClose  = document.getElementById('modal-close');
const deleteClose = document.getElementById('delete-close');
const deleteCancel = document.getElementById('delete-cancel');
const deleteConfirm = document.getElementById('delete-confirm');
const modalTitle  = document.getElementById('modal-title');

// ---- API ----
async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadTasks() {
  tasks = await api('GET', '/api/tasks');
  renderBoard();
}

// ---- Render ----
function renderBoard() {
  board.innerHTML = '';
  COLUMNS.forEach(col => {
    const colTasks = tasks.filter(t => t.column === col.id);
    board.appendChild(buildColumn(col, colTasks));
  });
}

function buildColumn(col, colTasks) {
  const column = document.createElement('div');
  column.className = 'column';
  column.dataset.column = col.id;

  column.innerHTML = `
    <div class="column-header">
      <div class="column-title">
        <span class="column-dot" style="background:${col.color}"></span>
        ${col.label}
      </div>
      <span class="column-count">${colTasks.length}</span>
    </div>
    <div class="column-body" id="col-${col.id}">
      ${colTasks.length === 0 ? `
        <div class="column-empty">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="3"/><line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          Drop tasks here
        </div>` : ''
      }
    </div>
  `;

  const body = column.querySelector('.column-body');
  colTasks.forEach(task => body.appendChild(buildCard(task)));

  // Drag-over events on column
  column.addEventListener('dragover', e => {
    e.preventDefault();
    column.classList.add('drag-over');
  });
  column.addEventListener('dragleave', e => {
    if (!column.contains(e.relatedTarget)) column.classList.remove('drag-over');
  });
  column.addEventListener('drop', async e => {
    e.preventDefault();
    column.classList.remove('drag-over');
    if (draggedId === null) return;
    const task = tasks.find(t => t.id === draggedId);
    if (!task || task.column === col.id) return;
    task.column = col.id;
    renderBoard();
    try {
      await api('PUT', `/api/tasks/${draggedId}`, { column: col.id });
    } catch {
      await loadTasks();
    }
    draggedId = null;
  });

  return column;
}

function buildCard(task) {
  const card = document.createElement('div');
  card.className = 'card';
  card.draggable = true;
  card.dataset.id = task.id;

  const priorityColor = {
    low: '#22C55E', medium: '#F59E0B', high: '#EF4444'
  }[task.priority] || '#F59E0B';

  const dueInfo = formatDue(task.dueDate);

  card.innerHTML = `
    <div class="card-priority-bar" style="background:${priorityColor}"></div>
    <div class="card-top">
      <span class="card-title">${escHtml(task.title)}</span>
      <div class="card-actions">
        <button class="card-btn edit" aria-label="Edit task" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="card-btn delete" aria-label="Delete task" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
    ${task.description ? `<p class="card-description">${escHtml(task.description)}</p>` : ''}
    <div class="card-footer">
      <span class="badge-priority ${task.priority}">${capitalize(task.priority)}</span>
      ${dueInfo ? `<span class="card-due ${dueInfo.overdue ? 'overdue' : ''}">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        ${dueInfo.label}
      </span>` : ''}
    </div>
  `;

  // Drag events
  card.addEventListener('dragstart', e => {
    draggedId = task.id;
    setTimeout(() => card.classList.add('dragging'), 0);
    e.dataTransfer.effectAllowed = 'move';
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    draggedId = null;
  });

  // Edit
  card.querySelector('.card-btn.edit').addEventListener('click', e => {
    e.stopPropagation();
    openEditModal(task);
  });

  // Delete
  card.querySelector('.card-btn.delete').addEventListener('click', e => {
    e.stopPropagation();
    openDeleteModal(task.id);
  });

  return card;
}

// ---- Modal ----
function openCreateModal(columnId) {
  taskForm.reset();
  document.getElementById('task-id').value = '';
  document.getElementById('task-column').value = columnId || 'todo';
  modalTitle.textContent = 'New Task';
  btnSubmit.textContent = 'Create Task';
  modalOverlay.classList.add('active');
  document.getElementById('task-title').focus();
}

function openEditModal(task) {
  document.getElementById('task-id').value = task.id;
  document.getElementById('task-title').value = task.title;
  document.getElementById('task-description').value = task.description || '';
  document.getElementById('task-priority').value = task.priority;
  document.getElementById('task-column').value = task.column;
  document.getElementById('task-due').value = task.dueDate || '';
  modalTitle.textContent = 'Edit Task';
  btnSubmit.textContent = 'Save Changes';
  modalOverlay.classList.add('active');
  document.getElementById('task-title').focus();
}

function closeModal() {
  modalOverlay.classList.remove('active');
  taskForm.reset();
}

function openDeleteModal(id) {
  deleteTargetId = id;
  deleteOverlay.classList.add('active');
}

function closeDeleteModal() {
  deleteOverlay.classList.remove('active');
  deleteTargetId = null;
}

// ---- Event Listeners ----
btnOpenModal.addEventListener('click', () => openCreateModal());
btnCancel.addEventListener('click', closeModal);
modalClose.addEventListener('click', closeModal);
deleteClose.addEventListener('click', closeDeleteModal);
deleteCancel.addEventListener('click', closeDeleteModal);

modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});
deleteOverlay.addEventListener('click', e => {
  if (e.target === deleteOverlay) closeDeleteModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeDeleteModal();
  }
});

taskForm.addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('task-id').value;
  const payload = {
    title:       document.getElementById('task-title').value.trim(),
    description: document.getElementById('task-description').value.trim(),
    priority:    document.getElementById('task-priority').value,
    column:      document.getElementById('task-column').value,
    dueDate:     document.getElementById('task-due').value || null
  };
  if (!payload.title) return;

  btnSubmit.disabled = true;
  try {
    if (id) {
      const updated = await api('PUT', `/api/tasks/${id}`, payload);
      tasks = tasks.map(t => t.id === parseInt(id) ? updated : t);
    } else {
      const created = await api('POST', '/api/tasks', payload);
      tasks.push(created);
    }
    renderBoard();
    closeModal();
  } catch (err) {
    console.error(err);
  } finally {
    btnSubmit.disabled = false;
  }
});

deleteConfirm.addEventListener('click', async () => {
  if (!deleteTargetId) return;
  deleteConfirm.disabled = true;
  try {
    await api('DELETE', `/api/tasks/${deleteTargetId}`);
    tasks = tasks.filter(t => t.id !== deleteTargetId);
    renderBoard();
    closeDeleteModal();
  } catch (err) {
    console.error(err);
  } finally {
    deleteConfirm.disabled = false;
  }
});

// ---- Helpers ----
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDue(dateStr) {
  if (!dateStr) return null;
  const due = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((due - today) / 86400000);
  const overdue = diff < 0;
  let label;
  if (diff === 0) label = 'Today';
  else if (diff === 1) label = 'Tomorrow';
  else if (diff === -1) label = 'Yesterday';
  else if (overdue) label = `${Math.abs(diff)}d overdue`;
  else label = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { label, overdue };
}

// ---- Init ----
loadTasks();
