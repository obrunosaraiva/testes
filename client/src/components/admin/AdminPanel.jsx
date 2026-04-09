import { useState, useEffect } from 'react';
import { useRole, ROLE_LABELS } from '../../context/RoleContext';
import { useKanban } from '../../context/KanbanContext';
import { sb } from '../../lib/supabase';

const ROLE_COLORS = { admin: 'var(--accent)', editor: 'var(--warning)', viewer: 'var(--text-muted)' };

export default function AdminPanel({ onClose }) {
  const { userId, userEmail, role, allProfiles, loadAllProfiles, updateUserRole } = useRole();
  const { members, addMember, updateMember, deleteMember } = useKanban();

  const [tab, setTab] = useState('members'); // 'members' | 'users'
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingRole, setSavingRole] = useState(null);
  const [msg, setMsg] = useState('');
  const [msgError, setMsgError] = useState('');

  // Member form state
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);

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

  // ── Members ────────────────────────────────────────────────────────────────
  function handleAddMember(e) {
    e.preventDefault();
    if (!memberName.trim()) return;
    addMember(memberName, memberEmail);
    setMemberName('');
    setMemberEmail('');
    flash('Membro adicionado!');
  }

  function startEdit(m) {
    setEditingId(m.id);
    setEditName(m.name);
    setEditEmail(m.email || '');
  }

  function handleSaveEdit(id) {
    if (!editName.trim()) return;
    updateMember(id, { name: editName.trim(), email: editEmail.trim() });
    setEditingId(null);
    flash('Membro atualizado!');
  }

  function handleDeleteMember(id, name) {
    if (!window.confirm(`Remover "${name}" da lista de responsáveis?`)) return;
    deleteMember(id);
    flash('Membro removido.');
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  async function getToken() {
    const { data: { session } } = await sb.auth.getSession();
    return session?.access_token;
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { flash(data.error || 'Erro ao convidar.', true); }
      else {
        flash(`Convite enviado para ${inviteEmail}!`);
        setInviteEmail('');
        loadAllProfiles();
      }
    } catch (e) {
      flash(e.message, true);
    }
    setInviting(false);
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
    } catch (e) {
      flash(e.message, true);
    }
  }

  async function handleChangeRole(targetId, r) {
    setSavingRole(targetId);
    await updateUserRole(targetId, r);
    setSavingRole(null);
    flash('Role atualizado!');
  }

  return (
    <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>🛡 Painel Admin</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, padding: '0 20px', borderBottom: '1px solid var(--border)' }}>
          {[
            { key: 'members', label: 'Responsáveis' },
            { key: 'users', label: 'Usuários do sistema' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 14px', fontSize: '.85rem', fontWeight: tab === t.key ? 700 : 400,
                color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {/* ── Members tab ───────────────────────────────────────────────── */}
          {tab === 'members' && (
            <>
              <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginTop: 0 }}>
                Cadastre os responsáveis que aparecem no campo de atribuição das tarefas. Pode ser qualquer pessoa — com ou sem conta no sistema.
              </p>

              {/* Add member form */}
              <form onSubmit={handleAddMember} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Nome do responsável *"
                  value={memberName}
                  onChange={e => setMemberName(e.target.value)}
                  style={{ flex: '2 1 160px' }}
                  required
                />
                <input
                  type="email"
                  placeholder="Email (opcional)"
                  value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)}
                  style={{ flex: '2 1 180px' }}
                />
                <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                  + Adicionar
                </button>
              </form>

              {/* Member list */}
              {members.length === 0 ? (
                <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', padding: '12px 0' }}>
                  Nenhum responsável cadastrado. Adicione acima.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {members.map(m => (
                    <div key={m.id} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px' }}>
                      {editingId === m.id ? (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            style={{ flex: '2 1 140px', fontSize: '.85rem' }}
                            autoFocus
                          />
                          <input
                            type="email"
                            value={editEmail}
                            onChange={e => setEditEmail(e.target.value)}
                            placeholder="Email (opcional)"
                            style={{ flex: '2 1 160px', fontSize: '.85rem' }}
                          />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-primary" style={{ fontSize: '.78rem', padding: '4px 10px' }} onClick={() => handleSaveEdit(m.id)}>
                              Salvar
                            </button>
                            <button className="btn" style={{ fontSize: '.78rem', padding: '4px 10px' }} onClick={() => setEditingId(null)}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{m.name}</div>
                            {m.email && <div style={{ fontSize: '.73rem', color: 'var(--text-muted)' }}>{m.email}</div>}
                          </div>
                          <button
                            title="Editar"
                            onClick={() => startEdit(m)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '.9rem', padding: '2px 6px' }}
                          >
                            ✏️
                          </button>
                          <button
                            title="Remover"
                            onClick={() => handleDeleteMember(m.id, m.name)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '.9rem', padding: '2px 6px' }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Users tab ─────────────────────────────────────────────────── */}
          {tab === 'users' && (
            <>
              {/* Invite form */}
              <div>
                <label className="field-label">Convidar usuário</label>
                <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    style={{ flex: '2 1 180px' }}
                    required
                  />
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ width: 140 }}>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Visualizador</option>
                  </select>
                  <button type="submit" className="btn btn-primary" disabled={inviting} style={{ whiteSpace: 'nowrap' }}>
                    {inviting ? '...' : '✉ Convidar'}
                  </button>
                </form>
                <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  O usuário receberá um email com link para entrar — sem precisar criar conta.
                </div>
              </div>

              {/* User list */}
              {loadingUsers ? (
                <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', padding: 12 }}>Carregando...</div>
              ) : allProfiles.length === 0 ? (
                <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', padding: 12 }}>Nenhum usuário encontrado.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {allProfiles.map(u => (
                    <div key={u.id} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.83rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.email || u.id}
                          {u.id === userId && <span style={{ fontSize: '.68rem', color: 'var(--accent)', marginLeft: 6 }}>você</span>}
                        </div>
                        {u.last_sign_in && (
                          <div style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>
                            Último acesso: {new Date(u.last_sign_in).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                      <select
                        value={u.role || 'viewer'}
                        onChange={e => handleChangeRole(u.id, e.target.value)}
                        disabled={savingRole === u.id || u.id === userId}
                        style={{ width: 130, fontSize: '.8rem' }}
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Visualizador</option>
                      </select>
                      {savingRole === u.id
                        ? <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>...</span>
                        : u.id !== userId && (
                          <button
                            title="Remover usuário"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '.9rem', padding: '2px 6px', flexShrink: 0 }}
                          >
                            ✕
                          </button>
                        )
                      }
                    </div>
                  ))}
                </div>
              )}

              {/* Role legend */}
              <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: 12 }}>
                <label className="field-label" style={{ marginBottom: 8 }}>Permissões por role</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '.8rem' }}>
                  {[
                    { role: 'admin', desc: 'Controle total — criar, editar, excluir, restaurar da lixeira, gerenciar usuários' },
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
