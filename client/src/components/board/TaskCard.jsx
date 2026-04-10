import { useKanban } from '../../context/KanbanContext';
import { useRole } from '../../context/RoleContext';
import { useConfirm } from '../../hooks/useConfirm';

const PROJ_COLORS = ['pc0','pc1','pc2','pc3','pc4','pc5','pc6','pc7'];
const URGENCY_LABEL = { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' };

function formatDateShort(iso) {
  if (!iso) return '';
  const d = iso.includes('T') ? new Date(iso) : new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function isDepDone(dep) {
  if (!dep) return true; // missing dep — don't block
  return dep.status === 'done' || dep.taskStatus === 'concluido' || dep.taskStatus === 'cancelado';
}

export default function TaskCard({ task, projIndex, onOpen }) {
  const { softDeleteTask, tasks } = useKanban();
  const { can, userId } = useRole();
  const [ConfirmDialog, confirm] = useConfirm();
  const cl = task.checklist || [];
  const done = cl.filter(x => x.done).length;
  const pc = PROJ_COLORS[Math.max(0, projIndex) % PROJ_COLORS.length];
  const isOverdue = task.deadline && new Date(task.deadline + 'T23:59:59') < new Date() && task.status !== 'done';
  const lateChecklistItems = cl.filter(c => c.deadline && !c.done && new Date(c.deadline + 'T23:59:59') < new Date()).length;
  const attCount = (task.attachments || []).length;
  const deps = task.dependencies || [];
  const isBlocked = deps.length > 0 && deps.some(depId => !isDepDone(tasks.find(t => t.id === depId)));

  function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  async function handleDelete(e) {
    e.stopPropagation();
    const ok = await confirm(`Mover "${task.title}" para a lixeira?`, {
      title: 'Mover para lixeira',
      confirmLabel: 'Mover',
    });
    if (!ok) return;
    softDeleteTask(task.id, userId || '');
  }

  return (
    <>
      {ConfirmDialog}
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onOpen(task.id)}
      className={`card card-c-${task.cardColor || 'none'}`}
      style={{ cursor: 'pointer', borderLeft: isBlocked ? '3px solid #f97316' : undefined }}
    >
      <div className="card-color-bar" />
      <div className="card-top">
        <span className={`card-proj-tag ${pc}`}>{task.project}</span>
        {isBlocked && (
          <span style={{ fontSize: '.65rem', padding: '2px 6px', borderRadius: 10, background: 'rgba(249,115,22,.15)', color: '#f97316', fontWeight: 600 }}>🔒 Bloqueada</span>
        )}
        {task.urgency && task.urgency !== 'medium' && (
          <span className={`urgency-badge urgency-${task.urgency}`}>{URGENCY_LABEL[task.urgency]}</span>
        )}
        {task.isEvent && <span style={{ fontSize: '.65rem', padding: '2px 6px', borderRadius: 10, background: 'rgba(245,158,11,.15)', color: '#f59e0b' }}>🎟 Evento</span>}
      </div>
      <div className="card-title">{task.title}</div>
      {task.description && <div className="card-desc">{task.description}</div>}
      {cl.length > 0 && (
        <div className="card-checklist-bar">
          <div className="card-checklist-fill" style={{ width: `${(done / cl.length) * 100}%` }} />
        </div>
      )}
      {lateChecklistItems > 0 && (
        <span style={{ fontSize: '.7rem', color: 'var(--danger)', fontWeight: 600 }}>🔴 {lateChecklistItems} item(s) atrasado(s)</span>
      )}
      <div className="card-meta">
        {task.deadline && (
          <span className={isOverdue ? 'overdue' : ''}>
            📅 {formatDateShort(task.deadline)}{task.deadlineTime ? ' ' + task.deadlineTime : ''}{isOverdue ? ' (atrasada)' : ''}
          </span>
        )}
        {task.assignee && <span>👤 {task.assignee.includes('@') ? task.assignee.split('@')[0] : task.assignee}</span>}
        {attCount > 0 && <span>📎 {attCount}</span>}
        {cl.length > 0 && <span>☑ {done}/{cl.length}</span>}
      </div>
      <div className="card-footer">
        <span className="card-date">{formatDateShort(task.createdAt)}</span>
        <div className="card-actions">
          {can.delete && (
            <button className="card-btn del" onClick={handleDelete} title="Mover para lixeira">✕</button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
