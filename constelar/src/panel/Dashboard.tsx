import { useEffect, useState } from 'react'
import { api, setToken, type Therapist, type Client, type Session } from '../api'

type View = 'home' | 'clients' | 'sessions' | 'session' | 'profile'

const STATUS_LABEL: Record<string, string> = { agendada: 'Agendada', realizada: 'Realizada', cancelada: 'Cancelada' }
const roomLink = (code: string) => `${location.origin}/?sala=${code}` // link do cliente
const hostLink = (code: string) => `${location.origin}/?sala=${code}&host=1` // terapeuta abre o campo
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Sem data'

export function Dashboard({ therapist, onLogout }: { therapist: Therapist; onLogout: () => void }) {
  const [view, setView] = useState<View>('home')
  const [sessionId, setSessionId] = useState<string | null>(null)

  const openSession = (id: string) => {
    setSessionId(id)
    setView('session')
  }

  return (
    <div className="dash">
      <aside className="dash-nav">
        <div className="dash-brand">
          <span className="logo">✦</span> Constelar
        </div>
        <nav>
          {(['home', 'clients', 'sessions', 'profile'] as View[]).map((v) => (
            <button key={v} className={view === v ? 'nav-item active' : 'nav-item'} onClick={() => setView(v)}>
              {v === 'home' ? '🏠 Início' : v === 'clients' ? '👤 Clientes' : v === 'sessions' ? '🗓️ Sessões' : '⚙️ Perfil'}
            </button>
          ))}
        </nav>
        <div className="dash-user">
          <div className="dash-user-name">{therapist.name}</div>
          <button className="link-btn" onClick={onLogout}>
            Sair
          </button>
        </div>
      </aside>

      <main className="dash-main">
        {view === 'home' && <Home therapist={therapist} onOpenSession={openSession} onGoSessions={() => setView('sessions')} />}
        {view === 'clients' && <Clients />}
        {view === 'sessions' && <Sessions onOpenSession={openSession} />}
        {view === 'session' && sessionId && <SessionDetail id={sessionId} onBack={() => setView('sessions')} />}
        {view === 'profile' && <Profile therapist={therapist} onLogout={onLogout} />}
      </main>
    </div>
  )
}

