import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { sb } from '../lib/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Supabase can return jsonb columns as already-parsed arrays OR as strings
function parseJsonField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch { return []; }
}

// Normalizes both old snake_case localStorage format and new camelCase format
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
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SK = 'kanban_pro_v2';
const DRAFT_KEY = 'kanban_task_draft';

// ─── Initial state ─────────────────────────────────────────────────────────────
const initialState = {
  projects: ['Projeto 1'],
  tasks: [],
  templates: [],
  activeProject: '__all__',
  view: 'board',
  dbReady: false,
  syncStatus: 'Conectando...',
};

// ─── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_LOCAL':
      return { ...state, ...action.payload };
    case 'SET_DB_READY':
      return { ...state, dbReady: true, syncStatus: '● Online' };
    case 'SET_SYNC_STATUS':
      return { ...state, syncStatus: action.payload };
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };
    case 'SET_TEMPLATES':
      return { ...state, templates: action.payload };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK':
      return { ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(p => p !== action.payload),
        tasks: state.tasks.filter(t => t.project !== action.payload),
        activeProject: state.activeProject === action.payload ? '__all__' : state.activeProject,
      };
    case 'SET_ACTIVE_PROJECT':
      return { ...state, activeProject: action.payload };
    case 'SET_VIEW':
      return { ...state, view: action.payload };
    case 'ADD_TEMPLATE':
      return { ...state, templates: [...state.templates, action.payload] };
    case 'DELETE_TEMPLATE':
      return { ...state, templates: state.templates.filter(t => t.id !== action.payload) };
    default:
      return state;
  }
}

// ─── Context ───────────────────────────────────────────────────────────────────
const KanbanContext = createContext(null);

