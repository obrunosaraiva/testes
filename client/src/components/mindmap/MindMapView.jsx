import { useState, useRef, useEffect, useMemo } from 'react';
import { useKanban } from '../../context/KanbanContext';

// ── Constants ──────────────────────────────────────────────────────────────────
const RADIUS_L1 = 240;   // tasks from center
const RADIUS_L2 = 430;   // subtasks from center
const NODE_W    = 168;   // task node width
const R_PROJ    = 48;    // project center radius

const STATUS_COLORS = {
  pendente: '#9ca3af', solicitado: '#f97316', andamento: '#3b82f6',
  revisao: '#ec4899', correcao: '#eab308', concluido: '#22c55e',
  cancelado: '#6b7280', atrasado: '#ef4444',
  impedimento_interno: '#ea580c', impedimento_externo: '#a855f7',
};
const STATUS_EMOJI = {
  pendente: '⚪', solicitado: '🟠', andamento: '🔵', revisao: '🩷',
  correcao: '🟡', concluido: '🟢', cancelado: '⚫', atrasado: '🔴',
  impedimento_interno: '🟧', impedimento_externo: '🟪',
};
const URGENCY = [
  ['low', 'Baixa', '#4ade80'],
  ['medium', 'Média', '#fbbf24'],
  ['high', 'Alta', '#f87171'],
  ['critical', 'Crítica', '#ef4444'],
];

function trunc(s, n) { return !s ? '' : s.length > n ? s.slice(0, n - 1) + '…' : s; }
function subDone(c) {
  return c.status ? (c.status === 'concluido' || c.status === 'cancelado') : !!c.done;
}

// ── Debounce hook ──────────────────────────────────────────────────────────────
function useDebounce(value, ms) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return dv;
}

// ── Layout algorithm ───────────────────────────────────────────────────────────
function buildLayout(tasks, expandedSet) {
  if (!tasks.length) return { nodes: [], edges: [] };
  const nodes = [], edges = [];

  // Weight: expanded task with N subtasks gets N× angular space
  const weight = t => expandedSet.has(t.id)
    ? Math.max(1, (t.checklist || []).filter(c => !subDone(c)).length)
    : 1;

  const totalW = tasks.reduce((s, t) => s + weight(t), 0);
  // Span: full circle if >= 6 tasks, else proportional (min 180°)
  const span = Math.min(2 * Math.PI * 0.94, Math.max(Math.PI, tasks.length * 0.6));
  const startA = -Math.PI / 2 - span / 2;

  let cum = 0;
  tasks.forEach(task => {
    const w = weight(task);
    const slice = (w / totalW) * span;
    const angle = startA + ((cum + w / 2) / totalW) * span;
    cum += w;

    const tx = RADIUS_L1 * Math.cos(angle);
    const ty = RADIUS_L1 * Math.sin(angle);
    nodes.push({ id: task.id, type: 'task', x: tx, y: ty, angle, slice, data: task });
    edges.push({ id: `ep_${task.id}`, x1: 0, y1: 0, x2: tx, y2: ty });

    if (expandedSet.has(task.id)) {
      const cl = (task.checklist || []).filter(c => !subDone(c));
      cl.forEach((item, i) => {
        const a = angle - slice / 2 + ((i + 0.5) / cl.length) * slice;
        const sx = RADIUS_L2 * Math.cos(a);
        const sy = RADIUS_L2 * Math.sin(a);
        const sid = item.id || `${task.id}_cl_${i}`;
        nodes.push({ id: sid, type: 'subtask', x: sx, y: sy, data: item, taskId: task.id });
        edges.push({ id: `ec_${sid}`, x1: tx, y1: ty, x2: sx, y2: sy });
      });
    }
  });

  return { nodes, edges };
}

// ── Project center node ────────────────────────────────────────────────────────
function ProjectNode({ name, count }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      <circle r={R_PROJ + 10} fill="var(--accent)" opacity={0.1} />
      <circle r={R_PROJ} fill="var(--accent)" opacity={0.88} filter="url(#mm-shadow)" />
      <text textAnchor="middle" y={-8} fill="#fff" fontSize={12} fontWeight={700}
        style={{ userSelect: 'none' }}>{trunc(name, 18)}</text>
      <text textAnchor="middle" y={9} fill="rgba(255,255,255,.72)" fontSize={10}
        style={{ userSelect: 'none' }}>{count} tarefa{count !== 1 ? 's' : ''}</text>
    </g>
  );
}

