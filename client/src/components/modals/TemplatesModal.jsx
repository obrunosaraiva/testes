import { useKanban } from '../../context/KanbanContext';
import { useConfirm } from '../../hooks/useConfirm';

export default function TemplatesModal({ onClose, onUseTemplate }) {
  const { templates, deleteTemplate } = useKanban();
  const [ConfirmDialog, confirm] = useConfirm();

  return (
    <>
    {ConfirmDialog}
    <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Templates de Tarefa</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
            Clique num template para criar uma nova tarefa a partir dele.
          </p>
          {templates.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '.85rem' }}>
              Nenhum template salvo ainda.<br />
              Salve uma tarefa como template no modal de edição.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {templates.map(tpl => (
              <div
                key={tpl.id}
                style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                  transition: 'border-color .15s', position: 'relative',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                onClick={() => { onUseTemplate(tpl); onClose(); }}
              >
                <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 4 }}>{tpl.name}</div>
                {tpl.project && <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>📁 {tpl.project}</div>}
                {tpl.checklist?.length > 0 && (
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    ☑ {tpl.checklist.length} item(s)
                  </div>
                )}
                <button
                  onClick={async e => { e.stopPropagation(); const ok = await confirm(`Excluir o template "${tpl.name}"?`, { title: 'Excluir template', confirmLabel: 'Excluir' }); if (ok) deleteTemplate(tpl.id); }}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    fontSize: '.9rem', cursor: 'pointer', opacity: 0.6,
                  }}
                  onMouseEnter={e => e.target.style.opacity = '1'}
                  onMouseLeave={e => e.target.style.opacity = '0.6'}
                  title="Excluir template"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
