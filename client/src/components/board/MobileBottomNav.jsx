import { useKanban } from '../../context/KanbanContext';

const STATUSES = [
  { key: 'backlog', label: 'Backlog', color: 'var(--backlog)' },
  { key: 'todo',    label: 'To Do',   color: 'var(--todo)'    },
  { key: 'doing',   label: 'Doing',   color: 'var(--doing)'   },
  { key: 'done',    label: 'Done',    color: 'var(--done)'    },
];

export default function MobileBottomNav({ activeStatus, onSelect }) {
  const { tasks, projects, activeProject, combinedProjects, viewFilter, costCenterFilter } = useKanban();

  function count(status) {
    return tasks.filter(t => {
      if (t.status !== status) return false;
      if (combinedProjects.length > 0) {
        if (!combinedProjects.includes(t.project)) return false;
      } else if (activeProject !== '__all__' && t.project !== activeProject) {
        return false;
      }
      if (viewFilter === 'events' && !t.isEvent) return false;
      if (viewFilter === 'tasks' && t.isEvent) return false;
      if (costCenterFilter.length > 0) {
        const proj = projects.find(p => p.name === t.project);
        if (!proj?.costCenter || !costCenterFilter.includes(proj.costCenter)) return false;
      }
      return true;
    }).length;
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      height: 64,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      boxShadow: '0 -4px 24px rgba(0,0,0,.18)',
      display: 'flex',
      overflowX: 'auto',
      overflowY: 'hidden',
      scrollbarWidth: 'none',
      paddingBottom: 'env(safe-area-inset-bottom)',
      WebkitOverflowScrolling: 'touch',
    }}>
      {STATUSES.map(({ key, label, color }) => {
        const active = activeStatus === key;
        const n = count(key);
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            style={{
              flex: '0 0 auto',
              minWidth: 80,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '6px 10px 4px',
              background: 'none',
              border: 'none',
              borderTop: `3px solid ${active ? color : 'transparent'}`,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'border-color .15s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: color, flexShrink: 0,
                boxShadow: active ? `0 0 6px ${color}` : 'none',
                transition: 'box-shadow .15s',
              }} />
              <span style={{
                fontSize: '.72rem',
                fontWeight: active ? 700 : 500,
                color: active ? color : 'var(--text-muted)',
                whiteSpace: 'nowrap',
                transition: 'color .15s',
              }}>
                {label}
              </span>
            </div>
            <span style={{
              fontSize: '.68rem',
              fontWeight: 700,
              color: active ? color : 'var(--text-muted)',
              background: active ? color + '22' : 'var(--surface2)',
              padding: '1px 8px',
              borderRadius: 10,
              minWidth: 22,
              textAlign: 'center',
              transition: 'all .15s',
            }}>
              {n}
            </span>
          </button>
        );
      })}
    </div>
  );
}
