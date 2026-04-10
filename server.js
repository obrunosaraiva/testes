const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://imsqnoxztoxlmiumdalu.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltc3Fub3h6dG94bG1pdW1kYWx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTk5NTEsImV4cCI6MjA5MDQ3NTk1MX0.CaFrcNJokpvdRD9v9AIp3rlDd8wXIrW6k1urepMDnqw';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Web Push (VAPID) ───────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BDDSPNsZfA0VrQAGoi8pHOQBVyRX46a1_nhDwKj8MZ3w7SMpO6cNFi7Iw3tI6rCi2AKT_uiHCulCIfJ1QEa-GIY';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'CBjdCU-L0y4mAtvzlCx358hQWAaKiDnV7WaXBuFPs68';
let webpush;
try {
  webpush = require('web-push');
  webpush.setVapidDetails('mailto:kanbanpro@app.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e) {
  console.warn('[Push] web-push not available:', e.message);
}

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
  ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
  ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT DEFAULT '';
  ALTER TABLE IF EXISTS kanban_tasks ADD COLUMN IF NOT EXISTS task_status TEXT DEFAULT 'pendente';
  CREATE TABLE IF NOT EXISTS kanban_messages (
    id TEXT PRIMARY KEY,
    channel_type TEXT NOT NULL DEFAULT 'general',
    channel_id TEXT NOT NULL DEFAULT 'geral',
    user_id TEXT DEFAULT '',
    user_name TEXT NOT NULL DEFAULT '',
    content TEXT DEFAULT '',
    attachments JSONB DEFAULT '[]'::jsonb,
    mentions JSONB DEFAULT '[]'::jsonb,
    reply_to TEXT,
    reply_preview JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT false
  );
  CREATE INDEX IF NOT EXISTS idx_kanban_messages_channel
    ON kanban_messages (channel_type, channel_id, created_at);
  ALTER TABLE kanban_messages ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT false;
  ALTER TABLE kanban_messages DISABLE ROW LEVEL SECURITY;
  DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE kanban_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;
  CREATE TABLE IF NOT EXISTS kanban_push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(endpoint)
  );
  CREATE INDEX IF NOT EXISTS idx_push_subs_user ON kanban_push_subscriptions (user_id);
  ALTER TABLE kanban_push_subscriptions DISABLE ROW LEVEL SECURITY;
  ALTER TABLE kanban_tasks ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb;
