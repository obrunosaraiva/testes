import { useKanban } from '../../context/KanbanContext';

export default function ProjectBar() {
  const { projects, tasks, activeProject, setActiveProject, addProject, deleteProject } = useKanban();

  function handleAddProject() {
    const name = prompt('Nome do novo projeto:');
    if (name && name.trim() && !projects.includes(name.trim())) {
      addProject(name.trim());
    }
  }

  async function handleDeleteProject(name) {
    if (!confirm(`Excluir "${name}" e todas as suas tarefas?`)) return;
    await deleteProject(name);
  }

  const allCount = tasks.length;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 24px',
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      overflowX: 'auto', flexShrink: 0,
    }}>
      {/* All tab */}
      <ProjectTab
        label="Todos"
        count={allCount}
        active={activeProject === '__all__'}
        onClick={() => setActiveProject('__all__')}
      />

      {projects.map(name => (
        <ProjectTab
          key={name}
          label={name}
          count={tasks.filter(t => t.project === name).length}
          active={activeProject === name}
          onClick={() => setActiveProject(name)}
          onDelete={() => handleDeleteProject(name)}
        />
      ))}

      <button
        onClick={handleAddProject}
        style={{
          padding: '5px 12px', borderRadius: 20,
          background: 'transparent', border: '1px dashed var(--border)',
          color: 'var(--text-muted)', fontSize: '.8rem', whiteSpace: 'nowrap',
          transition: 'all .2s',
        }}
        onMouseEnter={e => e.target.style.borderColor = 'var(--accent)'}
        onMouseLeave={e => e.target.style.borderColor = 'var(--border)'}
      >
        + Projeto
      </button>
    </div>
  );
}

function ProjectTab({ label, count, active, onClick, onDelete }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 14px', borderRadius: 20, cursor: 'pointer',
        background: active ? 'var(--accent)' : 'var(--surface2)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        color: active ? '#fff' : 'var(--text-muted)',
        fontSize: '.82rem', whiteSpace: 'nowrap', transition: 'all .2s',
        position: 'relative',
      }}
      className="project-tab-item"
    >
      <span>{label}</span>
      <span style={{
        background: active ? 'rgba(255,255,255,.2)' : 'var(--surface3)',
        padding: '1px 7px', borderRadius: 10, fontSize: '.72rem',
      }}>
        {count}
      </span>
      {onDelete && (
        <span
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{
            marginLeft: 2, opacity: 0.6, fontSize: '.78rem', lineHeight: 1,
            cursor: 'pointer', transition: 'opacity .15s',
          }}
          onMouseEnter={e => e.target.style.opacity = '1'}
          onMouseLeave={e => e.target.style.opacity = '0.6'}
        >
          ×
        </span>
      )}
    </div>
  );
}
