import { useState, useMemo } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useRole } from '../../context/RoleContext';

const STATUS_COLORS = {
  backlog: '#6b7280', todo: '#3b82f6', doing: '#f59e0b',
  paused: '#8b5cf6', review: '#06b6d4', done: '#22c55e',
};
const STATUS_LABELS = {
  backlog: 'Backlog', todo: 'To Do', doing: 'Fazendo',
  paused: 'Pausado', review: 'Revisão', done: 'Concluído',
};
const URGENCY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
const URGENCY_LABELS = { high: 'Alta', medium: 'Média', low: 'Baixa' };
const STATUSES = ['backlog', 'todo', 'doing', 'paused', 'review', 'done'];

const COL = '28px 1fr 110px 130px 90px 70px';

function HeaderRow() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: COL, gap: 0,
      padding: '8px 14px',
      fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '.06em',
      borderBottom: '2px solid var(--border)',
      position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10,
    }}>
      <span />
      <span>Título</span>
      <span style={{ textAlign: 'center' }}>Progresso</span>
      <span>Responsável</span>
      <span>Prazo</span>
      <span>Urgência</span>
    </div>
  );
}

export default function ListView({ onOpenTask, onNewTask }) {
  const { tasks, activeProject, costCenterFilter, projects, updateTask } = useKanban();
  const { can } = useRole();
  const [collapsed, setCollapsed] = useState({});

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const filtered = useMemo(() => {
    let t = [...tasks];
    if (activeProject !== '__all__') t = t.filter(t => t.project === activeProject);
    if (costCenterFilter.length > 0) {
      t = t.filter(task => {
        const proj = projects.find(p => p.name === task.project);
        return proj && costCenterFilter.includes(proj.costCenter);
      });
    }
    return t;
  }, [tasks, activeProject, costCenterFilter, projects]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(t => {
      const key = t.project || 'Sem projeto';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return Object.entries(map);
  }, [filtered]);

  function toggleCollapse(proj) {
    setCollapsed(p => ({ ...p, [proj]: !p[proj] }));
  }

  if (grouped.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: '2rem' }}>📋</div>
        <div>Nenhuma tarefa encontrada</div>
        {can.create && <button className="btn btn-primary" onClick={() => onNewTask('backlog')}>+ Nova tarefa</button>}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <HeaderRow />

        {grouped.map(([projName, projTasks]) => {
          const isCollapsed = collapsed[projName];
          const doneCount = projTasks.filter(t => t.status === 'done').length;
          const avgProgress = projTasks.length
            ? Math.round(projTasks.reduce((s, t) => s + (t.progress || 0), 0) / projTasks.length)
            : 0;

          return (
            <div key={projName} style={{ marginBottom: 12 }}>
              {/* Group header */}
              <div
                onClick={() => toggleCollapse(projName)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 14px', cursor: 'pointer', userSelect: 'none',
                  background: 'var(--surface2)',
                  borderRadius: isCollapsed ? 10 : '10px 10px 0 0',
                  borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', transition: 'transform .15s', display: 'inline-block', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)' }}>▼</span>
                <span style={{ fontWeight: 700, fontSize: '.9rem' }}>📁 {projName}</span>
                <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{projTasks.length} tarefa{projTasks.length !== 1 ? 's' : ''}</span>
                {doneCount > 0 && <span style={{ fontSize: '.72rem', color: 'var(--success)' }}>✅ {doneCount} concluída{doneCount !== 1 ? 's' : ''}</span>}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 80, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${avgProgress}%`, background: avgProgress === 100 ? 'var(--success)' : 'var(--accent)', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{avgProgress}%</span>
                </div>
              </div>

              {/* Task rows */}
              {!isCollapsed && (
                <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                  {projTasks.map((task, idx) => {
                    const dl = task.deadline ? new Date(task.deadline + 'T00:00:00') : null;
                    const late = dl && dl < today && task.status !== 'done';
                    const progress = task.progress || 0;
                    const isLast = idx === projTasks.length - 1;

                    return (
                      <TaskRow
                        key={task.id}
                        task={task}
                        idx={idx}
                        isLast={isLast}
                        dl={dl}
                        late={late}
                        progress={progress}
                        onOpen={() => onOpenTask(task.id)}
                        onChangeStatus={can.edit ? s => updateTask({ ...task, status: s }) : null}
                      />
                    );
                  })}

                  {can.create && (
                    <div
                      onClick={() => onNewTask('backlog')}
                      style={{ padding: '8px 14px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '.82rem', borderTop: '1px solid var(--border)', background: 'var(--surface2)', transition: 'color .15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      + Adicionar tarefa
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskRow({ task, idx, isLast, dl, late, progress, onOpen, onChangeStatus }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: COL, gap: 0,
        padding: '9px 14px', alignItems: 'center',
        background: hovered ? 'var(--surface3)' : idx % 2 === 0 ? 'var(--surface)' : 'var(--surface2)',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        transition: 'background .1s', cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
    >
      {/* Status dot / select */}
      <div onClick={e => e.stopPropagation()}>
        <select
          value={task.status}
          onChange={e => onChangeStatus?.(e.target.value)}
          disabled={!onChangeStatus}
          title={STATUS_LABELS[task.status]}
          style={{
            width: 18, height: 18, borderRadius: '50%', border: 'none', cursor: onChangeStatus ? 'pointer' : 'default',
            background: STATUS_COLORS[task.status] || '#6b7280',
            appearance: 'none', WebkitAppearance: 'none', padding: 0, outline: 'none',
          }}
        >
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {/* Title */}
      <div style={{ overflow: 'hidden', paddingRight: 12 }}>
        <span style={{ fontSize: '.88rem', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.status === 'done' ? <s style={{ color: 'var(--text-muted)' }}>{task.title}</s> : task.title}
        </span>
        {task.checklist?.length > 0 && (
          <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>
            ☑ {task.checklist.filter(c => c.done).length}/{task.checklist.length}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 6px' }}>
        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--success)' : 'var(--accent)', borderRadius: 3 }} />
        </div>
        <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', minWidth: 26, textAlign: 'right' }}>{progress}%</span>
      </div>

      {/* Assignee */}
      <div style={{ fontSize: '.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: task.assignee ? 'var(--text)' : 'var(--text-muted)' }}>
        {task.assignee || '—'}
      </div>

      {/* Deadline */}
      <div style={{ fontSize: '.82rem', fontWeight: late ? 700 : 400, color: late ? 'var(--danger)' : dl ? 'var(--text)' : 'var(--text-muted)' }}>
        {dl ? dl.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
        {late && ' ⚠'}
      </div>

      {/* Urgency */}
      <div>
        {task.urgency ? (
          <span style={{
            fontSize: '.7rem', fontWeight: 700,
            color: URGENCY_COLORS[task.urgency] || 'var(--text-muted)',
            background: (URGENCY_COLORS[task.urgency] || '#666') + '22',
            padding: '2px 8px', borderRadius: 10,
          }}>
            {URGENCY_LABELS[task.urgency] || task.urgency}
          </span>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>—</span>}
      </div>
    </div>
  );
}
