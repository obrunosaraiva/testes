import { useState } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useRole } from '../../context/RoleContext';
import TaskCard from './TaskCard';

const STATUS_CONFIG = {
  backlog: { label: 'Backlog',  color: 'var(--backlog)' },
  todo:    { label: 'To Do',    color: 'var(--todo)' },
  doing:   { label: 'Doing',   color: 'var(--doing)' },
  paused:  { label: 'Pausado', color: 'var(--paused)' },
  review:  { label: 'Review',  color: 'var(--review)' },
  done:    { label: 'Done',    color: 'var(--done)' },
};

export default function Column({ status, onOpenTask, onNewTask }) {
  const { tasks, projects, activeProject, combinedProjects, viewFilter, costCenterFilter, costCenters, updateTask } = useKanban();
  const { can, userId } = useRole();
  const [dragOver, setDragOver] = useState(false);

  const cfg = STATUS_CONFIG[status];

  const items = tasks.filter(t => {
    if (t.status !== status) return false;

    // Project filter
    if (combinedProjects.length > 0) {
      if (!combinedProjects.includes(t.project)) return false;
    } else if (activeProject !== '__all__' && t.project !== activeProject) {
      return false;
    }

    // View filter
    if (viewFilter === 'events' && !t.isEvent) return false;
    if (viewFilter === 'tasks' && t.isEvent) return false;

    // Hide tasks from private CCs not owned by current user
    const proj = projects.find(p => p.name === t.project);
    if (proj?.costCenter) {
      const cc = costCenters.find(c => c.key === proj.costCenter);
      if (cc?.isPrivate && cc.createdBy !== userId) return false;
    }

    // Cost center filter
    if (costCenterFilter.length > 0) {
      if (!proj?.costCenter || !costCenterFilter.includes(proj.costCenter)) return false;
    }

    return true;
  });

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const id = e.dataTransfer.getData('text/plain');
    const task = tasks.find(t => t.id === id);
    if (task && task.status !== status) updateTask({ ...task, status });
  }

  return (
    <div className="column">
      <div className="col-header">
        <div className="col-title">
          <div className="col-dot" style={{ background: cfg.color }} />
          {cfg.label}
        </div>
        <span className="col-count">{items.length}</span>
      </div>

      <div
        className={`col-body${dragOver ? ' drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {items.length === 0 && <div className="empty-state">Nenhuma tarefa</div>}
        {items.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            projIndex={projects.findIndex(p => p.name === task.project)}
            onOpen={onOpenTask}
          />
        ))}
      </div>

      {can.create && (
        <button className="add-card-btn" onClick={() => onNewTask(status)}>
          + Tarefa
        </button>
      )}
    </div>
  );
}
