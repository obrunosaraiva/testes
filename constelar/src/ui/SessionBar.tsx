import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { connect, newRoomId } from '../net'

/** Controla a sessão online: terapeuta inicia a sala, cliente entra pelo link. */
export function SessionBar() {
  const role = useStore((s) => s.role)
  const conn = useStore((s) => s.conn)
  const participants = useStore((s) => s.participants)
  const allowGuestMove = useStore((s) => s.ambiance.allowGuestMove)
  const setAmbiance = useStore((s) => s.setAmbiance)

  const [copied, setCopied] = useState(false)

  // ?sala=CÓDIGO&host=1 → terapeuta (host); ?sala=CÓDIGO → cliente (guest)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const sala = params.get('sala')
    const wantHost = params.get('host') === '1'
    if (sala && useStore.getState().role === 'solo') {
      connect(sala, wantHost ? 'host' : 'guest')
    }
  }, [])

  const startSession = () => {
    const id = newRoomId()
    const url = new URL(location.href)
    url.searchParams.set('sala', id)
    history.replaceState(null, '', url.toString())
    connect(id, 'host')
  }

  const copyLink = async () => {
    try {
      // link do cliente = mesma sala, mas sem o parâmetro host
      const url = new URL(location.href)
      url.searchParams.delete('host')
      await navigator.clipboard.writeText(url.toString())
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard indisponível */
    }
  }

  const dot =
    conn === 'online' ? 'dot-on' : conn === 'connecting' ? 'dot-mid' : 'dot-off'

  // cliente (guest)
  if (role === 'guest') {
    return (
      <div className="session">
        <span className={`dot ${dot}`} />
        <span className="session-text">
          {conn === 'online' ? 'Conectado à sala do terapeuta' : conn === 'connecting' ? 'Conectando…' : 'Sem conexão'}
        </span>
      </div>
    )
  }

  // terapeuta ainda não iniciou (solo)
  if (role === 'solo') {
    return (
      <div className="session">
        <button className="btn-session" onClick={startSession}>
          ▶ Iniciar sessão online
        </button>
      </div>
    )
  }

  // terapeuta (host) com sala ativa
  return (
    <div className="session">
      <span className={`dot ${dot}`} />
      <span className="session-text">
        {participants > 1 ? `Cliente na sala · ${participants} conectados` : 'Aguardando o cliente…'}
      </span>
      <button className="btn-session" onClick={copyLink}>
        {copied ? '✓ Copiado' : '🔗 Copiar link do cliente'}
      </button>
      <label className="toggle mini">
        <input
          type="checkbox"
          checked={allowGuestMove}
          onChange={(e) => setAmbiance({ allowGuestMove: e.target.checked })}
        />
        Cliente pode mover
      </label>
    </div>
  )
}