export function KanbanProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // ── Persist to localStorage ──────────────────────────────────────────────────
  const saveLocal = useCallback((s) => {
    try {
      localStorage.setItem(SK, JSON.stringify({
        projects: s.projects,
        tasks: s.tasks,
        templates: s.templates,
        activeProject: s.activeProject,
        view: s.view,
      }));
    } catch (e) {}
  }, []);

  // Auto-save to localStorage on every state change
  useEffect(() => {
    if (state.tasks.length > 0 || state.projects.length > 1) {
      saveLocal(state);
    }
  }, [state, saveLocal]);

  // ── Load from localStorage on mount ─────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SK);
      if (raw) {
        const parsed = JSON.parse(raw);
        dispatch({
          type: 'LOAD_LOCAL',
          payload: {
            projects: parsed.projects || ['Projeto 1'],
            tasks: (parsed.tasks || []).map(normalizeTask),
            templates: parsed.templates || [],
            activeProject: parsed.activeProject || '__all__',
            view: parsed.view || 'board',
          },
        });
      }
    } catch (e) {}
  }, []);

  // ── Load from Supabase ────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadSupabase() {
      try {
        const { data: projects } = await sb.from('kanban_projects').select('name').order('created_at');
        const { data: tasks, error: taskError } = await sb.from('kanban_tasks').select('*').order('created_at');
        if (taskError) throw taskError;

        const mapped = (tasks || []).map(t => ({
          id: t.id,
          title: t.title || '',
          description: t.description || '',
          project: t.project || '',
          status: t.status || 'backlog',
          assignee: t.assignee || '',
          urgency: t.urgency || 'medium',
          startDate: t.start_date || '',
          deadline: t.deadline || '',
          deadlineTime: t.deadline_time || '',
          isEvent: t.is_event || false,
          eventStartDate: t.event_start_date || '',
          eventEndDate: t.event_end_date || '',
          cardColor: t.card_color || 'none',
          checklist: parseJsonField(t.checklist),
          attachments: parseJsonField(t.attachments),
          createdAt: t.created_at,
        }));

        const supabaseIds = new Set(mapped.map(t => t.id));
        const localOnly = stateRef.current.tasks
          .filter(t => !supabaseIds.has(t.id))
          .map(normalizeTask);

        const allTasks = [...mapped, ...localOnly];
        dispatch({ type: 'SET_TASKS', payload: allTasks });

        if (projects && projects.length) {
          dispatch({ type: 'SET_PROJECTS', payload: projects.map(p => p.name) });
        }

        // Push local-only tasks to Supabase
        for (const t of localOnly) {
          saveTaskToDb(t);
        }

        dispatch({ type: 'SET_DB_READY' });
      } catch (e) {
        console.warn('[Kanban] Supabase load error:', e.message);
        dispatch({ type: 'SET_SYNC_STATUS', payload: '○ Offline' });
      }
    }
    loadSupabase();
  }, []);

  // ── Supabase task save ────────────────────────────────────────────────────────
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
      // Fallback without new columns if schema is outdated
      const { deadline_time, is_event, event_start_date, event_end_date, ...basic } = row;
      const { error: e2 } = await sb.from('kanban_tasks').upsert(basic, { onConflict: 'id' });
      if (e2) console.warn('[Kanban] saveTask fallback error:', e2.message);
    }
  }

  // ── Project sync to Supabase ──────────────────────────────────────────────────
  async function syncProjects(projects) {
    try {
      const { data: existing } = await sb.from('kanban_projects').select('name');
      const existingNames = (existing || []).map(p => p.name);
      const toInsert = projects.filter(p => !existingNames.includes(p));
      const toDelete = existingNames.filter(p => !projects.includes(p));
      if (toInsert.length) await sb.from('kanban_projects').insert(toInsert.map(name => ({ name })));
      for (const name of toDelete) await sb.from('kanban_projects').delete().eq('name', name);
    } catch (e) {
      console.warn('[Kanban] syncProjects error:', e.message);
    }
  }

  // ── Public actions ────────────────────────────────────────────────────────────
  function addTask(task) {
    dispatch({ type: 'ADD_TASK', payload: task });
    saveTaskToDb(task);
  }

  function updateTask(task) {
    dispatch({ type: 'UPDATE_TASK', payload: task });
    saveTaskToDb(task);
  }

  async function deleteTask(id) {
    dispatch({ type: 'DELETE_TASK', payload: id });
    try { await sb.from('kanban_tasks').delete().eq('id', id); } catch (e) {}
  }

  function addProject(name) {
    const newProjects = [...stateRef.current.projects, name];
    dispatch({ type: 'ADD_PROJECT', payload: name });
    syncProjects(newProjects);
  }

  async function deleteProject(name) {
    const taskIds = stateRef.current.tasks.filter(t => t.project === name).map(t => t.id);
    dispatch({ type: 'DELETE_PROJECT', payload: name });
    const newProjects = stateRef.current.projects.filter(p => p !== name);
    syncProjects(newProjects);
    for (const id of taskIds) {
      try { await sb.from('kanban_tasks').delete().eq('id', id); } catch (e) {}
    }
  }

  function setActiveProject(name) {
    dispatch({ type: 'SET_ACTIVE_PROJECT', payload: name });
  }

  function setView(v) {
    dispatch({ type: 'SET_VIEW', payload: v });
  }

  function addTemplate(tpl) {
    dispatch({ type: 'ADD_TEMPLATE', payload: tpl });
  }

  function deleteTemplate(id) {
    dispatch({ type: 'DELETE_TEMPLATE', payload: id });
  }

  // ── Draft helpers ─────────────────────────────────────────────────────────────
  function saveDraft(draft) {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) {}
  }
  function loadDraft() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { return null; }
  }
  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  return (
    <KanbanContext.Provider value={{
      ...state,
      dispatch,
      addTask,
      updateTask,
      deleteTask,
      addProject,
      deleteProject,
      setActiveProject,
      setView,
      addTemplate,
      deleteTemplate,
      saveTaskToDb,
      saveDraft,
      loadDraft,
      clearDraft,
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
