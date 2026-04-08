import { useState } from 'react';
import { useKanban } from '../../context/KanbanContext';

const STATUS_LABEL = { backlog: 'Backlog', todo: 'To Do', doing: 'Fazendo', paused: 'Pausado', review: 'Em Revisão' };
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

export default function ReportModal({ onClose }) {
  const { tasks, projects } = useKanban();
  const [tab, setTab] = useState('tasks');
  const [filterProj, setFilterProj] = useState('__all__');
  const [statuses, setStatuses] = useState({ backlog: true, todo: true, doing: true, paused: true, review: true });
  const [includeDone, setIncludeDone] = useState(false);
  const [onlyLate, setOnlyLate] = useState(false);
  const [preview, setPreview] = useState('');
  const [copied, setCopied] = useState(false);

  function toggleStatus(s) {
    setStatuses(prev => ({ ...prev, [s]: !prev[s] }));
  }

  // ── Tarefas report ─────────────────────────────────────────────────────────
  function buildReport() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const activeStatuses = Object.entries(statuses).filter(([,v]) => v).map(([k]) => k);

    const activeTasks = tasks.filter(t => {
      if (filterProj !== '__all__' && t.project !== filterProj) return false;
      if (!activeStatuses.includes(t.status)) return false;
      if (onlyLate) {
        if (!t.deadline) return false;
        if (new Date(t.deadline + 'T00:00:00') >= today) return false;
      }
      return true;
    });

    const doneTasks = includeDone ? tasks.filter(t => {
      if (t.status !== 'done') return false;
      if (filterProj !== '__all__' && t.project !== filterProj) return false;
      return true;
    }) : [];

    const allTasks = [...activeTasks, ...doneTasks];
    if (!allTasks.length) return 'Nenhuma tarefa encontrada com os filtros selecionados.';

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const lines = [];
    lines.push('📋 *Relatório Kanban Pro*');
    lines.push(`${dateStr} - ${timeStr}`);

    const allProjs = filterProj === '__all__'
      ? [...new Set(allTasks.map(t => t.project || 'Sem Projeto'))]
      : [filterProj];

    allProjs.forEach(pName => {
      const active = activeTasks.filter(t => (t.project || 'Sem Projeto') === pName);
      const done = doneTasks.filter(t => (t.project || 'Sem Projeto') === pName);
      if (!active.length && !done.length) return;

      lines.push(''); lines.push(`📁 *${pName}*`); lines.push('');

      let i = 1;
      active.forEach(t => {
        const dl = t.deadline ? new Date(t.deadline + 'T00:00:00') : null;
        const late = dl && dl < today;
        const dlStr = dl ? dl.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Sem prazo';
        lines.push(`${i++}. *${t.title}*`);
        lines.push(`   👤 Responsável: ${t.assignee || '—'}`);
        lines.push(`   🔄 Status: ${STATUS_LABEL[t.status] || t.status} — ${late ? '⚠️ Atrasado' : '✅ Dentro do prazo'}`);
        lines.push(`   📅 Prazo: ${dlStr}`);
        (t.checklist || []).forEach(c => {
          const clDl = c.deadline ? ` · 📅 ${new Date(c.deadline + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : '';
          const clA = c.assignee ? ` · 👤 ${c.assignee}` : '';
          lines.push(`      ${c.done ? '☑' : '☐'} ${c.text || '—'}${clA}${clDl}`);
        });
      });

      done.forEach(t => {
        lines.push(`${i++}. ${t.title} — ${t.assignee || '—'} ✅`);
        (t.checklist || []).forEach(c => {
          lines.push(`      ${c.done ? '☑' : '☐'} ${c.text || '—'}`);
        });
      });
    });

    lines.push(''); lines.push('---');
    lines.push(`📊 Total: ${allTasks.length} tarefa${allTasks.length !== 1 ? 's' : ''}`);
    if (includeDone && doneTasks.length) lines.push(`✅ Concluídas: ${doneTasks.length}`);
    const lateCount = activeTasks.filter(t => t.deadline && new Date(t.deadline + 'T00:00:00') < today).length;
    if (lateCount) lines.push(`⚠️ Atrasadas: ${lateCount}`);
    return lines.join('\n');
  }

  // ── Eventos report ──────────────────────────────────────────────────────────
  function buildEventsReport() {
    const eventTasks = tasks.filter(t => t.isEvent && (filterProj === '__all__' || t.project === filterProj));
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
      lines.push(`   🔄 Status: ${STATUS_LABEL[t.status] || t.status}`);
      lines.push(`   📅 Data do evento: ${evStart}${t.eventEndDate ? ` até ${evEnd}` : ''}`);
      lines.push('');
      lines.push(`   🎯 Meta de ingressos: ${goal || '—'}`);
      lines.push(`   ✅ Ingressos vendidos: ${sold}`);
      lines.push(`   📉 Faltam: ${goal > 0 ? remaining : '—'}`);
      lines.push(`   📊 Progresso: ${salesPct !== null ? salesPct + '%' : '—'}`);
      lines.push(`   ⏱ Dias restantes: ${daysRemaining !== null ? daysRemaining : '—'}`);
      lines.push(`   📈 Pacing diário: ${pacing !== null ? pacing + ' ingressos/dia' : '—'}`);
      lines.push(`   ${status}`);

      if ((t.checklist || []).length > 0) {
        lines.push('');
        lines.push('   📋 Checklist:');
        t.checklist.forEach(c => {
          const clA = c.assignee ? ` · 👤 ${c.assignee}` : '';
          const clDl = c.deadline ? ` · 📅 ${new Date(c.deadline + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : '';
          lines.push(`      ${c.done ? '☑' : '☐'} ${c.text || '—'}${clA}${clDl}`);
        });
      }
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

  function handlePreview() {
    setPreview(tab === 'tasks' ? buildReport() : buildEventsReport());
    setCopied(false);
  }

  async function handleCopy() {
    const text = tab === 'tasks' ? buildReport() : buildEventsReport();
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
            {[['tasks', '📋 Tarefas'], ['events', `🎟 Eventos${eventCount ? ` (${eventCount})` : ''}`]].map(([key, label]) => (
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

          {/* Project filter */}
          <div>
            <label className="field-label">Projeto</label>
            <select value={filterProj} onChange={e => { setFilterProj(e.target.value); setPreview(''); }}>
              <option value="__all__">Todos os projetos</option>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Tasks tab filters */}
          {tab === 'tasks' && (
            <>
              <div>
                <label className="field-label">Status</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {[['backlog','📥 Backlog'],['todo','📌 To Do'],['doing','🔄 Doing'],['paused','⏸ Pausado'],['review','👀 Review']].map(([s, label]) => (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.85rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={statuses[s]} onChange={() => toggleStatus(s)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={includeDone} onChange={e => setIncludeDone(e.target.checked)} />
                ✅ Incluir tarefas concluídas?
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={onlyLate} onChange={e => setOnlyLate(e.target.checked)} />
                ⚠️ Apenas tarefas atrasadas
              </label>
            </>
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
