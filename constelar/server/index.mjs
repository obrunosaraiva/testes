// Servidor de sincronização em tempo real das salas de constelação.
// Mantém o estado autoritativo de cada sala e retransmite mudanças aos demais.
import http from 'node:http'
import { WebSocketServer } from 'ws'

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787

/** @type {Map<string, {state: any, clients: Set<import('ws').WebSocket>}>} */
const rooms = new Map()

function defaultState() {
  return {
    dolls: [],
    ambiance: { light: 'warm', field: 'wood', incense: true, music: false, allowGuestMove: true },
    currentPhrase: null,
  }
}

function getRoom(id) {
  let room = rooms.get(id)
  if (!room) {
    room = { state: defaultState(), clients: new Set() }
    rooms.set(id, room)
  }
  return room
}

/** aplica uma mensagem ao estado autoritativo da sala */
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
      break
    case 'ambiance':
      state.ambiance = { ...state.ambiance, ...msg.patch }
      break
    case 'phrase':
      state.currentPhrase = msg.phrase
      break
    case 'clear':
      state.dolls = []
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

function sendPresence(room) {
  broadcast(room, { t: 'presence', count: room.clients.size })
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('ok')
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost')
  const roomId = url.searchParams.get('room') || 'default'
  const room = getRoom(roomId)
  room.clients.add(ws)

  // envia o estado atual ao recém-chegado
  ws.send(JSON.stringify({ t: 'state', dolls: room.state.dolls, ambiance: room.state.ambiance }))
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
    broadcast(room, msg, ws) // retransmite a todos, menos ao remetente
  })

  ws.on('close', () => {
    room.clients.delete(ws)
    if (room.clients.size === 0) {
      // mantém a sala por um tempo curto; aqui simplificamos e limpamos na hora
      rooms.delete(roomId)
    } else {
      sendPresence(room)
    }
  })
})

server.listen(PORT, () => {
  console.log(`[constelar] servidor de tempo real em ws://localhost:${PORT}/ws`)
})
