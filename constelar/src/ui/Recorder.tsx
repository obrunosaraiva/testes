import { useEffect, useRef, useState } from 'react'
import { startFieldRecording, type ActiveRecording } from '../recorder'
import { api, getToken } from '../api'
import { useT } from '../i18n'

type Phase = 'idle' | 'consent' | 'recording' | 'saving'

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Gravação da sessão (só terapeuta), com consentimento obrigatório. */
export function Recorder() {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('idle')
  const [agreed, setAgreed] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const recRef = useRef<ActiveRecording | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  const begin = async () => {
    try {
      const rec = await startFieldRecording()
      recRef.current = rec
      setPhase('recording')
      setElapsed(0)
      timer.current = window.setInterval(() => setElapsed(Date.now() - rec.startedAt), 500)
    } catch {
      setPhase('idle')
    }
  }

  const stop = async () => {
    if (!recRef.current) return
    if (timer.current) clearInterval(timer.current)
    const rec = recRef.current
    recRef.current = null
    setPhase('saving')
    const blob = await rec.stop()
    const duration = (Date.now() - rec.startedAt) / 1000

    // download local
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `constelacao-${new Date().toISOString().slice(0, 16)}.webm`
    a.click()
    URL.revokeObjectURL(url)

    // salva na sessão, se logado e vinculado a uma sala
    const code = new URLSearchParams(location.search).get('sala')
    if (getToken() && code) {
      try {
        const room = await api.room(code)
        await api.uploadRecording(room.id, blob, duration)
        setSavedMsg(t('bar.saved'))
      } catch {
        setSavedMsg(t('bar.downloaded'))
      }
    } else {
      setSavedMsg(t('bar.downloaded'))
    }
    setPhase('idle')
    setAgreed(false)
    setTimeout(() => setSavedMsg(null), 3000)
  }

  return (
    <>
      <div className="recorder">
        {phase === 'recording' ? (
          <button className="btn-rec recording" onClick={stop}>
            {t('bar.recording', { t: fmt(elapsed) })}
          </button>
        ) : (
          <button className="btn-rec" disabled={phase === 'saving'} onClick={() => setPhase('consent')}>
            {savedMsg ? `⏺ ${savedMsg}` : t('bar.record')}
          </button>
        )}
      </div>

      {phase === 'consent' && (
        <div className="modal-backdrop" onClick={() => setPhase('idle')}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('consent.title')}</h3>
            <p>{t('consent.body')}</p>
            <label className="consent-check">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              {t('consent.agree')}
            </label>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setPhase('idle')}>
                {t('consent.cancel')}
              </button>
              <button className="btn-primary compact" disabled={!agreed} onClick={begin}>
                {t('consent.start')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
