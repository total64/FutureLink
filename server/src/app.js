import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { env } from './config.js'
import { fail } from './lib/http.js'
import { authRouter } from './routes/auth.js'
import { opportunityRouter } from './routes/opportunities.js'
import { profileRouter } from './routes/profile.js'
import { savedRouter } from './routes/saved.js'
import { orgRouter } from './routes/org.js'
import { adminRouter } from './routes/admin.js'
import { OPPORTUNITY_TYPES } from './lib/catalog.js'

export function createApp() {
  const app = express()
  app.use(helmet())
  app.use(cors({ origin: env.clientOrigins, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false })

  app.get('/api/v1/health', (_req, res) => {
    res.json({ success: true, data: { ok: true }, error: null })
  })
  app.get('/api/v1/categories', (_req, res) => {
    res.json({ success: true, data: OPPORTUNITY_TYPES, error: null })
  })

  app.use('/api/v1/auth', authLimit, authRouter)
  app.use('/api/v1/opportunities', opportunityRouter)
  app.use('/api/v1/profile', profileRouter)
  app.use('/api/v1/saved', savedRouter)
  app.use('/api/v1/org', orgRouter)
  app.use('/api/v1/admin', adminRouter)

  app.use((req, res) => fail(res, 404, 'NOT_FOUND', `No route for ${req.method} ${req.path}`))
  app.use((error, _req, res, _next) => {
    console.error(error)
    fail(res, 500, 'SERVER', 'Something went wrong. Try again.')
  })
  return app
}
