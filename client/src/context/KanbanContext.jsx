import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { sb } from '../lib/supabase';

// ─── Cost Centers ─────────────────────────────────────────────────────────────
// Static export kept for any legacy references; dynamic list lives in state
export const COST_CENTERS = {
  IBEC:  { label: 'IBEC',  color: '#eab308' },
  GH:    { label: 'GH',    color: '#3b82f6' },
  Leanx: { label: 'Leanx', color: '#ef4444' },
  Up3:   { label: 'Up3',   color: '#22c55e' },
};

export const DEFAULT_COST_CENTERS = [
  { key: 'IBEC',  label: 'IBEC',  color: '#eab308', isPrivate: false, createdBy: null },
  { key: 'GH',    label: 'GH',    color: '#3b82f6', isPrivate: false, createdBy: null },
  { key: 'Leanx', label: 'Leanx', color: '#ef4444', isPrivate: false, createdBy: null },
  { key: 'Up3',   label: 'Up3',   color: '#22c55e', isPrivate: false, createdBy: null },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseJsonField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch { return []; }
}

// Migrate old string projects to objects
function normalizeProject(p) {
  if (typeof p === 'string') return { id: 'p_' + p.replace(/[^a-z0-9]/gi, '_'), name: p, costCenter: null };
  return { id: p.id || ('p_' + Date.now() + '_' + Math.random().toString(36).slice(2,5)), name: p.name || String(p), costCenter: p.costCenter || null };
}

