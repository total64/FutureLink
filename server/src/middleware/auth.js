import { fail } from '../lib/http.js'
import { verifyAccessToken } from '../lib/authTokens.js'

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return next()
  try {
    req.auth = verifyAccessToken(token)
  } catch {
    req.auth = null
  }
  next()
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return fail(res, 401, 'AUTH_REQUIRED', 'Sign in to continue.')
  try {
    req.auth = verifyAccessToken(token)
    return next()
  } catch {
    return fail(res, 401, 'TOKEN_EXPIRED', 'Your session expired. Sign in again.')
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) return fail(res, 401, 'AUTH_REQUIRED', 'Sign in to continue.')
    if (!roles.includes(req.auth.role)) {
      return fail(res, 403, 'FORBIDDEN', 'This action is not available for your account.')
    }
    next()
  }
}
