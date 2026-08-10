import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { unauthorized } from './httpError.js'

const scryptAsync = promisify(crypto.scrypt)

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const derived = await scryptAsync(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${Buffer.from(derived).toString('hex')}`
}

export async function verifyPassword(password, stored) {
  const [algorithm, saltHex, hashHex] = String(stored || '').split('$')
  if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false
  const derived = await scryptAsync(password, Buffer.from(saltHex, 'hex'), 64)
  const expected = Buffer.from(hashHex, 'hex')
  const actual = Buffer.from(derived)
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

function tokenSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is required')
  return secret
}

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function signatureFor(input) {
  return crypto.createHmac('sha256', tokenSecret()).update(input).digest('base64url')
}

export function issueToken(user, expiresInSeconds = Number(process.env.AUTH_TOKEN_TTL_SECONDS || 604800)) {
  const now = Math.floor(Date.now() / 1000)
  const header = encodeJson({ alg: 'HS256', typ: 'JWT' })
  const payload = encodeJson({
    userId: user.USER_ID,
    role: user.ROLE,
    email: user.EMAIL,
    iat: now,
    exp: now + expiresInSeconds,
  })
  const input = `${header}.${payload}`
  return `${input}.${signatureFor(input)}`
}

export function verifyToken(token) {
  const [header, payloadPart, signature] = String(token || '').split('.')
  if (!header || !payloadPart || !signature) throw unauthorized('Invalid authentication token')

  const input = `${header}.${payloadPart}`
  const expected = signatureFor(input)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw unauthorized('Invalid authentication token')

  let payload
  try {
    payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'))
  } catch {
    throw unauthorized('Invalid authentication token')
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) throw unauthorized('Authentication token expired')
  return payload
}
