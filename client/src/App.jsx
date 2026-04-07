import { useState, useEffect } from 'react';
import './App.css';

import { useAuth } from './hooks/useAuth';
import { KanbanProvider, useKanban } from './context/KanbanContext';

import LoginScreen from './components/auth/LoginScreen';
import Header from './components/layout/Header';
import ProjectBar from './components/layout/ProjectBar';
import BoardView from './components/board/BoardView';
import GanttView from './components/gantt/GanttView';
import TaskModal from './components/modals/TaskModal';
import TemplatesModal from './components/modals/TemplatesModal';
import ReportModal from './components/modals/ReportModal';

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
    <KanbanProvider>
      <KanbanApp />
    </KanbanProvider>
  );
}

function KanbanApp() {
  const { view } = useKanban();
  const [taskModalId, setTaskModalId] = useState(null);
  const [newTaskStatus, setNewTaskStatus] = useState('backlog');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showReport, setShowReport] = useState(false);
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

  function openTaskById(id) {
    setTaskModalId(id);
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

  return (
    <div className="app-layout">
      <Header
        onOpenTemplates={() => setShowTemplates(true)}
        onOpenReport={() => setShowReport(true)}
      />
      <ProjectBar />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {view === 'board' && (
          <BoardView onOpenTask={openTaskById} onNewTask={openNewTask} />
        )}
        {view === 'gantt' && (
          <GanttView onOpenTask={openTaskById} />
        )}
      </div>

      {taskModalId !== null && (
        <TaskModal
          taskId={taskModalId === 'new' ? null : taskModalId}
          defaultStatus={newTaskStatus}
          templateData={templateToApply}
          onClose={closeTaskModal}
        />
      )}

      {showTemplates && (
        <TemplatesModal
          onClose={() => setShowTemplates(false)}
          onUseTemplate={handleUseTemplate}
        />
      )}

      {showReport && (
        <ReportModal onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
