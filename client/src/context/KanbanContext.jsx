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
  { key: 'IBEC',  label: 'IBEC',  color: '#eab308', isPrivate: false, createdBy: null, sharedWith: [] },
  { key: 'GH',    label: 'GH',    color: '#3b82f6', isPrivate: false, createdBy: null, sharedWith: [] },
  { key: 'Leanx', label: 'Leanx', color: '#ef4444', isPrivate: false, createdBy: null, sharedWith: [] },
  { key: 'Up3',   label: 'Up3',   color: '#22c55e', isPrivate: false, createdBy: null, sharedWith: [] },
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
      // Merge DB tasks with any locally-added tasks not yet confirmed by DB.
      // This prevents the race condition where SET_TASKS fires before saveTaskToDb
      // completes, wiping tasks that exist in local state but not in DB yet.
      const trashedIds = new Set(state.trashedTasks.map(t => t.id));
      const dbIds = new Set(action.payload.map(t => t.id));
      const localPending = state.tasks.filter(t => !dbIds.has(t.id) && !trashedIds.has(t.id));
      return { ...state, tasks: [...action.payload.filter(t => !trashedIds.has(t.id)), ...localPending] };
    }
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload.map(normalizeProject) };
    case 'SET_COST_CENTERS':
      return { ...state, costCenters: action.payload };
    case 'SET_TEMPLATES':
      return { ...state, templates: action.payload };
    case 'SET_RESOURCES':
      return { ...state, resources: action.payload };
    case 'SET_TRASH':
      return { ...state, trashedTasks: action.payload.trashedTasks || [], trashedProjects: action.payload.trashedProjects || [] };

    // ── Tasks ──
    case 'ADD_TASK': {
      // Idempotent: Realtime INSERT may arrive before this dispatch if the channel is fast
      const alreadyAdded = state.tasks.some(t => t.id === action.payload.id);
      if (alreadyAdded) return state;
      return { ...state, tasks: [...state.tasks, action.payload] };
    }
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
    case 'UPDATE_COST_CENTER':
      return { ...state, costCenters: state.costCenters.map(cc => cc.key === action.payload.key ? { ...cc, ...action.payload } : cc) };
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
    case 'UPDATE_RESOURCE':
      return { ...state, resources: state.resources.map(r => r.id === action.payload.id ? { ...r, ...action.payload } : r) };
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

  // ── Persist UI preferences to localStorage (view state only, not app data) ────
  const saveLocal = useCallback((s) => {
    try {
      localStorage.setItem(SK, JSON.stringify({
        activeProject: s.activeProject,
        view: s.view,
        viewFilter: s.viewFilter,
        costCenterFilter: s.costCenterFilter,
      }));
    } catch {}
  }, []);

  useEffect(() => {
    saveLocal(state);
  }, [state.activeProject, state.view, state.viewFilter, state.costCenterFilter]);

  // ── Load UI preferences from localStorage on mount ─────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SK);
      if (raw) {
        const p = JSON.parse(raw);
        dispatch({
          type: 'LOAD_LOCAL',
          payload: {
            activeProject: p.activeProject || '__all__',
            view: p.view || 'board',
            viewFilter: p.viewFilter || 'all',
            costCenterFilter: p.costCenterFilter || [],
          },
        });
      }
    } catch {}
    // All app data (templates, resources, costCenters, trash) comes exclusively from Supabase
  }, []);

  // ── Load from Supabase ──────────────────────────────────────────────────────
  // channelRef ensures cleanup always has a reference even when setup is async
  const channelRef = useRef(null);

  useEffect(() => {
    // Helper: fetch tasks from DB (with fallback if 'deleted' column missing)
    async function fetchTasksFromDb() {
      let { data, error } = await sb.from('kanban_tasks').select('*').neq('deleted', true).order('created_at');
      if (error && error.message?.includes('deleted')) {
        ({ data, error } = await sb.from('kanban_tasks').select('*').order('created_at'));
      }
      if (error) throw error;
      return (data || []).map(t => normalizeTask({
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
    }

    // Helper: fetch projects from DB
    async function fetchProjectsFromDb() {
      const { data } = await sb.from('kanban_projects').select('*').order('created_at');
      return (data || []).map(p => ({
        id: p.id || ('p_' + p.name.replace(/[^a-z0-9]/gi, '_')),
        name: p.name,
        costCenter: p.cost_center || null,
      }));
    }

    // Helper: fetch cost centers from DB (null = table missing)
    async function fetchCostCentersFromDb() {
      const { data, error } = await sb.from('kanban_cost_centers').select('*').order('created_at');
      if (error) return null;
      return (data || [])
        .filter(r => !r.key.startsWith('__'))  // exclude any legacy system entries
        .map(cc => ({
          key: cc.key, label: cc.label, color: cc.color || '#3b82f6',
          isPrivate: cc.is_private || false, createdBy: cc.created_by || null,
          sharedWith: cc.shared_with || [],
        }));
    }

    // Helper: fetch resources from DB (null = table missing)
    async function fetchResourcesFromDb() {
      const { data, error } = await sb.from('kanban_resources').select('*').order('created_at');
      if (error) return null;
      return (data || []).map(r => ({
        id: r.id, title: r.name || '', url: r.url || '',  // DB 'name' → component 'title'
        type: r.type || 'link', description: r.description || '',
        costCenters: parseJsonField(r.cost_centers),
        createdAt: r.created_at || '',
      }));
    }

    // Helper: fetch trash from DB (null = table missing)
    async function fetchTrashFromDb() {
      const { data, error } = await sb.from('kanban_trash').select('*').order('deleted_at');
      if (error) return null;
      const trashedTasks = [], trashedProjects = [];
      for (const row of (data || [])) {
        if (row.type === 'task') trashedTasks.push({ ...row.data, deletedAt: row.deleted_at, deletedBy: row.deleted_by || '', deletedWithProject: row.deleted_with_project || false });
        else if (row.type === 'project') trashedProjects.push({ ...row.data, deletedAt: row.deleted_at });
      }
      return { trashedTasks, trashedProjects };
    }

    // Helper: fetch templates from DB (null = table missing)
    async function fetchTemplatesFromDb() {
      const { data, error } = await sb.from('kanban_templates').select('*').order('created_at');
      if (error) return null;
      return (data || []).map(t => ({
        id: t.id, title: t.title || '', description: t.description || '',
        project: t.project || '', status: t.status || 'backlog',
        assignee: t.assignee || '', urgency: t.urgency || '',
        checklist: parseJsonField(t.checklist), links: parseJsonField(t.links),
        cardColor: t.card_color || 'none',
      }));
    }

    async function loadSupabase() {
      try {
        const [mapped, dbMapped, ccMapped, tplMapped, resMapped, trashMapped] = await Promise.all([
          fetchTasksFromDb(), fetchProjectsFromDb(), fetchCostCentersFromDb(),
          fetchTemplatesFromDb(), fetchResourcesFromDb(), fetchTrashFromDb(),
        ]);

        dispatch({ type: 'SET_TASKS', payload: mapped });
        dispatch({ type: 'SET_PROJECTS', payload: dbMapped });

        // Cost centers
        if (ccMapped !== null) {
          if (ccMapped.length > 0) {
            dispatch({ type: 'SET_COST_CENTERS', payload: ccMapped });
          } else {
            // One-time migration from localStorage on first deploy
            try {
              const stored = JSON.parse(localStorage.getItem(SK) || '{}');
              const localCCs = Array.isArray(stored.costCenters) && stored.costCenters.length > 0
                ? stored.costCenters : DEFAULT_COST_CENTERS;
              for (const cc of localCCs) {
                await sb.from('kanban_cost_centers').upsert({
                  key: cc.key, label: cc.label, color: cc.color,
                  is_private: cc.isPrivate || false, created_by: cc.createdBy || null, shared_with: cc.sharedWith || [],
                }, { onConflict: 'key' });
              }
              dispatch({ type: 'SET_COST_CENTERS', payload: localCCs });
            } catch { dispatch({ type: 'SET_COST_CENTERS', payload: DEFAULT_COST_CENTERS }); }
          }
        }

        // Templates
        if (tplMapped !== null) {
          dispatch({ type: 'SET_TEMPLATES', payload: tplMapped });
          if (tplMapped.length === 0) {
            try {
              const stored = JSON.parse(localStorage.getItem(SK) || '{}');
              if (Array.isArray(stored.templates) && stored.templates.length > 0) {
                for (const tpl of stored.templates) await saveTemplateToDb(tpl);
                dispatch({ type: 'SET_TEMPLATES', payload: stored.templates });
              }
            } catch {}
          }
        }

        // Resources — one-time migration from localStorage if DB empty
        if (resMapped !== null) {
          dispatch({ type: 'SET_RESOURCES', payload: resMapped });
          if (resMapped.length === 0) {
            try {
              const stored = JSON.parse(localStorage.getItem(SK) || '{}');
              if (Array.isArray(stored.resources) && stored.resources.length > 0) {
                for (const r of stored.resources) await saveResourceToDb(r);
                dispatch({ type: 'SET_RESOURCES', payload: stored.resources });
              }
            } catch {}
          }
        }

        // Trash — one-time migration from localStorage if DB empty
        if (trashMapped !== null) {
          dispatch({ type: 'SET_TRASH', payload: trashMapped });
          if (trashMapped.trashedTasks.length === 0 && trashMapped.trashedProjects.length === 0) {
            try {
              const rawTrash = localStorage.getItem(TRASH_KEY);
              if (rawTrash) {
                const { trashedTasks: lt = [], trashedProjects: lp = [] } = JSON.parse(rawTrash);
                for (const task of lt) await saveToTrashDb({ id: task.id, type: 'task', data: task, deletedAt: task.deletedAt || new Date().toISOString(), deletedBy: task.deletedBy || '', deletedWithProject: task.deletedWithProject || false });
                for (const proj of lp) await saveToTrashDb({ id: proj.id, type: 'project', data: proj, deletedAt: proj.deletedAt || new Date().toISOString(), deletedBy: '', deletedWithProject: false });
              }
            } catch {}
          }
        }

        dispatch({ type: 'SET_DB_READY' });
      } catch (e) {
        console.warn('[Kanban] Supabase load error:', e.message);
        dispatch({ type: 'SET_SYNC_STATUS', payload: '○ Offline' });
      }
    }
    loadSupabase();

    // Refresh all data from DB (called on visibilitychange and Realtime project events)
    async function refreshFromDb() {
      try {
        const [mapped, dbMapped, ccMapped, tplMapped, resMapped] = await Promise.all([
          fetchTasksFromDb(), fetchProjectsFromDb(), fetchCostCentersFromDb(),
          fetchTemplatesFromDb(), fetchResourcesFromDb(),
        ]);
        dispatch({ type: 'SET_TASKS', payload: mapped });
        if (dbMapped.length > 0) dispatch({ type: 'SET_PROJECTS', payload: dbMapped });
        if (ccMapped && ccMapped.length > 0) dispatch({ type: 'SET_COST_CENTERS', payload: ccMapped });
        if (tplMapped !== null) dispatch({ type: 'SET_TEMPLATES', payload: tplMapped });
        if (resMapped !== null) dispatch({ type: 'SET_RESOURCES', payload: resMapped });
      } catch (e) {
        console.warn('[Kanban] refresh error:', e.message);
      }
    }

    // Setup Realtime SYNCHRONOUSLY — no async gap means cleanup always finds channelRef.current set
    channelRef.current = sb.channel('kanban-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kanban_tasks' }, ({ new: row }) => {
        dispatch({ type: 'UPSERT_TASK', payload: normalizeTask(row) });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kanban_tasks' }, ({ new: row }) => {
        if (row?.deleted) {
          if (row.id) dispatch({ type: 'REMOVE_TASK_BY_ID', payload: row.id });
        } else {
          dispatch({ type: 'UPSERT_TASK', payload: normalizeTask(row) });
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'kanban_tasks' }, ({ old: row }) => {
        if (row?.id) dispatch({ type: 'REMOVE_TASK_BY_ID', payload: row.id });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_projects' }, () => {
        refreshFromDb();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_cost_centers' }, () => {
        fetchCostCentersFromDb().then(cc => { if (cc) dispatch({ type: 'SET_COST_CENTERS', payload: cc }); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_templates' }, () => {
        fetchTemplatesFromDb().then(tpl => { if (tpl !== null) dispatch({ type: 'SET_TEMPLATES', payload: tpl }); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_resources' }, () => {
        fetchResourcesFromDb().then(res => { if (res !== null) dispatch({ type: 'SET_RESOURCES', payload: res }); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_trash' }, () => {
        fetchTrashFromDb().then(trash => { if (trash !== null) dispatch({ type: 'SET_TRASH', payload: trash }); });
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') dispatch({ type: 'SET_SYNC_STATUS', payload: '⚠ Erro de conexão' });
      });

    // Fallback: refresh tasks+projects when user tabs back (covers Realtime not enabled for table)
    function onVisibility() {
      if (document.visibilityState === 'visible') refreshFromDb();
    }
    document.addEventListener('visibilitychange', onVisibility);

    // Cleanup: always works because channelRef is set synchronously above
    return () => {
      if (channelRef.current) {
        sb.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // ── DB helpers for templates, resources, trash ─────────────────────────────
  async function saveTemplateToDb(tpl) {
    const { error } = await sb.from('kanban_templates').upsert({
      id: tpl.id, title: tpl.title || '', description: tpl.description || '',
      project: tpl.project || '', status: tpl.status || 'backlog',
      assignee: tpl.assignee || '', urgency: tpl.urgency || '',
      checklist: JSON.stringify(tpl.checklist || []),
      links: JSON.stringify(tpl.links || []),
      card_color: tpl.cardColor || 'none',
    }, { onConflict: 'id' });
    if (error) console.warn('[Kanban] template save error:', error.message);
  }

  async function saveResourceToDb(r) {
    const { error } = await sb.from('kanban_resources').upsert({
      id: r.id, name: r.title || r.name || '', url: r.url || '',  // component 'title' → DB 'name'
      type: r.type || 'link', description: r.description || '',
      cost_centers: JSON.stringify(r.costCenters || []),
    }, { onConflict: 'id' });
    if (error) console.warn('[Kanban] resource save error:', error.message);
  }

  async function saveToTrashDb({ id, type, data, deletedAt, deletedBy, deletedWithProject }) {
    const { error } = await sb.from('kanban_trash').upsert({
      id, type, data,
      deleted_at: deletedAt,
      deleted_by: deletedBy || '',
      deleted_with_project: deletedWithProject || false,
    }, { onConflict: 'id' });
    if (error) console.warn('[Kanban] trash save error:', error.message);
  }

  function deleteFromTrashDb(id, type = null) {
    sb.from('kanban_trash').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('[Kanban] trash delete error:', error.message); });
  }

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
      // Retry without optional columns that may not exist in the DB yet (migration pending)
      const { deadline_time, is_event, event_start_date, event_end_date, card_color, ticket_goal, tickets_sold, event_type, links, deleted, ...basic } = row;
      const { error: e2 } = await sb.from('kanban_tasks').upsert(basic, { onConflict: 'id' });
      if (e2) {
        console.error('[Kanban] task save failed:', e2.message, '| task id:', task.id);
        dispatch({ type: 'SET_SYNC_STATUS', payload: '⚠ Erro ao salvar' });
        return e2; // propagate so callers can react
      }
    }
    return null; // success
  }

  // ── Project DB ops — targeted, never delete based on list comparison ───────
  async function insertProjectToDb(proj) {
    // Note: Supabase never throws — errors come in { error } return value
    // Always include id so TEXT-typed id columns don't reject the insert
    const row = { id: proj.id, name: proj.name, cost_center: proj.costCenter || null };
    let { error } = await sb.from('kanban_projects').insert(row);

    // If id caused a type error (UUID column), retry without it
    if (error && (error.message?.includes('id') || error.message?.includes('uuid') || error.message?.includes('invalid input'))) {
      const { id: _drop, ...rowWithoutId } = row;
      ({ error } = await sb.from('kanban_projects').insert(rowWithoutId));
    }

    if (error) {
      console.warn('[Kanban] project insert failed:', error.message, '— retrying with upsert');
      const { error: e2 } = await sb.from('kanban_projects')
        .upsert(row, { onConflict: 'name' });
      if (e2) {
        // Last resort: upsert without id
        const { id: _drop, ...rowWithoutId } = row;
        const { error: e3 } = await sb.from('kanban_projects')
          .upsert(rowWithoutId, { onConflict: 'name' });
        if (e3) console.warn('[Kanban] project upsert also failed:', e3.message);
      }
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
  // addTask: DB-first — task only appears in UI after Supabase confirms the save.
  // This eliminates the race condition where SET_TASKS (from loadSupabase) fires
  // between ADD_TASK and saveTaskToDb completing, wiping the locally-added task.
  async function addTask(task) {
    const error = await saveTaskToDb(task);
    if (!error) {
      dispatch({ type: 'ADD_TASK', payload: task });
    }
    // On error: SET_SYNC_STATUS already set inside saveTaskToDb; task not added locally
    return error; // propagate so callers can keep modal open and show feedback
  }

  function updateTask(task) {
    dispatch({ type: 'UPDATE_TASK', payload: task });
    saveTaskToDb(task);
  }

  function softDeleteTask(id, deletedBy = '') {
    const task = stateRef.current.tasks.find(t => t.id === id);
    if (!task) return;
    deletedIds.current.add(id);
    const deletedAt = new Date().toISOString();
    dispatch({ type: 'SOFT_DELETE_TASK', payload: { id, deletedAt, deletedBy } });
    // Save full task data to trash before removing from active tasks
    saveToTrashDb({ id, type: 'task', data: task, deletedAt, deletedBy, deletedWithProject: false });
    // Fire Realtime UPDATE then hard DELETE
    sb.from('kanban_tasks').update({ deleted: true }).eq('id', id)
      .then(() => sb.from('kanban_tasks').delete().eq('id', id))
      .catch(e => console.warn('[Kanban] delete error:', e.message));
  }

  function restoreTask(id) {
    const task = stateRef.current.trashedTasks.find(t => t.id === id);
    dispatch({ type: 'RESTORE_TASK', payload: id });
    if (task) {
      const { deletedAt, deletedWithProject, deletedBy, ...cleanTask } = task;
      saveTaskToDb(normalizeTask(cleanTask));
      deleteFromTrashDb(id);
    }
  }

  function permDeleteTask(id) {
    dispatch({ type: 'PERM_DELETE_TASK', payload: id });
    deleteFromTrashDb(id);
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
    const tasks = stateRef.current.tasks.filter(t => t.project === proj?.name);
    const deletedAt = new Date().toISOString();
    dispatch({ type: 'SOFT_DELETE_PROJECT', payload: { id, deletedAt, deletedBy } });
    if (proj) {
      // Save project and all its tasks to trash
      saveToTrashDb({ id: proj.id, type: 'project', data: proj, deletedAt, deletedBy, deletedWithProject: false });
      for (const task of tasks) {
        deletedIds.current.add(task.id);
        saveToTrashDb({ id: task.id, type: 'task', data: task, deletedAt, deletedBy, deletedWithProject: true });
      }
      deleteProjectFromDb(proj.name);
      for (const task of tasks) sb.from('kanban_tasks').delete().eq('id', task.id).catch(() => {});
    }
  }

  function restoreProject(id) {
    dispatch({ type: 'RESTORE_PROJECT', payload: id });
    const proj = stateRef.current.trashedProjects.find(p => p.id === id);
    if (proj) {
      insertProjectToDb(proj);
      const restoredTasks = stateRef.current.trashedTasks.filter(t => t.project === proj.name && t.deletedWithProject);
      for (const t of restoredTasks) {
        const { deletedAt, deletedWithProject, deletedBy, ...cleanTask } = t;
        saveTaskToDb(normalizeTask(cleanTask));
        deleteFromTrashDb(t.id);
      }
      deleteFromTrashDb(proj.id);
    }
  }

  function permDeleteProject(id) {
    const proj = stateRef.current.trashedProjects.find(p => p.id === id);
    dispatch({ type: 'PERM_DELETE_PROJECT', payload: id });
    if (proj) {
      deleteFromTrashDb(proj.id);
      stateRef.current.trashedTasks
        .filter(t => t.project === proj.name && t.deletedWithProject)
        .forEach(t => deleteFromTrashDb(t.id));
    }
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

  // ── Cost Center DB helpers ──────────────────────────────────────────────────
  async function saveCcToDb(cc) {
    const { error } = await sb.from('kanban_cost_centers').upsert({
      key: cc.key, label: cc.label, color: cc.color,
      is_private: cc.isPrivate || false,
      created_by: cc.createdBy || null,
      shared_with: cc.sharedWith || [],
    }, { onConflict: 'key' });
    if (error) console.warn('[Kanban] CC save error:', error.message);
  }

  function addCostCenter(label, color, isPrivate = false, createdBy = null, sharedWith = []) {
    const key = label.trim().replace(/\s+/g, '_').toUpperCase().slice(0, 20);
    const unique = stateRef.current.costCenters.some(cc => cc.key === key)
      ? key + '_' + Date.now().toString(36).slice(-4)
      : key;
    const cc = { key: unique, label: label.trim(), color, isPrivate, createdBy, sharedWith };
    dispatch({ type: 'ADD_COST_CENTER', payload: cc });
    saveCcToDb(cc);
  }

  function addResource(item) {
    const resource = { id: 'r_' + Date.now(), createdAt: new Date().toISOString(), costCenters: [], ...item };
    dispatch({ type: 'ADD_RESOURCE', payload: resource });
    saveResourceToDb(resource);
  }
  function updateResource(id, patch) {
    dispatch({ type: 'UPDATE_RESOURCE', payload: { id, ...patch } });
    const existing = stateRef.current.resources.find(r => r.id === id);
    if (existing) saveResourceToDb({ ...existing, ...patch });
  }
  function deleteResource(id) {
    dispatch({ type: 'DELETE_RESOURCE', payload: id });
    sb.from('kanban_resources').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('[Kanban] resource delete error:', error.message); });
  }

  function updateCostCenter(key, patch) {
    dispatch({ type: 'UPDATE_COST_CENTER', payload: { key, ...patch } });
    const existing = stateRef.current.costCenters.find(cc => cc.key === key);
    if (existing) saveCcToDb({ ...existing, ...patch });
  }

  function deleteCostCenter(key) {
    dispatch({ type: 'DELETE_COST_CENTER', payload: key });
    sb.from('kanban_cost_centers').delete().eq('key', key)
      .then(({ error }) => { if (error) console.warn('[Kanban] CC delete error:', error.message); });
  }
  function addTemplate(tpl) {
    dispatch({ type: 'ADD_TEMPLATE', payload: tpl });
    saveTemplateToDb(tpl);
  }
  function deleteTemplate(id) {
    dispatch({ type: 'DELETE_TEMPLATE', payload: id });
    sb.from('kanban_templates').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('[Kanban] template delete error:', error.message); });
  }

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
      addCostCenter, updateCostCenter, deleteCostCenter,
      addTemplate, deleteTemplate,
      addResource, updateResource, deleteResource,
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
