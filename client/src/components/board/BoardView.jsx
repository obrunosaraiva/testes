import Column from './Column';

const STATUSES = ['backlog', 'todo', 'doing', 'review', 'done'];

export default function BoardView({ onOpenTask, onNewTask }) {
  return (
    <div className="board">
      {STATUSES.map(s => (
        <Column
          key={s}
          status={s}
          onOpenTask={onOpenTask}
          onNewTask={onNewTask}
        />
      ))}
    </div>
  );
}
