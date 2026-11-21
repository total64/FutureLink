import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config.js'

const ACCESS_TTL = '15m'
const REFRESH_DAYS = 7

export async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    env.accessSecret,
    { expiresIn: ACCESS_TTL },
  )
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.accessSecret)
}

export function newRefreshToken() {
  const raw = crypto.randomBytes(48).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex')
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)
  return { raw, tokenHash, expiresAt }
}

export function hashRefreshToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export const REFRESH_COOKIE = 'eventlink_refresh'

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/api/v1/auth',
    maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000,
  }
}
