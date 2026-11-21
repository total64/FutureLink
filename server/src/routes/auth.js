import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { fail, ok } from '../lib/http.js'
import {
  hashPassword,
  hashRefreshToken,
  newRefreshToken,
  REFRESH_COOKIE,
  refreshCookieOptions,
  signAccessToken,
  verifyPassword,
} from '../lib/authTokens.js'
import { publicUser } from '../lib/catalog.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const password = z
  .string()
  .min(8, 'Use 8 or more characters, including letters and numbers.')
  .regex(/[A-Za-z]/, 'Use 8 or more characters, including letters and numbers.')
  .regex(/[0-9]/, 'Use 8 or more characters, including letters and numbers.')

const registerSchema = z.object({
  body: z.object({
    accountType: z.enum(['seeker', 'provider']),
    firstName: z.string().trim().min(1, 'Enter your first name.'),
    lastName: z.string().trim().min(1, 'Enter your last name.'),
    email: z.string().trim().email('Enter a valid email address.'),
    password,
    organizationName: z.string().trim().optional(),
    acceptedTerms: z.literal(true, { errorMap: () => ({ message: 'Agree to the Terms of Service and Privacy Policy.' }) }),
  }).superRefine((value, ctx) => {
    if (value.accountType === 'provider' && !value.organizationName) {
      ctx.addIssue({ code: 'custom', message: 'Enter your organization name.', path: ['organizationName'] })
    }
  }),
})

const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Enter a valid email address.'),
    password: z.string().min(1, 'Enter your password.'),
  }),
})

async function issueSession(res, user) {
  const accessToken = signAccessToken(user)
  const refresh = newRefreshToken()
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: refresh.tokenHash, expiresAt: refresh.expiresAt },
  })
  res.cookie(REFRESH_COOKIE, refresh.raw, refreshCookieOptions())
  return accessToken
}

export const authRouter = Router()

authRouter.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { accountType, firstName, lastName, email, password: plain, organizationName } = req.valid.body
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) return fail(res, 409, 'EMAIL_TAKEN', 'An account with this email already exists.')

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: await hashPassword(plain),
        role: accountType === 'provider' ? 'PROVIDER' : 'SEEKER',
        firstName,
        lastName,
        profile: accountType === 'seeker' ? { create: {} } : undefined,
        organization: accountType === 'provider'
          ? {
              create: {
                name: organizationName,
                contactEmail: email.toLowerCase(),
              },
            }
          : undefined,
      },
      include: { organization: true },
    })

    const accessToken = await issueSession(res, user)
    return ok(res, { accessToken, user: publicUser(user) }, 201)
  } catch (error) {
    next(error)
  }
})

authRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const email = req.valid.body.email.toLowerCase()
    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    })
    if (!user || !(await verifyPassword(req.valid.body.password, user.passwordHash))) {
      return fail(res, 401, 'INVALID_LOGIN', 'Email or password is incorrect.')
    }
    if (user.status === 'banned') {
      return fail(res, 403, 'BANNED', 'This account is banned for repeated community-restricted content.')
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const accessToken = await issueSession(res, user)
    return ok(res, { accessToken, user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE]
    if (!raw) return fail(res, 401, 'REFRESH_MISSING', 'Sign in to continue.')
    const tokenHash = hashRefreshToken(raw)
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { organization: true } } },
    })
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return fail(res, 401, 'REFRESH_INVALID', 'Sign in to continue.')
    }
    if (stored.user.status === 'banned') {
      return fail(res, 403, 'BANNED', 'This account is banned for repeated community-restricted content.')
    }
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } })
    const accessToken = await issueSession(res, stored.user)
    return ok(res, { accessToken, user: publicUser(stored.user) })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/logout', async (req, res, next) => {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE]
    if (raw) {
      const tokenHash = hashRefreshToken(raw)
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' })
    return ok(res, { loggedOut: true })
  } catch (error) {
    next(error)
  }
})

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.sub },
      include: { organization: true },
    })
    if (!user || user.status === 'banned') return fail(res, 401, 'AUTH_REQUIRED', 'Sign in to continue.')
    return ok(res, { user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})
