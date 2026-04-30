// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                                                              ║
// ║                    ✝   MEDALHA DE SÃO BENTO   ✝                             ║
// ║                                                                              ║
// ║                        · · · P A X · · ·                                    ║
// ║                     ·  ╭────────────────╮  ·                                ║
// ║               V·R· ·   │  C  · │ ·  S  │   · ·S·M·                         ║
// ║               S·N· ·   │ ─ ─ ─ ╪ ─ ─ ─ │   · ·Q·L·                         ║
// ║               S·M· ·   │C·S·S·M·L│N·D·S│   · ·I·V·                         ║
// ║               M·V· ·   │ ─ ─ ─ ╪·M·D ─ │   · ·B· ·                         ║
// ║                    ·   │  P  · │ ·  B  │   ·                                ║
// ║                     ·  ╰────────────────╯  ·                                ║
// ║                        · ·VADE RETRO· · ·                                   ║
// ║                           S A T A N A                                       ║
// ║                                                                              ║
// ║   Crux Sancti Patris Benedicti  ·  Crux Sacra Sit Mihi Lux                  ║
// ║   Non Draco Sit Mihi Dux        ·  Vade Retro Satana!                       ║
// ║                                                                              ║
// ║   🛡️  Se você está aqui tentando invadir: Deus e Ximinoze te veem.  🛡️      ║
// ║   Toda tentativa está registrada — Art. 154-A Código Penal Brasileiro.      ║
// ║   Ximinoze is watching. Turn back now.                                       ║
// ║                                                                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const express = require('express');
const path    = require('path');
const app     = express();
const PORT    = process.env.PORT || 3000;

// ── Security packages (optional — loaded gracefully if present) ────────────────
let helmet, rateLimit;
try { helmet    = require('helmet');            } catch (_) { console.warn('[Security] helmet not installed — run npm install'); }
try { rateLimit = require('express-rate-limit'); } catch (_) { console.warn('[Security] express-rate-limit not installed — run npm install'); }

// ── Security headers via helmet ────────────────────────────────────────────────
if (helmet) {
  app.use(helmet({
    contentSecurityPolicy: false, // React app manages its own CSP
    crossOriginEmbedderPolicy: false,
  }));
}

// Custom header: attacker-facing signature on every response
app.use((req, res, next) => {
  res.setHeader('X-Protected-By', 'Ximinoze');
  next();
});

// ── Rate limiters ──────────────────────────────────────────────────────────────
function makeRateLimit(windowMs, max, message) {
  if (!rateLimit) return (req, res, next) => next();
  return rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: message }),
  });
}
const limiterGeneral  = makeRateLimit(15 * 60 * 1000, 300,  'Muitas requisições. Tente novamente em instantes.');
const limiterStrict   = makeRateLimit(15 * 60 * 1000,  10,  'Limite de tentativas atingido. Aguarde 15 minutos.');
const limiterUpload   = makeRateLimit(60  * 60 * 1000,  30, 'Limite de uploads atingido. Aguarde 1 hora.');
const limiterAdmin    = makeRateLimit(15 * 60 * 1000,  50,  'Muitas requisições admin. Tente novamente em instantes.');

app.use('/api/', limiterGeneral);

// ── Honeypot: trap common attack/scan paths ────────────────────────────────────
const HONEYPOT = [
  '/wp-admin', '/wp-login', '/phpmyadmin', '/phpinfo', '/.env',
  '/config', '/.git', '/.ssh', '/etc', '/admin.php', '/shell',
  '/backup', '/api/debug', '/api/env', '/api/config',
];
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (HONEYPOT.some(h => p === h || p.startsWith(h + '/'))) {
    console.warn(`[SECURITY] Honeypot hit: ${req.method} ${req.path} | IP: ${req.ip} | UA: ${(req.headers['user-agent'] || '').slice(0, 80)}`);
    return res.status(404).json({
      error: 'Not found.',
      notice: '🛡️ Ximinoze protege este app. Esta tentativa foi registrada.',
    });
  }
  next();
});

app.use(express.json({ limit: '1mb' }));

// ── Required env vars ──────────────────────────────────────────────────────────
// Credentials must come ONLY from environment variables — never hardcoded.
// Set these in Railway (or .env locally):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY     = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('[CRITICAL] SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias. Defina as variáveis de ambiente.');
}

const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

// ── Web Push (VAPID) ───────────────────────────────────────────────────────────
let webpush;
try {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush = require('web-push');
    webpush.setVapidDetails('mailto:kanbanpro@app.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } else {
    console.warn('[Push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY não configuradas — push desativado.');
  }
} catch (e) {
  console.warn('[Push] web-push não disponível:', e.message);
}