// ── Task node ─────────────────────────────────────────────────────────────────
function TaskNode({ node, allTasks, expandedSet, onToggle, onOpen, searchQ }) {
  const task = node.data;
  const color = STATUS_COLORS[task.taskStatus || 'pendente'];
  const today = new Date();
  const overdue = task.deadline && new Date(task.deadline + 'T23:59:59') < today && task.status !== 'done';

  const pendingDeps = (task.dependencies || [])
    .map(id => allTasks.find(t => t.id === id))
    .filter(d => d && d.status !== 'done' && d.taskStatus !== 'concluido' && d.taskStatus !== 'cancelado');
  const blocked = pendingDeps.length > 0;

  const activeSubs = (task.checklist || []).filter(c => !subDone(c)).length;
  const doneSubs   = (task.checklist || []).filter(c => subDone(c)).length;
  const isExpanded = expandedSet.has(task.id);

  const matched = !searchQ || (
    task.title.toLowerCase().includes(searchQ) ||
    (task.assignee || '').toLowerCase().includes(searchQ)
  );

  // Dynamic box height
  const hasMeta = !!(task.assignee || overdue);
  const boxH = 44 + (hasMeta ? 14 : 0) + (blocked ? 14 : 0);

  const t1y = -boxH / 2 + 16;   // title line
  const t2y = -boxH / 2 + 30;   // meta line
  const t3y = -boxH / 2 + (hasMeta ? 44 : 30); // deps line

  return (
    <g transform={`translate(${node.x},${node.y})`} opacity={searchQ && !matched ? 0.22 : 1}>
      {/* Box */}
      <rect
        x={-NODE_W / 2} y={-boxH / 2} width={NODE_W} height={boxH} rx={9}
        fill="var(--surface2)"
        stroke={blocked ? '#f97316' : 'var(--border)'}
        strokeWidth={blocked ? 1.8 : 1}
        style={{ cursor: 'pointer' }}
        onClick={onToggle}
      />
      {/* Left status bar */}
      <rect
        x={-NODE_W / 2} y={-boxH / 2} width={4} height={boxH} rx={2}
        fill={color} style={{ pointerEvents: 'none' }}
      />

      {/* Title */}
      <text
        x={-NODE_W / 2 + 12} y={t1y}
        fill="var(--text)" fontSize={11} fontWeight={600}
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {STATUS_EMOJI[task.taskStatus || 'pendente']} {trunc(task.title, 18)}
      </text>

      {/* Meta: assignee + overdue */}
      {hasMeta && (
        <text
          x={-NODE_W / 2 + 12} y={t2y}
          fill={overdue ? '#ef4444' : 'var(--text-muted)'}
          fontSize={9.5}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {task.assignee ? `👤 ${trunc(task.assignee, 13)}` : ''}{overdue ? (task.assignee ? ' · ' : '') + '🔴 atrasada' : ''}
        </text>
      )}

      {/* Blocked dependency */}
      {blocked && (
        <text
          x={-NODE_W / 2 + 12} y={t3y}
          fill="#f97316" fontSize={9}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          🟧 {trunc(pendingDeps.map(d => d.title).join(', '), 24)}
        </text>
      )}

      {/* Subtask expand badge */}
      {activeSubs > 0 && (
        <g
          transform={`translate(${NODE_W / 2 - 14}, ${-boxH / 2 + 14})`}
          onClick={e => { e.stopPropagation(); onToggle(); }}
          style={{ cursor: 'pointer' }}
        >
          <circle r={9} fill={isExpanded ? 'var(--accent)' : 'var(--surface3)'}
            stroke="var(--border)" strokeWidth={1} />
          <text textAnchor="middle" dy={3.5} fontSize={8.5} fontWeight={700}
            fill={isExpanded ? '#fff' : 'var(--text-muted)'}
            style={{ userSelect: 'none', pointerEvents: 'none' }}>
            {isExpanded ? '−' : activeSubs}
          </text>
        </g>
      )}

      {/* Checklist progress pill */}
      {(activeSubs > 0 || doneSubs > 0) && !isExpanded && doneSubs > 0 && (
        <text
          x={-NODE_W / 2 + 12} y={boxH / 2 - 6}
          fill="var(--text-muted)" fontSize={8.5}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          ☑ {doneSubs}/{activeSubs + doneSubs}
        </text>
      )}

      {/* Open modal button */}
      <g
        transform={`translate(${NODE_W / 2 + 18}, 0)`}
        onClick={e => { e.stopPropagation(); onOpen(task.id); }}
        style={{ cursor: 'pointer' }}
        title="Abrir tarefa"
      >
        <circle r={11} fill="var(--accent)" opacity={0.9} />
        <text textAnchor="middle" dy={4.5} fontSize={14} fill="#fff" fontWeight={700}
          style={{ userSelect: 'none', pointerEvents: 'none' }}>+</text>
      </g>
    </g>
  );
}

