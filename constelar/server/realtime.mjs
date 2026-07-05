// Sincronização em tempo real das salas de constelação: estado autoritativo por sala + broadcast.
// Também serve de canal de sinalização WebRTC (mensagens "rtc:*" são apenas retransmitidas).
import { WebSocketServer } from 'ws'

/** @type {Map<string, {state: any, clients: Set<import('ws').WebSocket>}>} */
const rooms = new Map()

function defaultState() {
  return {
    dolls: [],
    anchors: [],
    links: [],
    ambiance: { light: 'warm', field: 'wood', incense: true, music: false, allowGuestMove: true },
    currentPhrase: null,
  }
}

const GRACE_MS = 60_000 // mantém a sala viva por 60s após o último sair (permite reconexão)

function getRoom(id) {
  let room = rooms.get(id)
  if (!room) {
    room = { state: defaultState(), clients: new Set(), reapTimer: null }
    rooms.set(id, room)
  }
  if (room.reapTimer) {
    clearTimeout(room.reapTimer)
    room.reapTimer = null
  }
  return room
}

function applyToState(state, msg) {
  switch (msg.t) {
    case 'doll:add':
      if (!state.dolls.some((d) => d.id === msg.doll.id)) state.dolls.push(msg.doll)
      break
    case 'doll:update':
      state.dolls = state.dolls.map((d) => (d.id === msg.id ? { ...d, ...msg.patch } : d))
      break
    case 'doll:remove':
      state.dolls = state.dolls.filter((d) => d.id !== msg.id)
      state.links = state.links.filter((l) => l.a !== msg.id && l.b !== msg.id)
      break
    case 'anchor:add':
      if (!state.anchors.some((a) => a.id === msg.anchor.id)) state.anchors.push(msg.anchor)
      break
    case 'anchor:update':
      state.anchors = state.anchors.map((a) => (a.id === msg.id ? { ...a, ...msg.patch } : a))
      break
    case 'anchor:remove':
      state.anchors = state.anchors.filter((a) => a.id !== msg.id)
      break
    case 'link:add':
      if (!state.links.some((l) => l.id === msg.link.id)) state.links.push(msg.link)
      break
    case 'link:remove':
      state.links = state.links.filter((l) => l.id !== msg.id)
      break
    case 'ambiance':
      state.ambiance = { ...state.ambiance, ...msg.patch }
      break
    case 'phrase':
      state.currentPhrase = msg.phrase
      break
    case 'clear':
      state.dolls = []
      state.anchors = []
      state.links = []
      break
    default:
      break
  }
}

function broadcast(room, data, except) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data)
  for (const client of room.clients) {
    if (client !== except && client.readyState === 1) client.send(payload)
  }
}

const sendPresence = (room) => broadcast(room, { t: 'presence', count: room.clients.size })

/** Anexa o servidor WebSocket de tempo real a um servidor HTTP existente. */
export function attachRealtime(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost')
    const roomId = url.searchParams.get('room') || 'default'
    const room = getRoom(roomId)
    room.clients.add(ws)

    ws.send(
      JSON.stringify({
        t: 'state',
        dolls: room.state.dolls,
        ambiance: room.state.ambiance,
        anchors: room.state.anchors,
        links: room.state.links,
      })
    )
    if (room.state.currentPhrase) ws.send(JSON.stringify({ t: 'phrase', phrase: room.state.currentPhrase }))
    sendPresence(room)

    ws.on('message', (raw) => {
      let msg
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        return
      }
      applyToState(room.state, msg)
      broadcast(room, msg, ws)
    })

    ws.on('close', () => {
      room.clients.delete(ws)
      if (room.clients.size === 0) {
        // não apaga na hora: dá carência para reconexão, preservando o estado da sala
        room.reapTimer = setTimeout(() => rooms.delete(roomId), GRACE_MS)
      } else {
        sendPresence(room)
      }
    })
  })

  return wss
}
