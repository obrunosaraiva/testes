import { useRef, useState, useEffect } from 'react';
import Column from './Column';

const STATUSES = ['backlog', 'todo', 'doing', 'paused', 'review', 'done'];

export default function BoardView({ onOpenTask, onNewTask }) {
  const boardRef = useRef(null);
  const [activeCol, setActiveCol] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const board = boardRef.current;
    if (!board || !isMobile) return;
    function onScroll() {
      const colWidth = board.offsetWidth;
      if (!colWidth) return;
      const idx = Math.round(board.scrollLeft / colWidth);
      setActiveCol(Math.max(0, Math.min(idx, STATUSES.length - 1)));
    }
    board.addEventListener('scroll', onScroll, { passive: true });
    return () => board.removeEventListener('scroll', onScroll);
  }, [isMobile]);

  function scrollToCol(i) {
    const board = boardRef.current;
    if (!board) return;
    board.scrollTo({ left: board.offsetWidth * i, behavior: 'smooth' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="board" ref={boardRef}>
        {STATUSES.map(s => (
          <Column key={s} status={s} onOpenTask={onOpenTask} onNewTask={onNewTask} />
        ))}
      </div>

      {isMobile && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '10px 0 6px', flexShrink: 0 }}>
          {STATUSES.map((_, i) => (
            <div
              key={i}
              onClick={() => scrollToCol(i)}
              style={{
                width: i === activeCol ? 22 : 6,
                height: 6, borderRadius: 3,
                background: i === activeCol ? 'var(--accent)' : 'var(--border)',
                transition: 'all .2s ease', cursor: 'pointer',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
