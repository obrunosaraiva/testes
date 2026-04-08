import { useKanban } from '../../context/KanbanContext';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TrashPanel({ onClose }) {
  const { trashedTasks, trashedProjects, restoreTask, permDeleteTask, restoreProject, permDeleteProject } = useKanban();
  const total = trashedTasks.length + trashedProjects.length;

  return (
    <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>🗑 Lixeira</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {total === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>✨</div>
              <div style={{ fontSize: '.9rem' }}>Lixeira vazia</div>
            </div>
          ) : (
            <>
              {/* Trashed projects */}
              {trashedProjects.length > 0 && (
                <div>
                  <label className="field-label">Projetos excluídos ({trashedProjects.length})</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {trashedProjects.map(proj => {
                      const taskCount = trashedTasks.filter(t => t.project === proj.name && t.deletedWithProject).length;
                      return (
                        <TrashItem
                          key={proj.id}
                          icon="📁"
                          title={proj.name}
                          subtitle={`${taskCount} tarefa${taskCount !== 1 ? 's' : ''} · Excluído em ${fmtDate(proj.deletedAt)}`}
                          badge={proj.costCenter}
                          onRestore={() => restoreProject(proj.id)}
                          onDelete={() => {
                            if (confirm(`Excluir "${proj.name}" permanentemente? Isso removerá também as ${taskCount} tarefa(s) do projeto.`)) {
                              permDeleteProject(proj.id);
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Trashed tasks */}
              {trashedTasks.filter(t => !t.deletedWithProject).length > 0 && (
                <div>
                  <label className="field-label">Tarefas excluídas ({trashedTasks.filter(t => !t.deletedWithProject).length})</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {trashedTasks.filter(t => !t.deletedWithProject).map(task => (
                      <TrashItem
                        key={task.id}
                        icon="📋"
                        title={task.title}
                        subtitle={`${task.project || 'Sem projeto'} · ${task.assignee || '—'} · Excluída em ${fmtDate(task.deletedAt)}`}
                        onRestore={() => restoreTask(task.id)}
                        onDelete={() => {
                          if (confirm(`Excluir "${task.title}" permanentemente?`)) permDeleteTask(task.id);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {trashedTasks.filter(t => t.deletedWithProject).length > 0 && (
                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8 }}>
                  ℹ️ {trashedTasks.filter(t => t.deletedWithProject).length} tarefa(s) excluídas junto com seus projetos. Restaure o projeto para recuperá-las.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TrashItem({ icon, title, subtitle, badge, onRestore, onDelete }) {
  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
          {badge && <span style={{ marginLeft: 8, fontSize: '.68rem', padding: '1px 7px', borderRadius: 10, background: 'var(--surface3)', color: 'var(--text-muted)' }}>{badge}</span>}
        </div>
        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
      </div>
      <button
        onClick={onRestore}
        style={{ padding: '4px 12px', borderRadius: 7, background: 'var(--success)', border: 'none', color: '#fff', fontSize: '.75rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        ↩ Restaurar
      </button>
      <button
        onClick={onDelete}
        style={{ padding: '4px 10px', borderRadius: 7, background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        ✕ Excluir
      </button>
    </div>
  );
}
