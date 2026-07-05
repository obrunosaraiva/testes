import express from 'express'
import { db, now } from './db.mjs'
import { uid, hashPassword, verifyPassword, signToken, requireAuth } from './auth.mjs'

export const api = express.Router()
api.use(express.json({ limit: '12mb' })) // imagens de solução chegam como data URL

const publicTherapist = (t) => ({ id: t.id, name: t.name, email: t.email, bio: t.bio, avatar: t.avatar })
const roomCode = () => Math.random().toString(36).slice(2, 8)

// ---------- Auth ----------
api.post('/auth/register', (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name || !email || !password) return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' })
  const exists = db.prepare('SELECT id FROM therapists WHERE email = ?').get(email.toLowerCase())
  if (exists) return res.status(409).json({ error: 'Já existe uma conta com este e-mail' })
  const t = {
    id: uid(),
    name,
    email: email.toLowerCase(),
    pass_hash: hashPassword(password),
    bio: '',
    avatar: '',
    created_at: now(),
  }
  db.prepare(
    'INSERT INTO therapists (id,name,email,pass_hash,bio,avatar,created_at) VALUES (?,?,?,?,?,?,?)'
  ).run(t.id, t.name, t.email, t.pass_hash, t.bio, t.avatar, t.created_at)
  res.json({ token: signToken({ sub: t.id }), therapist: publicTherapist(t) })
})

api.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {}
  const t = db.prepare('SELECT * FROM therapists WHERE email = ?').get((email || '').toLowerCase())
  if (!t || !verifyPassword(password || '', t.pass_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos' })
  }
  res.json({ token: signToken({ sub: t.id }), therapist: publicTherapist(t) })
})

// tudo abaixo exige autenticação
api.use(requireAuth)

api.get('/me', (req, res) => {
  const t = db.prepare('SELECT * FROM therapists WHERE id = ?').get(req.therapistId)
  if (!t) return res.status(404).json({ error: 'Não encontrado' })
  res.json(publicTherapist(t))
})

api.put('/me', (req, res) => {
  const { name, bio, avatar } = req.body || {}
  const t = db.prepare('SELECT * FROM therapists WHERE id = ?').get(req.therapistId)
  if (!t) return res.status(404).json({ error: 'Não encontrado' })
  db.prepare('UPDATE therapists SET name = ?, bio = ?, avatar = ? WHERE id = ?').run(
    name ?? t.name,
    bio ?? t.bio,
    avatar ?? t.avatar,
    t.id
  )
  res.json(publicTherapist(db.prepare('SELECT * FROM therapists WHERE id = ?').get(t.id)))
})

// ---------- Clientes ----------
api.get('/clients', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM clients WHERE therapist_id = ? ORDER BY name COLLATE NOCASE')
    .all(req.therapistId)
  res.json(rows)
})

api.post('/clients', (req, res) => {
  const { name, contact, notes } = req.body || {}
  if (!name) return res.status(400).json({ error: 'Nome do cliente é obrigatório' })
  const c = { id: uid(), therapist_id: req.therapistId, name, contact: contact || '', notes: notes || '', created_at: now() }
  db.prepare('INSERT INTO clients (id,therapist_id,name,contact,notes,created_at) VALUES (?,?,?,?,?,?)').run(
    c.id, c.therapist_id, c.name, c.contact, c.notes, c.created_at
  )
  res.json(c)
})

const ownClient = (req, id) =>
  db.prepare('SELECT * FROM clients WHERE id = ? AND therapist_id = ?').get(id, req.therapistId)

api.get('/clients/:id', (req, res) => {
  const c = ownClient(req, req.params.id)
  if (!c) return res.status(404).json({ error: 'Cliente não encontrado' })
  const sessions = db
    .prepare('SELECT * FROM sessions WHERE client_id = ? AND therapist_id = ? ORDER BY created_at DESC')
    .all(c.id, req.therapistId)
  res.json({ ...c, sessions })
})

api.put('/clients/:id', (req, res) => {
  const c = ownClient(req, req.params.id)
  if (!c) return res.status(404).json({ error: 'Cliente não encontrado' })
  const { name, contact, notes } = req.body || {}
  db.prepare('UPDATE clients SET name = ?, contact = ?, notes = ? WHERE id = ?').run(
    name ?? c.name, contact ?? c.contact, notes ?? c.notes, c.id
  )
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(c.id))
})

api.delete('/clients/:id', (req, res) => {
  const c = ownClient(req, req.params.id)
  if (!c) return res.status(404).json({ error: 'Cliente não encontrado' })
  db.prepare('DELETE FROM clients WHERE id = ?').run(c.id)
  res.json({ ok: true })
})

// ---------- Sessões ----------
api.get('/sessions', (req, res) => {
  const { status } = req.query
  const base =
    'SELECT s.*, c.name AS client_name FROM sessions s LEFT JOIN clients c ON c.id = s.client_id WHERE s.therapist_id = ?'
  const rows = status
    ? db.prepare(`${base} AND s.status = ? ORDER BY s.scheduled_at`).all(req.therapistId, status)
    : db.prepare(`${base} ORDER BY s.scheduled_at`).all(req.therapistId)
  res.json(rows)
})

