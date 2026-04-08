import { createContext, useContext, useState, useEffect } from 'react';
import { sb } from '../lib/supabase';

const ROLES_KEY = 'kanban_roles_v1';
export const ROLE_LABELS = { admin: 'Admin', editor: 'Editor', viewer: 'Visualizador' };

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allProfiles, setAllProfiles] = useState([]);

  useEffect(() => { init(); }, []);

  async function init() {
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      setUserEmail(user.email);

      let userRole = null;
      try {
        const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (profile) userRole = profile.role;
      } catch {}

      if (!userRole) {
        const stored = getStoredRoles();
        if (stored[user.id]) {
          userRole = stored[user.id].role;
        } else {
          const hasAdmin = Object.values(stored).some(u => u.role === 'admin');
          userRole = hasAdmin ? 'viewer' : 'admin';
          stored[user.id] = { role: userRole, email: user.email };
          saveStoredRoles(stored);
          try { await sb.from('profiles').upsert({ id: user.id, email: user.email, role: userRole }); } catch {}
        }
      }
      setRole(userRole);
    } catch {
      setRole('admin');
    }
    setLoading(false);
  }

  function getStoredRoles() {
    try { return JSON.parse(localStorage.getItem(ROLES_KEY)) || {}; } catch { return {}; }
  }
  function saveStoredRoles(r) {
    try { localStorage.setItem(ROLES_KEY, JSON.stringify(r)); } catch {}
  }

  async function loadAllProfiles() {
    // Try server-side endpoint (requires SUPABASE_SERVICE_ROLE_KEY on server)
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.access_token) {
        const res = await fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const { users } = await res.json();
          setAllProfiles(users);
          return users;
        }
      }
    } catch {}

    // Fallback: Supabase profiles table
    try {
      const { data, error } = await sb.from('profiles').select('*');
      if (!error && data && data.length) { setAllProfiles(data); return data; }
    } catch {}

    // Fallback: localStorage
    const stored = getStoredRoles();
    const local = Object.entries(stored).map(([id, info]) => ({ id, ...info }));
    setAllProfiles(local);
    return local;
  }

  async function updateUserRole(targetId, newRole) {
    // Try server-side endpoint first
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.access_token) {
        await fetch(`/api/admin/users/${targetId}/role`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        });
      }
    } catch {}
    try { await sb.from('profiles').update({ role: newRole }).eq('id', targetId); } catch {}
    const stored = getStoredRoles();
    if (stored[targetId]) { stored[targetId].role = newRole; saveStoredRoles(stored); }
    setAllProfiles(prev => prev.map(u => u.id === targetId ? { ...u, role: newRole } : u));
    if (targetId === userId) setRole(newRole);
  }

  async function addUserProfile(email, roleVal = 'viewer') {
    const profile = { id: 'manual_' + Date.now(), email, role: roleVal };
    const stored = getStoredRoles();
    stored[profile.id] = { email, role: roleVal };
    saveStoredRoles(stored);
    try { await sb.from('profiles').insert({ email, role: roleVal }); } catch {}
    setAllProfiles(prev => [...prev, profile]);
    return profile;
  }

  const can = {
    delete: role === 'admin',
    edit: role === 'admin' || role === 'editor',
    create: role === 'admin' || role === 'editor',
    admin: role === 'admin',
    view: true,
  };

  return (
    <RoleContext.Provider value={{ role, userId, userEmail, loading, can, allProfiles, loadAllProfiles, updateUserRole, addUserProfile }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be inside RoleProvider');
  return ctx;
}
