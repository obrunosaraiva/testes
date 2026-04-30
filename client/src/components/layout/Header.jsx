import { useState } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useRole } from '../../context/RoleContext';

export default function Header({ onOpenTemplates, onOpenReport, onOpenAdmin, onOpenTrash, onOpenRepository, mentionCount = 0 }) {
  const { view, setView, syncStatus, trashedTasks, trashedProjects } = useKanban();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { can } = useRole();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const trashCount = trashedTasks.length + trashedProjects.length;
  const close = () => setDrawerOpen(false);

  return (
    <>
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

        {/* Desktop */}
        <div className="desktop-only" style={{ alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: '.72rem', padding: '3px 10px', borderRadius: 20,
            background: 'var(--surface2)', border: '1px solid var(--border)',
            color: syncStatus.includes('Online') ? 'var(--success)' : 'var(--text-muted)',
          }}>
            {syncStatus}
          </span>
          <button onClick={toggleTheme} className="icon-btn" title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="view-btn" onClick={onOpenRepository}>📁 Repositório</button>
          <button className="view-btn" onClick={onOpenTemplates}>Templates</button>
          {can.admin && <button className="view-btn" onClick={onOpenReport}>📋 Relatório</button>}
          <button className={`view-btn${view === 'board' ? ' active' : ''}`} onClick={() => setView('board')}>Board</button>
          <button className={`view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>Lista</button>
          <button className={`view-btn${view === 'gantt' ? ' active' : ''}`} onClick={() => setView('gantt')}>Gantt</button>
          <button className={`view-btn${view === 'mindmap' ? ' active' : ''}`} onClick={() => setView('mindmap')}>🗺 Mapa</button>
          <button className={`view-btn${view === 'chat' ? ' active' : ''}`} onClick={() => setView('chat')} style={{ position: 'relative' }}>
            💬 Chat
            {mentionCount > 0 && (
              <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, background: '#ef4444', color: '#fff', fontSize: '.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', lineHeight: 1 }}>
                {mentionCount > 99 ? '99+' : mentionCount}
              </span>
            )}
          </button>
          {can.admin && (
            <button onClick={onOpenTrash} className="icon-btn" title="Lixeira"
              style={{ color: trashCount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
              🗑{trashCount > 0 && <span style={{ fontSize: '.7rem', fontWeight: 700 }}>{trashCount}</span>}
            </button>
          )}
          {can.admin && (
            <button onClick={onOpenAdmin} className="icon-btn" title="Painel Admin">🛡</button>
          )}
          <button onClick={signOut} className="icon-btn">Sair</button>
        </div>

        {/* Mobile */}
        <div className="mobile-only" style={{ alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
            background: syncStatus.includes('Online') ? 'var(--success)' : 'var(--text-muted)',
          }} title={syncStatus} />
          <button
            onClick={() => setDrawerOpen(true)}
            className="icon-btn"
            style={{ fontSize: '1.2rem', padding: '5px 12px' }}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
          }}
          onClick={close}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', top: 0, right: 0, bottom: 0, width: 280,
              background: 'var(--surface)', borderLeft: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column',
              animation: 'slideInRight .2s ease',
            }}
          >
            {/* Drawer header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{
                fontSize: '1rem', fontWeight: 700,
                background: 'linear-gradient(135deg,var(--accent),var(--info))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Kanban Pro
              </h2>
              <button onClick={close} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
            </div>

            {/* View switcher */}
            <div style={{ padding: '14px 20px 4px' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '.05em' }}>VISUALIZAÇÃO</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className={`view-btn${view === 'board'   ? ' active' : ''}`} style={{ flex: '1 1 40%' }} onClick={() => { setView('board');   close(); }}>Board</button>
                <button className={`view-btn${view === 'list'    ? ' active' : ''}`} style={{ flex: '1 1 40%' }} onClick={() => { setView('list');    close(); }}>Lista</button>
                <button className={`view-btn${view === 'gantt'   ? ' active' : ''}`} style={{ flex: '1 1 40%' }} onClick={() => { setView('gantt');   close(); }}>Gantt</button>
                <button className={`view-btn${view === 'mindmap' ? ' active' : ''}`} style={{ flex: '1 1 40%' }} onClick={() => { setView('mindmap'); close(); }}>🗺 Mapa</button>
                <button className={`view-btn${view === 'chat'    ? ' active' : ''}`} style={{ flex: '1 1 40%' }} onClick={() => { setView('chat');    close(); }}>💬 Chat</button>
              </div>
            </div>

            {/* Drawer items */}
            <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
              <DrawerItem icon={theme === 'dark' ? '☀️' : '🌙'} label={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'} onClick={() => { toggleTheme(); close(); }} />
              <DrawerItem icon="💬" label={`Chat${mentionCount > 0 ? ` (${mentionCount})` : ''}`} onClick={() => { setView('chat'); close(); }} danger={mentionCount > 0} />
              <DrawerItem icon="📁" label="Repositório" onClick={() => { onOpenRepository(); close(); }} />
              <DrawerItem icon="📄" label="Templates" onClick={() => { onOpenTemplates(); close(); }} />
              {can.admin && <DrawerItem icon="📋" label="Relatório" onClick={() => { onOpenReport(); close(); }} />}
              {can.admin && (
                <DrawerItem
                  icon="🗑"
                  label={`Lixeira${trashCount > 0 ? ` (${trashCount})` : ''}`}
                  onClick={() => { onOpenTrash(); close(); }}
                  danger={trashCount > 0}
                />
              )}
              {can.admin && <DrawerItem icon="🛡" label="Painel Admin" onClick={() => { onOpenAdmin(); close(); }} />}
            </div>

            {/* Sign out */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => { signOut(); close(); }}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', fontWeight: 600, fontSize: '.9rem',
                  fontFamily: 'inherit',
                }}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DrawerItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
        padding: '13px 20px', background: 'none', border: 'none',
        color: danger ? 'var(--danger)' : 'var(--text)',
        fontSize: '.9rem', fontFamily: 'inherit', textAlign: 'left',
        cursor: 'pointer', transition: 'background .15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <span style={{ fontSize: '1rem', width: 22, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  );
}
