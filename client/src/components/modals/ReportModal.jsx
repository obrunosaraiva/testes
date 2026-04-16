import { useState, useMemo } from 'react';
import { useKanban } from '../../context/KanbanContext';

const STATUS_LABEL = { backlog: 'Backlog', todo: 'To Do', doing: 'Fazendo', done: 'Concluído' };

const TASK_STATUSES = [
  { value: 'pendente',            label: '⚪ Pendente' },
  { value: 'solicitado',          label: '🟠 Solicitado' },
  { value: 'andamento',           label: '🔵 Andamento' },
  { value: 'revisao',             label: '🩷 Revisão' },
  { value: 'correcao',            label: '🟡 Correção necessária' },
  { value: 'concluido',           label: '🟢 Concluído' },
  { value: 'cancelado',           label: '⚫ Cancelado' },
  { value: 'atrasado',            label: '🔴 Atrasado' },
  { value: 'impedimento_interno', label: '🟧 Impedimento Interno' },
  { value: 'impedimento_externo', label: '🟪 Impedimento Externo' },
];
const TASK_STATUS_MAP = Object.fromEntries(TASK_STATUSES.map(s => [s.value, s]));
function subDone(item) { return item.status ? (item.status === 'concluido' || item.status === 'cancelado') : !!item.done; }
const MS = 86400000;

function calcEventStats(task) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const eventDate = task.eventStartDate ? new Date(task.eventStartDate + 'T00:00:00') : null;
  const goal = parseInt(task.ticketGoal) || 0;
  const sold = parseInt(task.ticketsSold) || 0;
  const remaining = Math.max(0, goal - sold);
  const daysRemaining = eventDate ? Math.max(0, Math.ceil((eventDate - today) / MS)) : null;
  const pacing = daysRemaining > 0 && goal > 0 ? Math.ceil(remaining / daysRemaining) : null;
  const salesPct = goal > 0 ? Math.min(100, ((sold / goal) * 100)).toFixed(1) : null;

  let status = '—';
  if (goal > 0 && eventDate) {
    const campaignStart = task.startDate ? new Date(task.startDate + 'T00:00:00') : new Date(eventDate.getTime() - 30 * MS);
    const totalDays = Math.max(1, Math.ceil((eventDate - campaignStart) / MS));
    const daysElapsed = Math.max(0, totalDays - (daysRemaining || 0));
    const expectedByNow = (goal / totalDays) * daysElapsed;
    if (expectedByNow > 0) {
      const ratio = sold / expectedByNow;
      if (ratio < 0.6) status = '🔴 Fora da meta';
      else if (ratio < 0.9) status = '🟡 Atenção';
      else status = '✅ Na meta';
    }
  }

  return { goal, sold, remaining, daysRemaining, pacing, salesPct, status };
}

const DEFAULT_TASK_STATUSES = {
  pendente: true, solicitado: true, andamento: true, revisao: true,
  correcao: true, concluido: false, cancelado: false,
  atrasado: true, impedimento_interno: true, impedimento_externo: true,
};

