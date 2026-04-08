import { useState, useEffect } from 'react';
import './App.css';

import { useAuth } from './hooks/useAuth';
import { KanbanProvider, useKanban } from './context/KanbanContext';
import { RoleProvider, useRole } from './context/RoleContext';

import LoginScreen from './components/auth/LoginScreen';
import Header from './components/layout/Header';
import ProjectBar from './components/layout/ProjectBar';
import BoardView from './components/board/BoardView';
import GanttView from './components/gantt/GanttView';
import TaskModal from './components/modals/TaskModal';
import TemplatesModal from './components/modals/TemplatesModal';
import ReportModal from './components/modals/ReportModal';
import AdminPanel from './components/admin/AdminPanel';
import TrashPanel from './components/admin/TrashPanel';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        Carregando...
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <RoleProvider>
      <KanbanProvider>
        <KanbanApp />
      </KanbanProvider>
    </RoleProvider>
  );
}

function KanbanApp() {
  const { view } = useKanban();
  const { role, can, loading: roleLoading } = useRole();
  const [taskModalId, setTaskModalId] = useState(null);
  const [newTaskStatus, setNewTaskStatus] = useState('backlog');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [templateToApply, setTemplateToApply] = useState(null);

  useEffect(() => {
    function onKey(e) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        openNewTask('backlog');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function openNewTask(status) {
    setNewTaskStatus(status);
    setTaskModalId('new');
    setTemplateToApply(null);
  }

  function handleUseTemplate(tpl) {
    setTemplateToApply(tpl);
    setNewTaskStatus(tpl.status || 'backlog');
    setTaskModalId('new');
  }

  function closeTaskModal() {
    setTaskModalId(null);
    setTemplateToApply(null);
  }

  if (roleLoading) return null;

  return (
    <div className="app-layout">
      <Header
        onOpenTemplates={() => setShowTemplates(true)}
        onOpenReport={() => setShowReport(true)}
        onOpenAdmin={() => setShowAdmin(true)}
        onOpenTrash={() => setShowTrash(true)}
      />
      <ProjectBar />

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {view === 'board' && <BoardView onOpenTask={id => setTaskModalId(id)} onNewTask={openNewTask} />}
        {view === 'gantt' && <GanttView onOpenTask={id => setTaskModalId(id)} />}
      </div>

      {taskModalId !== null && (
        <TaskModal
          taskId={taskModalId === 'new' ? null : taskModalId}
          defaultStatus={newTaskStatus}
          templateData={templateToApply}
          onClose={closeTaskModal}
        />
      )}
      {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} onUseTemplate={handleUseTemplate} />}
      {showReport && <ReportModal onClose={() => setShowReport(false)} />}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {showTrash && <TrashPanel onClose={() => setShowTrash(false)} />}

      {/* FAB — mobile only, board view only */}
      {view === 'board' && can.create && (
        <button
          className="mobile-only"
          onClick={() => openNewTask('backlog')}
          style={{
            position: 'fixed', bottom: 24, right: 24,
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--accent)', border: 'none',
            color: '#fff', fontSize: '1.8rem', lineHeight: 1,
            boxShadow: '0 4px 20px rgba(99,102,241,.5)',
            zIndex: 100, display: 'none', alignItems: 'center', justifyContent: 'center',
            transition: 'transform .15s, box-shadow .15s',
          }}
          onTouchStart={e => { e.currentTarget.style.transform = 'scale(.92)'; }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          title="Nova Tarefa"
        >
          +
        </button>
      )}
    </div>
  );
}