function normalizeTask(t) {
  return {
    id: t.id,
    title: t.title || '',
    description: t.description || '',
    project: t.project || '',
    status: t.status || 'backlog',
    assignee: t.assignee || '',
    urgency: t.urgency || '',
    startDate: t.startDate || t.start_date || '',
    deadline: t.deadline || '',
    deadlineTime: t.deadlineTime || t.deadline_time || '',
    isEvent: t.isEvent ?? t.is_event ?? false,
    eventStartDate: t.eventStartDate || t.event_start_date || '',
    eventEndDate: t.eventEndDate || t.event_end_date || '',
    cardColor: t.cardColor || t.card_color || 'none',
    checklist: parseJsonField(t.checklist),
    attachments: parseJsonField(t.attachments),
    createdAt: t.createdAt || t.created_at || '',
    ticketGoal: t.ticketGoal ?? t.ticket_goal ?? '',
    ticketsSold: t.ticketsSold ?? t.tickets_sold ?? '',
    eventType: t.eventType || t.event_type || 'presencial',
    links: parseJsonField(t.links),
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SK = 'kanban_pro_v2';
const TRASH_KEY = 'kanban_trash_v1';
const DRAFT_KEY = 'kanban_task_draft';

// ─── Initial state ────────────────────────────────────────────────────────────
const initialState = {
  projects: [{ id: 'p_default', name: 'Projeto 1', costCenter: null }],
  tasks: [],
  trashedTasks: [],
  trashedProjects: [],
  templates: [],
  resources: [],
  costCenters: DEFAULT_COST_CENTERS,
  activeProject: '__all__',
  combinedProjects: [],       // array of project names for multi-view
  viewFilter: 'all',          // 'all' | 'events' | 'tasks'
  costCenterFilter: [],       // array of cost center keys, empty = all
  view: 'board',
  dbReady: false,
  syncStatus: 'Conectando...',
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_LOCAL':
      return { ...state, ...action.payload };
    case 'LOAD_TRASH':
      return { ...state, trashedTasks: action.payload.trashedTasks || [], trashedProjects: action.payload.trashedProjects || [] };
    case 'SET_DB_READY':
      return { ...state, dbReady: true, syncStatus: '● Online' };
    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.payload };
    case 'SET_TASKS': {
      // Never restore tasks that are already in the local trash.
      // This prevents deleted tasks from reappearing when Supabase loads
      // before the DB delete completes (or after a quick page refresh).
      const trashedIds = new Set(state.trashedTasks.map(t => t.id));
      return { ...state, tasks: action.payload.filter(t => !trashedIds.has(t.id)) };
    }
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload.map(normalizeProject) };
    case 'SET_TEMPLATES':
      return { ...state, templates: action.payload };

    // ── Tasks ──
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK':
      return { ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? action.payload : t) };
    // Realtime: insert or update from another device
    case 'UPSERT_TASK': {
      // Never re-add a task that is in the trash (handles race: upsert arrives after delete)
      if (state.trashedTasks.some(t => t.id === action.payload.id)) return state;
      const exists = state.tasks.some(t => t.id === action.payload.id);
      return { ...state, tasks: exists
        ? state.tasks.map(t => t.id === action.payload.id ? action.payload : t)
        : [...state.tasks, action.payload] };
    }
    // Realtime: delete from another device
    case 'REMOVE_TASK_BY_ID':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) };
    case 'SOFT_DELETE_TASK': {
      const task = state.tasks.find(t => t.id === action.payload.id);
      if (!task) return state;
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.payload.id),
        trashedTasks: [...state.trashedTasks, { ...task, deletedAt: action.payload.deletedAt, deletedWithProject: false }],
      };
    }
    case 'RESTORE_TASK': {
      const task = state.trashedTasks.find(t => t.id === action.payload);
      if (!task) return state;
      const { deletedAt, deletedWithProject, ...restored } = task;
      return {
        ...state,
        trashedTasks: state.trashedTasks.filter(t => t.id !== action.payload),
        tasks: [...state.tasks, restored],
      };
    }
    case 'PERM_DELETE_TASK':
      return { ...state, trashedTasks: state.trashedTasks.filter(t => t.id !== action.payload) };

    // ── Projects ──
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'UPDATE_PROJECT':
      return { ...state, projects: state.projects.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) };
    case 'SOFT_DELETE_PROJECT': {
      const proj = state.projects.find(p => p.id === action.payload.id);
      if (!proj) return state;
      const projTasks = state.tasks.filter(t => t.project === proj.name);
      const newTrashed = projTasks.map(t => ({ ...t, deletedAt: action.payload.deletedAt, deletedWithProject: true }));
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== proj.id),
        tasks: state.tasks.filter(t => t.project !== proj.name),
        trashedProjects: [...state.trashedProjects, { ...proj, deletedAt: action.payload.deletedAt }],
        trashedTasks: [...state.trashedTasks, ...newTrashed],
        activeProject: state.activeProject === proj.name ? '__all__' : state.activeProject,
        combinedProjects: state.combinedProjects.filter(n => n !== proj.name),
      };
    }
    case 'RESTORE_PROJECT': {
      const proj = state.trashedProjects.find(p => p.id === action.payload);
      if (!proj) return state;
      const { deletedAt, ...restoredProj } = proj;
      const restoredTasks = state.trashedTasks
        .filter(t => t.project === proj.name && t.deletedWithProject)
        .map(({ deletedAt, deletedWithProject, ...t }) => t);
      return {
        ...state,
        projects: [...state.projects, restoredProj],
        trashedProjects: state.trashedProjects.filter(p => p.id !== proj.id),
        tasks: [...state.tasks, ...restoredTasks],
        trashedTasks: state.trashedTasks.filter(t => !(t.project === proj.name && t.deletedWithProject)),
      };
    }
    case 'PERM_DELETE_PROJECT': {
      const proj = state.trashedProjects.find(p => p.id === action.payload);
      return {
        ...state,
        trashedProjects: state.trashedProjects.filter(p => p.id !== action.payload),
        trashedTasks: proj
          ? state.trashedTasks.filter(t => !(t.project === proj.name && t.deletedWithProject))
          : state.trashedTasks,
      };
    }

    // ── Filters / View ──
    case 'SET_ACTIVE_PROJECT':
      return { ...state, activeProject: action.payload, combinedProjects: [] };
    case 'TOGGLE_COMBINED_PROJECT': {
      const name = action.payload;
      const next = state.combinedProjects.includes(name)
        ? state.combinedProjects.filter(p => p !== name)
        : [...state.combinedProjects, name];
      return { ...state, combinedProjects: next, activeProject: '__all__' };
    }
    case 'CLEAR_COMBINED_PROJECTS':
      return { ...state, combinedProjects: [] };
    case 'SET_VIEW':
      return { ...state, view: action.payload };
    case 'SET_VIEW_FILTER':
      return { ...state, viewFilter: action.payload };
    case 'TOGGLE_COST_CENTER_FILTER': {
      const cc = action.payload;
      const cur = state.costCenterFilter;
      const next = cur.includes(cc) ? cur.filter(c => c !== cc) : [...cur, cc];
      return { ...state, costCenterFilter: next };
    }
    case 'CLEAR_COST_CENTER_FILTER':
      return { ...state, costCenterFilter: [] };

    // ── Dynamic Cost Centers ──
    case 'ADD_COST_CENTER':
      return { ...state, costCenters: [...state.costCenters, action.payload] };
    case 'DELETE_COST_CENTER':
      return { ...state, costCenters: state.costCenters.filter(cc => cc.key !== action.payload) };

    // ── Templates ──
    case 'ADD_TEMPLATE':
      return { ...state, templates: [...state.templates, action.payload] };
    case 'DELETE_TEMPLATE':
      return { ...state, templates: state.templates.filter(t => t.id !== action.payload) };

    // ── Resources ──
    case 'ADD_RESOURCE':
      return { ...state, resources: [...state.resources, action.payload] };
    case 'DELETE_RESOURCE':
      return { ...state, resources: state.resources.filter(r => r.id !== action.payload) };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const KanbanContext = createContext(null);

