import { useState, useMemo, useRef, useEffect } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useRole } from '../../context/RoleContext';

const TASK_STATUSES = [
  { value: 'pendente',            label: '⚪ Pendente',             short: 'Pendente',       color: '#9ca3af' },
  { value: 'solicitado',          label: '🟠 Solicitado',           short: 'Solicitado',     color: '#f97316' },
  { value: 'andamento',           label: '🔵 Andamento',            short: 'Andamento',      color: '#3b82f6' },
  { value: 'revisao',             label: '🩷 Revisão',              short: 'Revisão',        color: '#ec4899' },
  { value: 'correcao',            label: '🟡 Correção necessária',  short: 'Correção',       color: '#eab308' },
  { value: 'concluido',           label: '🟢 Concluído',            short: 'Concluído',      color: '#22c55e' },
  { value: 'cancelado',           label: '⚫ Cancelado',            short: 'Cancelado',      color: '#6b7280' },
  { value: 'atrasado',            label: '🔴 Atrasado',             short: 'Atrasado',       color: '#ef4444' },
  { value: 'impedimento_interno', label: '🟧 Impedimento Interno',  short: 'Imp. Interno',   color: '#ea580c' },
  { value: 'impedimento_externo', label: '🟪 Impedimento Externo',  short: 'Imp. Externo',   color: '#a855f7' },
];

const STATUS_MAP = Object.fromEntries(TASK_STATUSES.map(s => [s.value, s]));
function subDone(item) {
  if (item.status) return item.status === 'concluido' || item.status === 'cancelado';
  return !!item.done;
}

const URGENCY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
const URGENCY_LABELS = { high: 'Alta', medium: 'Média', low: 'Baixa' };

