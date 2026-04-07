import { useState, useEffect, useRef, useCallback } from 'react';
import { useKanban } from '../../context/KanbanContext';

// Auto-growing textarea — grows with content, no need to drag resize
function AutoTextarea({ value, onChange, placeholder, style }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = ref.current.scrollHeight + 'px';
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      style={{ resize: 'none', overflow: 'hidden', minHeight: 88, ...style }}
    />
  );
}

const CARD_COLORS = ['none','red','orange','yellow','green','blue','purple','pink'];
const COLOR_MAP = {
  none: 'transparent', red: '#ef4444', orange: '#f97316', yellow: '#eab308',
  green: '#22c55e', blue: '#3b82f6', purple: '#a855f7', pink: '#ec4899',
};

function newId() {
  return 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
}

const EMPTY_FORM = {
  title: '', description: '', project: '', status: 'backlog',
  assignee: '', urgency: '', startDate: '', deadline: '', deadlineTime: '',
  isEvent: false, eventStartDate: '', eventEndDate: '', cardColor: 'none',
  ticketGoal: '', ticketsSold: '',
};

export default function TaskModal({ taskId, defaultStatus, onClose }) {
  const { tasks, projects, addTask, updateTask, deleteTask, saveDraft, loadDraft, clearDraft, saveTaskToDb } = useKanban();

  const isNew = !taskId;
  const task = taskId ? tasks.find(t => t.id === taskId) : null;

  const [form, setForm] = useState(EMPTY_FORM);
  const [checklist, setChecklist] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [autosaveStatus, setAutosaveStatus] = useState('');
  const autosaveTimer = useRef(null);

  // Initialize form
  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        project: task.project || (projects[0] || ''),
        status: task.status || 'backlog',
        assignee: task.assignee || '',
        urgency: task.urgency || '',
        startDate: task.startDate || '',
        deadline: task.deadline || '',
        deadlineTime: task.deadlineTime || '',
        isEvent: task.isEvent || false,
        eventStartDate: task.eventStartDate || '',
        eventEndDate: task.eventEndDate || '',
        cardColor: task.cardColor || 'none',
        ticketGoal: task.ticketGoal ?? '',
        ticketsSold: task.ticketsSold ?? '',
      });
      setChecklist(JSON.parse(JSON.stringify(task.checklist || [])));
      setAttachments(JSON.parse(JSON.stringify(task.attachments || [])));
    } else {
      // New task — restore draft if exists
      const draft = loadDraft();
      if (draft) {
        setForm({
          title: draft.title || '',
          description: draft.description || '',
          project: draft.project || (projects[0] || ''),
          status: draft.status || defaultStatus || 'backlog',
          assignee: draft.assignee || '',
          urgency: draft.urgency || '',
          startDate: draft.startDate || '',
          deadline: draft.deadline || '',
          deadlineTime: draft.deadlineTime || '',
          isEvent: draft.isEvent || false,
          eventStartDate: draft.eventStartDate || '',
          eventEndDate: draft.eventEndDate || '',
          cardColor: draft.cardColor || 'none',
          ticketGoal: draft.ticketGoal ?? '',
          ticketsSold: draft.ticketsSold ?? '',
        });
        setChecklist(draft.checklist || []);
      } else {
        setForm(f => ({
          ...EMPTY_FORM,
          project: projects[0] || '',
          status: defaultStatus || 'backlog',
        }));
        setChecklist([]);
        setAttachments([]);
      }
    }
  }, [taskId]);

  // Draft auto-save for new tasks
  useEffect(() => {
    if (!isNew) return;
    saveDraft({ ...form, checklist });
  }, [form, checklist, isNew]);

  // Autosave for existing tasks
  const triggerAutosave = useCallback(() => {
    if (isNew) return;
    clearTimeout(autosaveTimer.current);
    setAutosaveStatus('Modificado...');
    autosaveTimer.current = setTimeout(() => {
      if (!task) return;
      const updated = { ...task, ...form, checklist, attachments };
      updateTask(updated);
      setAutosaveStatus('Salvo ✓');
      setTimeout(() => setAutosaveStatus(''), 2000);
    }, 1500);
  }, [form, checklist, attachments, isNew, task]);

  // Trigger autosave when form/checklist changes (edit mode only)
  useEffect(() => {
    if (!isNew && task) triggerAutosave();
  }, [form, checklist]);

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSave() {
    if (!form.title.trim()) return alert('Digite um título!');
    if (isNew) {
      const newTask = {
        id: newId(),
        createdAt: new Date().toISOString(),
        ...form,
        checklist,
        attachments,
      };
      addTask(newTask);
      clearDraft();
    } else if (task) {
      clearTimeout(autosaveTimer.current);
      updateTask({ ...task, ...form, checklist, attachments });
    }
    onClose();
  }

  async function handleDelete() {
    if (!task || !confirm('Excluir esta tarefa?')) return;
    await deleteTask(task.id);
    clearDraft();
    onClose();
  }

  // Checklist helpers
  function addCLItem() {
    setChecklist(cl => [...cl, { text: '', done: false, assignee: '', deadline: '', time: '' }]);
  }
  function updateCL(i, patch) {
    setChecklist(cl => cl.map((item, idx) => idx === i ? { ...item, ...patch } : item));
  }
  function removeCL(i) {
    setChecklist(cl => cl.filter((_, idx) => idx !== i));
  }

  // Attachments
  function handleAttach(e) {
    Array.from(e.target.files).forEach(f => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(a => [...a, { name: f.name, size: f.size, type: f.type, data: reader.result }]);
      };
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  }
  function removeAtt(i) {
    setAttachments(a => a.filter((_, idx) => idx !== i));
  }

  // Templates
  const { templates, addTemplate } = useKanban();
  function handleSaveAsTemplate() {
    const name = prompt('Nome do template:');
    if (!name?.trim()) return;
    addTemplate({ id: 't_' + Date.now(), name: name.trim(), ...form, checklist: JSON.parse(JSON.stringify(checklist)) });
    alert('Template salvo!');
  }

  const clDone = checklist.filter(x => x.done).length;

  return (
    <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{isNew ? 'Nova Tarefa' : 'Editar Tarefa'}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {autosaveStatus && (
              <span style={{ fontSize: '.75rem', color: autosaveStatus.includes('✓') ? 'var(--success)' : 'var(--text-muted)' }}>
                {autosaveStatus}
              </span>
            )}
            <button className="modal-close" onClick={onClose}>&times;</button>
          </div>
        </div>

        <div className="modal-body">
          {/* Title */}
          <input
            value={form.title}
            onChange={e => setField('title', e.target.value)}
            placeholder="Título da tarefa..."
            autoFocus
            style={{ fontSize: '1rem', fontWeight: 600 }}
          />

          {/* Description */}
          <AutoTextarea
            value={form.description}
            onChange={e => setField('description', e.target.value)}
            placeholder="Descrição..."
          />

          {/* Row: Project + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="field-label">Projeto</label>
              <select value={form.project} onChange={e => setField('project', e.target.value)}>
                {projects.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Status</label>
              <select value={form.status} onChange={e => setField('status', e.target.value)}>
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="doing">Doing</option>
                <option value="paused">Pausado</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          {/* Row: Assignee + Urgency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="field-label">Responsável</label>
              <input value={form.assignee} onChange={e => setField('assignee', e.target.value)} placeholder="Nome..." />
            </div>
            <div>
              <label className="field-label">Urgência</label>
              <select value={form.urgency} onChange={e => setField('urgency', e.target.value)}>
                <option value="">Sem urgência</option>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
          </div>

          {/* Row: Start + Deadline + Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px', gap: 12 }}>
            <div>
              <label className="field-label">Data de início</label>
              <input type="date" value={form.startDate} onChange={e => setField('startDate', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setField('deadline', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Hora entrega</label>
              <input type="time" value={form.deadlineTime} onChange={e => setField('deadlineTime', e.target.value)} />
            </div>
          </div>

          {/* Event toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="isEventCheck"
              checked={form.isEvent}
              onChange={e => setField('isEvent', e.target.checked)}
            />
            <label htmlFor="isEventCheck" style={{ fontSize: '.85rem', cursor: 'pointer' }}>
              É um evento? (mostra barra dupla no Gantt)
            </label>
          </div>
          {form.isEvent && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="field-label">Início do evento</label>
                  <input type="date" value={form.eventStartDate} onChange={e => setField('eventStartDate', e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Fim do evento</label>
                  <input type="date" value={form.eventEndDate} onChange={e => setField('eventEndDate', e.target.value)} />
                </div>
              </div>
              <EventSalesTracker form={form} setField={setField} />
            </>
          )}

          {/* Color picker */}
          <div>
            <label className="field-label">Cor do card</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CARD_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setField('cardColor', c)}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
                    background: COLOR_MAP[c] || 'var(--surface3)',
                    border: form.cardColor === c ? '2px solid var(--accent)' : '2px solid var(--border)',
                    outline: c === 'none' ? '1px dashed var(--border)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ fontSize: '.9rem', fontWeight: 600 }}>Checklist</h3>
              <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{clDone}/{checklist.length}</span>
            </div>
            {checklist.length > 0 && (
              <div style={{
                height: 4, background: 'var(--surface3)', borderRadius: 2, marginBottom: 12,
              }}>
                <div style={{
                  height: '100%', borderRadius: 2, background: 'var(--success)',
                  width: `${checklist.length ? (clDone / checklist.length) * 100 : 0}%`,
                  transition: 'width .3s',
                }} />
              </div>
            )}
            {checklist.map((item, i) => {
              const isOverdue = item.deadline && !item.done && new Date(item.deadline + 'T23:59:59') < new Date();
              return (
                <div key={i} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={item.done} onChange={() => updateCL(i, { done: !item.done })} />
                    <input
                      value={item.text}
                      onChange={e => updateCL(i, { text: e.target.value })}
                      placeholder="Nome do item..."
                      style={{ flex: 1, textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.5 : 1 }}
                    />
                    <button onClick={() => removeCL(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.1rem' }}>×</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 110px', gap: 6, marginTop: 6 }}>
                    <input value={item.assignee || ''} onChange={e => updateCL(i, { assignee: e.target.value })} placeholder="Responsável..." />
                    <input type="date" value={item.deadline || ''} onChange={e => updateCL(i, { deadline: e.target.value })} />
                    <input type="time" value={item.time || ''} onChange={e => updateCL(i, { time: e.target.value })} title="Hora da entrega" />
                  </div>
                  {isOverdue && <div style={{ fontSize: '.7rem', color: 'var(--danger)', marginTop: 4 }}>🔴 Atrasado!</div>}
                </div>
              );
            })}
            <button
              onClick={addCLItem}
              style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 8, color: 'var(--text-muted)', padding: '6px 14px', fontSize: '.82rem', width: '100%' }}
            >
              + Item
            </button>
          </div>

          {/* Attachments */}
          <div>
            <h3 style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: 8 }}>Anexos</h3>
            {attachments.map((att, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{att.type?.startsWith('image') ? '🖼' : '📄'}</span>
                <span style={{ flex: 1, fontSize: '.82rem' }}>{att.name}</span>
                <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{formatSize(att.size)}</span>
                <button onClick={() => removeAtt(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
              </div>
            ))}
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8,
              padding: '6px 14px', borderRadius: 8, border: '1px dashed var(--border)',
              color: 'var(--text-muted)', fontSize: '.82rem', cursor: 'pointer',
            }}>
              📎 Adicionar anexo
              <input type="file" multiple onChange={handleAttach} style={{ display: 'none' }} />
            </label>
          </div>

          <button
            onClick={handleSaveAsTemplate}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', padding: '6px 14px', fontSize: '.82rem', alignSelf: 'flex-start' }}
          >
            💾 Salvar como Template
          </button>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
            {!isNew && (
              <button className="btn btn-danger" onClick={handleDelete}>Excluir</button>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave}>Salvar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventSalesTracker({ form, setField }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const MS = 86400000;

  const eventDate = form.eventStartDate ? new Date(form.eventStartDate + 'T00:00:00') : null;
  if (!eventDate) return (
    <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, border: '1px dashed var(--border)' }}>
      Preencha a data de início do evento para ver o painel de vendas.
    </div>
  );

  const campaignStart = form.startDate ? new Date(form.startDate + 'T00:00:00') : null;
  const refStart = campaignStart || new Date(eventDate.getTime() - 30 * MS);
  const totalDays = Math.max(1, Math.ceil((eventDate - refStart) / MS));
  const daysRemaining = Math.max(0, Math.ceil((eventDate - today) / MS));
  const daysElapsed = Math.max(0, totalDays - daysRemaining);

  const goal = parseInt(form.ticketGoal) || 0;
  const sold = parseInt(form.ticketsSold) || 0;
  const remaining = Math.max(0, goal - sold);
  const salesPct = goal > 0 ? Math.min(100, (sold / goal) * 100) : 0;
  const timePct = Math.min(100, (daysElapsed / totalDays) * 100);
  const expectedByNow = goal > 0 && daysElapsed > 0 ? (goal / totalDays) * daysElapsed : 0;
  const dailyNeeded = daysRemaining > 0 && goal > 0 ? Math.ceil(remaining / daysRemaining) : 0;
  const dailyCurrent = daysElapsed > 0 && sold > 0 ? (sold / daysElapsed).toFixed(1) : '0';

  let barColor = '#22c55e';
  let statusText = '✅ Dentro da meta';
  if (goal > 0 && expectedByNow > 0) {
    const ratio = sold / expectedByNow;
    if (ratio < 0.6) { barColor = '#ef4444'; statusText = '🔴 Fora da meta'; }
    else if (ratio < 0.9) { barColor = '#f59e0b'; statusText = '🟡 Atenção: abaixo do ritmo'; }
  } else if (goal === 0) {
    barColor = 'var(--accent)'; statusText = '—';
  }

  const eventDateStr = eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div style={{ background: 'var(--surface2)', border: `1px solid ${barColor}40`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: '.92rem' }}>🎟 Painel de Vendas</span>
        <span style={{ fontSize: '.78rem', fontWeight: 600, color: barColor }}>{statusText}</span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, textAlign: 'center' }}>
        {[
          { value: daysRemaining, label: 'dias restantes', color: daysRemaining <= 7 ? '#ef4444' : 'var(--text)' },
          { value: goal || '—', label: 'meta', color: 'var(--text)' },
          { value: sold, label: 'vendidos', color: 'var(--text)' },
          { value: goal > 0 ? remaining : '—', label: 'faltam', color: barColor },
        ].map(({ value, label, color }) => (
          <div key={label} style={{ background: 'var(--surface3)', borderRadius: 8, padding: '8px 4px' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Sales progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: 5 }}>
          <span>🎫 Progresso de vendas</span>
          <span style={{ fontWeight: 600, color: barColor }}>{salesPct.toFixed(1)}%</span>
        </div>
        <div style={{ height: 14, background: 'var(--surface3)', borderRadius: 7, overflow: 'hidden', position: 'relative' }}>
          <div style={{ height: '100%', width: `${salesPct}%`, borderRadius: 7, background: barColor, transition: 'width .5s, background .5s' }} />
          {/* Pace marker */}
          {goal > 0 && timePct > 0 && (
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: `${timePct}%`,
              width: 2, background: 'rgba(255,255,255,0.6)',
              transform: 'translateX(-50%)',
            }} title="Ritmo esperado" />
          )}
        </div>
        {goal > 0 && (
          <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: 3 }}>
            A linha branca indica onde deveríamos estar hoje no ritmo linear.
          </div>
        )}
      </div>

      {/* Time bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: 5 }}>
          <span>⏱ Tempo da campanha ({daysElapsed}d passados)</span>
          <span>📅 Evento: {eventDateStr}</span>
        </div>
        <div style={{ height: 8, background: 'var(--surface3)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${timePct}%`, borderRadius: 4, background: 'var(--accent)', transition: 'width .5s' }} />
        </div>
      </div>

      {/* Pace */}
      {goal > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', background: 'var(--surface3)', borderRadius: 8, padding: '8px 12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>📈 Ritmo atual: <strong style={{ color: 'var(--text)' }}>{dailyCurrent}/dia</strong></span>
          <span style={{ color: 'var(--text-muted)' }}>🎯 Precisa vender: <strong style={{ color: barColor }}>{dailyNeeded}/dia</strong></span>
        </div>
      )}

      {/* Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label className="field-label">🎯 Meta de ingressos</label>
          <input type="number" min="0" value={form.ticketGoal} onChange={e => setField('ticketGoal', e.target.value)} placeholder="Ex: 500" />
        </div>
        <div>
          <label className="field-label">✅ Ingressos vendidos</label>
          <input type="number" min="0" value={form.ticketsSold} onChange={e => setField('ticketsSold', e.target.value)} placeholder="Ex: 150" />
        </div>
      </div>
    </div>
  );
}

function formatSize(b) {
  if (!b) return '';
  if (b < 1024) return b + 'B';
  if (b < 1048576) return (b / 1024).toFixed(1) + 'KB';
  return (b / 1048576).toFixed(1) + 'MB';
}
