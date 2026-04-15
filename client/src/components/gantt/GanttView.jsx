import { useState, useMemo } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useMobile } from '../../hooks/useMobile';

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
  const isMobile = useMobile();
  const [filterProj, setFilterProj] = useState('__all__');
  const [inputStart, setInputStart] = useState('');
  const [inputEnd, setInputEnd] = useState('');

  const DAY_W   = isMobile ? 20 : 40;
  const LABEL_W = isMobile ? 100 : 240;

  const filtered = useMemo(() => {
    let t = tasks.filter(t => (t.startDate || t.deadline) && t.status !== 'done');
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
  const totalWidth = LABEL_W + days.length * DAY_W;
  const pad = isMobile ? '8px 8px 80px' : '24px';

  const labelStyle = { width: LABEL_W, minWidth: LABEL_W };

  if (!filtered.length) {
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: pad }}>
        <GanttControls projects={projects} filterProj={filterProj} setFilterProj={setFilterProj}
          inputStart={inputStart} setInputStart={setInputStart}
          inputEnd={inputEnd} setInputEnd={setInputEnd}
          autoStart={autoStart} autoEnd={autoEnd} isMobile={isMobile} />
        <div className="gantt-empty">
          Nenhuma tarefa com datas definidas.<br />
          Adicione datas de início e deadline nas tarefas para visualizar o Gantt.
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: pad }}>
      <GanttControls projects={projects} filterProj={filterProj} setFilterProj={setFilterProj}
        inputStart={inputStart} setInputStart={setInputStart}
        inputEnd={inputEnd} setInputEnd={setInputEnd}
        autoStart={autoStart} autoEnd={autoEnd} isMobile={isMobile} />

      <div className="gantt-scroll-wrap">
        <div className="gantt-inner" style={{ width: totalWidth }}>
          {/* Header */}
          <div className="gantt-header">
            <div className="gantt-label-col" style={labelStyle}>Tarefa</div>
            <div className="gantt-timeline-header">
              {days.map((day, i) => {
                const iso = fmtISO(day);
                const wd  = day.getDay();
                const dayName = ['D','S','T','Q','Q','S','S'][wd];
                return (
                  <div key={i}
                    className={`gantt-day-header${wd===0||wd===6?' weekend':''}${iso===todayISO?' today':''}`}
                    style={{ width: DAY_W, minWidth: DAY_W }}
                  >
                    {day.getDate()}
                    {!isMobile && <><br /><span style={{ fontSize: '.6rem' }}>{['Dom','Seg','Ter','Qua','Qui','Sex','Sab'][wd]}</span></>}
                    {isMobile && wd === 1 && <><br /><span style={{ fontSize: '.5rem' }}>{dayName}</span></>}
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
            const end   = t.deadline  ? new Date(t.deadline  + 'T00:00:00') : t.startDate ? new Date(t.startDate + 'T00:00:00') : null;
            const todayIdx = daysBetween(rangeStart, new Date(todayISO + 'T00:00:00'));

            return (
              <div key={t.id} className="gantt-row">
                <div className="gantt-row-label" style={labelStyle}>
                  {!isMobile && <span className={`gr-proj ${pc}`}>{t.project}</span>}
                  <span className="gr-title" title={t.title} style={{ fontSize: isMobile ? '.7rem' : '.78rem' }}>{t.title}</span>
                </div>
                <div className="gantt-row-timeline" style={{ width: days.length * DAY_W, flexShrink: 0, height: isMobile ? 36 : 48 }}>
                  {/* BG cells */}
                  {days.map((day, i) => {
                    const iso = fmtISO(day);
                    const wd = day.getDay();
                    let cls = 'gantt-cell';
                    if (wd === 0 || wd === 6) cls += ' weekend';
                    if (iso === todayISO) cls += ' today';
                    return <div key={i} className={cls} style={{ width: DAY_W, minWidth: DAY_W }} />;
                  })}

                  {/* Bar */}
                  {start && end && (() => {
                    if (t.isEvent && t.eventStartDate) {
                      const evStart = new Date(t.eventStartDate + 'T00:00:00');
                      const evEnd   = t.eventEndDate ? new Date(t.eventEndDate + 'T00:00:00') : evStart;
                      const prepEnd = new Date(evStart.getTime() - 86400000);
                      const bars = [];

                      if (start < evStart) {
                        const prepSI = Math.max(0, daysBetween(rangeStart, start));
                        const prepEI = Math.min(days.length - 1, daysBetween(rangeStart, prepEnd));
                        if (prepEI >= prepSI) {
                          bars.push(
                            <div key="prep" className="gantt-bar gantt-bar-prep"
                              style={{ left: prepSI*DAY_W, width: Math.max(DAY_W,(prepEI-prepSI+1)*DAY_W), background: barColor, top: isMobile?4:10, height: isMobile?20:28 }}
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
                            style={{ left: evSI*DAY_W, width: Math.max(DAY_W,(evEI-evSI+1)*DAY_W), top: isMobile?2:6, height: isMobile?28:36 }}
                            onClick={() => onOpenTask(t.id)} title={`${t.title} — EVENTO`}>
                            {!isMobile && evEI - evSI >= 2 ? t.title : ''}
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
                          style={{ left: si*DAY_W, width: Math.max(DAY_W,(ei-si+1)*DAY_W), background: barColor, opacity, top: isMobile?6:10, height: isMobile?22:28 }}
                          onClick={() => onOpenTask(t.id)} title={t.title}>
                          {!isMobile && ei - si >= 3 ? t.title : ''}
                        </div>
                      );
                    }
                  })()}

                  {/* Today line */}
                  {todayIdx >= 0 && todayIdx < days.length && (
                    <div className="gantt-today-line" style={{ left: todayIdx*DAY_W + DAY_W/2 }} />
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

function GanttControls({ projects, filterProj, setFilterProj, inputStart, setInputStart, inputEnd, setInputEnd, autoStart, autoEnd, isMobile }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <select value={filterProj} onChange={e => setFilterProj(e.target.value)} style={{ width: 'auto', fontSize: isMobile ? '.8rem' : undefined }}>
        <option value="__all__">Todos os projetos</option>
        {projects.map(p => <option key={p.id || p} value={p.name || p}>{p.name || p}</option>)}
      </select>
      <input type="date" value={inputStart} onChange={e => setInputStart(e.target.value)}
        placeholder={fmtISO(autoStart)} style={{ width: 'auto', fontSize: isMobile ? '.8rem' : undefined }} />
      <input type="date" value={inputEnd} onChange={e => setInputEnd(e.target.value)}
        placeholder={fmtISO(autoEnd)} style={{ width: 'auto', fontSize: isMobile ? '.8rem' : undefined }} />
      {(inputStart || inputEnd) && (
        <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '.8rem' }}
          onClick={() => { setInputStart(''); setInputEnd(''); }}>
          ×
        </button>
      )}
    </div>
  );
}