// ── Input validation helpers ───────────────────────────────────────────────────
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const ALLOWED_ROLES = ['admin', 'editor', 'viewer'];

function isValidUUID(v)  { return typeof v === 'string' && UUID_RE.test(v); }
function isValidEmail(v) { return typeof v === 'string' && EMAIL_RE.test(v.trim()) && v.length <= 320; }
function isValidRole(v)  { return ALLOWED_ROLES.includes(v); }
function safeStr(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }

// Generic internal error — never leak exception details to clients
function internalErr(res, e) {
  console.error('[API Error]', e?.message || e);
  return res.status(500).json({ error: 'Erro interno do servidor.' });
}

// ── Startup DB migration ──────────────────────────────────────────────────────
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
  ALTER TABLE kanban_tasks ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb;

  -- RLS is managed via Supabase migrations, not on every server startup.
`;

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF
  || (SUPABASE_URL ? SUPABASE_URL.split('//')[1]?.split('.')[0] : '');

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
  if (process.env.DATABASE_URL) {
    try {
      await tryPgClient({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }, sql);
      console.log('[DB] Migration via DATABASE_URL OK');
      return;
    } catch (e) {
      console.warn('[DB] DATABASE_URL failed:', e.message);
    }
  }

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (accessToken && PROJECT_REF) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql }),
      });
      if (res.ok) { console.log('[DB] Migration via Management API OK'); return; }
      console.warn('[DB] Management API:', res.status);
    } catch (e) {
      console.warn('[DB] Management API failed:', e.message);
    }
  }

  if (SERVICE_KEY && PROJECT_REF) {
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
    } catch (_) {
      console.warn('[DB] Supavisor: all regions failed');
    }
  }

  console.log('[DB] Migration skipped — set DATABASE_URL or SUPABASE_ACCESS_TOKEN to enable.');
}

if (process.env.SKIP_MIGRATIONS === 'true') {
  console.log('[DB] Migrations skipped — SKIP_MIGRATIONS=true');
} else {
  runMigrations();
}

// ── Chat storage bucket setup ─────────────────────────────────────────────────
async function ensureChatBucket() {
  if (!SERVICE_KEY || !SUPABASE_URL) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'chat-files', name: 'chat-files', public: true, file_size_limit: 104857600 }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) console.log('[Chat] Storage bucket chat-files created.');
    else if (body.error === 'Duplicate') console.log('[Chat] Bucket chat-files already exists.');
    else console.warn('[Chat] Bucket creation response:', res.status);
    return true;
  } catch (e) {
    console.warn('[Chat] Bucket setup error:', e.message);
    return false;
  }
}
ensureChatBucket();

// ── JWT verification ───────────────────────────────────────────────────────────
async function verifyJWT(req) {
  if (!SUPABASE_URL) return null;
  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return null;
  // Try ANON_KEY first, then SERVICE_KEY as fallback
  const keysToTry = [ANON_KEY, SERVICE_KEY].filter(Boolean);
  if (!keysToTry.length) return null;
  for (const apikey of keysToTry) {
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}`, apikey },
      });
      if (r.ok) {
        const u = await r.json();
        return u?.id || null;
      }
      console.warn(`[verifyJWT] /auth/v1/user status=${r.status} with key=${apikey === SERVICE_KEY ? 'SERVICE' : 'ANON'}`);
    } catch (e) {
      console.warn('[verifyJWT] fetch error:', e.message);
    }
  }
  return null;
}