`;

const PROJECT_REF = 'imsqnoxztoxlmiumdalu';

// Run migration via a single pg Client (returns the client host on success, throws on failure)
function tryPgClient(clientOpts, sql) {
  return new Promise((resolve, reject) => {
    const { Client } = require('pg');
    const client = new Client(clientOpts);
    client.connect()
      .then(() => client.query(sql))
      .then(() => client.end())
      .then(() => resolve(clientOpts.host || clientOpts.connectionString || 'db'))
      .catch(err => { client.end().catch(() => {}); reject(err); });
  });
}

async function runMigrations(sql = MIGRATION_SQL) {
  // Strategy 1: Direct Postgres via DATABASE_URL env var
  if (process.env.DATABASE_URL) {
    try {
      await tryPgClient({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }, sql);
      console.log('[DB] Migration via DATABASE_URL OK');
      return;
    } catch (e) {
      console.warn('[DB] DATABASE_URL failed:', e.message);
    }
  }

  // Strategy 2: Supabase Management API (requires SUPABASE_ACCESS_TOKEN)
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (accessToken) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql }),
      });
      if (res.ok) { console.log('[DB] Migration via Management API OK'); return; }
      console.warn('[DB] Management API:', res.status, await res.text());
    } catch (e) {
      console.warn('[DB] Management API failed:', e.message);
    }
  }

  // Strategy 3: Supavisor pooler — try all regions IN PARALLEL (fastest region wins)
  if (SERVICE_KEY) {
    const regions = ['sa-east-1', 'us-east-1', 'us-east-2', 'us-west-2',
      'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-southeast-2',
      'ap-northeast-1', 'ap-south-1', 'eu-north-1', 'ca-central-1'];
    const attempts = regions.map(r => tryPgClient({
      user: `postgres.${PROJECT_REF}`,
      password: SERVICE_KEY,
      host: `aws-0-${r}.pooler.supabase.com`,
      port: 6543,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 20000,
    }, sql));
    try {
      const region = await Promise.any(attempts);
      console.log(`[DB] Migration via Supavisor (${region}) OK`);
      return;
    } catch (agg) {
      console.warn('[DB] Supavisor: all regions failed');
    }
  }

  console.log('[DB] Migration skipped — set DATABASE_URL or SUPABASE_ACCESS_TOKEN to enable.');
}

runMigrations();

// ── Chat storage bucket setup ─────────────────────────────────────────────────
async function ensureChatBucket() {
  if (!SERVICE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'chat-files', name: 'chat-files', public: true, file_size_limit: 104857600 }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) console.log('[Chat] Storage bucket chat-files created.');
    else if (body.error === 'Duplicate') console.log('[Chat] Bucket chat-files already exists.');
    else console.warn('[Chat] Bucket creation response:', res.status, body);
    return true;
  } catch (e) {
    console.warn('[Chat] Bucket setup error:', e.message);
    return false;
  }
}
ensureChatBucket();

// ── Chat file upload (proxy using service key) ────────────────────────────────
app.post('/api/chat/upload', express.raw({ type: '*/*', limit: '100mb' }), async (req, res) => {
  if (!SERVICE_KEY) return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.' });
  const raw = req.headers['x-filename'] || `file_${Date.now()}`;
  const filename = decodeURIComponent(raw).replace(/[^a-zA-Z0-9._\- ]/g, '_');
  const contentType = req.headers['x-content-type'] || 'application/octet-stream';
  const storagePath = `chat/${Date.now()}_${filename}`;

  async function doUpload() {
    return fetch(`${SUPABASE_URL}/storage/v1/object/chat-files/${storagePath}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': contentType, 'x-upsert': 'true' },
      body: req.body,
    });
  }

  let uploadRes = await doUpload();
  if (!uploadRes.ok) {
    const errBody = await uploadRes.json().catch(() => ({}));
    // Bucket not found — create it and retry once
    if (uploadRes.status === 400 && errBody.error === 'Bucket not found') {
      await ensureChatBucket();
      uploadRes = await doUpload();
    }
    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      return res.status(400).json({ error: err.error || err.message || 'Upload failed' });
    }
  }
  res.json({ url: `${SUPABASE_URL}/storage/v1/object/public/chat-files/${storagePath}`, name: filename, type: contentType });
});

// On-demand migration endpoint — lets the client trigger DB setup if table is missing
app.post('/api/db/migrate', async (req, res) => {
  try {
    await runMigrations();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Push Notification endpoints ────────────────────────────────────────────────

// Return VAPID public key so clients can subscribe
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Helper: verify user JWT and return user id
async function verifyJWT(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: ANON_KEY },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u?.id || null;
}

// Save push subscription for current user
app.post('/api/push/subscribe', async (req, res) => {
  if (!SERVICE_KEY) return res.status(503).json({ error: 'SERVICE_KEY não configurada.' });
  const userId = await verifyJWT(req);
  if (!userId) return res.status(401).json({ error: 'Token inválido.' });

  const { subscription } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: 'subscription.endpoint obrigatório.' });

  const id = 'ps_' + Buffer.from(subscription.endpoint).toString('base64').slice(0, 32).replace(/[^a-zA-Z0-9]/g, '');
  await fetch(`${SUPABASE_URL}/rest/v1/kanban_push_subscriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY,
      'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ id, user_id: userId, endpoint: subscription.endpoint, subscription }),
  });
  res.json({ ok: true });
});

// Remove push subscription for current user
app.delete('/api/push/subscribe', async (req, res) => {
  if (!SERVICE_KEY) return res.status(503).json({ error: 'SERVICE_KEY não configurada.' });
  const userId = await verifyJWT(req);
  if (!userId) return res.status(401).json({ error: 'Token inválido.' });

  await fetch(`${SUPABASE_URL}/rest/v1/kanban_push_subscriptions?user_id=eq.${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, Prefer: 'return=minimal' },
  });
  res.json({ ok: true });
});

