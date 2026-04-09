import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useKanban } from '../../context/KanbanContext';
import { useRole } from '../../context/RoleContext';
import { sb } from '../../lib/supabase';
import { usePushNotifications } from '../../hooks/usePushNotifications';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nameInitials(name = '') {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
}
function nameColor(name = '') {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  const colors = ['#6366f1','#3b82f6','#06b6d4','#22c55e','#f59e0b','#f97316','#ec4899','#a855f7'];
  return colors[Math.abs(h) % colors.length];
}
function timeAgo(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
function renderContent(content) {
  if (!content) return null;
  return content.split(/(@\S+)/g).map((part, i) =>
    part.startsWith('@')
      ? <span key={i} style={{ color: 'var(--accent)', fontWeight: 600 }}>{part}</span>
      : part
  );
}
async function uploadFile(file) {
  const res = await fetch('/api/chat/upload', {
    method: 'POST',
    headers: { 'x-filename': encodeURIComponent(file.name), 'x-content-type': file.type, 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
  return res.json(); // { url, name, type }
}

// ─── Channel list builder ──────────────────────────────────────────────────────
function buildChannels(costCenters, projects, tasks) {
  return [
    { type: 'general', id: 'geral', name: 'Geral', icon: '💬', group: null },
    ...costCenters.filter(cc => !cc.key.startsWith('__mbr_')).map(cc => ({
      type: 'cc', id: cc.key, name: cc.label, icon: '📂', group: 'Centros de Custo',
    })),
    ...projects.map(p => ({
      type: 'project', id: p.id || p.name, name: p.name, icon: '📁', group: 'Projetos',
    })),
    ...tasks.filter(t => t.status !== 'done').slice(0, 60).map(t => ({
      type: 'task', id: t.id, name: t.title, icon: '📋', group: 'Tarefas',
    })),
  ];
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function ChannelSidebar({ channels, selected, onSelect, unread }) {
  const groups = useMemo(() => {
    const map = {};
    for (const ch of channels) {
      const g = ch.group || '__top__';
      if (!map[g]) map[g] = [];
      map[g].push(ch);
    }
    return map;
  }, [channels]);

  return (
    <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px 8px', fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
        💬 Chat
      </div>
      {Object.entries(groups).map(([group, chs]) => (
        <div key={group}>
          {group !== '__top__' && (
            <div style={{ padding: '8px 16px 4px', fontSize: '.67rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {group}
            </div>
          )}
          {chs.map(ch => {
            const isActive = selected?.type === ch.type && selected?.id === ch.id;
            const badge = unread[ch.type + ch.id] || 0;
            return (
              <button
                key={ch.type + ch.id}
                onClick={() => onSelect(ch)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 16px', background: isActive ? 'var(--accent)22' : 'none',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  color: isActive ? 'var(--accent)' : 'var(--text)',
                  fontSize: '.84rem', fontWeight: isActive || badge > 0 ? 600 : 400,
                  fontFamily: 'inherit', borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface2)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'none'; }}
              >
                <span style={{ fontSize: '.8rem', flexShrink: 0 }}>{ch.icon}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ch.name}</span>
                {badge > 0 && (
                  <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: '.65rem', fontWeight: 700, padding: '1px 6px', flexShrink: 0 }}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Message item ──────────────────────────────────────────────────────────────
function MessageItem({ msg, isGrouped, isOwn, onReply }) {
  const atts = useMemo(() => {
    try { return Array.isArray(msg.attachments) ? msg.attachments : JSON.parse(msg.attachments || '[]'); }
    catch { return []; }
  }, [msg.attachments]);
  const replyPreview = useMemo(() => {
    try { return msg.reply_preview ? (typeof msg.reply_preview === 'object' ? msg.reply_preview : JSON.parse(msg.reply_preview)) : null; }
    catch { return null; }
  }, [msg.reply_preview]);

  return (
    <div
      style={{ display: 'flex', gap: 10, padding: isGrouped ? '2px 0' : '10px 0 2px', alignItems: 'flex-start' }}
      className="chat-msg"
    >
      {/* Avatar */}
      <div style={{ width: 34, flexShrink: 0, marginTop: 2 }}>
        {!isGrouped ? (
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: nameColor(msg.user_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {nameInitials(msg.user_name)}
          </div>
        ) : null}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + time */}
        {!isGrouped && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: '.85rem', fontWeight: 700 }}>{msg.user_name}</span>
            <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{timeAgo(msg.created_at)}</span>
          </div>
        )}

        {/* Reply preview */}
        {replyPreview && (
          <div style={{ borderLeft: '2px solid var(--accent)', paddingLeft: 8, marginBottom: 4, fontSize: '.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <strong>{replyPreview.user_name}: </strong>{replyPreview.content}
          </div>
        )}

        {/* Content */}
        {msg.content && (
          <div style={{ fontSize: '.88rem', lineHeight: 1.55, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
            {renderContent(msg.content)}
          </div>
        )}

        {/* Attachments */}
        {atts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {atts.map((att, i) => (
              <AttachmentPreview key={i} att={att} />
            ))}
          </div>
        )}

        {/* Reply button */}
        <button
          className="reply-btn"
          onClick={() => onReply(msg)}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '.72rem', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, marginTop: 2, display: 'none' }}
        >
          ↩ Responder
        </button>
      </div>
    </div>
  );
}

function AttachmentPreview({ att }) {
  if (att.type?.startsWith('image/')) {
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer">
        <img src={att.url} alt={att.name} style={{ maxWidth: 320, maxHeight: 240, borderRadius: 8, cursor: 'pointer', display: 'block' }} />
      </a>
    );
  }
  if (att.type?.startsWith('audio/')) {
    return (
      <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px' }}>
        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>🎤 {att.name}</div>
        <audio controls src={att.url} style={{ height: 36, maxWidth: 280 }} />
      </div>
    );
  }
  if (att.type?.startsWith('video/')) {
    return (
      <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 8 }}>
        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>🎬 {att.name}</div>
        <video controls src={att.url} style={{ maxWidth: 400, maxHeight: 280, borderRadius: 6 }} />
      </div>
    );
  }
  return (
    <a href={att.url} target="_blank" rel="noopener noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: '.8rem', color: 'var(--text)', textDecoration: 'none' }}>
      📎 {att.name}
    </a>
  );
}

// ─── Message feed ──────────────────────────────────────────────────────────────
function MessageFeed({ messages, loading, feedRef, currentUserId, onReply }) {
  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 10 }}>
      <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span> Carregando...
    </div>
  );
  if (!messages.length) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 10 }}>
      <div style={{ fontSize: '2.5rem' }}>💬</div>
      <div style={{ fontWeight: 500 }}>Seja o primeiro a escrever aqui!</div>
    </div>
  );
  return (
    <div
      ref={feedRef}
      style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}
      // Show reply button on hover via CSS hack
      onMouseOver={e => {
        const btn = e.target.closest('.chat-msg')?.querySelector('.reply-btn');
        if (btn) btn.style.display = 'inline-block';
      }}
      onMouseOut={e => {
        const btn = e.target.closest('.chat-msg')?.querySelector('.reply-btn');
        if (btn) btn.style.display = 'none';
      }}
    >
      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const isGrouped = prev && prev.user_id === msg.user_id &&
          (new Date(msg.created_at) - new Date(prev.created_at)) < 120000;
        return (
          <MessageItem
            key={msg.id}
            msg={msg}
            isGrouped={isGrouped}
            isOwn={msg.user_id === currentUserId}
            onReply={onReply}
          />
        );
      })}
      <div style={{ height: 1 }} id="feed-bottom" />
    </div>
  );
}