export function KanbanProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  const deletedIds = useRef(new Set()); // tracks IDs deleted this session — blocks any in-flight autosave upsert
  useEffect(() => { stateRef.current = state; }, [state]);

  // ── Persist to localStorage ─────────────────────────────────────────────────
  const saveLocal = useCallback((s) => {
    try {
      localStorage.setItem(SK, JSON.stringify({
        projects: s.projects,
        tasks: s.tasks,
        templates: s.templates,
        resources: s.resources,
        activeProject: s.activeProject,
        view: s.view,
        viewFilter: s.viewFilter,
        costCenterFilter: s.costCenterFilter,
        costCenters: s.costCenters,
      }));
      localStorage.setItem(TRASH_KEY, JSON.stringify({
        trashedTasks: s.trashedTasks,
        trashedProjects: s.trashedProjects,
      }));
    } catch {}
  }, []);

  useEffect(() => {
    if (state.tasks.length > 0 || state.projects.length > 1 || state.trashedTasks.length > 0) {
      saveLocal(state);
    }
  }, [state, saveLocal]);

  // ── Load from localStorage on mount ────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SK);
      if (raw) {
        const p = JSON.parse(raw);
        dispatch({
          type: 'LOAD_LOCAL',
          payload: {
            projects: (p.projects || ['Projeto 1']).map(normalizeProject),
            tasks: (p.tasks || []).map(normalizeTask),
            templates: p.templates || [],
            resources: p.resources || [],
            activeProject: p.activeProject || '__all__',
            view: p.view || 'board',
            viewFilter: p.viewFilter || 'all',
            costCenterFilter: p.costCenterFilter || [],
            costCenters: p.costCenters || DEFAULT_COST_CENTERS,
          },
        });
      }
    } catch {}

    try {
      const trash = localStorage.getItem(TRASH_KEY);
      if (trash) {
        const t = JSON.parse(trash);
        dispatch({ type: 'LOAD_TRASH', payload: t });
      }
    } catch {}
  }, []);

  // ── Load from Supabase ──────────────────────────────────────────────────────
  useEffect(() => {
    async function loadSupabase() {
      try {
        const [{ data: dbProjects }, rawTasksResult] = await Promise.all([
          sb.from('kanban_projects').select('*').order('created_at'),
          sb.from('kanban_tasks').select('*').neq('deleted', true).order('created_at'),
        ]);

        // If the 'deleted' column doesn't exist yet (migration not run), fall back to unfiltered query
        let { data: tasks, error: taskError } = rawTasksResult;
        if (taskError && taskError.message?.includes('deleted')) {
          const fallback = await sb.from('kanban_tasks').select('*').order('created_at');
          tasks = fallback.data;
          taskError = fallback.error;
        }
        if (taskError) throw taskError;

        const mapped = (tasks || []).map(t => normalizeTask({
          ...t,
          startDate: t.start_date,
          deadlineTime: t.deadline_time,
          isEvent: t.is_event,
          eventStartDate: t.event_start_date,
          eventEndDate: t.event_end_date,
          cardColor: t.card_color,
          createdAt: t.created_at,
          ticketGoal: t.ticket_goal,
          ticketsSold: t.tickets_sold,
        }));

        // Supabase is source of truth. Only update if we got real data back.
        // Never wipe tasks if Supabase returned an unexpected empty list.
        if (mapped.length > 0 || stateRef.current.tasks.length === 0) {
          dispatch({ type: 'SET_TASKS', payload: mapped });
        }

        // Merge DB projects with local-only projects (pending insert or offline)
        // Read directly from localStorage so timing of React state updates doesn't matter
        let localProjects = [];
        let trashedProjNames = new Set();
        try {
          const rawLocal = localStorage.getItem(SK);
          if (rawLocal) localProjects = (JSON.parse(rawLocal).projects || []).map(normalizeProject);
          const rawTrash = localStorage.getItem(TRASH_KEY);
          if (rawTrash) trashedProjNames = new Set((JSON.parse(rawTrash).trashedProjects || []).map(p => p.name));
        } catch {}

        const dbMapped = (dbProjects || []).map(p => ({
          id: p.id || ('p_' + p.name.replace(/[^a-z0-9]/gi, '_')),
          name: p.name,
          costCenter: p.cost_center || null,
        }));
        const dbNames = new Set(dbMapped.map(p => p.name));
        // Keep local projects not yet in DB and not in trash (in-flight inserts)
        const pendingLocal = localProjects.filter(p => !dbNames.has(p.name) && !trashedProjNames.has(p.name));
        // Re-insert pending projects so they survive future reloads
        for (const p of pendingLocal) insertProjectToDb(p);

        dispatch({ type: 'SET_PROJECTS', payload: [...dbMapped, ...pendingLocal] });

        dispatch({ type: 'SET_DB_READY' });
      } catch (e) {
        console.warn('[Kanban] Supabase load error:', e.message);
        dispatch({ type: 'SET_SYNC_STATUS', payload: '○ Offline' });
      }
    }
    loadSupabase().then(() => {
      // ── Supabase Realtime ─────────────────────────────────────────────────────
      // NOTE: tables must be added to supabase_realtime publication in Supabase
      // Dashboard → Database → Replication → kanban_tasks + kanban_projects
      const channel = sb.channel('kanban-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kanban_tasks' }, ({ new: row }) => {
          dispatch({ type: 'UPSERT_TASK', payload: normalizeTask(row) });
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kanban_tasks' }, ({ new: row }) => {
          // If the row was soft-deleted, remove it from the board on all devices immediately
          if (row?.deleted) {
            if (row.id) dispatch({ type: 'REMOVE_TASK_BY_ID', payload: row.id });
          } else {
            dispatch({ type: 'UPSERT_TASK', payload: normalizeTask(row) });
          }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'kanban_tasks' }, ({ old: row }) => {
          if (row?.id) dispatch({ type: 'REMOVE_TASK_BY_ID', payload: row.id });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_projects' }, async () => {
          const { data } = await sb.from('kanban_projects').select('*').order('created_at');
          // Only replace if DB returned data AND the count is reasonable
          // (avoids wiping local projects if DB returns empty due to timing/RLS)
          if (data && data.length > 0) {
            dispatch({
              type: 'SET_PROJECTS',
              payload: data.map(p => ({
                id: p.id || ('p_' + p.name.replace(/[^a-z0-9]/gi, '_')),
                name: p.name,
                costCenter: p.cost_center || null,
              })),
            });
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') dispatch({ type: 'SET_SYNC_STATUS', payload: '● Online' });
          if (status === 'CHANNEL_ERROR') dispatch({ type: 'SET_SYNC_STATUS', payload: '○ Sync Error' });
        });

      return () => sb.removeChannel(channel);
    });
  }, []);

  // ── Supabase task save ──────────────────────────────────────────────────────
  async function saveTaskToDb(task) {
    // Guard: task was explicitly deleted this session (blocks in-flight upserts)
    if (deletedIds.current.has(task.id)) return;
    const row = {
      id: task.id,
      title: task.title,
      description: task.description || '',
      project: task.project || '',
      status: task.status || 'backlog',
      assignee: task.assignee || '',
      urgency: task.urgency || 'medium',
      start_date: task.startDate || null,
      deadline: task.deadline || null,
      deadline_time: task.deadlineTime || '',
      is_event: task.isEvent || false,
      event_start_date: task.eventStartDate || '',
      event_end_date: task.eventEndDate || '',
      card_color: task.cardColor || 'none',
      checklist: JSON.stringify(task.checklist || []),
      attachments: JSON.stringify(task.attachments || []),
      ticket_goal: task.ticketGoal !== '' && task.ticketGoal != null ? Number(task.ticketGoal) : null,
      tickets_sold: task.ticketsSold !== '' && task.ticketsSold != null ? Number(task.ticketsSold) : null,
      event_type: task.eventType || 'presencial',
      links: JSON.stringify(task.links || []),
      deleted: false,
    };
    const { error } = await sb.from('kanban_tasks').upsert(row, { onConflict: 'id' });
    if (error) {
      const { deadline_time, is_event, event_start_date, event_end_date, card_color, ticket_goal, tickets_sold, event_type, links, deleted, ...basic } = row;
      await sb.from('kanban_tasks').upsert(basic, { onConflict: 'id' }).catch(() => {});
    }
  }

  // ── Project DB ops — targeted, never delete based on list comparison ───────
  async function insertProjectToDb(proj) {
    // Note: Supabase never throws — errors come in { error } return value
    const { error } = await sb.from('kanban_projects').insert({
      name: proj.name,
      cost_center: proj.costCenter || null,
    });
    if (error) {
      console.warn('[Kanban] project insert failed:', error.message, '— retrying with upsert');
      const { error: e2 } = await sb.from('kanban_projects')
        .upsert({ name: proj.name, cost_center: proj.costCenter || null }, { onConflict: 'name' });
      if (e2) console.warn('[Kanban] project upsert also failed:', e2.message);
    }
  }

  async function updateProjectInDb(proj) {
    const { error } = await sb.from('kanban_projects')
      .update({ cost_center: proj.costCenter || null })
      .eq('name', proj.name);
    if (error) console.warn('[Kanban] updateProject DB error:', error.message);
  }

  async function deleteProjectFromDb(name) {
    const { error } = await sb.from('kanban_projects').delete().eq('name', name);
    if (error) console.warn('[Kanban] deleteProject DB error:', error.message);
  }

  // ── Public actions ──────────────────────────────────────────────────────────
  function addTask(task) {
    dispatch({ type: 'ADD_TASK', payload: task });
    saveTaskToDb(task);
  }

  function updateTask(task) {
    dispatch({ type: 'UPDATE_TASK', payload: task });
    saveTaskToDb(task);
  }

  function softDeleteTask(id, deletedBy = '') {
    // Track in session so saveTaskToDb never upserts a deleted task
    deletedIds.current.add(id);
    dispatch({ type: 'SOFT_DELETE_TASK', payload: { id, deletedAt: new Date().toISOString(), deletedBy } });
    // Step 1: UPDATE deleted=true — fires Realtime UPDATE event to ALL devices immediately
    // Step 2: Hard DELETE to clean the row from the table
    sb.from('kanban_tasks')
      .update({ deleted: true })
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.warn('[Kanban] soft-delete flag failed:', error.message, '— trying hard delete anyway');
        return sb.from('kanban_tasks').delete().eq('id', id);
      })
      .then(({ error }) => {
        if (error) console.warn('[Kanban] hard delete failed:', error.message, '— task may reappear on refresh');
      })
      .catch(e => console.warn('[Kanban] delete error:', e.message));
  }

  function restoreTask(id) {
    const task = stateRef.current.trashedTasks.find(t => t.id === id);
    dispatch({ type: 'RESTORE_TASK', payload: id });
    if (task) saveTaskToDb(normalizeTask(task));
  }

  function permDeleteTask(id) {
    dispatch({ type: 'PERM_DELETE_TASK', payload: id });
  }

  function newProjectId() {
    return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
  }

  function addProject(name, costCenter = null) {
    const proj = { id: newProjectId(), name, costCenter };
    dispatch({ type: 'ADD_PROJECT', payload: proj });
    insertProjectToDb(proj);
  }

  function updateProject(id, patch) {
    dispatch({ type: 'UPDATE_PROJECT', payload: { id, ...patch } });
    const updated = stateRef.current.projects.find(p => p.id === id);
    if (updated) updateProjectInDb({ ...updated, ...patch });
  }

  async function softDeleteProject(id, deletedBy = '') {
    const proj = stateRef.current.projects.find(p => p.id === id);
    dispatch({ type: 'SOFT_DELETE_PROJECT', payload: { id, deletedAt: new Date().toISOString(), deletedBy } });
    if (proj) {
      const taskIds = stateRef.current.tasks.filter(t => t.project === proj.name).map(t => t.id);
      deleteProjectFromDb(proj.name);
      for (const tid of taskIds) sb.from('kanban_tasks').delete().eq('id', tid).catch(() => {});
    }
  }

  function restoreProject(id) {
    dispatch({ type: 'RESTORE_PROJECT', payload: id });
    const proj = stateRef.current.trashedProjects.find(p => p.id === id);
    if (proj) {
      insertProjectToDb(proj);
      const restoredTasks = stateRef.current.trashedTasks.filter(t => t.project === proj.name && t.deletedWithProject);
      for (const t of restoredTasks) saveTaskToDb(normalizeTask(t));
    }
  }

  function permDeleteProject(id) {
    dispatch({ type: 'PERM_DELETE_PROJECT', payload: id });
  }

  function setActiveProject(name) {
    dispatch({ type: 'SET_ACTIVE_PROJECT', payload: name });
  }

  function toggleCombinedProject(name) {
    dispatch({ type: 'TOGGLE_COMBINED_PROJECT', payload: name });
  }

  function clearCombinedProjects() {
    dispatch({ type: 'CLEAR_COMBINED_PROJECTS' });
  }

  function setView(v) { dispatch({ type: 'SET_VIEW', payload: v }); }
  function setViewFilter(f) { dispatch({ type: 'SET_VIEW_FILTER', payload: f }); }
  function toggleCostCenterFilter(cc) { dispatch({ type: 'TOGGLE_COST_CENTER_FILTER', payload: cc }); }
  function clearCostCenterFilter() { dispatch({ type: 'CLEAR_COST_CENTER_FILTER' }); }

  function addCostCenter(label, color, isPrivate = false, createdBy = null) {
    const key = label.trim().replace(/\s+/g, '_').toUpperCase().slice(0, 20);
    const unique = stateRef.current.costCenters.some(cc => cc.key === key)
      ? key + '_' + Date.now().toString(36).slice(-4)
      : key;
    dispatch({ type: 'ADD_COST_CENTER', payload: { key: unique, label: label.trim(), color, isPrivate, createdBy } });
  }

  function addResource(item) { dispatch({ type: 'ADD_RESOURCE', payload: { id: 'r_' + Date.now(), createdAt: new Date().toISOString(), ...item } }); }
  function deleteResource(id) { dispatch({ type: 'DELETE_RESOURCE', payload: id }); }

  function deleteCostCenter(key) {
    dispatch({ type: 'DELETE_COST_CENTER', payload: key });
  }
  function addTemplate(tpl) { dispatch({ type: 'ADD_TEMPLATE', payload: tpl }); }
  function deleteTemplate(id) { dispatch({ type: 'DELETE_TEMPLATE', payload: id }); }

  function saveDraft(draft) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {} }
  function loadDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { return null; } }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch {} }

  return (
    <KanbanContext.Provider value={{
      ...state,
      dispatch,
      addTask, updateTask, softDeleteTask, restoreTask, permDeleteTask,
      addProject, updateProject, softDeleteProject, restoreProject, permDeleteProject,
      setActiveProject, toggleCombinedProject, clearCombinedProjects,
      setView, setViewFilter, toggleCostCenterFilter, clearCostCenterFilter,
      addCostCenter, deleteCostCenter,
      addTemplate, deleteTemplate,
      addResource, deleteResource,
      saveTaskToDb, saveDraft, loadDraft, clearDraft,
    }}>
      {children}
    </KanbanContext.Provider>
  );
}

export function useKanban() {
  const ctx = useContext(KanbanContext);
  if (!ctx) throw new Error('useKanban must be used inside KanbanProvider');
  return ctx;
}
