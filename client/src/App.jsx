import { useState, useEffect } from 'react';
import './App.css';

import { useAuth } from './hooks/useAuth';
import { useMobile } from './hooks/useMobile';
import { KanbanProvider, useKanban } from './context/KanbanContext';
import { RoleProvider, useRole } from './context/RoleContext';

import LoginScreen from './components/auth/LoginScreen';
import Header from './components/layout/Header';
import ProjectBar from './components/layout/ProjectBar';
import BoardView from './components/board/BoardView';
import MobileBottomNav from './components/board/MobileBottomNav';
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
  const isMobile = useMobile();
  const [mobileStatus, setMobileStatus] = useState('backlog');
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

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', paddingBottom: isMobile && view === 'board' ? 64 : 0 }}>
        {view === 'board' && <BoardView onOpenTask={id => setTaskModalId(id)} onNewTask={openNewTask} mobileStatus={mobileStatus} />}
        {view === 'gantt' && <GanttView onOpenTask={id => setTaskModalId(id)} />}
      </div>

      {isMobile && view === 'board' && (
        <MobileBottomNav activeStatus={mobileStatus} onSelect={setMobileStatus} />
      )}

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

    </div>
  );
}