// Send push to mentioned users
app.post('/api/push/notify', async (req, res) => {
  if (!SERVICE_KEY || !webpush) return res.json({ ok: true, skipped: true });

  const { content, user_name, channel_name, channel_type, channel_id, mentions } = req.body;
  if (!mentions?.length) return res.json({ ok: true });

  // Collect unique user IDs from mentions (only type:'user')
  const userIds = [...new Set(mentions.filter(m => m.type === 'user' && m.id).map(m => m.id))];
  if (!userIds.length) return res.json({ ok: true });

  try {
    // Fetch subscriptions for mentioned users
    const filter = userIds.map(id => `user_id=eq.${id}`).join(',');
    const subsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/kanban_push_subscriptions?or=(${filter})`,
      { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } }
    );
    const subs = await subsRes.json();
    if (!Array.isArray(subs) || !subs.length) return res.json({ ok: true });

    const payload = JSON.stringify({
      title: `${user_name} mencionou você`,
      body: `#${channel_name}: ${(content || '').slice(0, 120)}`,
      tag: `mention-${channel_type}-${channel_id}`,
      url: '/',
    });

    await Promise.allSettled(subs.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, payload, { TTL: 86400 });
      } catch (e) {
        // 410 Gone = subscription expired, remove it
        if (e.statusCode === 410) {
          fetch(`${SUPABASE_URL}/rest/v1/kanban_push_subscriptions?id=eq.${row.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
          }).catch(() => {});
        }
      }
    }));
  } catch (e) {
    console.warn('[Push] notify error:', e.message);
  }

  res.json({ ok: true });
});

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

    const { role, name, whatsapp } = req.body;
    const { id } = req.params;

    const patch = {};
    if (role !== undefined) patch.role = role;
    if (name !== undefined) patch.name = name;
    if (whatsapp !== undefined) patch.whatsapp = whatsapp;

    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      },
      body: JSON.stringify(patch),
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Public signup — creates user + profile with editor role (no admin required)
app.post('/api/auth/signup', async (req, res) => {
  if (!SERVICE_KEY) return res.status(503).json({ error: 'Servidor não configurado para criar contas.' });

  const { email, password, name = '', phone = '' } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  if (password.length < 6) return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });

  try {
    // Create user via admin API (email_confirm: true skips confirmation email)
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    const createText = await createRes.text();
    let userData = {};
    try { userData = JSON.parse(createText); } catch (_) {}
    if (!createRes.ok) {
      return res.status(createRes.status).json({ error: userData.message || userData.msg || userData.error || `Erro ao criar conta (${createRes.status}).` });
    }

    // Create profile with editor role, name and phone
    if (userData.id) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY,
          'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ id: userData.id, email, role: 'editor', name, whatsapp: phone }),
      });
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Invite user by email (admin only) — sends Supabase magic link, no manual signup needed
app.post('/api/admin/invite', async (req, res) => {
  if (!SERVICE_KEY) return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.' });
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
      return res.status(403).json({ error: 'Acesso negado. Apenas admins podem convidar usuários.' });
    }

    const { email, role: inviteRole = 'viewer', name = '', whatsapp = '' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatório.' });

    // Create/invite user via Supabase Admin API — sends email with sign-in link
    const inviteRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/invite`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    const inviteData = await inviteRes.json();

    if (!inviteRes.ok) {
      return res.status(inviteRes.status).json({ error: inviteData.message || inviteData.error || 'Erro ao convidar.' });
    }

    // Set role, name and whatsapp in profiles table.
    // Use PATCH first (overrides any trigger default), then upsert as fallback.
    if (inviteData.id) {
      const profileHeaders = {
        Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      };
      const profileBody = { role: inviteRole, name, whatsapp };

      // PATCH — wins over trigger that may have already created the row with a default role
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${inviteData.id}`, {
        method: 'PATCH', headers: profileHeaders, body: JSON.stringify(profileBody),
      });

      // If PATCH updated 0 rows (trigger didn't run), insert the row
      if (patchRes.headers.get('content-range') === '*/0' || patchRes.status === 204) {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
          method: 'POST',
          headers: { ...profileHeaders, Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({ id: inviteData.id, email, ...profileBody }),
        });
      }
    }

    res.json({ ok: true, userId: inviteData.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete auth user (admin only)
app.delete('/api/admin/users/:id', async (req, res) => {
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
    const profs = await profileRes.json();
    if (!profs?.[0] || profs[0].role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const { id } = req.params;
    if (id === caller.id) return res.status(400).json({ error: 'Você não pode remover a si mesmo.' });

    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    });
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, Prefer: 'return=minimal' },
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