// ── Subtask node ───────────────────────────────────────────────────────────────
function SubtaskNode({ node, searchQ }) {
  const item = node.data;
  const color = STATUS_COLORS[item.status || 'pendente'];
  const matched = !searchQ || (item.text || '').toLowerCase().includes(searchQ);

  return (
    <g transform={`translate(${node.x},${node.y})`} opacity={searchQ && !matched ? 0.22 : 1}>
      <rect x={-68} y={-18} width={136} height={item.assignee ? 38 : 28} rx={7}
        fill="var(--surface)" stroke="var(--border)" strokeWidth={1}
        style={{ pointerEvents: 'none' }}
      />
      <rect x={-68} y={-18} width={3.5} height={item.assignee ? 38 : 28} rx={1.5}
        fill={color} style={{ pointerEvents: 'none' }} />
      <text x={-58} y={-4} fill="var(--text)" fontSize={9.5} fontWeight={500}
        style={{ userSelect: 'none', pointerEvents: 'none' }}>
        {STATUS_EMOJI[item.status || 'pendente']} {trunc(item.text || '(sem título)', 16)}
      </text>
      {item.assignee && (
        <text x={-58} y={10} fill="var(--text-muted)" fontSize={8.5}
          style={{ userSelect: 'none', pointerEvents: 'none' }}>
          👤 {trunc(item.assignee, 15)}
        </text>
      )}
    </g>
  );
}

// ── Fit-to-view ───────────────────────────────────────────────────────────────
function computeFit(nodes, size) {
  if (!nodes.length || size.w === 0 || size.h === 0) return { scale: 1, pan: { x: 0, y: 0 } };

  const PAD = 64; // padding around content (content units)
  let minX = -(R_PROJ + 12), maxX = R_PROJ + 12;
  let minY = -(R_PROJ + 12), maxY = R_PROJ + 12;

  nodes.forEach(n => {
    const hw = n.type === 'task' ? NODE_W / 2 + 32 : 72;
    const hh = n.type === 'task' ? 42                : 22;
    minX = Math.min(minX, n.x - hw);
    maxX = Math.max(maxX, n.x + hw);
    minY = Math.min(minY, n.y - hh);
    maxY = Math.max(maxY, n.y + hh);
  });

  const contentW = maxX - minX + PAD * 2;
  const contentH = maxY - minY + PAD * 2;
  const rawS  = Math.min(size.w / contentW, size.h / contentH);
  const scale = Math.max(0.2, Math.min(1.8, rawS));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // pan must use the same capped scale so the content stays centred on screen
  return { scale, pan: { x: -centerX * scale, y: -centerY * scale } };
}


