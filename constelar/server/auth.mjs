// Autenticação: hash de senha (scrypt) e token tipo-JWT (HMAC-SHA256), sem dependências externas.
import { randomBytes, scryptSync, timingSafeEqual, createHmac, randomUUID } from 'node:crypto'

const SECRET = process.env.CONSTELAR_SECRET || 'constelar-dev-secret-troque-em-producao'
const TOKEN_TTL = 60 * 60 * 24 * 30 // 30 dias

export const uid = () => randomUUID()

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const test = scryptSync(password, salt, 64)
  const ref = Buffer.from(hash, 'hex')
  return test.length === ref.length && timingSafeEqual(test, ref)
}

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
const sign = (data) => createHmac('sha256', SECRET).update(data).digest('base64url')

export function signToken(payload) {
  const body = { ...payload, iat: Math.floor(Date.now() / 1000) }
  const head = b64url({ alg: 'HS256', typ: 'JWT' })
  const data = `${head}.${b64url(body)}`
  return `${data}.${sign(data)}`
}

export function verifyToken(token) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [head, body, sig] = parts
  if (sign(`${head}.${body}`) !== sig) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (payload.iat && Date.now() / 1000 - payload.iat > TOKEN_TTL) return null
    return payload
  } catch {
    return null
  }
}

/** Middleware Express: exige token válido; injeta req.therapistId.
 * Aceita o token no header Authorization ou em ?token= (para servir arquivos em <video>). */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.query?.token || null
  const payload = verifyToken(token)
  if (!payload?.sub) return res.status(401).json({ error: 'Não autorizado' })
  req.therapistId = payload.sub
  next()
}
