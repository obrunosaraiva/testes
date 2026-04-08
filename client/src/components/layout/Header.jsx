import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useRole } from '../../context/RoleContext';

export default function Header({ onOpenTemplates, onOpenReport, onOpenAdmin, onOpenTrash }) {
  const { view, setView, syncStatus, trashedTasks, trashedProjects } = useKanban();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { can } = useRole();

  const trashCount = trashedTasks.length + trashedProjects.length;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', height: 56,
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      <h1 style={{
        fontSize: '1.1rem', fontWeight: 700,
        background: 'linear-gradient(135deg,var(--accent),var(--info))',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        Kanban Pro
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: '.72rem', padding: '3px 10px', borderRadius: 20,
          background: 'var(--surface2)', border: '1px solid var(--border)',
          color: syncStatus.includes('Online') ? 'var(--success)' : 'var(--text-muted)',
        }}>
          {syncStatus}
        </span>

        <button onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', padding: '5px 10px', fontSize: '1rem', lineHeight: 1 }}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <button className="view-btn" onClick={onOpenTemplates}>Templates</button>
        {can.admin && <button className="view-btn" onClick={onOpenReport}>📋 Relatório</button>}
        <button className={`view-btn${view === 'board' ? ' active' : ''}`} onClick={() => setView('board')}>Board</button>
        <button className={`view-btn${view === 'gantt' ? ' active' : ''}`} onClick={() => setView('gantt')}>Gantt</button>

        {can.admin && (
          <button
            onClick={onOpenTrash}
            title="Lixeira"
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: trashCount > 0 ? 'var(--danger)' : 'var(--text-muted)', padding: '5px 10px', fontSize: '.85rem', position: 'relative' }}
          >
            🗑{trashCount > 0 && <span style={{ marginLeft: 4, fontSize: '.7rem', fontWeight: 700 }}>{trashCount}</span>}
          </button>
        )}

        {can.admin && (
          <button onClick={onOpenAdmin}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', padding: '5px 10px', fontSize: '.85rem' }}
            title="Painel Admin"
          >
            🛡
          </button>
        )}

        <button
          onClick={signOut}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', padding: '5px 12px', fontSize: '.78rem' }}
        >
          Sair
        </button>
      </div>
    </div>
  );
}
