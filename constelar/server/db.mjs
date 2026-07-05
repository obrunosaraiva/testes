// Banco de dados do Constelar usando o SQLite embutido do Node (node:sqlite).
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, 'data')
mkdirSync(dataDir, { recursive: true })

const dbPath = process.env.CONSTELAR_DB || join(dataDir, 'constelar.db')
export const db = new DatabaseSync(dbPath)

db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')

db.exec(`
  CREATE TABLE IF NOT EXISTS therapists (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    pass_hash  TEXT NOT NULL,
    bio        TEXT DEFAULT '',
    avatar     TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clients (
    id           TEXT PRIMARY KEY,
    therapist_id TEXT NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    contact      TEXT DEFAULT '',
    notes        TEXT DEFAULT '',
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id           TEXT PRIMARY KEY,
    therapist_id TEXT NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
    client_id    TEXT REFERENCES clients(id) ON DELETE SET NULL,
    scheduled_at TEXT,
    status       TEXT NOT NULL DEFAULT 'agendada',
    type         TEXT NOT NULL DEFAULT 'individual',
    room_code    TEXT NOT NULL UNIQUE,
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id         TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS snapshots (
    id         TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    image      TEXT NOT NULL,
    caption    TEXT DEFAULT '',
    moment     TEXT DEFAULT 'solucao',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_clients_therapist ON clients(therapist_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_therapist ON sessions(therapist_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_room ON sessions(room_code);
  CREATE INDEX IF NOT EXISTS idx_notes_session ON notes(session_id);
  CREATE INDEX IF NOT EXISTS idx_snapshots_session ON snapshots(session_id);
`)

export function now() {
  // ISO sem depender de Date.now proibido em outros contextos; aqui no servidor é permitido
  return new Date().toISOString()
}
