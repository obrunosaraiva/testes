import { useState, useEffect } from 'react';
import './App.css';

import { useAuth } from './hooks/useAuth';
import { useMobile } from './hooks/useMobile';
import { KanbanProvider, useKanban } from './context/KanbanContext';
import { RoleProvider, useRole } from './context/RoleContext';
import { sb } from './lib/supabase';

import LoginScreen from './components/auth/LoginScreen';
import SignupScreen from './components/auth/SignupScreen';
import Header from './components/layout/Header';
import ProjectBar from './components/layout/ProjectBar';
import BoardView from './components/board/BoardView';
import MobileBottomNav from './components/board/MobileBottomNav';
import GanttView from './components/gantt/GanttView';
import ListView from './components/list/ListView';
import TaskModal from './components/modals/TaskModal';
import ResourceLibrary from './components/modals/ResourceLibrary';
import TemplatesModal from './components/modals/TemplatesModal';
import ReportModal from './components/modals/ReportModal';
import AdminPanel from './components/admin/AdminPanel';
import TrashPanel from './components/admin/TrashPanel';
import ChatView from './components/chat/ChatView';
import MindMapView from './components/mindmap/MindMapView';

export default function App() {
  const { user, loading } = useAuth();
  const [authScreen, setAuthScreen] = useState('login'); // 'login' | 'signup'

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        Carregando...
      </div>
    );
  }

  if (!user) {
    if (authScreen === 'signup') return <SignupScreen onGoToLogin={() => setAuthScreen('login')} />;
    return <LoginScreen onGoToSignup={() => setAuthScreen('signup')} />;
  }

  return (
    <RoleProvider>
      <KanbanProvider>
        <KanbanApp />
      </KanbanProvider>
    </RoleProvider>
  );
}

function KanbanApp() {
  const { view, setView } = useKanban();
  const { role, can, loading: roleLoading, userId } = useRole();
  const isMobile = useMobile();
  const [mobileStatus, setMobileStatus] = useState('backlog');
  const [taskModalId, setTaskModalId] = useState(null);
  const [newTaskStatus, setNewTaskStatus] = useState('backlog');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showRepository, setShowRepository] = useState(false);
  const [templateToApply, setTemplateToApply] = useState(null);
  const [mentionCount, setMentionCount] = useState(0);

  // Global realtime subscription — track @mentions for the current user across all channels
  useEffect(() => {
    if (!userId) return;
    const sub = sb.channel('global-mentions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kanban_messages' }, ({ new: msg }) => {
        if (msg.user_id === userId) return; // own messages don't count
        try {
          const mentions = JSON.parse(msg.mentions || '[]');
          const mentioned = mentions.some(m => m.id === userId);
          if (mentioned) setMentionCount(c => c + 1);
        } catch {}
      })
      .subscribe();
    return () => sub.unsubscribe();
  }, [userId]);

  // Clear badge when user opens chat
  useEffect(() => {
    if (view === 'chat') setMentionCount(0);
  }, [view]);

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
        onOpenRepository={() => setShowRepository(true)}
        mentionCount={mentionCount}
      />
      <ProjectBar />

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', paddingBottom: isMobile && view === 'board' ? 64 : 0 }}>
        {view === 'board'    && <BoardView onOpenTask={id => setTaskModalId(id)} onNewTask={openNewTask} mobileStatus={mobileStatus} />}
        {view === 'gantt'    && <GanttView onOpenTask={id => setTaskModalId(id)} />}
        {view === 'list'     && <ListView onOpenTask={id => setTaskModalId(id)} onNewTask={openNewTask} />}
        {view === 'mindmap'  && <MindMapView onOpenTask={id => setTaskModalId(id)} />}
        {view === 'chat'     && <ChatView />}
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
      {showRepository && <ResourceLibrary onClose={() => setShowRepository(false)} />}

    </div>
  );
}