// ─── Recording timer ───────────────────────────────────────────────────────────
function RecordingTimer({ active }) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!active) { setSecs(0); return; }
    const t = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return <span style={{ fontSize: '.78rem', color: '#ef4444', fontWeight: 700 }}>⏺ {mm}:{ss}</span>;
}

// ─── Message input ─────────────────────────────────────────────────────────────
function MessageInput({ onSend, channel, members, projects, costCenters, replyTo, onCancelReply }) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(null); // null | 'audio' | 'screen'
  const [sending, setSending] = useState(false);

  const textareaRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  const mentionables = useMemo(() => [
    ...members.map(m => ({ type: 'user', id: m.id, name: m.name, icon: '👤' })),
    ...projects.map(p => ({ type: 'project', id: p.id, name: p.name, icon: '📁' })),
    ...costCenters.filter(cc => !cc.key?.startsWith('__mbr_')).map(cc => ({ type: 'cc', id: cc.key, name: cc.label, icon: '📂' })),
  ], [members, projects, costCenters]);

  const filteredMentions = mentionQuery !== null
    ? mentionables.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 8)
    : [];

  function handleChange(e) {
    const val = e.target.value;
    setText(val);
    // Auto-grow
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    // Detect @mention
    const pos = e.target.selectionStart;
    const before = val.slice(0, pos);
    const m = before.match(/@(\w*)$/);
    setMentionQuery(m ? m[1] : null);
  }

  function insertMention(m) {
    const pos = textareaRef.current.selectionStart;
    const before = text.slice(0, pos);
    const after = text.slice(pos);
    const atIdx = before.lastIndexOf('@');
    const newText = before.slice(0, atIdx) + '@' + m.name + ' ' + after;
    setText(newText);
    setMentions(prev => [...prev.filter(x => x.id !== m.id), m]);
    setMentionQuery(null);
    textareaRef.current.focus();
  }

  async function handleFiles(files) {
    setUploading(true);
    try {
      const results = await Promise.all(Array.from(files).map(uploadFile));
      setAttachments(prev => [...prev, ...results]);
    } catch (e) {
      alert('Erro no upload: ' + e.message);
    }
    setUploading(false);
  }

  async function startAudioRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = e => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setUploading(true);
        try {
          const att = await uploadFile(new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' }));
          setAttachments(p => [...p, att]);
        } catch(e) { alert('Erro ao enviar áudio: ' + e.message); }
        setUploading(false);
        setRecording(null);
      };
      rec.start();
      recorderRef.current = rec;
      setRecording('audio');
    } catch(e) { alert('Microfone não disponível: ' + e.message); }
  }

  async function startScreenRec() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = e => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setUploading(true);
        try {
          const att = await uploadFile(new File([blob], `screen_${Date.now()}.webm`, { type: 'video/webm' }));
          setAttachments(p => [...p, att]);
        } catch(e) { alert('Erro ao enviar gravação: ' + e.message); }
        setUploading(false);
        setRecording(null);
      };
      stream.getVideoTracks()[0].addEventListener('ended', () => stopRec());
      rec.start();
      recorderRef.current = rec;
      setRecording('screen');
    } catch(e) { alert('Gravação de tela não disponível: ' + e.message); }
  }

  function stopRec() {
    recorderRef.current?.stop();
  }

  async function handleSend() {
    if ((!text.trim() && !attachments.length) || sending) return;
    setSending(true);
    await onSend({ content: text.trim(), attachments, mentions, replyTo });
    setText('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    setAttachments([]);
    setMentions([]);
    onCancelReply();
    setSending(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setMentionQuery(null); return; }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (mentionQuery !== null && filteredMentions.length) { insertMention(filteredMentions[0]); return; }
      handleSend();
    }
  }

  const canSend = (text.trim() || attachments.length > 0) && !uploading && !sending;

  return (
    <div style={{ padding: '0 20px 16px', flexShrink: 0, position: 'relative' }}>
      {/* Mention dropdown */}
      {mentionQuery !== null && filteredMentions.length > 0 && (
        <div style={{ position: 'absolute', bottom: 'calc(100% - 8px)', left: 20, right: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', zIndex: 100, boxShadow: '0 -6px 24px rgba(0,0,0,.3)' }}>
          {filteredMentions.map(m => (
            <div
              key={m.type + m.id}
              onMouseDown={e => { e.preventDefault(); insertMention(m); }}
              style={{ padding: '9px 14px', cursor: 'pointer', fontSize: '.84rem', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <span>{m.icon}</span>
              <span style={{ fontWeight: 600 }}>{m.name}</span>
              <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {m.type === 'user' ? 'usuário' : m.type === 'project' ? 'projeto' : 'CC'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Reply strip */}
      {replyTo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--surface2)', borderRadius: '10px 10px 0 0', borderTop: '2px solid var(--accent)' }}>
          <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', flex: 1 }}>
            ↩ Respondendo a <strong>{replyTo.user_name}</strong>: {replyTo.content?.slice(0, 80)}
          </span>
          <button onClick={onCancelReply} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 0 4px' }}>
          {attachments.map((att, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', fontSize: '.78rem' }}>
              {att.type?.startsWith('image/') ? '🖼️' : att.type?.startsWith('audio/') ? '🎵' : att.type?.startsWith('video/') ? '🎬' : '📎'}
              <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
              <button onClick={() => setAttachments(a => a.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Input box */}
      <div style={{
        border: '1px solid var(--border)',
        borderRadius: replyTo ? '0 0 12px 12px' : 12,
        background: 'var(--surface2)',
        overflow: 'hidden',
      }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Mensagem em #${channel?.name || 'canal'}... use @ para mencionar`}
          rows={1}
          style={{ display: 'block', width: '100%', resize: 'none', border: 'none', background: 'transparent', padding: '12px 14px', minHeight: 44, maxHeight: 120, lineHeight: 1.55, fontSize: '.88rem', fontFamily: 'inherit', boxSizing: 'border-box', height: 'auto' }}
        />

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 10px', borderTop: '1px solid var(--border)' }}>
          <ToolBtn title="Anexar arquivo">
            📎
            <input type="file" multiple onChange={e => handleFiles(e.target.files)} style={{ display: 'none' }} />
          </ToolBtn>
          <ToolBtn title="Anexar imagem">
            🖼️
            <input type="file" accept="image/*" capture="environment" multiple onChange={e => handleFiles(e.target.files)} style={{ display: 'none' }} />
          </ToolBtn>
          <ToolBtn title="Anexar vídeo">
            🎬
            <input type="file" accept="video/*" onChange={e => handleFiles(e.target.files)} style={{ display: 'none' }} />
          </ToolBtn>

          {/* Audio record */}
          <button
            title={recording === 'audio' ? 'Parar gravação de áudio' : 'Gravar áudio'}
            onClick={() => recording === 'audio' ? stopRec() : startAudioRec()}
            style={{ background: recording === 'audio' ? '#ef444422' : 'none', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '5px 8px', fontSize: '.9rem', color: recording === 'audio' ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            🎤 {recording === 'audio' && <RecordingTimer active={true} />}
          </button>

          {/* Screen record */}
          <button
            title={recording === 'screen' ? 'Parar gravação de tela' : 'Gravar tela'}
            onClick={() => recording === 'screen' ? stopRec() : startScreenRec()}
            style={{ background: recording === 'screen' ? '#ef444422' : 'none', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '5px 8px', fontSize: '.9rem', color: recording === 'screen' ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            🖥️ {recording === 'screen' && <RecordingTimer active={true} />}
          </button>

          {uploading && <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginLeft: 4 }}>Enviando...</span>}

          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{ marginLeft: 'auto', padding: '6px 18px', borderRadius: 8, background: canSend ? 'var(--accent)' : 'var(--surface3)', color: canSend ? '#fff' : 'var(--text-muted)', border: 'none', cursor: canSend ? 'pointer' : 'default', fontWeight: 600, fontSize: '.84rem', transition: 'background .15s' }}
          >
            {sending ? '...' : 'Enviar ↵'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ title, children }) {
  return (
    <label
      title={title}
      style={{ cursor: 'pointer', padding: '5px 8px', borderRadius: 6, color: 'var(--text-muted)', fontSize: '.9rem', display: 'flex', alignItems: 'center', userSelect: 'none' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
      onMouseLeave={e => e.currentTarget.style.background = ''}
    >
      {children}
    </label>
  );
}

// ─── Main ChatView ─────────────────────────────────────────────────────────────
export default function ChatView() {
  const { tasks, projects, costCenters, members } = useKanban();
  const { userId, userEmail, allProfiles, loadAllProfiles } = useRole();

  const channels = useMemo(() => buildChannels(costCenters, projects, tasks), [costCenters, projects, tasks]);
  const [selected, setSelected] = useState(channels[0] || null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [unread, setUnread] = useState({});
  const [dbStatus, setDbStatus] = useState('ok'); // 'ok' | 'migrating' | 'error'
  const { subscribe: subscribePush, unsubscribe: unsubscribePush, subscribed: pushSubscribed, permission: pushPerm, isSupported: pushSupported } = usePushNotifications(userId);

  const feedRef = useRef(null);
  const realtimeRef = useRef(null);
  const seenRef = useRef(new Set());
  const loadChannelRef = useRef(null);

  // Current user display name
  const myName = useMemo(() => {
    const p = allProfiles?.find(x => x.id === userId);
    return p?.name || userEmail?.split('@')[0] || 'Usuário';
  }, [allProfiles, userId, userEmail]);

  useEffect(() => { loadAllProfiles?.(); }, []);

  function scrollToBottom(smooth = false) {
    setTimeout(() => {
      feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    }, 60);
  }

  async function runMigration() {
    setDbStatus('migrating');
    try {
      const r = await fetch('/api/db/migrate', { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (d.ok) {
        setDbStatus('ok');
        return true;
      }
      setDbStatus('error');
    } catch (_) {
      setDbStatus('error');
    }
    return false;
  }

  function loadChannel(ch) {
    if (!ch) return;
    setLoading(true);
    setMessages([]);
    seenRef.current.clear();

    sb.from('kanban_messages')
      .select('*')
      .eq('channel_type', ch.type)
      .eq('channel_id', ch.id)
      .eq('deleted', false)
      .order('created_at', { ascending: true })
      .limit(150)
      .then(({ data, error }) => {
        if (error) {
          const isMissing = error.message?.includes('schema cache') || error.message?.includes('does not exist') || error.code === '42P01';
          if (isMissing && dbStatus !== 'error') {
            runMigration().then(ok => { if (ok) loadChannel(ch); });
          }
          setLoading(false);
          return;
        }
        const msgs = data || [];
        msgs.forEach(m => seenRef.current.add(m.id));
        setMessages(msgs);
        setLoading(false);
        scrollToBottom();
        setUnread(u => ({ ...u, [ch.type + ch.id]: 0 }));
      });

    realtimeRef.current?.unsubscribe();
    const sub = sb.channel(`chat-${ch.type}-${ch.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kanban_messages' }, ({ new: msg }) => {
        if (msg.channel_type !== ch.type || msg.channel_id !== ch.id) return;
        if (seenRef.current.has(msg.id)) return;
        seenRef.current.add(msg.id);
        setMessages(prev => [...prev, msg]);
        scrollToBottom(true);
      })
      .subscribe();
    realtimeRef.current = sub;
  }

  // Load messages + subscribe when channel changes
  useEffect(() => {
    if (!selected) return;
    loadChannel(selected);
    return () => { realtimeRef.current?.unsubscribe(); };
  }, [selected?.type, selected?.id]);

  async function handleSend({ content, attachments, mentions, replyTo: rt }) {
    const msg = {
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      channel_type: selected.type,
      channel_id: selected.id,
      user_id: userId || '',
      user_name: myName,
      content: content || '',
      attachments: JSON.stringify(attachments || []),
      mentions: JSON.stringify(mentions || []),
      reply_to: rt?.id || null,
      reply_preview: rt ? JSON.stringify({ user_name: rt.user_name, content: rt.content?.slice(0, 100) }) : null,
    };
    const { error } = await sb.from('kanban_messages').insert(msg);
    if (error) { alert('Erro ao enviar: ' + error.message); return; }

    // Send push notifications to @mentioned users (fire and forget)
    const userMentions = mentions?.filter(m => m.type === 'user') || [];
    if (userMentions.length) {
      fetch('/api/push/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          user_name: myName,
          channel_name: selected.name,
          channel_type: selected.type,
          channel_id: selected.id,
          mentions: userMentions,
        }),
      }).catch(() => {});
    }
  }

  function handleSelectChannel(ch) {
    setSelected(ch);
    setReplyTo(null);
    setUnread(u => ({ ...u, [ch.type + ch.id]: 0 }));
  }

  if (!channels.length) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      Carregando canais...
    </div>
  );

  // DB migration overlay
  if (dbStatus === 'migrating') return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite' }}>⚙️</div>
      <div style={{ fontWeight: 600 }}>Inicializando chat...</div>
      <div style={{ fontSize: '.8rem' }}>Aguarde um momento enquanto configuramos o banco de dados.</div>
    </div>
  );

  if (dbStatus === 'error') return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '2rem' }}>⚠️</div>
      <div style={{ fontWeight: 600, color: 'var(--danger)' }}>Chat não disponível</div>
      <div style={{ fontSize: '.84rem', textAlign: 'center', maxWidth: 360 }}>
        A tabela de mensagens não pôde ser criada automaticamente.<br/>
        Configure <code>DATABASE_URL</code> no Railway para habilitar o chat.
      </div>
      <button
        onClick={() => runMigration().then(ok => ok && loadChannel(selected))}
        style={{ padding: '8px 20px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
      >
        Tentar novamente
      </button>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>
      <ChannelSidebar channels={channels} selected={selected} onSelect={handleSelectChannel} unread={unread} />

      {selected ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Channel header */}
          <div style={{ padding: '0 20px', height: 52, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ fontSize: '1.1rem' }}>{selected.icon}</span>
            <span style={{ fontWeight: 700, fontSize: '.95rem' }}>{selected.name}</span>
            {selected.group && <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 10 }}>{selected.group}</span>}
            {pushSupported && (
              <button
                onClick={pushSubscribed ? unsubscribePush : subscribePush}
                title={pushSubscribed ? 'Desativar notificações' : pushPerm === 'denied' ? 'Notificações bloqueadas no navegador' : 'Ativar notificações de @menção'}
                disabled={pushPerm === 'denied'}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: pushPerm === 'denied' ? 'not-allowed' : 'pointer', fontSize: '1rem', opacity: pushPerm === 'denied' ? 0.4 : 1, padding: '4px 8px', borderRadius: 6, color: pushSubscribed ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {pushSubscribed ? '🔔' : '🔕'}
              </button>
            )}
          </div>

          <MessageFeed messages={messages} loading={loading} feedRef={feedRef} currentUserId={userId} onReply={setReplyTo} />

          <MessageInput
            onSend={handleSend}
            channel={selected}
            members={members}
            projects={projects}
            costCenters={costCenters}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
          />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Selecione um canal para começar
        </div>
      )}
    </div>
  );
}
