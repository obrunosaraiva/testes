import { useStore, registerEmit } from './store'
import type { NetMsg } from './store'

let ws: WebSocket | null = null

// --- canal de sinalização WebRTC (áudio/vídeo) ---
// mensagens cujo tipo começa com "rtc:" não são estado do campo: vão para o handler de mídia.
export type RtcMsg = { t: string; [k: string]: unknown }
let rtcHandler: ((msg: RtcMsg) => void) | null = null
// mensagens de sinalização que chegam antes de o par abrir a chamada ficam
// em fila e são entregues assim que um handler é registrado (evita perder a 1ª oferta).
const rtcBuffer: RtcMsg[] = []
export function onRtc(fn: ((msg: RtcMsg) => void) | null) {
  rtcHandler = fn
  if (fn) while (rtcBuffer.length) fn(rtcBuffer.shift() as RtcMsg)
  else rtcBuffer.length = 0
}
export function sendRtc(msg: RtcMsg) {
  rawSend(msg as unknown as NetMsg)
}

// coalescência: durante o arraste, muitos doll:update por segundo —
// mantemos só o último patch por boneco e enviamos 1x por animation frame.
const pending = new Map<string, Record<string, unknown>>()
let raf = 0

function flush() {
  raf = 0
  for (const [id, patch] of pending) rawSend({ t: 'doll:update', id, patch })
  pending.clear()
}

function rawSend(msg: NetMsg) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
}

function send(msg: NetMsg) {
  if (msg.t === 'doll:update') {
    pending.set(msg.id, { ...(pending.get(msg.id) ?? {}), ...msg.patch })
    if (!raf) raf = requestAnimationFrame(flush)
    return
  }
  rawSend(msg)
}

/** Gera um id de sala curto e legível. */
export function newRoomId(): string {
  return Math.random().toString(36).slice(2, 8)
}

/** Conecta à sala. role: 'host' (terapeuta) ou 'guest' (cliente). */
export function connect(roomId: string, role: 'host' | 'guest') {
  const { setSession } = useStore.getState()
  setSession({ role, roomId, conn: 'connecting' })

  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  ws = new WebSocket(`${proto}://${location.host}/ws?room=${encodeURIComponent(roomId)}&role=${role}`)

  ws.onopen = () => {
    setSession({ conn: 'online' })
    registerEmit(send)
  }
  ws.onclose = () => {
    setSession({ conn: 'offline' })
    registerEmit(null)
  }
  ws.onerror = () => setSession({ conn: 'offline' })
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data) as { t: string }
      if (msg.t.startsWith('rtc:')) {
        if (rtcHandler) rtcHandler(msg as RtcMsg)
        else rtcBuffer.push(msg as RtcMsg)
      } else useStore.getState().remoteApply(msg as NetMsg)
    } catch {
      /* ignora mensagens malformadas */
    }
  }
}

export function disconnect() {
  registerEmit(null)
  ws?.close()
  ws = null
}
