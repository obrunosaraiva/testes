// Cliente da API Constelar. Token guardado no localStorage.
const TOKEN_KEY = 'constelar_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)

export interface Therapist { id: string; name: string; email: string; bio: string; avatar: string }
export interface Client { id: string; name: string; contact: string; notes: string; created_at: string }
export interface Session {
  id: string
  client_id: string | null
  client_name?: string
  scheduled_at: string | null
  status: 'agendada' | 'realizada' | 'cancelada'
  type: 'individual' | 'grupo'
  room_code: string
  created_at: string
}
export interface Note { id: string; body: string; created_at: string }
export interface Snapshot { id: string; image: string; caption: string; moment: string; created_at: string }

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const res = await fetch('/api' + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || `Erro ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  register: (name: string, email: string, password: string) =>
    req<{ token: string; therapist: Therapist }>('POST', '/auth/register', { name, email, password }),
  login: (email: string, password: string) =>
    req<{ token: string; therapist: Therapist }>('POST', '/auth/login', { email, password }),
  me: () => req<Therapist>('GET', '/me'),
  updateMe: (patch: Partial<Pick<Therapist, 'name' | 'bio' | 'avatar'>>) => req<Therapist>('PUT', '/me', patch),

  clients: () => req<Client[]>('GET', '/clients'),
  createClient: (data: { name: string; contact?: string; notes?: string }) => req<Client>('POST', '/clients', data),
  client: (id: string) => req<Client & { sessions: Session[] }>('GET', `/clients/${id}`),
  deleteClient: (id: string) => req<{ ok: boolean }>('DELETE', `/clients/${id}`),

  sessions: (status?: string) => req<Session[]>('GET', `/sessions${status ? `?status=${status}` : ''}`),
  createSession: (data: { client_id?: string; scheduled_at?: string; type?: string }) =>
    req<Session>('POST', '/sessions', data),
  session: (id: string) =>
    req<Session & { client: Client | null; notes: Note[]; snapshots: Snapshot[] }>('GET', `/sessions/${id}`),
  updateSession: (id: string, patch: Partial<Session>) => req<Session>('PUT', `/sessions/${id}`, patch),
  deleteSession: (id: string) => req<{ ok: boolean }>('DELETE', `/sessions/${id}`),

  addNote: (sessionId: string, body: string) => req<Note>('POST', `/sessions/${sessionId}/notes`, { body }),
  addSnapshot: (sessionId: string, image: string, caption?: string, moment?: string) =>
    req<Snapshot>('POST', `/sessions/${sessionId}/snapshots`, { image, caption, moment }),

  room: (code: string) => req<{ id: string; room_code: string; type: string; status: string }>('GET', `/rooms/${code}`),

  recordings: (sessionId: string) =>
    req<{ id: string; duration: number; size: number; created_at: string }[]>('GET', `/sessions/${sessionId}/recordings`),
  recordingUrl: (id: string) => `/api/recordings/${id}/file?token=${encodeURIComponent(getToken() || '')}`,
  uploadRecording: async (sessionId: string, blob: Blob, duration: number) => {
    const res = await fetch(`/api/sessions/${sessionId}/recordings?duration=${Math.round(duration)}`, {
      method: 'POST',
      headers: { 'content-type': 'video/webm', authorization: 'Bearer ' + (getToken() || '') },
      body: blob,
    })
    if (!res.ok) throw new Error('Falha ao enviar gravação')
    return res.json()
  },
}