async function verifyAdmin(req, res) {
  if (!SERVICE_KEY || !SUPABASE_URL) {
    res.status(503).json({ error: 'Servidor não configurado.' });
    return null;
  }
  const userId = await verifyJWT(req);
  if (!userId) { res.status(401).json({ error: 'Token inválido ou ausente.' }); return null; }

  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=role`,
    { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } }
  );
  const profiles = await profileRes.json().catch(() => []);
  if (!profiles?.[0] || profiles[0].role !== 'admin') {
    res.status(403).json({ error: 'Acesso negado.' });
    return null;
  }
  return userId;
}

// ── Chat file upload (authenticated) ──────────────────────────────────────────
app.post('/api/chat/upload', limiterUpload, express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
  if (!SERVICE_KEY || !SUPABASE_URL) return res.status(503).json({ error: 'Servidor não configurado.' });

  // Require authenticated user
  const userId = await verifyJWT(req);
  if (!userId) return res.status(401).json({ error: 'Autenticação necessária para upload.' });

  const raw = req.headers['x-filename'] || `file_${Date.now()}`;
  const filename = decodeURIComponent(raw).replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 120);
  const contentType = req.headers['x-content-type'] || 'application/octet-stream';
  const storagePath = `chat/${Date.now()}_${filename}`;

  async function doUpload() {
    return fetch(`${SUPABASE_URL}/storage/v1/object/chat-files/${storagePath}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': contentType, 'x-upsert': 'true' },
      body: req.body,
    });
  }

  try {
    let uploadRes = await doUpload();
    if (!uploadRes.ok) {
      const errBody = await uploadRes.json().catch(() => ({}));
      if (uploadRes.status === 400 && errBody.error === 'Bucket not found') {
        await ensureChatBucket();
        uploadRes = await doUpload();
      }
      if (!uploadRes.ok) return res.status(400).json({ error: 'Falha no upload.' });
    }
    res.json({ url: `${SUPABASE_URL}/storage/v1/object/public/chat-files/${storagePath}`, name: filename, type: contentType });
  } catch (e) {
    internalErr(res, e);
  }
});

// ── On-demand migration (double-gated: MIGRATE_SECRET header + admin JWT) ─────
// KB-08 fix: returns 404 (not 401) to hide existence from unauthenticated callers.
// MIGRATE_SECRET must be set as a Railway env var (32+ random chars).
app.post('/api/db/migrate', limiterStrict, async (req, res) => {
  const secret = process.env.MIGRATE_SECRET;
  if (!secret || req.headers['x-migrate-secret'] !== secret) {
    return res.status(404).end(); // looks like "route not found" to scanners
  }
  const callerId = await verifyAdmin(req, res);
  if (!callerId) return;
  try {
    await runMigrations();
    res.json({ ok: true });
  } catch (e) {
    internalErr(res, e);
  }
});

// ── Push Notification endpoints ────────────────────────────────────────────────
app.get('/api/push/vapid-public-key', (req, res) => {
  if (!VAPID_PUBLIC_KEY) return res.status(503).json({ error: 'Push não configurado.' });
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

app.post('/api/push/subscribe', async (req, res) => {
  if (!SERVICE_KEY || !SUPABASE_URL) return res.status(503).json({ error: 'Servidor não configurado.' });
  const userId = await verifyJWT(req);
  if (!userId) return res.status(401).json({ error: 'Token inválido.' });

  const { subscription } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: 'subscription.endpoint obrigatório.' });
  if (typeof subscription.endpoint !== 'string' || subscription.endpoint.length > 2048) {
    return res.status(400).json({ error: 'Endpoint inválido.' });
  }

  const id = 'ps_' + Buffer.from(subscription.endpoint).toString('base64').slice(0, 32).replace(/[^a-zA-Z0-9]/g, '');
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/kanban_push_subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY,
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ id, user_id: userId, endpoint: subscription.endpoint, subscription }),
    });
    res.json({ ok: true });
  } catch (e) {
    internalErr(res, e);
  }
});

app.delete('/api/push/subscribe', async (req, res) => {
  if (!SERVICE_KEY || !SUPABASE_URL) return res.status(503).json({ error: 'Servidor não configurado.' });
  const userId = await verifyJWT(req);
  if (!userId) return res.status(401).json({ error: 'Token inválido.' });

  if (!isValidUUID(userId)) return res.status(400).json({ error: 'ID inválido.' });
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/kanban_push_subscriptions?user_id=eq.${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, Prefer: 'return=minimal' },
    });
    res.json({ ok: true });
  } catch (e) {
    internalErr(res, e);
  }
});

