import { useState, useMemo, useRef, useEffect } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useRole } from '../../context/RoleContext';
import { useMobile } from '../../hooks/useMobile';

const TASK_STATUSES = [
  { value: 'pendente',            label: '⚪ Pendente',             short: 'Pendente',       color: '#9ca3af' },
  { value: 'solicitado',          label: '🟠 Solicitado',           short: 'Solicitado',     color: '#f97316' },
  { value: 'andamento',           label: '🔵 Andamento',            short: 'Andamento',      color: '#3b82f6' },
  { value: 'revisao',             label: '🩷 Revisão',              short: 'Revisão',        color: '#ec4899' },
  { value: 'correcao',            label: '🟡 Correção',             short: 'Correção',       color: '#eab308' },
  { value: 'concluido',           label: '🟢 Concluído',            short: 'Concluído',      color: '#22c55e' },
  { value: 'cancelado',           label: '⚫ Cancelado',            short: 'Cancelado',      color: '#6b7280' },
  { value: 'atrasado',            label: '🔴 Atrasado',             short: 'Atrasado',       color: '#ef4444' },
  { value: 'impedimento_interno', label: '🟧 Imp. Interno',         short: 'Imp. Interno',   color: '#ea580c' },
  { value: 'impedimento_externo', label: '🟪 Imp. Externo',         short: 'Imp. Externo',   color: '#a855f7' },
];

const STATUS_MAP = Object.fromEntries(TASK_STATUSES.map(s => [s.value, s]));
function subDone(item) {
  if (item.status) return item.status === 'concluido' || item.status === 'cancelado';
  return !!item.done;
}

const URGENCY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
const URGENCY_LABELS  = { high: 'Alta',    medium: 'Média',   low: 'Baixa'  };

