import { useState } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useConfirm } from '../../hooks/useConfirm';

const TYPE_OPTIONS = [
  { value: 'link',    label: '🔗 Link',      color: '#3b82f6' },
  { value: 'sheet',   label: '📊 Planilha',  color: '#22c55e' },
  { value: 'doc',     label: '📄 Documento', color: '#f59e0b' },
  { value: 'other',   label: '📁 Outro',     color: '#6b7280' },
];

function typeInfo(type) {
  return TYPE_OPTIONS.find(t => t.value === type) || TYPE_OPTIONS[3];
}

export default function ResourceLibrary({ onClose }) {
  const { resources, addResource, deleteResource } = useKanban();
  const [ConfirmDialog, confirm] = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  const filtered = resources.filter(r => {
    if (filterType && r.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.title?.toLowerCase().includes(q) || r.url?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
    }
    return true;
  });

  async function handleDelete(r) {
    const ok = await confirm(`Remover "${r.title}" do repositório?`, { title: 'Remover recurso', confirmLabel: 'Remover' });
    if (ok) deleteResource(r.id);
  }

  function copyUrl(url) {
    navigator.clipboard.writeText(url).catch(() => {});
  }

  return (
    <>
      {ConfirmDialog}
      <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="modal" style={{ maxWidth: 660 }} onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <h2>📁 Repositório</h2>
            <button className="modal-close" onClick={onClose}>&times;</button>
          </div>

          <div className="modal-body">
            {/* Search + filter */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                style={{ flex: 1 }}
              />
              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 130 }}>
                <option value="">Todos os tipos</option>
                {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Resource list */}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '.85rem' }}>
                {resources.length === 0 ? 'Nenhum recurso cadastrado ainda.' : 'Nenhum resultado para a busca.'}
              </div>
            )}
            {filtered.map(r => {
              const t = typeInfo(r.type);
              return (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 10,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                }}>
                  <span style={{
                    fontSize: '1rem', width: 32, height: 32, borderRadius: 8,
                    background: t.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>{t.label.split(' ')[0]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 2 }}>{r.title}</div>
                    {r.description && <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>{r.description}</div>}
                    <a
                      href={r.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '.72rem', color: t.color, textDecoration: 'none', wordBreak: 'break-all' }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                    >
                      {r.url}
                    </a>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => copyUrl(r.url)}
                      title="Copiar link"
                      style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: '.78rem', color: 'var(--text-muted)' }}
                    >📋 Copiar</button>
                    <button
                      onClick={() => handleDelete(r)}
                      title="Remover"
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '.85rem' }}
                    >×</button>
                  </div>
                </div>
              );
            })}

            {/* Add button / form */}
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                style={{ width: '100%', padding: '9px', borderRadius: 10, border: '1px dashed var(--border)', background: 'none', color: 'var(--text-muted)', fontSize: '.85rem', cursor: 'pointer' }}
              >
                + Adicionar recurso
              </button>
            ) : (
              <AddResourceForm
                onAdd={item => { addResource(item); setShowForm(false); }}
                onCancel={() => setShowForm(false)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function AddResourceForm({ onAdd, onCancel }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('link');
  const [description, setDescription] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    const finalUrl = url.startsWith('http') ? url : 'https://' + url;
    onAdd({ title: title.trim(), url: finalUrl, type, description: description.trim() });
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 600, fontSize: '.88rem' }}>Novo recurso</div>
      <div className="form-grid-2">
        <div>
          <label className="field-label">Título *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Planilha de vendas" autoFocus />
        </div>
        <div>
          <label className="field-label">Tipo</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="field-label">URL *</label>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div>
        <label className="field-label">Descrição (opcional)</label>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrição do recurso..." />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar</button>
      </div>
    </form>
  );
}
