const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://imsqnoxztoxlmiumdalu.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltc3Fub3h6dG94bG1pdW1kYWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTk5NTEsImV4cCI6MjA5MDQ3NTk1MX0.CaFrcNJokpvdRD9v9AIp3rlDd8wXIrW6k1urepMDnqw';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Startup DB migration ──────────────────────────────────────────────────────
// Creates all required tables if they don't exist.
// Uses DATABASE_URL (direct Postgres) or SUPABASE_ACCESS_TOKEN (Management API).
const MIGRATION_SQL = `
  CREATE TABLE IF NOT EXISTS kanban_cost_centers (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    is_private BOOLEAN DEFAULT false,
    created_by TEXT,
    shared_with JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS kanban_templates (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    project TEXT DEFAULT '',
    status TEXT DEFAULT 'backlog',
    assignee TEXT DEFAULT '',
    urgency TEXT DEFAULT '',
    checklist JSONB DEFAULT '[]'::jsonb,
    links JSONB DEFAULT '[]'::jsonb,
    card_color TEXT DEFAULT 'none',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS kanban_resources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT DEFAULT '',
    type TEXT DEFAULT 'link',
    description TEXT DEFAULT '',
    cost_centers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS kanban_trash (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    data JSONB NOT NULL,
    deleted_at TEXT NOT NULL,
    deleted_by TEXT DEFAULT '',
    deleted_with_project BOOLEAN DEFAULT false
  );
`;

async function runMigrations() {
  // Strategy 1: Direct Postgres via DATABASE_URL env var
  if (process.env.DATABASE_URL) {
    try {
      const { Client } = require('pg');
      const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      await client.connect();
      await client.query(MIGRATION_SQL);
      await client.end();
      console.log('[DB] Auto-migration via DATABASE_URL completed.');
      return;
    } catch (e) {
      console.warn('[DB] DATABASE_URL migration failed:', e.message);
    }
  }

  // Strategy 2: Supabase Management API (requires SUPABASE_ACCESS_TOKEN)
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (accessToken) {
    try {
      const PROJECT_REF = 'imsqnoxztoxlmiumdalu';
      const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: MIGRATION_SQL }),
      });
      if (res.ok) {
        console.log('[DB] Auto-migration via Management API completed.');
        return;
      }
      console.warn('[DB] Management API returned:', res.status, await res.text());
    } catch (e) {
      console.warn('[DB] Management API migration failed:', e.message);
    }
  }

  // Strategy 3: Supabase Supavisor pooler with service role key as JWT password
  // Supabase supports API key auth on the connection pooler (no DATABASE_URL needed)
  if (SERVICE_KEY) {
    const PROJECT_REF = 'imsqnoxztoxlmiumdalu';
    // Try all Supabase-hosted AWS regions (sa-east-1 first for Brazilian projects)
    const regions = ['sa-east-1', 'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
      'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-north-1',
      'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ca-central-1'];
    for (const region of regions) {
      try {
        const { Client } = require('pg');
        const client = new Client({
          user: `postgres.${PROJECT_REF}`,
          password: SERVICE_KEY,
          host: `aws-0-${region}.pooler.supabase.com`,
          port: 6543,
          database: 'postgres',
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 8000,
        });
        await client.connect();
        await client.query(MIGRATION_SQL);
        await client.end();
        console.log(`[DB] Auto-migration via Supavisor (${region}) completed.`);
        return;
      } catch (e) {
        // try next region silently
      }
    }
    console.warn('[DB] Supavisor JWT auth: all regions failed.');

    // Strategy 4: Management API with service role key (experimental — may work on some plans)
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: MIGRATION_SQL }),
      });
      if (res.ok) {
        console.log('[DB] Auto-migration via Management API (service key) completed.');
        return;
      }
      console.warn('[DB] Management API (service key):', res.status);
    } catch (e) {
      console.warn('[DB] Management API (service key) error:', e.message);
    }
  }

  console.log('[DB] Auto-migration skipped — set DATABASE_URL or SUPABASE_ACCESS_TOKEN to enable.');
  console.log('[DB] Missing tables SQL:\n' + MIGRATION_SQL);
}

runMigrations();

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
