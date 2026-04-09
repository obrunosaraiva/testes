import { useState, useEffect } from 'react';
import { useRole, ROLE_LABELS } from '../../context/RoleContext';
import { useKanban } from '../../context/KanbanContext';
import { sb } from '../../lib/supabase';

const ROLE_COLORS = { admin: 'var(--accent)', editor: 'var(--warning)', viewer: 'var(--text-muted)' };

export default function AdminPanel({ onClose }) {
  const { userId, userEmail, role, allProfiles, loadAllProfiles, updateUserRole } = useRole();
  const { members, addMember, updateMember, deleteMember } = useKanban();

  const [tab, setTab] = useState('members');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgError, setMsgError] = useState('');

  // Member form
  const [mName, setMName] = useState('');
  const [mEmail, setMEmail] = useState('');
  const [mWhatsapp, setMWhatsapp] = useState('');
  const [editingMId, setEditingMId] = useState(null);
  const [editMName, setEditMName] = useState('');
  const [editMEmail, setEditMEmail] = useState('');
  const [editMWhatsapp, setEditMWhatsapp] = useState('');

  // Invite form
  const [invEmail, setInvEmail] = useState('');
  const [invName, setInvName] = useState('');
  const [invWhatsapp, setInvWhatsapp] = useState('');
  const [invRole, setInvRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);

  // User inline edit
  const [editingUId, setEditingUId] = useState(null);
  const [editUName, setEditUName] = useState('');
  const [editUWhatsapp, setEditUWhatsapp] = useState('');

  useEffect(() => {
    if (tab === 'users') {
      setLoadingUsers(true);
      loadAllProfiles().finally(() => setLoadingUsers(false));
    }
  }, [tab]);

  function flash(text, isError = false) {
    if (isError) { setMsgError(text); setTimeout(() => setMsgError(''), 4000); }
    else { setMsg(text); setTimeout(() => setMsg(''), 2500); }
  }

  async function getToken() {
    const { data: { session } } = await sb.auth.getSession();
    return session?.access_token;
  }

  // ── Members ──────────────────────────────────────────────────────────────
  function handleAddMember(e) {
    e.preventDefault();
    if (!mName.trim()) return;
    addMember(mName, mEmail, false);
    setMName(''); setMEmail(''); setMWhatsapp('');
    flash('Membro adicionado!');
  }

  function startEditMember(m) {
    setEditingMId(m.id);
    setEditMName(m.name);
    setEditMEmail(m.email || '');
    setEditMWhatsapp(m.whatsapp || '');
  }

  function handleSaveMember(id) {
    if (!editMName.trim()) return;
    updateMember(id, { name: editMName.trim(), email: editMEmail.trim(), whatsapp: editMWhatsapp.trim() });
    setEditingMId(null);
    flash('Membro atualizado!');
  }

  function handleDeleteMember(id, name) {
    if (!window.confirm(`Remover "${name}" da lista de responsáveis?`)) return;
    deleteMember(id);
    flash('Membro removido.');
  }

  // ── Users ─────────────────────────────────────────────────────────────────
  async function handleInvite(e) {
    e.preventDefault();
    if (!invEmail.trim()) return;
    setInviting(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: invEmail.trim(), role: invRole, name: invName.trim(), whatsapp: invWhatsapp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { flash(data.error || 'Erro ao convidar.', true); }
      else {
        flash(`Convite enviado para ${invEmail}!`);
        setInvEmail(''); setInvName(''); setInvWhatsapp('');
        loadAllProfiles();
      }
    } catch (err) { flash(err.message, true); }
    setInviting(false);
  }

  async function handleSaveUser(targetId) {
    try {
      const token = await getToken();
      await fetch(`/api/admin/users/${targetId}/role`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editUName.trim(), whatsapp: editUWhatsapp.trim() }),
      });
      await loadAllProfiles();
      setEditingUId(null);
      flash('Usuário atualizado!');
    } catch (err) { flash(err.message, true); }
  }

  async function handleChangeRole(targetId, r) {
    await updateUserRole(targetId, r);
    flash('Role atualizado!');
  }

  async function handleDeleteUser(targetId, targetEmail) {
    if (!window.confirm(`Remover "${targetEmail}" do sistema?\n\nEsta ação é irreversível.`)) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/users/${targetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { flash(data.error || 'Erro ao remover.', true); }
      else { flash('Usuário removido.'); loadAllProfiles(); }
    } catch (err) { flash(err.message, true); }
  }

  return (
    <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>🛡 Painel Admin</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '0 20px', borderBottom: '1px solid var(--border)' }}>
          {[{ key: 'members', label: 'Responsáveis' }, { key: 'users', label: 'Usuários do sistema' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 14px', fontSize: '.85rem',
              fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        <div className="modal-body">

          {/* ── Members tab ───────────────────────────────────────────── */}
          {tab === 'members' && (
            <>
              <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: 0 }}>
                Cadastre os responsáveis que aparecem no campo de atribuição das tarefas.
              </p>

              <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input type="text" placeholder="Nome *" value={mName} onChange={e => setMName(e.target.value)}
                    style={{ flex: '2 1 140px' }} required />
                  <input type="email" placeholder="Email (opcional)" value={mEmail} onChange={e => setMEmail(e.target.value)}
                    style={{ flex: '2 1 160px' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" placeholder="WhatsApp (opcional)" value={mWhatsapp} onChange={e => setMWhatsapp(e.target.value)}
                    style={{ flex: 1 }} />
                  <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>+ Adicionar</button>
                </div>
              </form>

              {members.length === 0 ? (
                <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', padding: '12px 0' }}>
                  Nenhum responsável cadastrado.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {members.map(m => (
                    <div key={m.id} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px' }}>
                      {editingMId === m.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <input type="text" value={editMName} onChange={e => setEditMName(e.target.value)}
                              placeholder="Nome *" style={{ flex: '2 1 140px', fontSize: '.85rem' }} autoFocus />
                            <input type="email" value={editMEmail} onChange={e => setEditMEmail(e.target.value)}
                              placeholder="Email" style={{ flex: '2 1 160px', fontSize: '.85rem' }} />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input type="text" value={editMWhatsapp} onChange={e => setEditMWhatsapp(e.target.value)}
                              placeholder="WhatsApp" style={{ flex: 1, fontSize: '.85rem' }} />
                            <button className="btn btn-primary" style={{ fontSize: '.78rem', padding: '4px 10px' }} onClick={() => handleSaveMember(m.id)}>Salvar</button>
                            <button className="btn" style={{ fontSize: '.78rem', padding: '4px 10px' }} onClick={() => setEditingMId(null)}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{m.name}</div>
                            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', display: 'flex', gap: 10 }}>
                              {m.email && <span>{m.email}</span>}
                              {m.whatsapp && <span>📱 {m.whatsapp}</span>}
                            </div>
                          </div>
                          <button title="Editar" onClick={() => startEditMember(m)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '.9rem', padding: '2px 6px' }}>✏️</button>
                          <button title="Remover" onClick={() => handleDeleteMember(m.id, m.name)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '.85rem', padding: '2px 6px' }}>✕</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Users tab ─────────────────────────────────────────────── */}
          {tab === 'users' && (
            <>
              {/* Invite form */}
              <label className="field-label">Convidar usuário</label>
              <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input type="email" placeholder="Email *" value={invEmail} onChange={e => setInvEmail(e.target.value)}
                    style={{ flex: '2 1 180px' }} required />
                  <input type="text" placeholder="Nome" value={invName} onChange={e => setInvName(e.target.value)}
                    style={{ flex: '2 1 140px' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" placeholder="WhatsApp" value={invWhatsapp} onChange={e => setInvWhatsapp(e.target.value)}
                    style={{ flex: 1 }} />
                  <select value={invRole} onChange={e => setInvRole(e.target.value)} style={{ width: 130 }}>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Visualizador</option>
                  </select>
                  <button type="submit" className="btn btn-primary" disabled={inviting} style={{ whiteSpace: 'nowrap' }}>
                    {inviting ? '...' : '✉ Convidar'}
                  </button>
                </div>
              </form>
              <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                O usuário receberá um email com link para entrar — sem precisar criar conta.
              </div>

              {/* User list */}
              {loadingUsers ? (
                <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', padding: 12 }}>Carregando...</div>
              ) : allProfiles.length === 0 ? (
                <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', padding: 12 }}>Nenhum usuário encontrado.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {allProfiles.map(u => (
                    <div key={u.id} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px' }}>
                      {editingUId === u.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <input type="text" value={editUName} onChange={e => setEditUName(e.target.value)}
                              placeholder="Nome" style={{ flex: '2 1 140px', fontSize: '.85rem' }} autoFocus />
                            <input type="text" value={editUWhatsapp} onChange={e => setEditUWhatsapp(e.target.value)}
                              placeholder="WhatsApp" style={{ flex: '2 1 140px', fontSize: '.85rem' }} />
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-primary" style={{ fontSize: '.78rem', padding: '4px 10px' }} onClick={() => handleSaveUser(u.id)}>Salvar</button>
                            <button className="btn" style={{ fontSize: '.78rem', padding: '4px 10px' }} onClick={() => setEditingUId(null)}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '.83rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {u.name || u.email}
                              {u.id === userId && <span style={{ fontSize: '.68rem', color: 'var(--accent)', marginLeft: 6 }}>você</span>}
                            </div>
                            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', display: 'flex', gap: 10 }}>
                              {u.name && <span>{u.email}</span>}
                              {u.whatsapp && <span>📱 {u.whatsapp}</span>}
                              {u.last_sign_in && <span>Último acesso: {new Date(u.last_sign_in).toLocaleDateString('pt-BR')}</span>}
                            </div>
                          </div>
                          <select value={u.role || 'viewer'} onChange={e => handleChangeRole(u.id, e.target.value)}
                            disabled={u.id === userId} style={{ width: 120, fontSize: '.8rem' }}>
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Visualizador</option>
                          </select>
                          <button title="Editar" onClick={() => { setEditingUId(u.id); setEditUName(u.name || ''); setEditUWhatsapp(u.whatsapp || ''); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '.9rem', padding: '2px 6px' }}>✏️</button>
                          {u.id !== userId && (
                            <button title="Remover" onClick={() => handleDeleteUser(u.id, u.email)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '.85rem', padding: '2px 6px' }}>✕</button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Role legend */}
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 12 }}>
                <label className="field-label" style={{ marginBottom: 8 }}>Permissões por role</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '.8rem' }}>
                  {[
                    { role: 'admin', desc: 'Controle total — criar, editar, excluir, restaurar, gerenciar usuários' },
                    { role: 'editor', desc: 'Criar e editar tarefas — não pode excluir' },
                    { role: 'viewer', desc: 'Apenas visualizar e acompanhar' },
                  ].map(({ role: r, desc }) => (
                    <div key={r} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 700, color: ROLE_COLORS[r], minWidth: 80 }}>{ROLE_LABELS[r]}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {msg && <div style={{ textAlign: 'center', fontSize: '.82rem', color: 'var(--success)' }}>✓ {msg}</div>}
          {msgError && <div style={{ textAlign: 'center', fontSize: '.82rem', color: 'var(--danger)' }}>⚠ {msgError}</div>}
        </div>
      </div>
    </div>
  );
}
