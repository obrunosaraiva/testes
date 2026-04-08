import { useState, useMemo } from 'react';
import { useKanban } from '../../context/KanbanContext';

const PROJ_COLORS = ['pc0','pc1','pc2','pc3','pc4','pc5','pc6','pc7'];
const BAR_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#3b82f6','#a855f7','#ec4899','#14b8a6'];

function fmtISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

export default function GanttView({ onOpenTask }) {
  const { tasks, projects, activeProject, costCenterFilter } = useKanban();
  const [filterProj, setFilterProj] = useState('__all__');
  const [inputStart, setInputStart] = useState('');
  const [inputEnd, setInputEnd] = useState('');

  const filtered = useMemo(() => {
    let t = tasks.filter(t => t.startDate || t.deadline);
    if (filterProj !== '__all__') t = t.filter(t => t.project === filterProj);
    else if (activeProject !== '__all__') t = t.filter(t => t.project === activeProject);
    if (costCenterFilter.length > 0) {
      t = t.filter(task => {
        const proj = projects.find(p => p.name === task.project);
        return proj?.costCenter && costCenterFilter.includes(proj.costCenter);
      });
    }
    return t;
  }, [tasks, filterProj, activeProject, costCenterFilter, projects]);

  const { rangeStart, rangeEnd, autoStart, autoEnd } = useMemo(() => {
    if (!filtered.length) return { rangeStart: new Date(), rangeEnd: new Date(), autoStart: new Date(), autoEnd: new Date() };
    const allDates = [];
    filtered.forEach(t => {
      if (t.startDate) allDates.push(new Date(t.startDate + 'T00:00:00'));
      if (t.deadline) allDates.push(new Date(t.deadline + 'T00:00:00'));
      if (t.isEvent && t.eventStartDate) allDates.push(new Date(t.eventStartDate + 'T00:00:00'));
      if (t.isEvent && t.eventEndDate) allDates.push(new Date(t.eventEndDate + 'T00:00:00'));
    });
    const minD = new Date(Math.min(...allDates)); minD.setHours(0,0,0,0);
    const maxD = new Date(Math.max(...allDates)); maxD.setHours(0,0,0,0);
    const rs = inputStart ? new Date(inputStart + 'T00:00:00') : minD;
    const re = inputEnd ? new Date(inputEnd + 'T00:00:00') : maxD;
    return { rangeStart: rs, rangeEnd: re, autoStart: minD, autoEnd: maxD };
  }, [filtered, inputStart, inputEnd]);

  const days = useMemo(() => {
    const arr = [];
    const d = new Date(rangeStart);
    while (d <= rangeEnd) { arr.push(new Date(d)); d.setDate(d.getDate() + 1); }
    if (!arr.length) arr.push(new Date(rangeStart));
    return arr;
  }, [rangeStart, rangeEnd]);

  const todayISO = fmtISO(new Date());
  const totalWidth = 240 + days.length * 40;

  if (!filtered.length) {
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <GanttControls projects={projects} filterProj={filterProj} setFilterProj={setFilterProj}
          inputStart={inputStart} setInputStart={setInputStart}
          inputEnd={inputEnd} setInputEnd={setInputEnd}
          autoStart={autoStart} autoEnd={autoEnd} />
        <div className="gantt-empty">
          Nenhuma tarefa com datas definidas.<br />
          Adicione datas de início e deadline nas tarefas para visualizar o Gantt.
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
      <GanttControls projects={projects} filterProj={filterProj} setFilterProj={setFilterProj}
        inputStart={inputStart} setInputStart={setInputStart}
        inputEnd={inputEnd} setInputEnd={setInputEnd}
        autoStart={autoStart} autoEnd={autoEnd} />

      <div className="gantt-scroll-wrap">
        <div className="gantt-inner" style={{ width: totalWidth }}>
          {/* Header */}
          <div className="gantt-header">
            <div className="gantt-label-col">Tarefa</div>
            <div className="gantt-timeline-header">
              {days.map((day, i) => {
                const iso = fmtISO(day);
                const wd = day.getDay();
                const cls = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'][wd];
                return (
                  <div key={i} className={`gantt-day-header${wd===0||wd===6?' weekend':''}${iso===todayISO?' today':''}`}>
                    {day.getDate()}<br />
                    <span style={{ fontSize: '.6rem' }}>{cls}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rows */}
          {filtered.map(t => {
            const pi = projects.findIndex(p => (p.name || p) === t.project);
            const pc = PROJ_COLORS[pi % PROJ_COLORS.length];
            const barColor = BAR_COLORS[pi % BAR_COLORS.length];
            const start = t.startDate ? new Date(t.startDate + 'T00:00:00') : t.deadline ? new Date(t.deadline + 'T00:00:00') : null;
            const end = t.deadline ? new Date(t.deadline + 'T00:00:00') : t.startDate ? new Date(t.startDate + 'T00:00:00') : null;
            const todayIdx = daysBetween(rangeStart, new Date(todayISO + 'T00:00:00'));

            return (
              <div key={t.id} className="gantt-row">
                <div className="gantt-row-label">
                  <span className={`gr-proj ${pc}`}>{t.project}</span>
                  <span className="gr-title" title={t.title}>{t.title}</span>
                </div>
                <div className="gantt-row-timeline" style={{ width: days.length * 40, flexShrink: 0 }}>
                  {/* BG cells */}
                  {days.map((day, i) => {
                    const iso = fmtISO(day);
                    const wd = day.getDay();
                    let cls = 'gantt-cell';
                    if (wd === 0 || wd === 6) cls += ' weekend';
                    if (iso === todayISO) cls += ' today';
                    return <div key={i} className={cls} />;
                  })}

                  {/* Bar */}
                  {start && end && (() => {
                    if (t.isEvent && t.eventStartDate) {
                      const evStart = new Date(t.eventStartDate + 'T00:00:00');
                      const evEnd = t.eventEndDate ? new Date(t.eventEndDate + 'T00:00:00') : evStart;
                      const prepEnd = new Date(evStart.getTime() - 86400000);
                      const bars = [];

                      if (start < evStart) {
                        const prepSI = Math.max(0, daysBetween(rangeStart, start));
                        const prepEI = Math.min(days.length - 1, daysBetween(rangeStart, prepEnd));
                        if (prepEI >= prepSI) {
                          bars.push(
                            <div key="prep" className="gantt-bar gantt-bar-prep"
                              style={{ left: prepSI*40, width: Math.max(12,(prepEI-prepSI+1)*40), background: barColor }}
                              onClick={() => onOpenTask(t.id)} title={`${t.title} — preparação`} />
                          );
                        }
                      }

                      const evSI = Math.max(0, daysBetween(rangeStart, evStart));
                      const evEI = Math.min(days.length - 1, daysBetween(rangeStart, evEnd));
                      if (evEI >= evSI) {
                        const cls = start < evStart ? 'gantt-bar gantt-bar-event' : 'gantt-bar gantt-bar-event-only';
                        bars.push(
                          <div key="ev" className={cls}
                            style={{ left: evSI*40, width: Math.max(12,(evEI-evSI+1)*40) }}
                            onClick={() => onOpenTask(t.id)} title={`${t.title} — EVENTO`}>
                            {evEI - evSI >= 2 ? t.title : ''}
                          </div>
                        );
                      }
                      return bars;
                    } else {
                      const si = Math.max(0, daysBetween(rangeStart, start));
                      const ei = Math.min(days.length - 1, daysBetween(rangeStart, end));
                      const opacity = t.urgency === 'critical' ? 1 : t.urgency === 'high' ? 0.9 : 0.75;
                      return (
                        <div className="gantt-bar"
                          style={{ left: si*40, width: Math.max(40,(ei-si+1)*40), background: barColor, opacity }}
                          onClick={() => onOpenTask(t.id)} title={t.title}>
                          {ei - si >= 3 ? t.title : ''}
                        </div>
                      );
                    }
                  })()}

                  {/* Today line */}
                  {todayIdx >= 0 && todayIdx < days.length && (
                    <div className="gantt-today-line" style={{ left: todayIdx*40+20 }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GanttControls({ projects, filterProj, setFilterProj, inputStart, setInputStart, inputEnd, setInputEnd, autoStart, autoEnd }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <select value={filterProj} onChange={e => setFilterProj(e.target.value)} style={{ width: 'auto' }}>
        <option value="__all__">Todos os projetos</option>
        {projects.map(p => <option key={p.id || p} value={p.name || p}>{p.name || p}</option>)}
      </select>
      <input type="date" value={inputStart} onChange={e => setInputStart(e.target.value)}
        placeholder={fmtISO(autoStart)} style={{ width: 'auto' }} />
      <input type="date" value={inputEnd} onChange={e => setInputEnd(e.target.value)}
        placeholder={fmtISO(autoEnd)} style={{ width: 'auto' }} />
      {(inputStart || inputEnd) && (
        <button className="btn btn-ghost" style={{ padding: '6px 12px' }}
          onClick={() => { setInputStart(''); setInputEnd(''); }}>
          Limpar datas
        </button>
      )}
    </div>
  );
}
