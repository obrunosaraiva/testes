import { useState, useMemo } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useRole } from '../../context/RoleContext';

const TASK_STATUSES = [
  { value: 'pendente',            label: '⚪ Pendente',             color: '#9ca3af' },
  { value: 'solicitado',          label: '🟠 Solicitado',           color: '#f97316' },
  { value: 'andamento',           label: '🔵 Andamento',            color: '#3b82f6' },
  { value: 'revisao',             label: '🩷 Revisão',              color: '#ec4899' },
  { value: 'correcao',            label: '🟡 Correção necessária',  color: '#eab308' },
  { value: 'concluido',           label: '🟢 Concluído',            color: '#22c55e' },
  { value: 'cancelado',           label: '⚫ Cancelado',            color: '#6b7280' },
  { value: 'atrasado',            label: '🔴 Atrasado',             color: '#ef4444' },
  { value: 'impedimento_interno', label: '🟧 Impedimento Interno',  color: '#ea580c' },
  { value: 'impedimento_externo', label: '🟪 Impedimento Externo',  color: '#a855f7' },
];

const STATUS_MAP = Object.fromEntries(TASK_STATUSES.map(s => [s.value, s]));

const URGENCY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
const URGENCY_LABELS = { high: 'Alta', medium: 'Média', low: 'Baixa' };

const COL = '180px 1fr 150px 100px 80px';

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
      <span>Status</span>
      <span>Título</span>
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
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <HeaderRow />

        {grouped.map(([projName, projTasks]) => {
          const isCollapsed = collapsed[projName];
          const doneCount = projTasks.filter(t => t.taskStatus === 'concluido').length;

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
              </div>

              {/* Task rows */}
              {!isCollapsed && (
                <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                  {projTasks.map((task, idx) => {
                    const dl = task.deadline ? new Date(task.deadline + 'T00:00:00') : null;
                    const late = dl && dl < today && task.taskStatus !== 'concluido' && task.taskStatus !== 'cancelado';
                    const isLast = idx === projTasks.length - 1;

                    return (
                      <TaskRow
                        key={task.id}
                        task={task}
                        idx={idx}
                        isLast={isLast}
                        dl={dl}
                        late={late}
                        onOpen={() => onOpenTask(task.id)}
                        onChangeTaskStatus={can.edit ? s => updateTask({ ...task, taskStatus: s }) : null}
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

function TaskRow({ task, idx, isLast, dl, late, onOpen, onChangeTaskStatus }) {
  const [hovered, setHovered] = useState(false);
  const [showSubs, setShowSubs] = useState(true);
  const ts = STATUS_MAP[task.taskStatus || 'pendente'] || STATUS_MAP['pendente'];

  const pending = task.checklist?.filter(c => !c.done) || [];
  const done = task.checklist?.filter(c => c.done) || [];
  const hasChecklist = (task.checklist?.length || 0) > 0;
  const showingItems = showSubs && hasChecklist;

  const bg = hovered ? 'var(--surface3)' : idx % 2 === 0 ? 'var(--surface)' : 'var(--surface2)';

  return (
    <div
      style={{ background: bg, borderBottom: isLast ? 'none' : '1px solid var(--border)', transition: 'background .1s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Main row */}
      <div
        style={{ display: 'grid', gridTemplateColumns: COL, gap: 0, padding: '9px 14px', alignItems: 'center', cursor: 'pointer' }}
        onClick={onOpen}
      >
        {/* Task Status */}
        <div onClick={e => e.stopPropagation()}>
          <select
            value={task.taskStatus || 'pendente'}
            onChange={e => onChangeTaskStatus?.(e.target.value)}
            disabled={!onChangeTaskStatus}
            style={{
              background: ts.color + '22',
              color: ts.color,
              border: `1px solid ${ts.color}55`,
              borderRadius: 20,
              padding: '3px 10px',
              fontSize: '.73rem',
              fontWeight: 700,
              cursor: onChangeTaskStatus ? 'pointer' : 'default',
              maxWidth: 170,
              outline: 'none',
            }}
          >
            {TASK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Title + subtask toggle */}
        <div style={{ overflow: 'hidden', paddingRight: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {hasChecklist && (
              <button
                onClick={e => { e.stopPropagation(); setShowSubs(x => !x); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px',
                  color: 'var(--text-muted)', fontSize: '.6rem', lineHeight: 1, flexShrink: 0,
                  transform: showSubs ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform .15s',
                }}
                title={showSubs ? 'Ocultar subtarefas' : 'Mostrar subtarefas'}
              >▼</button>
            )}
            <span style={{ fontSize: '.88rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.taskStatus === 'concluido' || task.taskStatus === 'cancelado'
                ? <s style={{ color: 'var(--text-muted)' }}>{task.title}</s>
                : task.title}
            </span>
          </div>
          {hasChecklist && (
            <span style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginLeft: hasChecklist ? 14 : 0 }}>
              ☑ {done.length}/{task.checklist.length}
            </span>
          )}
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

      {/* Subtask list */}
      {showingItems && (
        <div style={{ paddingLeft: 194, paddingRight: 14, paddingBottom: 8 }}>
          {pending.map((item, i) => (
            <div key={item.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0', fontSize: '.78rem' }}>
              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>☐</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text || item.label || ''}</span>
            </div>
          ))}
          {done.map((item, i) => (
            <div key={item.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0', fontSize: '.78rem', color: 'var(--text-muted)' }}>
              <span style={{ flexShrink: 0 }}>☑</span>
              <s style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text || item.label || ''}</s>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