export default function MindMapView({ onOpenTask }) {
  const { tasks, projects, activeProject, combinedProjects } = useKanban();

  // Require exactly one project selected
  const singleProject = useMemo(() => {
    if (combinedProjects && combinedProjects.length > 0) return null;
    if (!activeProject || activeProject === '__all__') return null;
    return projects.find(p => p.name === activeProject) || null;
  }, [activeProject, combinedProjects, projects]);

  const wrapRef  = useRef(null);
  const svgRef   = useRef(null);
  const dragRef  = useRef({ active: false, sx: 0, sy: 0, px: 0, py: 0 });
  const touchRef = useRef({ lastDist: null, lastMid: null });

  const [size, setSize]       = useState({ w: 800, h: 600 });
  const [scale, setScale]     = useState(1);
  const [pan, setPan]         = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    statuses: [], assignee: '', urgencies: [], onlyBlocked: false,
  });
  const [search, setSearch]   = useState('');
  const searchQ = useDebounce(search.toLowerCase().trim(), 300);

  // Resize observer
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Wheel zoom + touch events (passive:false required for preventDefault)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = e => {
      e.preventDefault();
      setScale(s => Math.min(3, Math.max(0.2, s * (e.deltaY > 0 ? 0.88 : 1.13))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart',  onTouchStart, { passive: false });
    el.addEventListener('touchmove',   onTouchMove,  { passive: false });
    el.addEventListener('touchend',    onTouchEnd,   { passive: false });
    return () => {
      el.removeEventListener('wheel',      onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pan]);

  // Keyboard shortcut: Escape
  useEffect(() => {
    const fn = e => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'Escape') { setShowFilters(false); setSearch(''); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!singleProject) return [];
    let r = tasks.filter(t => t.project === singleProject.name);
    if (filters.statuses.length)
      r = r.filter(t => filters.statuses.includes(t.taskStatus || 'pendente'));
    if (filters.assignee.trim())
      r = r.filter(t => (t.assignee || '').toLowerCase().includes(filters.assignee.toLowerCase()));
    if (filters.urgencies.length)
      r = r.filter(t => filters.urgencies.includes(t.urgency || 'medium'));
    if (filters.onlyBlocked)
      r = r.filter(t => {
        const deps = t.dependencies || [];
        return deps.length && deps.some(id => {
          const d = tasks.find(x => x.id === id);
          return d && d.status !== 'done' && d.taskStatus !== 'concluido' && d.taskStatus !== 'cancelado';
        });
      });
    return r;
  }, [singleProject, tasks, filters]);

  const { nodes, edges } = useMemo(
    () => buildLayout(filteredTasks, expanded),
    [filteredTasks, expanded]
  );

  const cx = size.w / 2, cy = size.h / 2;

  // Auto fit-to-view when the project/filter changes or size becomes known
  const fitKeyRef = useRef('');
  useEffect(() => {
    if (size.w === 0) return;
    const key = filteredTasks.map(t => t.id).join(',') + size.w + size.h;
    if (fitKeyRef.current === key) return;
    fitKeyRef.current = key;
    // Build a collapsed layout (level 1 only) to compute the fit
    const { nodes: fitNodes } = buildLayout(filteredTasks, new Set());
    const { scale: s, pan: p } = computeFit(fitNodes, size);
    setScale(s);
    setPan(p);
  }, [filteredTasks, size]);

  // ── Mouse pan handlers ─────────────────────────────────────────────────────
  function onMouseDown(e) {
    const tag = e.target.tagName;
    if (tag !== 'svg' && tag !== 'g' && tag !== 'line') return;
    dragRef.current = { active: true, sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
    setDragging(true);
  }
  function onMouseMove(e) {
    if (!dragRef.current.active) return;
    setPan({
      x: dragRef.current.px + e.clientX - dragRef.current.sx,
      y: dragRef.current.py + e.clientY - dragRef.current.sy,
    });
  }
  function onMouseUp() {
    dragRef.current.active = false;
    setDragging(false);
  }

  // ── Touch handlers (pan + pinch-to-zoom) ──────────────────────────────────
  function onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      dragRef.current = { active: true, sx: t.clientX, sy: t.clientY, px: pan.x, py: pan.y };
      touchRef.current = { lastDist: null, lastMid: null };
      setDragging(true);
    } else if (e.touches.length === 2) {
      dragRef.current.active = false;
      setDragging(false);
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchRef.current = {
        lastDist: dist,
        lastMid: { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 },
      };
    }
  }
  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && dragRef.current.active) {
      const t = e.touches[0];
      setPan({
        x: dragRef.current.px + t.clientX - dragRef.current.sx,
        y: dragRef.current.py + t.clientY - dragRef.current.sy,
      });
    } else if (e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const mid  = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };

      if (touchRef.current.lastDist !== null) {
        const ratio = dist / touchRef.current.lastDist;
        setScale(s => Math.min(3, Math.max(0.2, s * ratio)));

        // Pan to keep midpoint stable
        const dx = mid.x - touchRef.current.lastMid.x;
        const dy = mid.y - touchRef.current.lastMid.y;
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      }
      touchRef.current = { lastDist: dist, lastMid: mid };
    }
  }
  function onTouchEnd(e) {
    if (e.touches.length === 0) {
      dragRef.current.active = false;
      touchRef.current = { lastDist: null, lastMid: null };
      setDragging(false);
    } else if (e.touches.length === 1) {
      // Went from 2 fingers to 1 — resume pan from current position
      const t = e.touches[0];
      dragRef.current = { active: true, sx: t.clientX, sy: t.clientY, px: pan.x, py: pan.y };
      touchRef.current = { lastDist: null, lastMid: null };
    }
  }

  function toggleExpand(id) {
    setExpanded(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }
  function expandAll()   { setExpanded(new Set(filteredTasks.map(t => t.id))); }
  function collapseAll() { setExpanded(new Set()); }
  function centerView()  {
    const { nodes: fitNodes } = buildLayout(filteredTasks, new Set());
    const { scale: s, pan: p } = computeFit(fitNodes, size);
    setScale(s); setPan(p);
  }

  const activeFilters = [
    filters.statuses.length > 0,
    filters.assignee.trim() !== '',
    filters.urgencies.length > 0,
    filters.onlyBlocked,
  ].filter(Boolean).length;

  // ── Fallback ───────────────────────────────────────────────────────────────
  if (!singleProject) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 14, padding: 40, textAlign: 'center',
      }}>
        <span style={{ fontSize: '3.5rem' }}>🗺</span>
        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>
          Selecione um único projeto
        </div>
        <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', maxWidth: 360, lineHeight: 1.7 }}>
          O Mapa Mental exibe a estrutura de tarefas e subtarefas de um projeto
          específico. Selecione um projeto na barra acima para visualizar.
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px',
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '.9rem' }}>🗺</span>
        <span style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--text)' }}>
          {singleProject.name}
        </span>
        <span style={{
          fontSize: '.72rem', color: 'var(--text-muted)',
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '1px 8px',
        }}>
          {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? 's' : ''}
        </span>

        <div style={{ flex: 1 }} />

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar..."
          style={{ width: 148, fontSize: '.82rem', height: 30, padding: '0 10px' }}
        />

        {/* Zoom */}
        <button className="icon-btn" title="Ampliar"
          onClick={() => setScale(s => Math.min(3, +(s * 1.2).toFixed(2)))}>＋</button>
        <button className="icon-btn" title="Reduzir"
          onClick={() => setScale(s => Math.max(0.2, +(s / 1.2).toFixed(2)))}>－</button>
        <button className="icon-btn" title="Centralizar" onClick={centerView}>⊙</button>

        {/* Expand / collapse all */}
        <button className="icon-btn" title="Expandir todas as subtarefas" onClick={expandAll}>⊞</button>
        <button className="icon-btn" title="Colapsar tudo" onClick={collapseAll}>⊟</button>

        {/* Filters toggle */}
        <button
          className="icon-btn"
          style={showFilters ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
          onClick={() => setShowFilters(v => !v)}
          title="Filtros"
        >
          ⚙
          {activeFilters > 0 && (
            <span style={{
              background: 'var(--accent)', color: '#fff',
              borderRadius: 8, fontSize: '.62rem', fontWeight: 700,
              padding: '1px 5px', marginLeft: 3,
            }}>{activeFilters}</span>
          )}
        </button>
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div style={{
          display: 'flex', gap: 20, padding: '10px 16px', flexWrap: 'wrap',
          background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
          fontSize: '.82rem', alignItems: 'flex-end',
        }}>
          {/* Status */}
          <div>
            <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 5, letterSpacing: '.04em' }}>STATUS</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Object.entries(STATUS_EMOJI).map(([val, em]) => {
                const on = filters.statuses.includes(val);
                return (
                  <button key={val} onClick={() => setFilters(f => ({
                    ...f, statuses: on ? f.statuses.filter(s => s !== val) : [...f.statuses, val],
                  }))} style={{
                    border: `1px solid ${on ? STATUS_COLORS[val] : 'var(--border)'}`,
                    borderRadius: 20, padding: '2px 9px', cursor: 'pointer',
                    background: on ? STATUS_COLORS[val] + '28' : 'transparent',
                    color: on ? STATUS_COLORS[val] : 'var(--text-muted)',
                    fontSize: '.75rem', fontFamily: 'inherit',
                  }}>{em}</button>
                );
              })}
            </div>
          </div>

          {/* Assignee */}
          <div>
            <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 5, letterSpacing: '.04em' }}>RESPONSÁVEL</div>
            <input
              value={filters.assignee}
              onChange={e => setFilters(f => ({ ...f, assignee: e.target.value }))}
              placeholder="Nome..."
              style={{ width: 120, height: 28, fontSize: '.82rem' }}
            />
          </div>

          {/* Urgency */}
          <div>
            <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 5, letterSpacing: '.04em' }}>URGÊNCIA</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {URGENCY.map(([val, label, col]) => {
                const on = filters.urgencies.includes(val);
                return (
                  <button key={val} onClick={() => setFilters(f => ({
                    ...f, urgencies: on ? f.urgencies.filter(u => u !== val) : [...f.urgencies, val],
                  }))} style={{
                    border: `1px solid ${on ? col : 'var(--border)'}`,
                    borderRadius: 20, padding: '2px 8px', cursor: 'pointer',
                    background: on ? col + '28' : 'transparent',
                    color: on ? col : 'var(--text-muted)',
                    fontSize: '.75rem', fontFamily: 'inherit',
                  }}>{label}</button>
                );
              })}
            </div>
          </div>

          {/* Only blocked */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--text)', fontSize: '.82rem' }}>
            <input type="checkbox" checked={filters.onlyBlocked}
              onChange={e => setFilters(f => ({ ...f, onlyBlocked: e.target.checked }))} />
            🟧 Apenas bloqueadas
          </label>

          {/* Clear */}
          {activeFilters > 0 && (
            <button
              onClick={() => setFilters({ statuses: [], assignee: '', urgencies: [], onlyBlocked: false })}
              style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                padding: '4px 12px', cursor: 'pointer', color: 'var(--text-muted)',
                fontSize: '.78rem', fontFamily: 'inherit',
              }}>
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* ── SVG Canvas ── */}
      <div ref={wrapRef} style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          width="100%" height="100%"
          style={{ display: 'block', cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <defs>
            <filter id="mm-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="5"
                floodColor="var(--accent)" floodOpacity="0.35" />
            </filter>
          </defs>

          <g transform={`translate(${cx + pan.x},${cy + pan.y}) scale(${scale})`}>

            {/* Edges (rendered first, behind nodes) */}
            <g stroke="var(--border)" strokeWidth={1.5} opacity={0.55}>
              {edges.map(e => (
                <line key={e.id} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
              ))}
            </g>

            {/* Task + subtask nodes */}
            {nodes.map(n =>
              n.type === 'task' ? (
                <TaskNode
                  key={n.id}
                  node={n}
                  allTasks={tasks}
                  expandedSet={expanded}
                  onToggle={() => toggleExpand(n.id)}
                  onOpen={onOpenTask}
                  searchQ={searchQ}
                />
              ) : (
                <SubtaskNode key={n.id} node={n} searchQ={searchQ} />
              )
            )}

            {/* Project center (on top) */}
            <ProjectNode name={singleProject.name} count={filteredTasks.length} />
          </g>
        </svg>

        {/* Scale indicator */}
        <div style={{
          position: 'absolute', bottom: 10, left: 12,
          fontSize: '.7rem', color: 'var(--text-muted)',
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '2px 8px', pointerEvents: 'none',
        }}>
          {Math.round(scale * 100)}%
        </div>

        {/* Empty state */}
        {filteredTasks.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', gap: 10, pointerEvents: 'none',
          }}>
            <span style={{ fontSize: '2.5rem' }}>🔍</span>
            <span style={{ fontSize: '.9rem' }}>Nenhuma tarefa com os filtros ativos</span>
          </div>
        )}
      </div>
    </div>
  );
}
