const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://imsqnoxztoxlmiumdalu.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltc3Fub3h6dG94bG1pdW1kYWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTk5NTEsImV4cCI6MjA5MDQ3NTk1MX0.CaFrcNJokpvdRD9v9AIp3rlDd8wXIrW6k1urepMDnqw';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// List all auth users (admin only — requires SUPABASE_SERVICE_ROLE_KEY env var)
app.get('/api/admin/users', async (req, res) => {
  if (!SERVICE_KEY) {
    return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token não fornecido.' });

  try {
    // Verify the user's JWT using anon key
    const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
    });
    if (!verifyRes.ok) return res.status(401).json({ error: 'Token inválido.' });
    const caller = await verifyRes.json();

    // Check if caller is admin in profiles table
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${caller.id}&select=role`,
      { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } }
    );
    const profiles = await profileRes.json();
    if (!profiles?.[0] || profiles[0].role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas admins podem listar usuários.' });
    }

    // List all auth users
    const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    });
    const usersData = await usersRes.json();

    // Get all profiles for roles
    const allProfilesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=*`,
      { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } }
    );
    const allProfiles = await allProfilesRes.json();
    const profileMap = {};
    (Array.isArray(allProfiles) ? allProfiles : []).forEach(p => { profileMap[p.id] = p; });

    const users = (usersData.users || []).map(u => ({
      id: u.id,
      email: u.email,
      role: profileMap[u.id]?.role || 'viewer',
      last_sign_in: u.last_sign_in_at,
      created_at: u.created_at,
    }));

    res.json({ users });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update user role (admin only)
app.post('/api/admin/users/:id/role', async (req, res) => {
  if (!SERVICE_KEY) return res.status(503).json({ error: 'SERVICE_KEY não configurada.' });
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token não fornecido.' });

  try {
    const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
    });
    if (!verifyRes.ok) return res.status(401).json({ error: 'Token inválido.' });
    const caller = await verifyRes.json();

    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${caller.id}&select=role`,
      { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } }
    );
    const profiles = await profileRes.json();
    if (!profiles?.[0] || profiles[0].role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const { role } = req.body;
    const { id } = req.params;

    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      },
      body: JSON.stringify({ role }),
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Serve React build output
const distPath = path.join(__dirname, 'client', 'dist');
app.use(express.static(distPath));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Kanban Pro running on port ${PORT}`);
});