// ── Dropdown multi-select ──────────────────────────────────────────────────────
function MultiDropdown({ label, icon, options, selected, onToggle, onClear, colorMap }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const count = selected.size;

  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(x => !x)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
          border: count > 0 ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
          background: count > 0 ? 'var(--accent)18' : 'var(--surface2)',
          color: count > 0 ? 'var(--accent)' : 'var(--text)',
          fontSize: '.82rem', fontWeight: count > 0 ? 700 : 500,
          transition: 'all .15s', whiteSpace: 'nowrap',
        }}
      >
        {icon} {label}
        {count > 0 && (
          <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: '.72rem', fontWeight: 700 }}>
            {count}
          </span>
        )}
        <span style={{ fontSize: '.6rem', marginLeft: 2, opacity: .6 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 300,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, overflow: 'hidden', minWidth: 220,
          boxShadow: '0 8px 24px rgba(0,0,0,.25)',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
            {count > 0 && (
              <button onClick={() => { onClear(); setOpen(false); }} style={{ background: 'none', border: 'none', fontSize: '.72rem', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>
                Limpar
              </button>
            )}
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {options.map(opt => {
              const val = typeof opt === 'string' ? opt : opt.value;
              const lbl = typeof opt === 'string' ? opt : opt.label;
              const color = colorMap?.[val];
              const active = selected.has(val);
              return (
                <div
                  key={val}
                  onClick={() => onToggle(val)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', cursor: 'pointer', fontSize: '.83rem',
                    background: active ? (color ? color + '18' : 'var(--accent)18') : 'transparent',
                    borderLeft: `3px solid ${active ? (color || 'var(--accent)') : 'transparent'}`,
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface2)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${active ? (color || 'var(--accent)') : 'var(--border)'}`, background: active ? (color || 'var(--accent)') : 'transparent', flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{lbl}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Status cell (Monday.com style) ────────────────────────────────────────────
function StatusCell({ value, onChange, disabled, small = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const ts = STATUS_MAP[value] || STATUS_MAP['pendente'];

  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', height: '100%' }} onClick={e => e.stopPropagation()}>
      <div
        onClick={() => !disabled && setOpen(x => !x)}
        style={{
          background: ts.color, color: '#fff',
          padding: small ? '4px 8px' : '0 10px',
          height: small ? 'auto' : '100%',
          minHeight: small ? 'auto' : 38,
          fontWeight: 700, fontSize: small ? '.68rem' : '.75rem',
          cursor: disabled ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          userSelect: 'none', letterSpacing: '.02em',
          borderRadius: small ? 4 : 0, whiteSpace: 'nowrap',
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

// ── Mobile task card ───────────────────────────────────────────────────────────
function TaskCard({ task, dl, late, onOpen, onChangeTaskStatus, can }) {
  const ts = STATUS_MAP[task.taskStatus || 'pendente'];
  const done = task.checklist?.filter(c => subDone(c)).length || 0;
  const total = task.checklist?.length || 0;

  return (
    <div
      onClick={onOpen}
      style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        background: 'var(--surface)',
        activeBackground: 'var(--surface2)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        {/* Title */}
        <span style={{ fontSize: '.9rem', fontWeight: 600, flex: 1, lineHeight: 1.3,
          color: task.taskStatus === 'concluido' || task.taskStatus === 'cancelado' ? 'var(--text-muted)' : 'var(--text)',
          textDecoration: task.taskStatus === 'concluido' || task.taskStatus === 'cancelado' ? 'line-through' : 'none',
        }}>
          {task.title}
        </span>
        {/* Status pill */}
        <div
          onClick={e => { e.stopPropagation(); }}
          style={{ flexShrink: 0 }}
        >
          <StatusCell value={task.taskStatus || 'pendente'} onChange={onChangeTaskStatus || (() => {})} disabled={!onChangeTaskStatus} small />
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {task.assignee && (
          <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>👤 {task.assignee}</span>
        )}
        {dl && (
          <span style={{ fontSize: '.78rem', fontWeight: late ? 700 : 400, color: late ? 'var(--danger)' : 'var(--text-muted)' }}>
            📅 {dl.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{late ? ' ⚠' : ''}
          </span>
        )}
        {task.urgency && (
          <span style={{ fontSize: '.72rem', fontWeight: 700, color: URGENCY_COLORS[task.urgency], background: URGENCY_COLORS[task.urgency] + '22', padding: '2px 7px', borderRadius: 10 }}>
            {URGENCY_LABELS[task.urgency]}
          </span>
        )}
        {total > 0 && (
          <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>☑ {done}/{total}</span>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ListView({ onOpenTask, onNewTask }) {
  const { tasks, activeProject, costCenterFilter, projects, members, updateTask } = useKanban();
  const { can } = useRole();
  const isMobile = useMobile();
  const [collapsed, setCollapsed]         = useState({});
  const [assigneeFilter, setAssigneeFilter] = useState(new Set());
  const [statusFilter, setStatusFilter]   = useState(new Set());
  const [groupBy, setGroupBy]             = useState('project'); // 'project' | 'assignee'

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  // All unique assignees across visible tasks
  const allAssignees = useMemo(() => {
    const fromTasks = tasks.map(t => t.assignee).filter(Boolean);
    const fromMembers = (members || []).map(m => m.name).filter(Boolean);
    return [...new Set([...fromTasks, ...fromMembers])].sort((a, b) => a.localeCompare(b));
  }, [tasks, members]);

  const statusColorMap = useMemo(() =>
    Object.fromEntries(TASK_STATUSES.map(s => [s.value, s.color])), []);

  // Base filter (project + CC from global state)
  const baseFiltered = useMemo(() => {
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

  // Local filters (assignee + status)
  const filtered = useMemo(() => {
    let t = baseFiltered;
    if (assigneeFilter.size > 0) t = t.filter(t => assigneeFilter.has(t.assignee || ''));
    if (statusFilter.size > 0)   t = t.filter(t => statusFilter.has(t.taskStatus || 'pendente'));
    return t;
  }, [baseFiltered, assigneeFilter, statusFilter]);

  // Group by project or assignee
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(t => {
      const key = groupBy === 'assignee'
        ? (t.assignee || 'Sem responsável')
        : (t.project  || 'Sem projeto');
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    // Sort groups alphabetically
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, groupBy]);

  const hasFilters = assigneeFilter.size > 0 || statusFilter.size > 0;

  function toggleAssignee(v) {
    setAssigneeFilter(prev => { const s = new Set(prev); s.has(v) ? s.delete(v) : s.add(v); return s; });
  }
  function toggleStatus(v) {
    setStatusFilter(prev => { const s = new Set(prev); s.has(v) ? s.delete(v) : s.add(v); return s; });
  }

  // Stats for summary bar
  const stats = useMemo(() => {
    const total = filtered.length;
    const late  = filtered.filter(t => t.deadline && new Date(t.deadline + 'T00:00:00') < today && t.taskStatus !== 'concluido' && t.taskStatus !== 'cancelado').length;
    const done  = filtered.filter(t => t.taskStatus === 'concluido').length;
    return { total, late, done };
  }, [filtered, today]);

  const groupIcon = groupBy === 'assignee' ? '👤' : '📁';

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '8px 12px 80px' : '12px 24px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ── Filter bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          padding: '8px 0 12px', borderBottom: '1px solid var(--border)',
          marginBottom: 10,
        }}>
          <MultiDropdown
            label={isMobile ? '👤' : '👤 Responsável'}
            icon=""
            options={allAssignees}
            selected={assigneeFilter}
            onToggle={toggleAssignee}
            onClear={() => setAssigneeFilter(new Set())}
          />
          <MultiDropdown
            label={isMobile ? '🏷' : '🏷 Status'}
            icon=""
            options={TASK_STATUSES}
            selected={statusFilter}
            onToggle={toggleStatus}
            onClear={() => setStatusFilter(new Set())}
            colorMap={statusColorMap}
          />

          {/* Group by toggle */}
          <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {[['project', isMobile ? '📁' : '📁 Projeto'], ['assignee', isMobile ? '👤' : '👤 Responsável']].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setGroupBy(val)}
                style={{
                  padding: isMobile ? '6px 10px' : '6px 12px', border: 'none', cursor: 'pointer',
                  fontSize: '.80rem', fontWeight: groupBy === val ? 700 : 400,
                  background: groupBy === val ? 'var(--accent)' : 'transparent',
                  color: groupBy === val ? '#fff' : 'var(--text-muted)',
                  transition: 'all .15s',
                }}
              >{lbl}</button>
            ))}
          </div>

          {/* Clear all */}
          {hasFilters && (
            <button
              onClick={() => { setAssigneeFilter(new Set()); setStatusFilter(new Set()); }}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: '.80rem', color: 'var(--text-muted)', cursor: 'pointer' }}
            >×</button>
          )}

          {/* Stats */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, fontSize: '.75rem', color: 'var(--text-muted)', alignItems: 'center' }}>
            <span>{stats.total}</span>
            {stats.done > 0 && <span style={{ color: 'var(--success)' }}>✅{stats.done}</span>}
            {stats.late > 0 && <span style={{ color: 'var(--danger)'  }}>⚠{stats.late}</span>}
          </div>
        </div>

        {/* ── Empty state ── */}
        {grouped.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 12, padding: '60px 0' }}>
            <div style={{ fontSize: '2rem' }}>{hasFilters ? '🔍' : '📋'}</div>
            <div>{hasFilters ? 'Nenhuma tarefa com os filtros selecionados' : 'Nenhuma tarefa encontrada'}</div>
            {hasFilters && (
              <button className="btn btn-ghost" onClick={() => { setAssigneeFilter(new Set()); setStatusFilter(new Set()); }}>
                Limpar filtros
              </button>
            )}
            {!hasFilters && can.create && (
              <button className="btn btn-primary" onClick={() => onNewTask('backlog')}>+ Nova tarefa</button>
            )}
          </div>
        )}

        {/* ── Groups ── */}
        {grouped.length > 0 && (
          <>
            {!isMobile && <HeaderRow />}
            {grouped.map(([groupName, groupTasks]) => {
              const isCollapsed = collapsed[groupName];
              const doneCount = groupTasks.filter(t => t.taskStatus === 'concluido').length;
              const lateCount = groupTasks.filter(t => t.deadline && new Date(t.deadline + 'T00:00:00') < today && t.taskStatus !== 'concluido' && t.taskStatus !== 'cancelado').length;

              return (
                <div key={groupName} style={{ marginBottom: 12 }}>
                  <div
                    onClick={() => setCollapsed(p => ({ ...p, [groupName]: !p[groupName] }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px', cursor: 'pointer', userSelect: 'none',
                      background: 'var(--surface2)',
                      borderRadius: isCollapsed ? 10 : '10px 10px 0 0',
                      borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', display: 'inline-block', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform .15s' }}>▼</span>
                    <span style={{ fontWeight: 700, fontSize: '.88rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{groupIcon} {groupName}</span>
                    <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>{groupTasks.length}</span>
                    {doneCount > 0 && <span style={{ fontSize: '.72rem', color: 'var(--success)', flexShrink: 0 }}>✅{doneCount}</span>}
                    {lateCount > 0 && <span style={{ fontSize: '.72rem', color: 'var(--danger)', flexShrink: 0 }}>⚠{lateCount}</span>}
                  </div>

                  {!isCollapsed && (
                    <div style={{ border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                      {groupTasks.map((task, idx) => {
                        const dl   = task.deadline ? new Date(task.deadline + 'T00:00:00') : null;
                        const late = dl && dl < today && task.taskStatus !== 'concluido' && task.taskStatus !== 'cancelado';
                        const changeStatus = can.edit ? s => updateTask({ ...task, taskStatus: s }) : null;
                        const changeSubStatus = can.edit ? (subIdx, s) => {
                          const newCl = task.checklist.map((item, i) => i !== subIdx ? item : { ...item, status: s, done: s === 'concluido' || s === 'cancelado' });
                          updateTask({ ...task, checklist: newCl });
                        } : null;

                        return isMobile ? (
                          <TaskCard
                            key={task.id}
                            task={task}
                            dl={dl}
                            late={late}
                            onOpen={() => onOpenTask(task.id)}
                            onChangeTaskStatus={changeStatus}
                            can={can}
                          />
                        ) : (
                          <TaskRow
                            key={task.id}
                            task={task}
                            idx={idx}
                            isLast={idx === groupTasks.length - 1}
                            dl={dl}
                            late={late}
                            today={today}
                            onOpen={() => onOpenTask(task.id)}
                            onChangeTaskStatus={changeStatus}
                            onChangeSubStatus={changeSubStatus}
                          />
                        );
                      })}
                      {can.create && (
                        <div
                          onClick={() => onNewTask('backlog')}
                          style={{ padding: '10px 14px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '.82rem', borderTop: '1px solid var(--border)', background: 'var(--surface2)', transition: 'color .15s' }}
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
          </>
        )}
      </div>
    </div>
  );
}

// ── Task row ───────────────────────────────────────────────────────────────────
function TaskRow({ task, idx, isLast, dl, late, today, onOpen, onChangeTaskStatus, onChangeSubStatus }) {
  const [hovered, setHovered]   = useState(false);
  const [showSubs, setShowSubs] = useState(true);

  const pending    = task.checklist?.filter(c => !subDone(c)) || [];
  const done       = task.checklist?.filter(c =>  subDone(c)) || [];
  const hasChecklist = (task.checklist?.length || 0) > 0;

  const bg = hovered ? 'var(--surface3)' : idx % 2 === 0 ? 'var(--surface)' : 'var(--surface2)';

  return (
    <div
      style={{ background: bg, borderBottom: isLast && !(showSubs && hasChecklist) ? 'none' : '1px solid var(--border)', transition: 'background .1s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'grid', gridTemplateColumns: COL, alignItems: 'stretch', minHeight: 42, cursor: 'pointer' }} onClick={onOpen}>

        <StatusCell
          value={task.taskStatus || 'pendente'}
          onChange={onChangeTaskStatus || (() => {})}
          disabled={!onChangeTaskStatus}
        />

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
              <span style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>☑ {done.length}/{task.checklist.length}</span>
            )}
          </div>
        </div>

        <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: '.82rem', overflow: 'hidden', color: task.assignee ? 'var(--text)' : 'var(--text-muted)' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.assignee || '—'}</span>
        </div>

        <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: '.82rem', fontWeight: late ? 700 : 400, color: late ? 'var(--danger)' : dl ? 'var(--text)' : 'var(--text-muted)' }}>
          {dl ? dl.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
          {late && ' ⚠'}
        </div>

        <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center' }}>
          {task.urgency ? (
            <span style={{ fontSize: '.7rem', fontWeight: 700, color: URGENCY_COLORS[task.urgency], background: URGENCY_COLORS[task.urgency] + '22', padding: '2px 8px', borderRadius: 10 }}>
              {URGENCY_LABELS[task.urgency]}
            </span>
          ) : <span style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>—</span>}
        </div>
      </div>

      {showSubs && hasChecklist && (
        <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          {pending.length > 0 && (
            <>
              <div style={{ padding: '4px 14px 4px 42px', fontSize: '.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                Em aberto · {pending.length}
              </div>
              {pending.map(item => {
                const realIdx = task.checklist.findIndex(c => c === item);
                const subDl   = item.deadline ? new Date(item.deadline + 'T00:00:00') : null;
                const subLate = subDl && subDl < today && !subDone(item);
                return (
                  <div
                    key={realIdx}
                    style={{ display: 'grid', gridTemplateColumns: COL, alignItems: 'stretch', minHeight: 36, borderBottom: '1px solid var(--border)' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <StatusCell value={item.status || 'pendente'} onChange={s => onChangeSubStatus?.(realIdx, s)} disabled={!onChangeSubStatus} small />
                    <div style={{ padding: '0 14px 0 28px', display: 'flex', alignItems: 'center', fontSize: '.84rem', fontWeight: 500, overflow: 'hidden' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text || item.label || <em style={{ color: 'var(--text-muted)', fontWeight: 400 }}>sem título</em>}</span>
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
          {done.length > 0 && (
            <SubDoneSection items={done} task={task} today={today} onChangeSubStatus={onChangeSubStatus} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Subtasks — done/cancelled section ─────────────────────────────────────────
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
            <StatusCell value={item.status || 'concluido'} onChange={s => onChangeSubStatus?.(realIdx, s)} disabled={!onChangeSubStatus} small />
            <div style={{ padding: '0 14px 0 28px', display: 'flex', alignItems: 'center', fontSize: '.82rem', overflow: 'hidden' }}>
              <s style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{item.text || item.label || '(sem título)'}</s>
            </div>
            <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: '.78rem', color: 'var(--text-muted)' }}>{item.assignee || '—'}</div>
            <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: '.78rem', color: 'var(--text-muted)' }}>
              {item.deadline ? new Date(item.deadline + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
            </div>
            <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: '.78rem', color: 'var(--text-muted)' }}>{item.time || '—'}</div>
          </div>
        );
      })}
    </>
  );
}