// KB-09 fix: push notify is an admin-only action (sends to all mentioned users)
app.post('/api/push/notify', limiterAdmin, async (req, res) => {
  if (!SERVICE_KEY || !webpush || !SUPABASE_URL) return res.json({ ok: true, skipped: true });
  // Only authenticated users of the app can trigger push notifications.
  // The caller must have a valid Supabase JWT (any authenticated user is acceptable
  // here since the message is validated against real DB data downstream).
  const callerId = await verifyJWT(req);
  if (!callerId) return res.status(401).json({ error: 'Token inválido.' });

  const { content, user_name, channel_name, channel_type, channel_id, mentions } = req.body;
  if (!Array.isArray(mentions) || !mentions.length) return res.json({ ok: true });

  // Validate and sanitize mention IDs — only accept valid UUIDs
  const userIds = [...new Set(
    mentions
      .filter(m => m?.type === 'user' && isValidUUID(m?.id))
      .map(m => m.id)
  )].slice(0, 50); // cap to 50 recipients per notification
  if (!userIds.length) return res.json({ ok: true });

  try {
    const filter = userIds.map(id => `user_id=eq.${id}`).join(',');
    const subsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/kanban_push_subscriptions?or=(${filter})`,
      { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } }
    );
    const subs = await subsRes.json();
    if (!Array.isArray(subs) || !subs.length) return res.json({ ok: true });

    const payload = JSON.stringify({
      title: `${safeStr(user_name, 80)} mencionou você`,
      body: `#${safeStr(channel_name, 80)}: ${safeStr(content, 120)}`,
      tag: `mention-${safeStr(channel_type, 40)}-${safeStr(channel_id, 80)}`,
      url: '/',
    });

    await Promise.allSettled(subs.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, payload, { TTL: 86400 });
      } catch (e) {
        if (e.statusCode === 410 && isValidUUID(row.id)) {
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

// ── Admin: list users ──────────────────────────────────────────────────────────
app.get('/api/admin/users', limiterAdmin, async (req, res) => {
  const callerId = await verifyAdmin(req, res);
  if (!callerId) return;
  try {
    const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    });
    const usersData = await usersRes.json();

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
    internalErr(res, e);
  }
});

// ── Admin: update user role ────────────────────────────────────────────────────
app.post('/api/admin/users/:id/role', limiterAdmin, async (req, res) => {
  const callerId = await verifyAdmin(req, res);
  if (!callerId) return;

  const { id } = req.params;
  if (!isValidUUID(id)) return res.status(400).json({ error: 'ID inválido.' });

  const { role, name, whatsapp } = req.body;

  // Validate role against allowlist
  if (role !== undefined && !isValidRole(role)) {
    return res.status(400).json({ error: 'Role inválida. Use: admin, editor ou viewer.' });
  }

  const patch = {};
  if (role     !== undefined) patch.role     = role;
  if (name     !== undefined) patch.name     = safeStr(name, 200);
  if (whatsapp !== undefined) patch.whatsapp = safeStr(whatsapp, 30);

  try {
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
    internalErr(res, e);
  }
});

// ── Public signup ──────────────────────────────────────────────────────────────
app.post('/api/auth/signup', limiterStrict, async (req, res) => {
  if (!SERVICE_KEY || !SUPABASE_URL) return res.status(503).json({ error: 'Servidor não configurado para criar contas.' });

  const { email, password, name = '', phone = '' } = req.body;
  if (!email || !password)         return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  if (!isValidEmail(email))        return res.status(400).json({ error: 'Email inválido.' });
  if (password.length < 8)         return res.status(400).json({ error: 'A senha precisa ter pelo menos 8 caracteres.' });
  if (password.length > 128)       return res.status(400).json({ error: 'Senha muito longa.' });

  try {
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, email_confirm: true }),
    });
    let userData = {};
    try { userData = await createRes.json(); } catch (_) {}

    if (!createRes.ok) {
      // Return a safe error — avoid leaking internal Supabase messages
      const userMsg = userData?.message || userData?.msg || userData?.error || '';
      const safe = userMsg.toLowerCase().includes('already') ? 'Este email já está cadastrado.' : 'Não foi possível criar a conta.';
      return res.status(createRes.status).json({ error: safe });
    }

    if (userData.id) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY,
          'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          id: userData.id,
          email: email.trim().toLowerCase(),
          role: 'editor',
          name: safeStr(name, 200),
          whatsapp: safeStr(phone, 30),
        }),
      });
    }

    res.json({ ok: true });
  } catch (e) {
    internalErr(res, e);
  }
});