api.post('/sessions', (req, res) => {
  const { client_id, scheduled_at, type } = req.body || {}
  if (client_id) {
    const c = ownClient(req, client_id)
    if (!c) return res.status(400).json({ error: 'Cliente inválido' })
  }
  const s = {
    id: uid(),
    therapist_id: req.therapistId,
    client_id: client_id || null,
    scheduled_at: scheduled_at || null,
    status: 'agendada',
    type: type === 'grupo' ? 'grupo' : 'individual',
    room_code: roomCode(),
    created_at: now(),
  }
  db.prepare(
    'INSERT INTO sessions (id,therapist_id,client_id,scheduled_at,status,type,room_code,created_at) VALUES (?,?,?,?,?,?,?,?)'
  ).run(s.id, s.therapist_id, s.client_id, s.scheduled_at, s.status, s.type, s.room_code, s.created_at)
  res.json(s)
})

const ownSession = (req, id) =>
  db.prepare('SELECT * FROM sessions WHERE id = ? AND therapist_id = ?').get(id, req.therapistId)

api.get('/sessions/:id', (req, res) => {
  const s = ownSession(req, req.params.id)
  if (!s) return res.status(404).json({ error: 'Sessão não encontrada' })
  const client = s.client_id ? db.prepare('SELECT * FROM clients WHERE id = ?').get(s.client_id) : null
  const notes = db.prepare('SELECT * FROM notes WHERE session_id = ? ORDER BY created_at DESC').all(s.id)
  const snapshots = db.prepare('SELECT * FROM snapshots WHERE session_id = ? ORDER BY created_at DESC').all(s.id)
  res.json({ ...s, client, notes, snapshots })
})

api.put('/sessions/:id', (req, res) => {
  const s = ownSession(req, req.params.id)
  if (!s) return res.status(404).json({ error: 'Sessão não encontrada' })
  const { status, scheduled_at, type, client_id } = req.body || {}
  db.prepare('UPDATE sessions SET status = ?, scheduled_at = ?, type = ?, client_id = ? WHERE id = ?').run(
    status ?? s.status,
    scheduled_at ?? s.scheduled_at,
    type ?? s.type,
    client_id ?? s.client_id,
    s.id
  )
  res.json(db.prepare('SELECT * FROM sessions WHERE id = ?').get(s.id))
})

api.delete('/sessions/:id', (req, res) => {
  const s = ownSession(req, req.params.id)
  if (!s) return res.status(404).json({ error: 'Sessão não encontrada' })
  db.prepare('DELETE FROM sessions WHERE id = ?').run(s.id)
  res.json({ ok: true })
})

// ---------- Prontuário (anotações) ----------
api.post('/sessions/:id/notes', (req, res) => {
  const s = ownSession(req, req.params.id)
  if (!s) return res.status(404).json({ error: 'Sessão não encontrada' })
  const { body } = req.body || {}
  if (!body) return res.status(400).json({ error: 'Texto da anotação é obrigatório' })
  const n = { id: uid(), session_id: s.id, body, created_at: now() }
  db.prepare('INSERT INTO notes (id,session_id,body,created_at) VALUES (?,?,?,?)').run(n.id, n.session_id, n.body, n.created_at)
  res.json(n)
})

api.get('/sessions/:id/notes', (req, res) => {
  const s = ownSession(req, req.params.id)
  if (!s) return res.status(404).json({ error: 'Sessão não encontrada' })
  res.json(db.prepare('SELECT * FROM notes WHERE session_id = ? ORDER BY created_at DESC').all(s.id))
})

// ---------- Imagens de solução ----------
api.post('/sessions/:id/snapshots', (req, res) => {
  const s = ownSession(req, req.params.id)
  if (!s) return res.status(404).json({ error: 'Sessão não encontrada' })
  const { image, caption, moment } = req.body || {}
  if (!image) return res.status(400).json({ error: 'Imagem é obrigatória' })
  const snap = { id: uid(), session_id: s.id, image, caption: caption || '', moment: moment || 'solucao', created_at: now() }
  db.prepare('INSERT INTO snapshots (id,session_id,image,caption,moment,created_at) VALUES (?,?,?,?,?,?)').run(
    snap.id, snap.session_id, snap.image, snap.caption, snap.moment, snap.created_at
  )
  res.json({ ...snap, image: '[stored]' })
})

api.get('/sessions/:id/snapshots', (req, res) => {
  const s = ownSession(req, req.params.id)
  if (!s) return res.status(404).json({ error: 'Sessão não encontrada' })
  res.json(db.prepare('SELECT * FROM snapshots WHERE session_id = ? ORDER BY created_at DESC').all(s.id))
})

// resolve o código da sala -> sessão (para o app do campo saber a que sessão pertence)
api.get('/rooms/:code', (req, res) => {
  const s = db
    .prepare('SELECT id, room_code, type, status FROM sessions WHERE room_code = ? AND therapist_id = ?')
    .get(req.params.code, req.therapistId)
  if (!s) return res.status(404).json({ error: 'Sala não encontrada' })
  res.json(s)
})
