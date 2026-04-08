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
  { key: 'IBEC',  label: 'IBEC',  color: '#eab308' },
  { key: 'GH',    label: 'GH',    color: '#3b82f6' },
  { key: 'Leanx', label: 'Leanx', color: '#ef4444' },
  { key: 'Up3',   label: 'Up3',   color: '#22c55e' },
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
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
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

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const KanbanContext = createContext(null);

export function KanbanProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // ── Persist to localStorage ─────────────────────────────────────────────────
  const saveLocal = useCallback((s) => {
    try {
      localStorage.setItem(SK, JSON.stringify({
        projects: s.projects,
        tasks: s.tasks,
        templates: s.templates,
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
        const [{ data: dbProjects }, { data: tasks, error: taskError }] = await Promise.all([
          sb.from('kanban_projects').select('*').order('created_at'),
          sb.from('kanban_tasks').select('*').order('created_at'),
        ]);
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

        // Supabase is the source of truth — do NOT merge localStorage tasks
        // (merged tasks from deleted-on-another-device would come back)
        dispatch({ type: 'SET_TASKS', payload: mapped });

        if (dbProjects && dbProjects.length) {
          dispatch({
            type: 'SET_PROJECTS',
            payload: dbProjects.map(p => ({
              id: p.id || ('p_' + p.name.replace(/[^a-z0-9]/gi, '_')),
              name: p.name,
              costCenter: p.cost_center || null,
            })),
          });
        }

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
          dispatch({ type: 'UPSERT_TASK', payload: normalizeTask(row) });
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'kanban_tasks' }, ({ old: row }) => {
          if (row?.id) dispatch({ type: 'REMOVE_TASK_BY_ID', payload: row.id });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_projects' }, async () => {
          // On any project change, reload all projects from DB
          const { data } = await sb.from('kanban_projects').select('*').order('created_at');
          if (data?.length) {
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
    };
    const { error } = await sb.from('kanban_tasks').upsert(row, { onConflict: 'id' });
    if (error) {
      const { deadline_time, is_event, event_start_date, event_end_date, ...basic } = row;
      await sb.from('kanban_tasks').upsert(basic, { onConflict: 'id' }).catch(() => {});
    }
  }

  // ── Project sync ────────────────────────────────────────────────────────────
  async function syncProjects(projects) {
    try {
      const { data: existing } = await sb.from('kanban_projects').select('name');
      const existingNames = (existing || []).map(p => p.name);
      const toInsert = projects.filter(p => !existingNames.includes(p.name));
      const toDelete = existingNames.filter(n => !projects.some(p => p.name === n));
      if (toInsert.length) {
        await sb.from('kanban_projects').insert(toInsert.map(p => ({
          name: p.name,
          cost_center: p.costCenter || null,
        })));
      }
      for (const name of toDelete) await sb.from('kanban_projects').delete().eq('name', name);
      // Update cost center for existing
      for (const p of projects) {
        if (existingNames.includes(p.name)) {
          await sb.from('kanban_projects').update({ cost_center: p.costCenter || null }).eq('name', p.name);
        }
      }
    } catch (e) {
      console.warn('[Kanban] syncProjects error:', e.message);
    }
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
    dispatch({ type: 'SOFT_DELETE_TASK', payload: { id, deletedAt: new Date().toISOString(), deletedBy } });
    sb.from('kanban_tasks').delete().eq('id', id).catch(() => {});
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
    syncProjects([...stateRef.current.projects, proj]);
  }

  function updateProject(id, patch) {
    dispatch({ type: 'UPDATE_PROJECT', payload: { id, ...patch } });
    const updated = stateRef.current.projects.map(p => p.id === id ? { ...p, ...patch } : p);
    syncProjects(updated);
  }

  async function softDeleteProject(id, deletedBy = '') {
    const proj = stateRef.current.projects.find(p => p.id === id);
    dispatch({ type: 'SOFT_DELETE_PROJECT', payload: { id, deletedAt: new Date().toISOString(), deletedBy } });
    if (proj) {
      const taskIds = stateRef.current.tasks.filter(t => t.project === proj.name).map(t => t.id);
      const newProjects = stateRef.current.projects.filter(p => p.id !== id);
      syncProjects(newProjects);
      for (const tid of taskIds) sb.from('kanban_tasks').delete().eq('id', tid).catch(() => {});
    }
  }

  function restoreProject(id) {
    dispatch({ type: 'RESTORE_PROJECT', payload: id });
    const proj = stateRef.current.trashedProjects.find(p => p.id === id);
    if (proj) {
      syncProjects([...stateRef.current.projects, proj]);
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

  function addCostCenter(label, color) {
    const key = label.trim().replace(/\s+/g, '_').toUpperCase().slice(0, 20);
    const unique = stateRef.current.costCenters.some(cc => cc.key === key)
      ? key + '_' + Date.now().toString(36).slice(-4)
      : key;
    dispatch({ type: 'ADD_COST_CENTER', payload: { key: unique, label: label.trim(), color } });
  }

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