// Monday.com-style full-width colored status cell
function StatusCell({ value, onChange, disabled, small = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const ts = STATUS_MAP[value] || STATUS_MAP['pendente'];

  useEffect(() => {
    if (!open) return;
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', height: '100%' }} onClick={e => e.stopPropagation()}>
      <div
        onClick={() => !disabled && setOpen(x => !x)}
        style={{
          background: ts.color,
          color: '#fff',
          padding: small ? '4px 8px' : '0 10px',
          height: small ? 'auto' : '100%',
          minHeight: small ? 'auto' : 38,
          fontWeight: 700,
          fontSize: small ? '.68rem' : '.75rem',
          cursor: disabled ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          userSelect: 'none', letterSpacing: '.02em',
          borderRadius: small ? 4 : 0,
          whiteSpace: 'nowrap',
        }}
      >
        {ts.short}
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 200,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, overflow: 'hidden', minWidth: 200,
          boxShadow: '0 8px 24px rgba(0,0,0,.35)',
        }}>
          {TASK_STATUSES.map(s => (
            <div
              key={s.value}
              onClick={() => { onChange(s.value); setOpen(false); }}
              style={{
                padding: '9px 12px', cursor: 'pointer', fontSize: '.82rem',
                display: 'flex', alignItems: 'center', gap: 8,
                background: value === s.value ? s.color + '22' : 'transparent',
                borderLeft: `3px solid ${s.color}`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = s.color + '22'}
              onMouseLeave={e => e.currentTarget.style.background = value === s.value ? s.color + '22' : 'transparent'}
            >
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const COL = '150px 1fr 140px 90px 80px';

function HeaderRow() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: COL,
      fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '.06em',
      borderBottom: '2px solid var(--border)',
      position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10,
    }}>
      <span style={{ padding: '8px 10px' }}>Status</span>
      <span style={{ padding: '8px 14px' }}>Título</span>
      <span style={{ padding: '8px 14px' }}>Responsável</span>
      <span style={{ padding: '8px 14px' }}>Prazo</span>
      <span style={{ padding: '8px 14px' }}>Urgência</span>
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
              <div
                onClick={() => setCollapsed(p => ({ ...p, [projName]: !p[projName] }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 14px', cursor: 'pointer', userSelect: 'none',
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

              {!isCollapsed && (
                <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                  {projTasks.map((task, idx) => {
                    const dl = task.deadline ? new Date(task.deadline + 'T00:00:00') : null;
                    const late = dl && dl < today && task.taskStatus !== 'concluido' && task.taskStatus !== 'cancelado';
                    return (
                      <TaskRow
                        key={task.id}
                        task={task}
                        idx={idx}
                        isLast={idx === projTasks.length - 1}
                        dl={dl}
                        late={late}
                        today={today}
                        onOpen={() => onOpenTask(task.id)}
                        onChangeTaskStatus={can.edit ? s => updateTask({ ...task, taskStatus: s }) : null}
                        onChangeSubStatus={can.edit ? (subIdx, s) => {
                          const newCl = task.checklist.map((item, i) => i !== subIdx ? item : { ...item, status: s, done: s === 'concluido' || s === 'cancelado' });
                          updateTask({ ...task, checklist: newCl });
                        } : null}
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

function TaskRow({ task, idx, isLast, dl, late, today, onOpen, onChangeTaskStatus, onChangeSubStatus }) {
  const [hovered, setHovered] = useState(false);
  const [showSubs, setShowSubs] = useState(false);

  const pending = task.checklist?.filter(c => !subDone(c)) || [];
  const done = task.checklist?.filter(c => subDone(c)) || [];
  const hasChecklist = (task.checklist?.length || 0) > 0;

  const bg = hovered ? 'var(--surface3)' : idx % 2 === 0 ? 'var(--surface)' : 'var(--surface2)';

  return (
    <div
      style={{ background: bg, borderBottom: isLast && !showSubs ? 'none' : '1px solid var(--border)', transition: 'background .1s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Main task row */}
      <div style={{ display: 'grid', gridTemplateColumns: COL, alignItems: 'stretch', minHeight: 42, cursor: 'pointer' }} onClick={onOpen}>

        {/* Status — Monday.com style full-height colored cell */}
        <StatusCell
          value={task.taskStatus || 'pendente'}
          onChange={onChangeTaskStatus || (() => {})}
          disabled={!onChangeTaskStatus}
        />

        {/* Title */}
        <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          {hasChecklist && (
            <button
              onClick={e => { e.stopPropagation(); setShowSubs(x => !x); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '.6rem', flexShrink: 0, padding: '0 2px', transform: showSubs ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform .15s' }}
            >▼</button>
          )}
          <div style={{ overflow: 'hidden', minWidth: 0 }}>
            <span style={{ fontSize: '.88rem', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.taskStatus === 'concluido' || task.taskStatus === 'cancelado'
                ? <s style={{ color: 'var(--text-muted)' }}>{task.title}</s>
                : task.title}
            </span>
            {hasChecklist && (
              <span style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>
                ☑ {done.length}/{task.checklist.length}
              </span>
            )}
          </div>
        </div>

        {/* Responsável */}
        <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: '.82rem', overflow: 'hidden', color: task.assignee ? 'var(--text)' : 'var(--text-muted)' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.assignee || '—'}</span>
        </div>

        {/* Prazo */}
        <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: '.82rem', fontWeight: late ? 700 : 400, color: late ? 'var(--danger)' : dl ? 'var(--text)' : 'var(--text-muted)' }}>
          {dl ? dl.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
          {late && ' ⚠'}
        </div>

        {/* Urgência */}
        <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center' }}>
          {task.urgency ? (
            <span style={{ fontSize: '.7rem', fontWeight: 700, color: URGENCY_COLORS[task.urgency] || 'var(--text-muted)', background: (URGENCY_COLORS[task.urgency] || '#666') + '22', padding: '2px 8px', borderRadius: 10 }}>
              {URGENCY_LABELS[task.urgency] || task.urgency}
            </span>
          ) : <span style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>—</span>}
        </div>
      </div>

      {/* Subtasks — collapsed by default */}
      {showSubs && hasChecklist && (
        <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>

          {/* Em aberto */}
          {pending.length > 0 && (
            <>
              <div style={{ padding: '4px 14px 4px 42px', fontSize: '.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                Em aberto · {pending.length}
              </div>
              {pending.map(item => {
                const realIdx = task.checklist.findIndex(c => c === item);
                const subDl = item.deadline ? new Date(item.deadline + 'T00:00:00') : null;
                const subLate = subDl && subDl < today && !subDone(item);
                return (
                  <div
                    key={realIdx}
                    style={{ display: 'grid', gridTemplateColumns: COL, alignItems: 'stretch', minHeight: 36, borderBottom: '1px solid var(--border)' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <StatusCell
                      value={item.status || 'pendente'}
                      onChange={s => onChangeSubStatus?.(realIdx, s)}
                      disabled={!onChangeSubStatus}
                      small
                    />
                    <div style={{ padding: '0 14px 0 28px', display: 'flex', alignItems: 'center', fontSize: '.82rem', overflow: 'hidden' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text || <em style={{ color: 'var(--text-muted)' }}>sem título</em>}</span>
                    </div>
                    <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: '.78rem', color: item.assignee ? 'var(--text)' : 'var(--text-muted)' }}>
                      {item.assignee || '—'}
                    </div>
                    <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: '.78rem', fontWeight: subLate ? 700 : 400, color: subLate ? 'var(--danger)' : subDl ? 'var(--text)' : 'var(--text-muted)' }}>
                      {subDl ? subDl.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
                      {subLate && ' ⚠'}
                    </div>
                    <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: '.78rem', color: 'var(--text-muted)' }}>
                      {item.time || '—'}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Concluídas / Canceladas */}
          {done.length > 0 && (
            <SubDoneSection items={done} task={task} today={today} onChangeSubStatus={onChangeSubStatus} />
          )}
        </div>
      )}
    </div>
  );
}

function SubDoneSection({ items, task, today, onChangeSubStatus }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        onClick={e => { e.stopPropagation(); setOpen(x => !x); }}
        style={{ padding: '4px 14px 4px 42px', fontSize: '.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: open ? '1px solid var(--border)' : 'none', background: 'var(--surface2)', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <span style={{ fontSize: '.55rem', display: 'inline-block', transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform .15s' }}>▼</span>
        Concluídas / Canceladas · {items.length}
      </div>
      {open && items.map(item => {
        const realIdx = task.checklist.findIndex(c => c === item);
        return (
          <div
            key={realIdx}
            style={{ display: 'grid', gridTemplateColumns: COL, alignItems: 'stretch', minHeight: 36, borderBottom: '1px solid var(--border)', opacity: 0.65 }}
            onClick={e => e.stopPropagation()}
          >
            <StatusCell
              value={item.status || 'concluido'}
              onChange={s => onChangeSubStatus?.(realIdx, s)}
              disabled={!onChangeSubStatus}
              small
            />
            <div style={{ padding: '0 14px 0 28px', display: 'flex', alignItems: 'center', fontSize: '.82rem', overflow: 'hidden' }}>
              <s style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{item.text || '(sem título)'}</s>
            </div>
            <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: '.78rem', color: 'var(--text-muted)' }}>
              {item.assignee || '—'}
            </div>
            <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: '.78rem', color: 'var(--text-muted)' }}>
              {item.deadline ? new Date(item.deadline + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
            </div>
            <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: '.78rem', color: 'var(--text-muted)' }}>
              {item.time || '—'}
            </div>
          </div>
        );
      })}
    </>
  );
}
