import Column from './Column';
import { useMobile } from '../../hooks/useMobile';

const STATUSES = ['backlog', 'todo', 'doing', 'done'];

export default function BoardView({ onOpenTask, onNewTask, mobileStatus }) {
  const isMobile = useMobile();

  if (isMobile) {
    return (
      <div className="board-single">
        <Column
          key={mobileStatus}
          status={mobileStatus}
          onOpenTask={onOpenTask}
          onNewTask={onNewTask}
        />
      </div>
    );
  }

  return (
    <div className="board">
      {STATUSES.map(s => (
        <Column key={s} status={s} onOpenTask={onOpenTask} onNewTask={onNewTask} />
      ))}
    </div>
  );
}
