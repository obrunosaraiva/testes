import { useState, type FormEvent } from 'react'
import { api, setToken, type Therapist } from '../api'

export function Auth({ onAuth }: { onAuth: (t: Therapist) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = mode === 'login' ? await api.login(email, password) : await api.register(name, email, password)
      setToken(res.token)
      onAuth(res.therapist)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="logo">✦</span> Constelar
        </div>
        <p className="auth-sub">Atendimento de constelação sistêmica online</p>

        <div className="seg auth-seg">
          <button className={mode === 'login' ? 'seg-btn active' : 'seg-btn'} onClick={() => setMode('login')}>
            Entrar
          </button>
          <button className={mode === 'register' ? 'seg-btn active' : 'seg-btn'} onClick={() => setMode('register')}>
            Criar conta
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && (
            <input className="text-input" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required />
          )}
          <input
            className="text-input"
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="text-input"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="auth-error">{error}</div>}
          <button className="btn-primary" disabled={busy} type="submit">
            {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar minha conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
