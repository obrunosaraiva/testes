// Servidor Constelar: API REST (auth, clientes, sessões, prontuário, imagens de solução)
// + sincronização em tempo real das salas (WebSocket) + estáticos do build em produção.
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import express from 'express'
import { api } from './api.mjs'
import { attachRealtime } from './realtime.mjs'

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787
const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
app.get('/health', (_req, res) => res.send('ok'))
app.use('/api', api)

// serve o build de produção, se existir (deploy num único servidor)
const dist = join(__dirname, '..', 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next()
    res.sendFile(join(dist, 'index.html'))
  })
}

const server = http.createServer(app)
attachRealtime(server)

server.listen(PORT, () => {
  console.log(`[constelar] API em http://localhost:${PORT}/api  ·  tempo real em ws://localhost:${PORT}/ws`)
})
