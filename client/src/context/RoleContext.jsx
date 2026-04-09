import { createContext, useContext, useState, useEffect } from 'react';
import { sb } from '../lib/supabase';

export const ROLE_LABELS = { admin: 'Admin', editor: 'Editor', viewer: 'Visualizador' };

const RoleContext = createContext(null);

// Cache only the current user's own role (perf optimization, not source of truth)
const MY_ROLE_KEY = 'kanban_my_role_v1';
function getCachedRole(userId) {
  try { return JSON.parse(localStorage.getItem(MY_ROLE_KEY))?.[userId]; } catch { return null; }
}
function setCachedRole(userId, role) {
  try { localStorage.setItem(MY_ROLE_KEY, JSON.stringify({ [userId]: role })); } catch {}
}

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

      // 1. Supabase profiles table is authoritative
      let userRole = null;
      try {
        const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (profile) userRole = profile.role;
      } catch {}

      // 2. Not in profiles yet — determine role based on whether any admin exists
      if (!userRole) {
        try {
          const { data: existing } = await sb.from('profiles').select('id').limit(1);
          const hasAnyUser = (existing || []).length > 0;
          userRole = hasAnyUser ? 'viewer' : 'admin';
          try { await sb.from('profiles').upsert({ id: user.id, email: user.email, role: userRole }); } catch {}
        } catch {
          // Supabase unavailable — fall back to cached role for this user only
          userRole = getCachedRole(user.id) || 'viewer';
        }
      }

      setCachedRole(user.id, userRole);
      setRole(userRole);
    } catch {
      setRole('admin');
    }
    setLoading(false);
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

    return [];
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
    // Update cache only for current user
    if (targetId === userId) setCachedRole(userId, newRole);
    setAllProfiles(prev => prev.map(u => u.id === targetId ? { ...u, role: newRole } : u));
    if (targetId === userId) setRole(newRole);
  }

  async function addUserProfile(email, roleVal = 'viewer') {
    const profile = { id: 'manual_' + Date.now(), email, role: roleVal };
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
