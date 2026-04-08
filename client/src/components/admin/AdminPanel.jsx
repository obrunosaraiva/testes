import { useState, useEffect } from 'react';
import { useRole, ROLE_LABELS } from '../../context/RoleContext';

const ROLE_COLORS = { admin: 'var(--accent)', editor: 'var(--warning)', viewer: 'var(--text-muted)' };

export default function AdminPanel({ onClose }) {
  const { userId, userEmail, role, allProfiles, loadAllProfiles, updateUserRole, addUserProfile } = useRole();
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [saving, setSaving] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadAllProfiles().finally(() => setLoading(false));
  }, []);

  async function handleChangeRole(targetId, r) {
    setSaving(targetId);
    await updateUserRole(targetId, r);
    setSaving(null);
    setMsg('Role atualizado!');
    setTimeout(() => setMsg(''), 2000);
  }

  async function handleAddUser(e) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    await addUserProfile(newEmail.trim(), newRole);
    setNewEmail('');
    setMsg(`Usuário ${newEmail} adicionado como ${ROLE_LABELS[newRole]}.`);
    setTimeout(() => setMsg(''), 3000);
  }

  return (
    <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>🛡 Painel Admin</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>
            Gerencie usuários e permissões do workspace.
          </p>

          {/* Current user badge */}
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '.82rem', fontWeight: 600 }}>{userEmail}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>Você</div>
            </div>
            <span style={{ fontSize: '.75rem', fontWeight: 700, color: ROLE_COLORS[role], background: 'var(--surface3)', padding: '3px 10px', borderRadius: 20 }}>
              {ROLE_LABELS[role]}
            </span>
          </div>

          {/* User list */}
          <div>
            <label className="field-label">Usuários do workspace</label>
            {loading ? (
              <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', padding: 12 }}>Carregando...</div>
            ) : allProfiles.length === 0 ? (
              <div style={{ fontSize: '.82rem', color: 'var(--text-muted)', padding: 12 }}>Nenhum usuário encontrado.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allProfiles.map(u => (
                  <div key={u.id} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '.83rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.email || u.id}
                        {u.id === userId && <span style={{ fontSize: '.68rem', color: 'var(--accent)', marginLeft: 6 }}>você</span>}
                      </div>
                    </div>
                    <select
                      value={u.role || 'viewer'}
                      onChange={e => handleChangeRole(u.id, e.target.value)}
                      disabled={saving === u.id || u.id === userId}
                      style={{ width: 140, fontSize: '.8rem' }}
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Visualizador</option>
                    </select>
                    {saving === u.id && <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>...</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add user */}
          <div>
            <label className="field-label">Adicionar usuário</label>
            <form onSubmit={handleAddUser} style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                placeholder="email@exemplo.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                style={{ flex: 1 }}
              />
              <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ width: 140 }}>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Visualizador</option>
              </select>
              <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>+ Add</button>
            </form>
            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
              O usuário precisa criar uma conta no Supabase com este email para ter acesso.
            </div>
          </div>

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

          {msg && <div style={{ textAlign: 'center', fontSize: '.82rem', color: 'var(--success)' }}>✓ {msg}</div>}
        </div>
      </div>
    </div>
  );
}
