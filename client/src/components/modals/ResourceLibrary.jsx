import { useState } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useConfirm } from '../../hooks/useConfirm';

const TYPE_OPTIONS = [
  { value: 'link',  label: '🔗 Link',      color: '#3b82f6' },
  { value: 'sheet', label: '📊 Planilha',  color: '#22c55e' },
  { value: 'doc',   label: '📄 Documento', color: '#f59e0b' },
  { value: 'other', label: '📁 Outro',     color: '#6b7280' },
];

function typeInfo(type) {
  return TYPE_OPTIONS.find(t => t.value === type) || TYPE_OPTIONS[3];
}

export default function ResourceLibrary({ onClose }) {
  const { resources, addResource, updateResource, deleteResource, costCenters, costCenterFilter } = useKanban();
  const [ConfirmDialog, confirm] = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  // Filter by system CC filter, type, and search
  const filtered = resources.filter(r => {
    // If system has active CC filter, only show resources linked to those CCs
    if (costCenterFilter.length > 0) {
      const rCCs = r.costCenters || [];
      if (rCCs.length > 0 && !rCCs.some(cc => costCenterFilter.includes(cc))) return false;
    }
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
            {/* Active CC filter indicator */}
            {costCenterFilter.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'var(--accent)22', border: '1px solid var(--accent)44', fontSize: '.78rem', color: 'var(--accent)' }}>
                <span>🔍</span>
                <span>Filtrando por CC ativo: <strong>{costCenterFilter.map(k => costCenters.find(c => c.key === k)?.label || k).join(', ')}</strong></span>
              </div>
            )}

            {/* Search + filter */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ flex: 1 }} />
              <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 130 }}>
                <option value="">Todos os tipos</option>
                {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Resource list */}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '.85rem' }}>
                {resources.length === 0 ? 'Nenhum recurso cadastrado ainda.' : 'Nenhum resultado encontrado.'}
              </div>
            )}

            {filtered.map(r => {
              const t = typeInfo(r.type);
              const rCCs = (r.costCenters || []).map(k => costCenters.find(c => c.key === k)).filter(Boolean);

              if (editingId === r.id) {
                return (
                  <ResourceForm
                    key={r.id}
                    initial={r}
                    costCenters={costCenters}
                    onSave={patch => { updateResource(r.id, patch); setEditingId(null); }}
                    onCancel={() => setEditingId(null)}
                    title="Editar recurso"
                  />
                );
              }

              return (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '10px 14px', borderRadius: 10,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                }}>
                  <span style={{
                    fontSize: '1rem', width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: t.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{t.label.split(' ')[0]}</span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '.88rem', marginBottom: 2 }}>{r.title}</div>
                    {r.description && <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 3 }}>{r.description}</div>}
                    <a
                      href={r.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '.72rem', color: t.color, textDecoration: 'none', wordBreak: 'break-all' }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                    >{r.url}</a>
                    {/* CC tags */}
                    {rCCs.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                        {rCCs.map(cc => (
                          <span key={cc.key} style={{
                            fontSize: '.68rem', padding: '1px 8px', borderRadius: 10,
                            background: cc.color + '22', border: `1px solid ${cc.color}66`, color: cc.color, fontWeight: 600,
                          }}>{cc.label}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => navigator.clipboard.writeText(r.url).catch(() => {})} title="Copiar link"
                      style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: '.78rem', color: 'var(--text-muted)' }}>
                      📋
                    </button>
                    <button onClick={() => setEditingId(r.id)} title="Editar"
                      style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 9px', cursor: 'pointer', fontSize: '.8rem', color: 'var(--text-muted)' }}>
                      ✎
                    </button>
                    <button onClick={() => handleDelete(r)} title="Remover"
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '.85rem' }}>
                      ×
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add button / form */}
            {!showForm ? (
              <button onClick={() => setShowForm(true)}
                style={{ width: '100%', padding: '9px', borderRadius: 10, border: '1px dashed var(--border)', background: 'none', color: 'var(--text-muted)', fontSize: '.85rem', cursor: 'pointer' }}>
                + Adicionar recurso
              </button>
            ) : (
              <ResourceForm
                costCenters={costCenters}
                onSave={item => { addResource(item); setShowForm(false); }}
                onCancel={() => setShowForm(false)}
                title="Novo recurso"
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ResourceForm({ initial = {}, costCenters = [], onSave, onCancel, title }) {
  const [titleVal, setTitleVal] = useState(initial.title || '');
  const [url, setUrl] = useState(initial.url || '');
  const [type, setType] = useState(initial.type || 'link');
  const [description, setDescription] = useState(initial.description || '');
  const [selectedCCs, setSelectedCCs] = useState(initial.costCenters || []);

  function toggleCC(key) {
    setSelectedCCs(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!titleVal.trim() || !url.trim()) return;
    const finalUrl = url.startsWith('http') ? url : 'https://' + url;
    onSave({ title: titleVal.trim(), url: finalUrl, type, description: description.trim(), costCenters: selectedCCs });
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{title}</div>
      <div className="form-grid-2">
        <div>
          <label className="field-label">Título *</label>
          <input value={titleVal} onChange={e => setTitleVal(e.target.value)} placeholder="Ex: Planilha de vendas" autoFocus />
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

      {/* CC multi-select */}
      {costCenters.length > 0 && (
        <div>
          <label className="field-label">Centros de custo (opcional)</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {costCenters.map(cc => {
              const active = selectedCCs.includes(cc.key);
              return (
                <button key={cc.key} type="button" onClick={() => toggleCC(cc.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px',
                  borderRadius: 20, cursor: 'pointer', fontSize: '.78rem',
                  background: active ? cc.color + '22' : 'var(--surface3)',
                  border: `1px solid ${active ? cc.color : 'var(--border)'}`,
                  color: active ? cc.color : 'var(--text-muted)', fontWeight: active ? 700 : 400,
                  transition: 'all .15s',
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: cc.color }} />
                  {cc.label}
                  {active && <span style={{ fontSize: '.7rem' }}>✓</span>}
                </button>
              );
            })}
          </div>
          {selectedCCs.length === 0 && (
            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Sem CC = aparece em todos os filtros
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar</button>
      </div>
    </form>
  );
}
