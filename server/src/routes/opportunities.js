import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { fail, ok } from '../lib/http.js'
import { publicOpportunity, TYPE_LABEL } from '../lib/catalog.js'
import { optionalAuth, requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { scoreOpportunity } from '../services/recommend.js'
import { closeExpired, openWhere } from '../lib/deadline.js'
import { LIVE_TYPES } from '../services/plans.js'
import { applicationFields, checkAnswers } from '../lib/applicationForm.js'
import { NEAR_KM, clusterHeld, haversine, nearestCity } from '../lib/places.js'
import { reversePlace, searchPlaces } from '../lib/geocode.js'

const listSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    type: z.string().optional(),
    location: z.string().optional(),
    held: z.string().optional(),
    near: z.string().optional(),
    workMode: z.string().optional(),
    deadline: z.enum(['any', 'week', 'month']).optional(),
    audience: z.string().optional(),
    sort: z.enum(['match', 'newest', 'closing']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
})

function parseNear(value) {
  const [lat, lng] = String(value || '').split(',').map((item) => Number(item))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

function withinNear(row, near, radiusKm = NEAR_KM) {
  if (!near) return true
  const stored = row.latitude != null && row.longitude != null
  const lat = stored ? row.latitude : null
  const lng = stored ? row.longitude : null
  if (lat == null || lng == null) {
    const city = nearestCity(near.lat, near.lng, radiusKm)
    return Boolean(city && String(row.location || '').toLowerCase().includes(city.name.toLowerCase()))
  }
  return haversine(near.lat, near.lng, lat, lng) <= radiusKm
}

function whereFromQuery(query, now = new Date()) {
  const where = {
    ...openWhere(now),
    AND: [],
  }
  if (LIVE_TYPES.includes(query.type)) where.type = query.type
  if (!query.near && query.location) where.location = { equals: query.location.trim(), mode: 'insensitive' }
  else if (!query.near && query.held) where.location = { contains: query.held.trim(), mode: 'insensitive' }
  if (query.workMode) where.workMode = query.workMode
  if (query.audience) where.audience = { contains: query.audience, mode: 'insensitive' }
  if (query.q) {
    where.AND.push({
      OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { category: { contains: query.q, mode: 'insensitive' } },
        { org: { name: { contains: query.q, mode: 'insensitive' } } },
      ],
    })
  }
  if (query.deadline === 'week' || query.deadline === 'month') {
    const days = query.deadline === 'week' ? 7 : 30
    delete where.OR
    where.closesAt = { gte: now, lte: new Date(now.getTime() + days * 24 * 60 * 60 * 1000) }
  }
  if (where.AND.length === 0) delete where.AND
  return where
}

async function loadProfile(userId) {
  if (!userId) return null
  return prisma.profile.findUnique({ where: { userId } })
}

export const opportunityRouter = Router()

opportunityRouter.get('/', optionalAuth, validate(listSchema), async (req, res, next) => {
  try {
    const query = req.valid.query
    const page = query.page || 1
    const limit = query.limit || 12
    const now = new Date()
    await closeExpired(now)
    const where = whereFromQuery(query, now)
    const near = parseNear(query.near)
    const orderBy = query.sort === 'closing'
      ? [{ closesAt: 'asc' }]
      : [{ createdAt: 'desc' }]

    const [counted, found, profile] = await Promise.all([
      prisma.opportunity.count({ where }),
      prisma.opportunity.findMany({
        where,
        include: { org: true },
        orderBy,
        take: near || query.sort === 'match' ? 200 : limit,
        skip: near || query.sort === 'match' ? 0 : (page - 1) * limit,
      }),
      loadProfile(req.auth?.sub),
    ])
    const rows = near ? found.filter((row) => withinNear(row, near)) : found
    const total = near ? rows.length : counted

    let items = rows.map((row) => {
      const match = profile ? scoreOpportunity(profile, row) : null
      return publicOpportunity(row, match?.related ? {
        related: true,
        matchScore: match.score,
        explanation: match.explanation,
      } : {})
    })

    if (query.sort === 'match') {
      items.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
      const start = (page - 1) * limit
      items = items.slice(start, start + limit)
    }

    return ok(res, {
      items,
      page,
      limit,
      total,
      categories: Object.entries(TYPE_LABEL).map(([id, label]) => ({ id, label })),
    })
  } catch (error) {
    next(error)
  }
})

