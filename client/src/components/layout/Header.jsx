import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../hooks/useAuth';

export default function Header({ onOpenTemplates, onOpenReport }) {
  const { view, setView, syncStatus } = useKanban();
  const { signOut } = useAuth();

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

        <button className="view-btn" onClick={onOpenTemplates}>Templates</button>
        <button className="view-btn" onClick={onOpenReport}>📋 Relatório</button>
        <button className={`view-btn${view === 'board' ? ' active' : ''}`} onClick={() => setView('board')}>Board</button>
        <button className={`view-btn${view === 'gantt' ? ' active' : ''}`} onClick={() => setView('gantt')}>Gantt</button>

        <button
          onClick={signOut}
          style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text-muted)',
            padding: '5px 12px', fontSize: '.78rem',
          }}
          title="Sair"
        >
          Sair
        </button>
      </div>
    </div>
  );
}
