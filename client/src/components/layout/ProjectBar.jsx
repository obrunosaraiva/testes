import { useState } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useRole } from '../../context/RoleContext';
import { useConfirm } from '../../hooks/useConfirm';

const PRESET_COLORS = [
  '#eab308','#f59e0b','#ef4444','#ec4899','#a855f7',
  '#6366f1','#3b82f6','#22c55e','#14b8a6','#64748b',
];

export default function ProjectBar() {
  const {
    projects, tasks, activeProject, combinedProjects, viewFilter, costCenterFilter, costCenters,
    setActiveProject, toggleCombinedProject, clearCombinedProjects,
    addProject, updateProject, softDeleteProject, setViewFilter,
    toggleCostCenterFilter, clearCostCenterFilter,
    addCostCenter, deleteCostCenter,
  } = useKanban();
  const { can } = useRole();

  const [showNewModal, setShowNewModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [combineMode, setCombineMode] = useState(false);
  const [showNewCC, setShowNewCC] = useState(false);
  const [ConfirmDialog, confirm] = useConfirm();

  const allCount = tasks.length;
  const isCombining = combinedProjects.length > 0;

  async function handleDeleteProject(proj) {
    const ok = await confirm(`Mover "${proj.name}" para a lixeira?`, {
      title: 'Mover projeto para lixeira',
      confirmLabel: 'Mover',
    });
    if (!ok) return;
    softDeleteProject(proj.id);
  }

  function exitCombineMode() {
    clearCombinedProjects();
    setCombineMode(false);
  }

  return (
    <>
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {/* View filter tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 24px 0', borderBottom: '1px solid var(--border)' }}>
          {[['all','Todos'],['tasks','Tarefas'],['events','Eventos']].map(([f, label]) => (
            <button
              key={f}
              onClick={() => setViewFilter(f)}
              style={{
                padding: '4px 14px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
                fontSize: '.78rem', fontWeight: 600,
                background: viewFilter === f ? 'var(--accent)' : 'transparent',
                color: viewFilter === f ? '#fff' : 'var(--text-muted)',
                borderBottom: viewFilter === f ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all .15s',
              }}
            >
              {label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          {/* Combine mode toggle */}
          <button
            onClick={() => { setCombineMode(m => !m); if (combineMode) exitCombineMode(); }}
            style={{
              padding: '3px 12px', borderRadius: 20, fontSize: '.75rem', cursor: 'pointer',
              background: (combineMode || isCombining) ? 'var(--accent)' : 'var(--surface2)',
              border: `1px solid ${(combineMode || isCombining) ? 'var(--accent)' : 'var(--border)'}`,
              color: (combineMode || isCombining) ? '#fff' : 'var(--text-muted)',
              marginBottom: 4,
            }}
          >
            {isCombining ? `⊕ ${combinedProjects.length} combinados` : '⊕ Combinar'}
          </button>
          {isCombining && (
            <button onClick={exitCombineMode} style={{ padding: '3px 10px', borderRadius: 20, fontSize: '.73rem', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 4 }}>
              ✕ Limpar
            </button>
          )}
        </div>

        {/* Cost center filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 24px 8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginRight: 2 }}>CC:</span>
          {costCenters.map(cc => {
            const active = costCenterFilter.includes(cc.key);
            return (
              <button
                key={cc.key}
                onClick={() => toggleCostCenterFilter(cc.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '2px 10px', borderRadius: 20, cursor: 'pointer', fontSize: '.75rem',
                  background: active ? cc.color + '22' : 'var(--surface2)',
                  border: `1px solid ${active ? cc.color : 'var(--border)'}`,
                  color: active ? cc.color : 'var(--text-muted)',
                  fontWeight: active ? 700 : 400,
                  transition: 'all .15s',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: cc.color, flexShrink: 0 }} />
                {cc.label}
                {can.admin && (
                  <span
                    onClick={async e => { e.stopPropagation(); const ok = await confirm(`Remover "${cc.label}" dos centros de custo?`, { title: 'Remover CC', confirmLabel: 'Remover' }); if (ok) deleteCostCenter(cc.key); }}
                    style={{ marginLeft: 2, opacity: 0.4, fontSize: '.7rem', lineHeight: 1, cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
                    title="Remover CC"
                  >×</span>
                )}
              </button>
            );
          })}

          {/* Add CC button */}
          {can.admin && (
            <button
              onClick={() => setShowNewCC(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '2px 10px', borderRadius: 20, cursor: 'pointer', fontSize: '.75rem',
                background: 'transparent', border: '1px dashed var(--border)',
                color: 'var(--text-muted)', transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              + CC
            </button>
          )}

          {costCenterFilter.length > 0 && (
            <button
              onClick={clearCostCenterFilter}
              style={{ padding: '2px 10px', borderRadius: 20, fontSize: '.73rem', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              ✕ Limpar
            </button>
          )}
        </div>

        {/* Project tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 24px', overflowX: 'auto' }}>
          {!combineMode && !isCombining && (
            <ProjectTab
              label="Todos"
              count={allCount}
              active={activeProject === '__all__'}
              onClick={() => setActiveProject('__all__')}
              costCenters={costCenters}
            />
          )}

          {projects.map(proj => (
            <ProjectTab
              key={proj.id}
              label={proj.name}
              count={tasks.filter(t => t.project === proj.name).length}
              costCenter={proj.costCenter}
              costCenters={costCenters}
              active={combineMode || isCombining ? combinedProjects.includes(proj.name) : activeProject === proj.name}
              onClick={() => {
                if (combineMode || isCombining) {
                  toggleCombinedProject(proj.name);
                } else {
                  setActiveProject(proj.name);
                }
              }}
              onEdit={can.admin ? () => setEditingProject(proj) : null}
              onDelete={can.admin ? () => handleDeleteProject(proj) : null}
              combineMode={combineMode || isCombining}
              combined={combinedProjects.includes(proj.name)}
            />
          ))}

          {can.create && (
            <button
              onClick={() => setShowNewModal(true)}
              style={{
                padding: '5px 12px', borderRadius: 20, flexShrink: 0,
                background: 'transparent', border: '1px dashed var(--border)',
                color: 'var(--text-muted)', fontSize: '.8rem', whiteSpace: 'nowrap',
                cursor: 'pointer', transition: 'all .2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              + Projeto
            </button>
          )}
        </div>
      </div>

      {showNewModal && (
        <NewProjectModal
          costCenters={costCenters}
          onClose={() => setShowNewModal(false)}
          onCreate={(name, cc) => { addProject(name, cc); setShowNewModal(false); }}
        />
      )}

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          costCenters={costCenters}
          onClose={() => setEditingProject(null)}
          onSave={(patch) => { updateProject(editingProject.id, patch); setEditingProject(null); }}
        />
      )}

      {showNewCC && (
        <NewCostCenterModal
          onClose={() => setShowNewCC(false)}
          onCreate={(label, color) => { addCostCenter(label, color); setShowNewCC(false); }}
        />
      )}
      {ConfirmDialog}
    </>
  );
}

function ProjectTab({ label, count, costCenter, costCenters = [], active, onClick, onEdit, onDelete, combineMode, combined }) {
  const ccObj = costCenter && costCenters.find(c => c.key === costCenter);
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
        background: active ? 'var(--accent)' : 'var(--surface2)',
        border: `1px solid ${active ? 'var(--accent)' : combined ? 'var(--accent)' : 'var(--border)'}`,
        color: active ? '#fff' : 'var(--text-muted)',
        fontSize: '.82rem', whiteSpace: 'nowrap', transition: 'all .2s',
        position: 'relative', flexShrink: 0,
        outline: combined && !active ? '2px solid var(--accent)' : 'none',
        outlineOffset: 1,
      }}
    >
      {ccObj && (
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: ccObj.color,
          border: active ? '1px solid rgba(255,255,255,.4)' : '1px solid transparent',
        }} title={`Centro de custo: ${costCenter}`} />
      )}
      <span>{label}</span>
      <span style={{
        background: active ? 'rgba(255,255,255,.2)' : 'var(--surface3)',
        padding: '1px 7px', borderRadius: 10, fontSize: '.72rem',
      }}>
        {count}
      </span>
      {!combineMode && onEdit && (
        <span
          onClick={e => { e.stopPropagation(); onEdit(); }}
          title="Editar projeto"
          style={{ opacity: 0.5, fontSize: '.72rem', cursor: 'pointer', transition: 'opacity .15s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
        >
          ✎
        </span>
      )}
      {!combineMode && onDelete && (
        <span
          onClick={e => { e.stopPropagation(); onDelete(); }}
          title="Mover para lixeira"
          style={{ opacity: 0.5, fontSize: '.78rem', cursor: 'pointer', transition: 'opacity .15s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
        >
          ×
        </span>
      )}
    </div>
  );
}

function NewProjectModal({ costCenters, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [cc, setCc] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), cc || null);
  }

  return (
    <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>+ Novo Projeto</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div>
              <label className="field-label">Nome do projeto</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Lançamento Q3..." autoFocus />
            </div>
            <div>
              <label className="field-label">Centro de custo</label>
              <CostCenterPicker costCenters={costCenters} value={cc} onChange={setCc} />
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Criar Projeto</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditProjectModal({ project, costCenters, onClose, onSave }) {
  const [name, setName] = useState(project.name);
  const [cc, setCc] = useState(project.costCenter || '');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), costCenter: cc || null });
  }

  return (
    <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>✎ Editar Projeto</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div>
              <label className="field-label">Nome do projeto</label>
              <input value={name} onChange={e => setName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="field-label">Centro de custo</label>
              <CostCenterPicker costCenters={costCenters} value={cc} onChange={setCc} />
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function CostCenterPicker({ costCenters, value, onChange }) {
  const options = [{ key: '', label: 'Nenhum', color: '#6b7280' }, ...costCenters];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
      {options.map(({ key, label, color }) => (
        <label
          key={key}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
            background: value === key ? 'var(--surface3)' : 'var(--surface2)',
            border: `1px solid ${value === key ? color : 'var(--border)'}`,
            transition: 'all .15s',
          }}
        >
          <input type="radio" name="cc" value={key} checked={value === key} onChange={() => onChange(key)} style={{ display: 'none' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: '.85rem', fontWeight: value === key ? 600 : 400 }}>{label}</span>
        </label>
      ))}
    </div>
  );
}

function NewCostCenterModal({ onClose, onCreate }) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!label.trim()) return;
    onCreate(label.trim(), color);
  }

  return (
    <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>+ Novo Centro de Custo</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div>
              <label className="field-label">Nome</label>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: Marketing..." autoFocus />
            </div>
            <div>
              <label className="field-label">Cor</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                      outline: color === c ? `3px solid ${c}` : '3px solid transparent',
                      outlineOffset: 2, transition: 'outline .1s',
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  style={{ width: 28, height: 28, padding: 1, borderRadius: '50%', border: '1px solid var(--border)', cursor: 'pointer', background: 'none' }}
                  title="Cor personalizada"
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>{label || 'Prévia'}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Criar CC</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