opportunityRouter.get('/places', async (req, res, next) => {
  try {
    const now = new Date()
    await closeExpired(now)
    const rows = await prisma.opportunity.findMany({
      where: openWhere(now),
      select: { id: true, title: true, location: true, type: true, latitude: true, longitude: true },
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
    const places = [...map.values()].sort((left, right) => left.location.localeCompare(right.location))
    return ok(res, { places, ...clusterHeld(rows) })
  } catch (error) {
    next(error)
  }
})

opportunityRouter.get('/recommendations', requireAuth, async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.auth.sub } })
    const place = String(req.query.location || '').trim()
    const held = String(req.query.held || '').trim()
    const near = parseNear(req.query.near)
    const now = new Date()
    await closeExpired(now)
    const found = await prisma.opportunity.findMany({
      where: {
        ...openWhere(now),
        ...(near ? {} : place
          ? { location: { equals: place, mode: 'insensitive' } }
          : held
            ? { location: { contains: held, mode: 'insensitive' } }
            : {}),
      },
      include: { org: true },
      take: 100,
    })
    const rows = near ? found.filter((row) => withinNear(row, near)) : found
    const ranked = rows
      .map((row) => ({ row, match: scoreOpportunity(profile || {}, row) }))
      .filter((item) => item.match.related)
      .map(({ row, match }) => publicOpportunity(row, {
        related: true,
        matchScore: match.score,
        explanation: match.explanation,
        eligibilityChecks: match.eligibility.checks,
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 12)
    return ok(res, { items: ranked, profileReady: Boolean(profile && profile.completeness >= 40) })
  } catch (error) {
    next(error)
  }
})

opportunityRouter.get('/geocode', async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim()
    if (query.length < 2 || query.length > 120) return fail(res, 400, 'VALIDATION', 'Enter the place name.')
    const places = await searchPlaces(query)
    return ok(res, { places })
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError' || error.message === 'Place search failed') {
      return fail(res, 503, 'UNAVAILABLE', 'Place search is unavailable. Click the map to drop a pin.')
    }
    next(error)
  }
})

opportunityRouter.get('/nearest', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat)
    const lng = Number(req.query.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return fail(res, 400, 'VALIDATION', 'Choose a point on the map.')
    }
    let name = ''
    try {
      name = (await reversePlace(lat, lng))?.name || ''
    } catch {
      name = ''
    }
    if (!name) name = nearestCity(lat, lng)?.name || ''
    return ok(res, { name })
  } catch (error) {
    next(error)
  }
})

opportunityRouter.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const now = new Date()
    await closeExpired(now)
    const row = await prisma.opportunity.findFirst({
      where: { id: req.params.id, ...openWhere(now) },
      include: { org: true },
    })
    if (!row) return fail(res, 404, 'NOT_FOUND', 'This opportunity is not available.')
    await prisma.opportunity.update({ where: { id: row.id }, data: { viewCount: { increment: 1 } } })
    const profile = await loadProfile(req.auth?.sub)
    const match = profile ? scoreOpportunity(profile, row) : null
    let saved = null
    if (req.auth?.sub) {
      saved = await prisma.savedItem.findUnique({
        where: { userId_opportunityId: { userId: req.auth.sub, opportunityId: row.id } },
      })
    }
    return ok(res, publicOpportunity({ ...row, viewCount: row.viewCount + 1 }, {
      related: match ? match.related : null,
      matchScore: match?.related ? match.score : null,
      explanation: match?.related ? match.explanation : (match ? 'This opportunity is not related to your portfolio.' : null),
      eligibilityChecks: match?.eligibility.checks ?? [],
      saved: Boolean(saved),
      trackingStatus: saved?.trackingStatus ?? null,
    }))
  } catch (error) {
    next(error)
  }
})

const applySchema = z.object({
  body: z.object({
    answers: z.record(z.string(), z.string().max(4000)).optional(),
  }),
})

opportunityRouter.post('/:id/apply', requireAuth, validate(applySchema), async (req, res, next) => {
  try {
    if (req.auth.role !== 'SEEKER') {
      return fail(res, 403, 'FORBIDDEN', 'Sign in as a student to apply.')
    }
    const now = new Date()
    await closeExpired(now)
    const row = await prisma.opportunity.findFirst({
      where: { id: req.params.id, ...openWhere(now) },
    })
    if (!row) return fail(res, 404, 'NOT_FOUND', 'This opportunity has closed.')
    const existing = await prisma.application.findUnique({
      where: { userId_opportunityId: { userId: req.auth.sub, opportunityId: row.id } },
    })
    if (existing) return fail(res, 409, 'ALREADY_APPLIED', 'You already confirmed an application for this listing.')
    const checked = checkAnswers(applicationFields(row), req.valid.body.answers || {})
    if (checked.error) return fail(res, 400, 'VALIDATION', checked.error)
    await prisma.application.create({
      data: { userId: req.auth.sub, opportunityId: row.id, answers: checked.answers },
    })
    await prisma.opportunity.update({ where: { id: row.id }, data: { applyClicks: { increment: 1 } } })
    await prisma.savedItem.upsert({
      where: { userId_opportunityId: { userId: req.auth.sub, opportunityId: row.id } },
      update: { trackingStatus: 'APPLIED' },
      create: { userId: req.auth.sub, opportunityId: row.id, trackingStatus: 'APPLIED' },
    })
    return ok(res, { recorded: true }, 201)
  } catch (error) {
    next(error)
  }
})
