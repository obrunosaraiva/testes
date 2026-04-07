import { useState } from 'react';
import { useKanban } from '../../context/KanbanContext';

const STATUS_LABEL = { backlog: 'Backlog', todo: 'To Do', doing: 'Fazendo', paused: 'Pausado', review: 'Em Revisão' };

export default function ReportModal({ onClose }) {
  const { tasks, projects } = useKanban();
  const [filterProj, setFilterProj] = useState('__all__');
  const [statuses, setStatuses] = useState({ backlog: true, todo: true, doing: true, paused: true, review: true });
  const [includeDone, setIncludeDone] = useState(false);
  const [onlyLate, setOnlyLate] = useState(false);
  const [preview, setPreview] = useState('');
  const [copied, setCopied] = useState(false);

  function toggleStatus(s) {
    setStatuses(prev => ({ ...prev, [s]: !prev[s] }));
  }

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

      lines.push('');
      lines.push(`📁 *${pName}*`);
      lines.push('');

      let i = 1;
      active.forEach(t => {
        const dl = t.deadline ? new Date(t.deadline + 'T00:00:00') : null;
        const late = dl && dl < today;
        const dlStr = dl ? dl.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Sem prazo';
        const statusStr = STATUS_LABEL[t.status] || t.status;
        const prazoStatus = late ? '⚠️ Atrasado' : '✅ Dentro do prazo';
        lines.push(`${i++}. *${t.title}*`);
        lines.push(`   👤 Responsável: ${t.assignee || '—'}`);
        lines.push(`   🔄 Status: ${statusStr} — ${prazoStatus}`);
        lines.push(`   📅 Prazo: ${dlStr}`);
        (t.checklist || []).forEach(c => {
          const ck = c.done ? '☑' : '☐';
          const clDl = c.deadline ? ` · 📅 ${new Date(c.deadline + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : '';
          const clA = c.assignee ? ` · 👤 ${c.assignee}` : '';
          lines.push(`      ${ck} ${c.text || '—'}${clA}${clDl}`);
        });
      });

      done.forEach(t => {
        lines.push(`${i++}. ${t.title} — ${t.assignee || '—'} ✅`);
        (t.checklist || []).forEach(c => {
          lines.push(`      ${c.done ? '☑' : '☐'} ${c.text || '—'}`);
        });
      });
    });

    lines.push('');
    lines.push('---');
    lines.push(`📊 Total: ${allTasks.length} tarefa${allTasks.length !== 1 ? 's' : ''}`);
    if (includeDone && doneTasks.length) lines.push(`✅ Concluídas: ${doneTasks.length}`);
    const lateCount = activeTasks.filter(t => {
      if (!t.deadline) return false;
      return new Date(t.deadline + 'T00:00:00') < today;
    }).length;
    if (lateCount) lines.push(`⚠️ Atrasadas: ${lateCount}`);

    return lines.join('\n');
  }

  function handlePreview() {
    setPreview(buildReport());
    setCopied(false);
  }

  async function handleCopy() {
    const text = buildReport();
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

  return (
    <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>📋 Gerar Relatório</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
            Configure os filtros e copie o relatório para a área de transferência.
          </p>

          {/* Project filter */}
          <div>
            <label className="field-label">Projeto</label>
            <select value={filterProj} onChange={e => setFilterProj(e.target.value)}>
              <option value="__all__">Todos os projetos</option>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Status checkboxes */}
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

          {/* Done toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={includeDone} onChange={e => setIncludeDone(e.target.checked)} />
            ✅ Incluir tarefas concluídas?
          </label>

          {/* Only late */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={onlyLate} onChange={e => setOnlyLate(e.target.checked)} />
            ⚠️ Apenas tarefas atrasadas
          </label>

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
