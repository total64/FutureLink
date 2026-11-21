import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { fail, ok } from '../lib/http.js'
import { publicOpportunity, TYPE_LABEL } from '../lib/catalog.js'
import { optionalAuth, requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { scoreOpportunity } from '../services/recommend.js'
import { closeExpired, openWhere } from '../lib/deadline.js'
import { applicationFields, checkAnswers } from '../lib/applicationForm.js'

const listSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    type: z.string().optional(),
    location: z.string().optional(),
    workMode: z.string().optional(),
    deadline: z.enum(['any', 'week', 'month']).optional(),
    audience: z.string().optional(),
    sort: z.enum(['match', 'newest', 'closing']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
})

function whereFromQuery(query, now = new Date()) {
  const where = {
    ...openWhere(now),
    AND: [],
  }
  if (query.type && query.type !== 'ALL') where.type = query.type
  if (query.location) where.location = { contains: query.location, mode: 'insensitive' }
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
    const orderBy = query.sort === 'closing'
      ? [{ closesAt: 'asc' }]
      : [{ createdAt: 'desc' }]

    const [total, rows, profile] = await Promise.all([
      prisma.opportunity.count({ where }),
      prisma.opportunity.findMany({
        where,
        include: { org: true },
        orderBy,
        take: query.sort === 'match' ? 100 : limit,
        skip: query.sort === 'match' ? 0 : (page - 1) * limit,
      }),
      loadProfile(req.auth?.sub),
    ])

    let items = rows.map((row) => {
      const match = profile ? scoreOpportunity(profile, row) : null
      return publicOpportunity(row, match ? {
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

opportunityRouter.get('/recommendations', requireAuth, async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.auth.sub } })
    const now = new Date()
    await closeExpired(now)
    const rows = await prisma.opportunity.findMany({
      where: openWhere(now),
      include: { org: true },
      take: 100,
    })
    const ranked = rows
      .map((row) => {
        const match = scoreOpportunity(profile || {}, row)
        return publicOpportunity(row, {
          matchScore: match.score,
          explanation: match.explanation,
          eligibilityChecks: match.eligibility.checks,
        })
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 12)
    return ok(res, { items: ranked, profileReady: Boolean(profile && profile.completeness >= 40) })
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
      matchScore: match?.score ?? null,
      explanation: match?.explanation ?? null,
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
