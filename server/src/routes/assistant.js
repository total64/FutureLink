import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { ok } from '../lib/http.js'
import { optionalAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { closeExpired, openWhere } from '../lib/deadline.js'
import { guide, mentionedPlace } from '../services/assistant.js'

const messageSchema = z.object({
  body: z.object({
    message: z.string().trim().min(1).max(500),
    history: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().trim().max(500),
    })).max(8).optional(),
  }),
})

async function openPlaces(now) {
  const rows = await prisma.opportunity.findMany({
    where: openWhere(now),
    select: { location: true, type: true },
  })
  const map = new Map()
  for (const row of rows) {
    const location = String(row.location || '').trim()
    if (!location) continue
    const key = location.toLowerCase()
    const current = map.get(key) || { location, internships: 0, events: 0 }
    if (row.type === 'EVENT') current.events += 1
    else current.internships += 1
    map.set(key, current)
  }
  return [...map.values()].sort((left, right) => left.location.localeCompare(right.location))
}

export const assistantRouter = Router()

assistantRouter.post('/', optionalAuth, validate(messageSchema), async (req, res, next) => {
  try {
    const now = new Date()
    await closeExpired(now)
    const places = await openPlaces(now)
    const history = req.valid.body.history || []
    const blob = `${history.filter((item) => item.role === 'user').slice(-3).map((item) => item.content).join(' ')} ${req.valid.body.message}`
    const text = blob.toLowerCase()
    const howTo = /\b(how|can i|do i|should i|help|guide|explain)\b/.test(text)
    const placeQuestion = !howTo && /\bwhere (are|is)\b/.test(text) && !mentionedPlace(blob, places).place
    const asksListings = !howTo && !placeQuestion && (/\bintern|\bevents?\b/.test(text) || Boolean(mentionedPlace(blob, places).place))
    let listings = []
    if (asksListings) {
      const { place } = mentionedPlace(blob, places)
      const where = { ...openWhere(now) }
      if (/\bintern/.test(text) && !/\bevents?\b/.test(text)) where.type = 'INTERNSHIP'
      if (/\bevents?\b/.test(text) && !/\bintern/.test(text)) where.type = 'EVENT'
      if (place) where.location = { equals: place.location, mode: 'insensitive' }
      listings = await prisma.opportunity.findMany({
        where,
        select: { id: true, title: true, type: true, location: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })
    }
    const answer = guide({
      role: req.auth?.role || 'GUEST',
      message: req.valid.body.message,
      history,
      places,
      listings,
    })
    return ok(res, { reply: answer.reply, links: answer.links || [] })
  } catch (error) {
    next(error)
  }
})
