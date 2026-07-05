import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { connect, newRoomId } from '../net'
import { useT } from '../i18n'

/** Controla a sessão online: terapeuta inicia a sala, cliente entra pelo link. */
export function SessionBar() {
  const role = useStore((s) => s.role)
  const conn = useStore((s) => s.conn)
  const participants = useStore((s) => s.participants)
  const allowGuestMove = useStore((s) => s.ambiance.allowGuestMove)
  const setAmbiance = useStore((s) => s.setAmbiance)
  const t = useT()

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
          {conn === 'online'
            ? t('session.connectedGuest')
            : conn === 'connecting'
              ? t('session.connecting')
              : t('session.offline')}
        </span>
      </div>
    )
  }

  // terapeuta ainda não iniciou (solo)
  if (role === 'solo') {
    return (
      <div className="session">
        <button className="btn-session" onClick={startSession}>
          {t('session.start')}
        </button>
      </div>
    )
  }

  // terapeuta (host) com sala ativa
  return (
    <div className="session">
      <span className={`dot ${dot}`} />
      <span className="session-text">
        {participants > 1
          ? `${t('session.clientIn')} · ${t('session.connectedCount', { n: participants })}`
          : t('session.waiting')}
      </span>
      <button className="btn-session" onClick={copyLink}>
        {copied ? t('session.copied') : t('session.copyLink')}
      </button>
      <label className="toggle mini">
        <input
          type="checkbox"
          checked={allowGuestMove}
          onChange={(e) => setAmbiance({ allowGuestMove: e.target.checked })}
        />
        {t('session.guestCanMove')}
      </label>
    </div>
  )
}
