import { useState } from 'react';
import { useKanban, COST_CENTERS } from '../../context/KanbanContext';
import { useRole } from '../../context/RoleContext';

const CC_KEYS = Object.keys(COST_CENTERS);

export default function ProjectBar() {
  const {
    projects, tasks, activeProject, combinedProjects, viewFilter, costCenterFilter,
    setActiveProject, toggleCombinedProject, clearCombinedProjects,
    addProject, updateProject, softDeleteProject, setViewFilter,
    toggleCostCenterFilter, clearCostCenterFilter,
  } = useKanban();
  const { can } = useRole();

  const [showNewModal, setShowNewModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null); // project object
  const [combineMode, setCombineMode] = useState(false);

  const allCount = tasks.length;
  const isCombining = combinedProjects.length > 0;

  function handleAddProject() { setShowNewModal(true); }

  function handleDeleteProject(proj) {
    if (!confirm(`Mover "${proj.name}" para a lixeira?`)) return;
    softDeleteProject(proj.id);
  }

  function handleToggleCombine(projName) {
    toggleCombinedProject(projName);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 24px 8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginRight: 2 }}>CC:</span>
          {CC_KEYS.map(cc => {
            const active = costCenterFilter.includes(cc);
            const { color, label } = COST_CENTERS[cc];
            return (
              <button
                key={cc}
                onClick={() => toggleCostCenterFilter(cc)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '2px 10px', borderRadius: 20, cursor: 'pointer', fontSize: '.75rem',
                  background: active ? color + '22' : 'var(--surface2)',
                  border: `1px solid ${active ? color : 'var(--border)'}`,
                  color: active ? color : 'var(--text-muted)',
                  fontWeight: active ? 700 : 400,
                  transition: 'all .15s',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                {label}
              </button>
            );
          })}
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
            />
          )}

          {projects.map(proj => (
            <ProjectTab
              key={proj.id}
              label={proj.name}
              count={tasks.filter(t => t.project === proj.name).length}
              costCenter={proj.costCenter}
              active={combineMode || isCombining ? combinedProjects.includes(proj.name) : activeProject === proj.name}
              onClick={() => {
                if (combineMode || isCombining) {
                  handleToggleCombine(proj.name);
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
              onClick={handleAddProject}
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
          onClose={() => setShowNewModal(false)}
          onCreate={(name, cc) => { addProject(name, cc); setShowNewModal(false); }}
        />
      )}

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={(patch) => { updateProject(editingProject.id, patch); setEditingProject(null); }}
        />
      )}
    </>
  );
}

function ProjectTab({ label, count, costCenter, active, onClick, onEdit, onDelete, combineMode, combined }) {
  const cc = costCenter && COST_CENTERS[costCenter];
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
      {/* Cost center dot */}
      {cc && (
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: cc.color,
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

function NewProjectModal({ onClose, onCreate }) {
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {[['', 'Nenhum', '#6b7280'], ...CC_KEYS.map(k => [k, COST_CENTERS[k].label, COST_CENTERS[k].color])].map(([val, label, color]) => (
                  <label
                    key={val}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                      background: cc === val ? 'var(--surface3)' : 'var(--surface2)',
                      border: `1px solid ${cc === val ? color : 'var(--border)'}`,
                      transition: 'all .15s',
                    }}
                  >
                    <input type="radio" name="cc" value={val} checked={cc === val} onChange={() => setCc(val)} style={{ display: 'none' }} />
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '.85rem', fontWeight: cc === val ? 600 : 400 }}>{label}</span>
                  </label>
                ))}
              </div>
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

function EditProjectModal({ project, onClose, onSave }) {
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                {[['', 'Nenhum', '#6b7280'], ...CC_KEYS.map(k => [k, COST_CENTERS[k].label, COST_CENTERS[k].color])].map(([val, label, color]) => (
                  <label
                    key={val}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                      background: cc === val ? 'var(--surface3)' : 'var(--surface2)',
                      border: `1px solid ${cc === val ? color : 'var(--border)'}`,
                      transition: 'all .15s',
                    }}
                  >
                    <input type="radio" name="cc" value={val} checked={cc === val} onChange={() => setCc(val)} style={{ display: 'none' }} />
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '.85rem', fontWeight: cc === val ? 600 : 400 }}>{label}</span>
                  </label>
                ))}
              </div>
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