// ── Admin: invite user ─────────────────────────────────────────────────────────
app.post('/api/admin/invite', limiterAdmin, async (req, res) => {
  const callerId = await verifyAdmin(req, res);
  if (!callerId) return;

  const { email, role: inviteRole = 'viewer', name = '', whatsapp = '' } = req.body;
  if (!email)               return res.status(400).json({ error: 'Email obrigatório.' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Email inválido.' });
  if (!isValidRole(inviteRole)) return res.status(400).json({ error: 'Role inválida.' });

  try {
    const inviteRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    let inviteData = {};
    try { inviteData = await inviteRes.json(); } catch (_) {}

    if (!inviteRes.ok) {
      return res.status(inviteRes.status).json({ error: 'Não foi possível convidar o usuário.' });
    }

    if (inviteData.id) {
      const profileHeaders = {
        Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      };
      const profileBody = {
        role: inviteRole,
        name: safeStr(name, 200),
        whatsapp: safeStr(whatsapp, 30),
      };

      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${inviteData.id}`, {
        method: 'PATCH', headers: profileHeaders, body: JSON.stringify(profileBody),
      });

      if (patchRes.headers.get('content-range') === '*/0' || patchRes.status === 204) {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
          method: 'POST',
          headers: { ...profileHeaders, Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify({ id: inviteData.id, email: email.trim().toLowerCase(), ...profileBody }),
        });
      }
    }

    res.json({ ok: true, userId: inviteData.id });
  } catch (e) {
    internalErr(res, e);
  }
});

// ── Admin: delete user ─────────────────────────────────────────────────────────
app.delete('/api/admin/users/:id', limiterAdmin, async (req, res) => {
  const callerId = await verifyAdmin(req, res);
  if (!callerId) return;

  const { id } = req.params;
  if (!isValidUUID(id)) return res.status(400).json({ error: 'ID inválido.' });
  if (id === callerId) return res.status(400).json({ error: 'Você não pode remover a si mesmo.' });

  try {
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
    internalErr(res, e);
  }
});

// ── WhatsApp (Evolution API) ───────────────────────────────────────────────────
const EVO_URL      = (process.env.EVOLUTION_API_URL || '').replace(/\/$/, '');
const EVO_KEY      = process.env.EVOLUTION_API_KEY || '';
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE || 'ActiveSales';

// GET /api/whatsapp/groups — lista grupos da instância (auth obrigatória)
app.get('/api/whatsapp/groups', limiterGeneral, async (req, res) => {
  const callerId = await verifyJWT(req);
  if (!callerId) return res.status(401).json({ error: 'Token inválido.' });
  if (!EVO_URL || !EVO_KEY) return res.status(503).json({ error: 'WhatsApp não configurado.' });

  try {
    const r = await fetch(`${EVO_URL}/group/fetchAllGroups/${EVO_INSTANCE}?getParticipants=false`, {
      headers: { apikey: EVO_KEY },
    });
    if (!r.ok) return res.status(r.status).json({ error: 'Erro ao buscar grupos.' });
    const groups = await r.json();
    const list = (Array.isArray(groups) ? groups : [])
      .filter(g => g.id && g.subject)
      .map(g => ({ id: g.id, name: g.subject }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ groups: list });
  } catch (e) {
    internalErr(res, e);
  }
});

// POST /api/whatsapp/send-report — envia relatório para um grupo com @menções
app.post('/api/whatsapp/send-report', limiterGeneral, async (req, res) => {
  const callerId = await verifyJWT(req);
  if (!callerId) return res.status(401).json({ error: 'Token inválido.' });
  if (!EVO_URL || !EVO_KEY) return res.status(503).json({ error: 'WhatsApp não configurado.' });

  const { groupId, reportText, members } = req.body;
  if (!groupId || typeof groupId !== 'string') return res.status(400).json({ error: 'groupId obrigatório.' });
  if (!reportText || typeof reportText !== 'string') return res.status(400).json({ error: 'reportText obrigatório.' });
  if (!/^\d+@g\.us$/.test(groupId)) return res.status(400).json({ error: 'groupId inválido.' });

  // Normaliza número: remove tudo que não é dígito
  function cleanNumber(n) { return String(n || '').replace(/\D/g, ''); }

  // Monta mapa nome → número
  const memberMap = {};
  if (Array.isArray(members)) {
    members.forEach(m => {
      const num = cleanNumber(m.whatsapp);
      if (m.name && num.length >= 10) memberMap[m.name] = num;
    });
  }

  // Substitui "👤 Nome" por "@numero" e coleta menções
  const mentioned = [];
  let text = safeStr(reportText, 8000);
  Object.entries(memberMap).forEach(([name, num]) => {
    const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`👤 ${safeName}`, 'g');
    if (re.test(text)) {
      text = text.replace(new RegExp(`👤 ${safeName}`, 'g'), `@${num}`);
      mentioned.push(`${num}@s.whatsapp.net`);
    }
  });

  try {
    const payload = { number: groupId, text };
    if (mentioned.length) payload.mentioned = [...new Set(mentioned)];

    const r = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
      method: 'POST',
      headers: { apikey: EVO_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}));
      return res.status(r.status).json({ error: errBody?.message || 'Erro ao enviar mensagem.' });
    }
    res.json({ ok: true });
  } catch (e) {
    internalErr(res, e);
  }
});

// ── Serve React build ──────────────────────────────────────────────────────────
const distPath = path.join(__dirname, 'client', 'dist');
app.use(express.static(distPath));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🛡️  Kanban Pro running on port ${PORT} — Ximinoze on guard.`);
});
