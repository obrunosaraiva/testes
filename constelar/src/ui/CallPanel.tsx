import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { RtcSession, type CallState } from '../webrtc'
import { useT } from '../i18n'

/** Widget de áudio/vídeo da sessão (WebRTC 1:1 terapeuta ↔ cliente). */
export function CallPanel() {
  const role = useStore((s) => s.role)
  const conn = useStore((s) => s.conn)
  const t = useT()

  const [state, setState] = useState<CallState>('idle')
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(false)
  const [hasVideo, setHasVideo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sessionRef = useRef<RtcSession | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)

  // encerra a chamada se a sessão online cair
  useEffect(() => {
    if (conn !== 'online' && sessionRef.current) {
      sessionRef.current.hangup()
      sessionRef.current = null
      setState('idle')
    }
  }, [conn])

  useEffect(() => {
    return () => sessionRef.current?.hangup()
  }, [])

  if (role === 'solo' || conn !== 'online') return null

  const join = async (withVideo: boolean) => {
    setError(null)
    try {
      const session = new RtcSession(role as 'host' | 'guest', {
        onState: setState,
        onRemoteStream: (stream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream
        },
      })
      sessionRef.current = session
      if (import.meta.env.DEV) (window as unknown as { __rtc: RtcSession }).__rtc = session
      const local = await session.start(withVideo)
      setHasVideo(withVideo)
      setCamOn(withVideo)
      setMicOn(true)
      if (localVideoRef.current) localVideoRef.current.srcObject = local
    } catch {
      setError(t('call.mediaError'))
      setState('idle')
    }
  }

  const toggleMic = () => {
    const next = !micOn
    setMicOn(next)
    sessionRef.current?.toggleMic(next)
  }

  const toggleCam = () => {
    const next = !camOn
    setCamOn(next)
    sessionRef.current?.toggleCam(next)
  }

  const hangup = () => {
    sessionRef.current?.hangup()
    sessionRef.current = null
    setState('idle')
    setHasVideo(false)
  }

  // ainda não entrou na chamada
  if (state === 'idle') {
    return (
      <div className="call call-idle">
        <span className="call-label">{t('call.audioLabel')}</span>
        <div className="call-actions">
          <button className="btn-call" onClick={() => join(false)}>
            {t('call.joinAudio')}
          </button>
          <button className="btn-call ghost" onClick={() => join(true)}>
            {t('call.joinVideo')}
          </button>
        </div>
        {error && <span className="call-error">{error}</span>}
      </div>
    )
  }

  return (
    <div className="call" data-callstate={state}>
      <div className="call-tiles">
        <div className="tile">
          <video ref={remoteVideoRef} autoPlay playsInline className={hasVideo ? '' : 'hidden'} />
          <span className="tile-name">{role === 'host' ? t('call.client') : t('call.therapist')}</span>
          {state !== 'connected' && <span className="tile-status">{t('call.connecting')}</span>}
        </div>
        <div className="tile self">
          <video ref={localVideoRef} autoPlay playsInline muted className={camOn ? '' : 'hidden'} />
          <span className="tile-name">{t('call.you')}</span>
        </div>
      </div>

      <audio ref={remoteAudioRef} autoPlay />

      <div className="call-controls">
        <button className={micOn ? 'ctrl' : 'ctrl off'} onClick={toggleMic} title="Microfone">
          {micOn ? '🎙️' : '🔇'}
        </button>
        {hasVideo && (
          <button className={camOn ? 'ctrl' : 'ctrl off'} onClick={toggleCam} title="Câmera">
            {camOn ? '🎥' : '📷'}
          </button>
        )}
        <button className="ctrl hangup" onClick={hangup} title="Encerrar">
          ✕
        </button>
      </div>
    </div>
  )
}