// ---------- Início ----------
function Home({
  therapist,
  onOpenSession,
  onGoSessions,
}: {
  therapist: Therapist
  onOpenSession: (id: string) => void
  onGoSessions: () => void
}) {
  const [clients, setClients] = useState<Client[]>([])
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    api.clients().then(setClients).catch(() => {})
    api.sessions('agendada').then(setSessions).catch(() => {})
  }, [])

  return (
    <div>
      <h1 className="dash-h1">Olá, {therapist.name.split(' ')[0]} 🌱</h1>
      <p className="dash-lead">Bem-vinda ao seu consultório digital de constelação.</p>

      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-num">{clients.length}</div>
          <div className="stat-label">Clientes</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{sessions.length}</div>
          <div className="stat-label">Sessões agendadas</div>
        </div>
      </div>

      <div className="section-head">
        <h2>Próximas sessões</h2>
        <button className="link-btn" onClick={onGoSessions}>
          ver todas
        </button>
      </div>
      {sessions.length === 0 ? (
        <p className="muted">Nenhuma sessão agendada. Crie uma em “Sessões”.</p>
      ) : (
        <ul className="list">
          {sessions.map((s) => (
            <li key={s.id} className="list-row" onClick={() => onOpenSession(s.id)}>
              <span>{s.client_name || 'Sem cliente'}</span>
              <span className="muted">{fmtDate(s.scheduled_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------- Clientes ----------
function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [q, setQ] = useState('')

  const load = () => api.clients().then(setClients).catch(() => {})
  useEffect(() => { load() }, [])

  const add = async () => {
    if (!name.trim()) return
    await api.createClient({ name: name.trim(), contact: contact.trim() })
    setName('')
    setContact('')
    load()
  }

  const remove = async (id: string) => {
    await api.deleteClient(id)
    load()
  }

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <h1 className="dash-h1">Clientes</h1>
      <div className="inline-form">
        <input className="text-input" placeholder="Nome do cliente" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="text-input" placeholder="Contato (opcional)" value={contact} onChange={(e) => setContact(e.target.value)} />
        <button className="btn-primary compact" onClick={add}>
          + Adicionar
        </button>
      </div>

      <input className="text-input search" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />

      {filtered.length === 0 ? (
        <p className="muted">Nenhum cliente ainda.</p>
      ) : (
        <ul className="list">
          {filtered.map((c) => (
            <li key={c.id} className="list-row">
              <div>
                <div>{c.name}</div>
                {c.contact && <div className="muted small">{c.contact}</div>}
              </div>
              <button className="link-btn danger" onClick={() => remove(c.id)}>
                remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------- Sessões ----------
function Sessions({ onOpenSession }: { onOpenSession: (id: string) => void }) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [when, setWhen] = useState('')
  const [type, setType] = useState('individual')
  const [copied, setCopied] = useState<string | null>(null)

  const load = () => api.sessions().then(setSessions).catch(() => {})
  useEffect(() => {
    load()
    api.clients().then(setClients).catch(() => {})
  }, [])

  const create = async () => {
    await api.createSession({
      client_id: clientId || undefined,
      scheduled_at: when ? new Date(when).toISOString() : undefined,
      type,
    })
    setWhen('')
    load()
  }

  const copy = async (code: string) => {
    await navigator.clipboard.writeText(roomLink(code)).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(null), 1800)
  }

  return (
    <div>
      <h1 className="dash-h1">Sessões</h1>

      <div className="card create-card">
        <div className="card-title">Nova sessão</div>
        <div className="inline-form wrap">
          <select className="text-input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Sem cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input className="text-input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          <select className="text-input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="individual">Individual</option>
            <option value="grupo">Grupo</option>
          </select>
          <button className="btn-primary compact" onClick={create}>
            Agendar
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="muted">Nenhuma sessão ainda.</p>
      ) : (
        <ul className="list">
          {sessions.map((s) => (
            <li key={s.id} className="session-row">
              <div className="session-main" onClick={() => onOpenSession(s.id)}>
                <span className={`badge ${s.status}`}>{STATUS_LABEL[s.status]}</span>
                <span className="session-client">{s.client_name || 'Sem cliente'}</span>
                <span className="muted small">{fmtDate(s.scheduled_at)}</span>
              </div>
              <div className="session-actions">
                <button className="chip" onClick={() => copy(s.room_code)}>
                  {copied === s.room_code ? '✓ copiado' : '🔗 link'}
                </button>
                <a className="chip" href={hostLink(s.room_code)} target="_blank" rel="noreferrer">
                  ▶ campo
                </a>
                <button className="chip" onClick={() => onOpenSession(s.id)}>
                  detalhes
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------- Detalhe da sessão ----------
function SessionDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.session>> | null>(null)
  const [note, setNote] = useState('')

  const load = () => api.session(id).then(setData).catch(() => {})
  useEffect(() => { load() }, [id])

  if (!data) return <p className="muted">Carregando…</p>

  const addNote = async () => {
    if (!note.trim()) return
    await api.addNote(id, note.trim())
    setNote('')
    load()
  }

  const setStatus = async (status: string) => {
    await api.updateSession(id, { status: status as Session['status'] })
    load()
  }

  return (
    <div>
      <button className="link-btn" onClick={onBack}>
        ← voltar
      </button>
      <h1 className="dash-h1">{data.client?.name || 'Sessão sem cliente'}</h1>
      <div className="detail-meta">
        <span className={`badge ${data.status}`}>{STATUS_LABEL[data.status]}</span>
        <span className="muted">{fmtDate(data.scheduled_at)}</span>
        <span className="muted">· {data.type === 'grupo' ? 'Grupo' : 'Individual'}</span>
      </div>

      <div className="detail-actions">
        <a className="chip" href={hostLink(data.room_code)} target="_blank" rel="noreferrer">
          ▶ Abrir campo
        </a>
        <button className="chip" onClick={() => navigator.clipboard.writeText(roomLink(data.room_code))}>
          🔗 Copiar link do cliente
        </button>
        <select className="text-input tiny" value={data.status} onChange={(e) => setStatus(e.target.value)}>
          <option value="agendada">Agendada</option>
          <option value="realizada">Realizada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      <div className="two-col">
        <section>
          <h2>Prontuário</h2>
          <div className="note-add">
            <textarea
              className="text-input"
              rows={3}
              placeholder="Anotação privada sobre a sessão…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button className="btn-primary compact" onClick={addNote}>
              Salvar anotação
            </button>
          </div>
          {data.notes.length === 0 ? (
            <p className="muted">Sem anotações.</p>
          ) : (
            <ul className="notes">
              {data.notes.map((n) => (
                <li key={n.id}>
                  <div className="muted small">{fmtDate(n.created_at)}</div>
                  <div>{n.body}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2>Imagens de solução</h2>
          {data.snapshots.length === 0 ? (
            <p className="muted">Nenhuma imagem salva ainda. Elas são capturadas no campo.</p>
          ) : (
            <div className="gallery">
              {data.snapshots.map((s) => (
                <figure key={s.id}>
                  <img src={s.image} alt={s.caption} />
                  {s.caption && <figcaption>{s.caption}</figcaption>}
                </figure>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ---------- Perfil ----------
function Profile({ therapist, onLogout }: { therapist: Therapist; onLogout: () => void }) {
  const [name, setName] = useState(therapist.name)
  const [bio, setBio] = useState(therapist.bio)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    await api.updateMe({ name, bio })
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div>
      <h1 className="dash-h1">Perfil</h1>
      <div className="form-col">
        <label className="field-label">Nome</label>
        <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="field-label">Bio</label>
        <textarea className="text-input" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
        <div className="muted small">{therapist.email}</div>
        <div className="profile-actions">
          <button className="btn-primary compact" onClick={save}>
            {saved ? '✓ Salvo' : 'Salvar'}
          </button>
          <button className="btn-danger compact" onClick={onLogout}>
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  )
}

export function logout() {
  setToken(null)
}