export default function ReportModal({ onClose }) {
  const { tasks, projects, members } = useKanban();
  const [tab, setTab] = useState('tasks');
  const [filterProj, setFilterProj] = useState('__all__');
  const [filterAssignee, setFilterAssignee] = useState('__all__');
  const [colStatuses, setColStatuses] = useState({ backlog: true, todo: true, doing: true, done: false });
  const [taskStatuses, setTaskStatuses] = useState(DEFAULT_TASK_STATUSES);
  const [onlyLate, setOnlyLate] = useState(false);
  const [preview, setPreview] = useState('');
  const [copied, setCopied] = useState(false);

  const allAssignees = useMemo(() => {
    const fromTasks = tasks.map(t => t.assignee).filter(Boolean);
    const fromMembers = (members || []).map(m => m.name).filter(Boolean);
    return [...new Set([...fromTasks, ...fromMembers])].sort((a, b) => a.localeCompare(b));
  }, [tasks, members]);

  function toggleCol(s) {
    setColStatuses(prev => ({ ...prev, [s]: !prev[s] }));
  }
  function toggleTaskStatus(s) {
    setTaskStatuses(prev => ({ ...prev, [s]: !prev[s] }));
  }
  function allTaskStatuses(val) {
    setTaskStatuses(Object.fromEntries(Object.keys(DEFAULT_TASK_STATUSES).map(k => [k, val])));
  }

  // ── Tarefas report ─────────────────────────────────────────────────────────
  function buildReport() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const activeColStatuses = Object.entries(colStatuses).filter(([,v]) => v).map(([k]) => k);
    const activeTaskStatuses = Object.entries(taskStatuses).filter(([,v]) => v).map(([k]) => k);

    const allTasks = tasks.filter(t => {
      if (filterProj !== '__all__' && t.project !== filterProj) return false;
      if (filterAssignee !== '__all__' && (t.assignee || '') !== filterAssignee) return false;
      if (!activeColStatuses.includes(t.status)) return false;
      if (!activeTaskStatuses.includes(t.taskStatus || 'pendente')) return false;
      if (onlyLate) {
        if (!t.deadline) return false;
        if (new Date(t.deadline + 'T00:00:00') >= today) return false;
      }
      return true;
    });
    if (!allTasks.length) return 'Nenhuma tarefa encontrada com os filtros selecionados.';

    const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : null;
    const sEmoji = (ts) => (TASK_STATUS_MAP[ts || 'pendente']?.label || '⚪').split(' ')[0];
    const itemEmoji = (c) => {
      if (subDone(c)) return '🟢';
      if (c.status && TASK_STATUS_MAP[c.status]) return TASK_STATUS_MAP[c.status].label.split(' ')[0];
      return null;
    };

    // Helper: resolve task dependencies — returns pending blocking tasks
    const taskById = (id) => tasks.find(t => t.id === id);
    const isTaskDone = (t) => !t || t.status === 'done' || t.taskStatus === 'concluido' || t.taskStatus === 'cancelado';
    const pendingTaskDeps = (t) => (t.dependencies || [])
      .map(id => taskById(id))
      .filter(dep => dep && !isTaskDone(dep));

    // Helper: resolve checklist item dependencies — returns pending blocking items
    const pendingCLDeps = (item, checklist) => (item.dependencies || [])
      .map(id => checklist.find(c => c.id === id))
      .filter(dep => dep && !subDone(dep));

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const lines = [];
    lines.push('📋 *Relatório Kanban Pro*');
    lines.push(`${dateStr} - ${timeStr}`);

    // Destaques — tarefas que precisam de atenção
    const attention = allTasks.filter(t => ['correcao', 'atrasado', 'impedimento_interno', 'impedimento_externo'].includes(t.taskStatus));
    if (attention.length) {
      lines.push('');
      attention.forEach(t => {
        const dl = fmtDate(t.deadline);
        const assignee = t.assignee ? ` · 👤 ${t.assignee}` : '';
        const dlPart = dl ? ` · 📅 ${dl}` : '';
        const statusName = TASK_STATUS_MAP[t.taskStatus]?.label?.split(' ').slice(1).join(' ') || '';
        lines.push(`${sEmoji(t.taskStatus)} ${t.title}${assignee}${dlPart} · ${statusName}`);
      });
    }

    const allProjs = filterProj === '__all__'
      ? [...new Set(allTasks.map(t => t.project || 'Sem Projeto'))]
      : [filterProj];

    allProjs.forEach(pName => {
      const projTasks = allTasks.filter(t => (t.project || 'Sem Projeto') === pName);
      if (!projTasks.length) return;

      lines.push('');
      lines.push(`📁 ${pName}`);
      lines.push('');

      projTasks.forEach(t => {
        const dl = fmtDate(t.deadline);
        const checklist = t.checklist || [];
        const hasChecklist = checklist.length > 0;
        const dlPart = dl ? ` · 📅 ${dl}` : '';
        const assignee = t.assignee ? ` · 👤 ${t.assignee}` : '';

        // Cabeçalho da tarefa — formato único independente do status
        lines.push(`${sEmoji(t.taskStatus)}${dlPart} · ${t.title}${assignee}`);

        if (hasChecklist) {
          // Itens do checklist — respeita o mesmo filtro de taskStatus
          checklist.forEach(c => {
            const cStatus = subDone(c) ? (c.status || 'concluido') : (c.status || 'pendente');
            if (!activeTaskStatuses.includes(cStatus)) return; // oculta se status filtrado
            const cDl = fmtDate(c.deadline);
            const cAssignee = c.assignee ? ` · 👤 ${c.assignee}` : '';
            const cDlPart = cDl ? ` · 📅 ${cDl}` : '';
            const text = c.text || c.label || '—';
            const cEmoji = sEmoji(cStatus);
            lines.push(`      ${cEmoji}${cDlPart} · ${text}${cAssignee}`);
            // Subtask pending dependencies
            const clBlocking = pendingCLDeps(c, checklist);
            if (clBlocking.length) {
              const names = clBlocking.map(b => `${b.text || '—'} (${sEmoji(b.status || 'pendente')} ${TASK_STATUS_MAP[b.status || 'pendente']?.label?.split(' ').slice(1).join(' ') || 'Pendente'})`).join(', ');
              lines.push(`         🟧 Aguarda: ${names}`);
            }
          });
        }

        // Task-level pending dependencies
        const blocking = pendingTaskDeps(t);
        if (blocking.length) {
          const names = blocking.map(b => `${b.title} (${sEmoji(b.taskStatus)} ${TASK_STATUS_MAP[b.taskStatus || 'pendente']?.label?.split(' ').slice(1).join(' ') || 'Pendente'})`).join(', ');
          lines.push(`   🟧 Aguarda: ${names}`);
        }
      });
    });

    lines.push('');
    lines.push('> Legenda:');
    lines.push('⚪ Pendente');
    lines.push('🟠 Solicitado');
    lines.push('🔵 Andamento');
    lines.push('🔴 Atrasado');
    lines.push('🩷 Revisão');
    lines.push('🟡 Correção necessária');
    lines.push('🟢 Concluído');
    lines.push('⚫ Cancelado');
    lines.push('');
    lines.push('🟧 Aguardando dependência');
    lines.push('🟧 Impedimento Interno');
    lines.push('🟪 Impedimento Externo');

    return lines.join('\n');
  }

  // ── Eventos report ──────────────────────────────────────────────────────────
  function buildEventsReport() {
    const eventTasks = tasks.filter(t => t.isEvent && (filterProj === '__all__' || t.project === filterProj) && (filterAssignee === '__all__' || (t.assignee || '') === filterAssignee));
    if (!eventTasks.length) return 'Nenhum evento encontrado.';

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const lines = [];
    lines.push('🎟 *Relatório de Eventos — Kanban Pro*');
    lines.push(`${dateStr} - ${timeStr}`);
    lines.push('');

    eventTasks.forEach((t, i) => {
      const { goal, sold, remaining, daysRemaining, pacing, salesPct, status } = calcEventStats(t);
      const evStart = t.eventStartDate ? new Date(t.eventStartDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
      const evEnd = t.eventEndDate ? new Date(t.eventEndDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

      lines.push(`${i + 1}. 🎫 *${t.title}*`);
      lines.push(`   📁 Projeto: ${t.project || '—'}`);
      lines.push(`   👤 Responsável: ${t.assignee || '—'}`);
      lines.push(`   📅 Data do evento: ${evStart}${t.eventEndDate ? ` até ${evEnd}` : ''}`);
      lines.push('');
      lines.push(`   🎯 Meta de ingressos: ${goal || '—'}`);
      lines.push(`   ✅ Ingressos vendidos: ${sold}`);
      lines.push(`   📉 Faltam: ${goal > 0 ? remaining : '—'}`);
      lines.push(`   📊 Progresso: ${salesPct !== null ? salesPct + '%' : '—'}`);
      lines.push(`   ⏱ Dias restantes: ${daysRemaining !== null ? daysRemaining : '—'}`);
      lines.push(`   📈 Pacing diário: ${pacing !== null ? pacing + ' ingressos/dia' : '—'}`);
      lines.push(`   ${status}`);

      lines.push('');
    });

    lines.push('---');
    lines.push(`🎟 Total de eventos: ${eventTasks.length}`);
    const onTrack = eventTasks.filter(t => calcEventStats(t).status === '✅ Na meta').length;
    const offTrack = eventTasks.filter(t => calcEventStats(t).status === '🔴 Fora da meta').length;
    if (onTrack) lines.push(`✅ Na meta: ${onTrack}`);
    if (offTrack) lines.push(`🔴 Fora da meta: ${offTrack}`);

    return lines.join('\n');
  }

  // ── Resumo Executivo ─────────────────────────────────────────────────────────
  function buildResumo() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const allTasks = tasks.filter(t => (filterProj === '__all__' || t.project === filterProj) && (filterAssignee === '__all__' || (t.assignee || '') === filterAssignee));
    if (!allTasks.length) return 'Nenhuma tarefa encontrada.';

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const lines = [];
    lines.push(`📊 *Resumo Executivo — Kanban Pro*`);
    lines.push(dateStr);
    lines.push('');

    const projs = filterProj === '__all__'
      ? [...new Set(allTasks.map(t => t.project || 'Sem Projeto'))].sort()
      : [filterProj];

    projs.forEach(pName => {
      const pt = allTasks.filter(t => (t.project || 'Sem Projeto') === pName);
      if (!pt.length) return;

      const byTaskStatus = {};
      pt.forEach(t => { const ts = t.taskStatus || 'pendente'; byTaskStatus[ts] = (byTaskStatus[ts] || 0) + 1; });
      const lateCount = pt.filter(t => t.deadline && new Date(t.deadline + 'T00:00:00') < today && t.status !== 'done').length;
      const avgProgress = Math.round(pt.reduce((s, t) => s + (t.progress || 0), 0) / pt.length);

      const assignees = {};
      pt.forEach(t => { if (t.assignee) assignees[t.assignee] = (assignees[t.assignee] || 0) + 1; });
      const assigneeStr = Object.entries(assignees).sort((a,b) => b[1]-a[1]).slice(0, 5).map(([n, c]) => `${n} (${c})`).join(' · ');

      lines.push(`📁 *${pName}*`);

      const statusLine = TASK_STATUSES.filter(s => byTaskStatus[s.value]).map(s => `${s.label}: ${byTaskStatus[s.value]}`).join(' · ');
      lines.push(`   ${statusLine}`);

      const progBar = '█'.repeat(Math.round(avgProgress / 10)) + '░'.repeat(10 - Math.round(avgProgress / 10));
      lines.push(`   Progresso médio: ${progBar} ${avgProgress}%`);

      if (assigneeStr) lines.push(`   👤 ${assigneeStr}`);
      if (lateCount) lines.push(`   ⚠️ Atrasadas: ${lateCount}`);
      lines.push('');
    });

    const totalDone = allTasks.filter(t => t.taskStatus === 'concluido' || t.status === 'done').length;
    const totalLate = allTasks.filter(t => t.deadline && new Date(t.deadline + 'T00:00:00') < today && t.status !== 'done').length;
    const overallProgress = Math.round(allTasks.reduce((s, t) => s + (t.progress || 0), 0) / allTasks.length);

    lines.push('---');
    lines.push(`📋 Total: ${allTasks.length} tarefa${allTasks.length !== 1 ? 's' : ''} em ${projs.length} projeto${projs.length !== 1 ? 's' : ''}`);
    if (totalDone) lines.push(`✅ Concluídas: ${totalDone}`);
    if (totalLate) lines.push(`⚠️ Atrasadas: ${totalLate}`);
    lines.push(`📊 Progresso geral: ${overallProgress}%`);

    return lines.join('\n');
  }

  function handlePreview() {
    if (tab === 'tasks') setPreview(buildReport());
    else if (tab === 'events') setPreview(buildEventsReport());
    else setPreview(buildResumo());
    setCopied(false);
  }

  async function handleCopy() {
    const text = tab === 'tasks' ? buildReport() : tab === 'events' ? buildEventsReport() : buildResumo();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  const eventCount = tasks.filter(t => t.isEvent && (filterProj === '__all__' || t.project === filterProj)).length;

  return (
    <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>📋 Gerar Relatório</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface2)', borderRadius: 10, padding: 4 }}>
            {[['tasks', '📋 Tarefas'], ['events', `🎟 Eventos${eventCount ? ` (${eventCount})` : ''}`], ['resumo', '📊 Resumo']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setTab(key); setPreview(''); setCopied(false); }}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 7, border: 'none',
                  fontSize: '.83rem', fontWeight: 600, cursor: 'pointer',
                  background: tab === key ? 'var(--accent)' : 'transparent',
                  color: tab === key ? '#fff' : 'var(--text-muted)',
                  transition: 'all .15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Project + Assignee filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="field-label">Projeto</label>
              <select value={filterProj} onChange={e => { setFilterProj(e.target.value); setPreview(''); }}>
                <option value="__all__">Todos os projetos</option>
                {projects.map(p => <option key={p.id || p} value={p.name || p}>{p.name || p}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Responsável</label>
              <select value={filterAssignee} onChange={e => { setFilterAssignee(e.target.value); setPreview(''); }}>
                <option value="__all__">Todos</option>
                {allAssignees.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Tasks tab filters */}
          {tab === 'tasks' && (
            <>
              <div>
                <label className="field-label">Coluna do Kanban</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {[['backlog','📥 Backlog'],['todo','📌 To Do'],['doing','🔄 Doing'],['done','✅ Done']].map(([s, label]) => (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.85rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={colStatuses[s]} onChange={() => { toggleCol(s); setPreview(''); }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="field-label" style={{ margin: 0 }}>Status da tarefa</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { allTaskStatuses(true); setPreview(''); }} style={{ background: 'none', border: 'none', fontSize: '.75rem', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>Todos</button>
                    <button onClick={() => { allTaskStatuses(false); setPreview(''); }} style={{ background: 'none', border: 'none', fontSize: '.75rem', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>Nenhum</button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {TASK_STATUSES.map(({ value, label }) => (
                    <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.82rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={taskStatuses[value]} onChange={() => { toggleTaskStatus(value); setPreview(''); }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={onlyLate} onChange={e => { setOnlyLate(e.target.checked); setPreview(''); }} />
                ⚠️ Apenas tarefas atrasadas
              </label>
            </>
          )}

          {/* Resumo tab info */}
          {tab === 'resumo' && (
            <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              Resumo executivo por projeto: contagem por status, progresso médio, responsáveis e tarefas atrasadas. Ideal para enviar no WhatsApp ou reuniões de acompanhamento.
            </div>
          )}

          {/* Events tab info */}
          {tab === 'events' && (
            <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              Exporta todos os eventos com: data, meta, ingressos vendidos, faltam, pacing diário, progresso e status.
            </div>
          )}

          {/* Preview */}
          {preview && (
            <pre style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 14, fontSize: '.78rem', lineHeight: 1.7,
              whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto',
              color: 'var(--text)', fontFamily: 'monospace',
            }}>
              {preview}
            </pre>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handlePreview}>👁 Visualizar</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCopy} disabled={!preview}>
              📋 Copiar
            </button>
          </div>

          {copied && (
            <div style={{ textAlign: 'center', fontSize: '.8rem', color: 'var(--success)' }}>
              ✓ Copiado para a área de transferência!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
