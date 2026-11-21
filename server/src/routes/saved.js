import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { fail, ok } from '../lib/http.js'
import { publicOpportunity } from '../lib/catalog.js'
import { deadlineReminder } from '../lib/deadline.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

export const savedRouter = Router()
savedRouter.use(requireAuth, requireRole('SEEKER', 'ADMIN'))

savedRouter.get('/', async (req, res, next) => {
  try {
    const [items, applications] = await Promise.all([
      prisma.savedItem.findMany({
        where: { userId: req.auth.sub },
        include: { opportunity: { include: { org: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.application.findMany({ where: { userId: req.auth.sub } }),
    ])
    const decisionByOpportunity = new Map(applications.map((item) => [item.opportunityId, item.status]))
    return ok(res, {
      items: items.map((item) => ({
        id: item.id,
        trackingStatus: item.trackingStatus,
        decision: decisionByOpportunity.get(item.opportunityId) || null,
        reminder: decisionByOpportunity.get(item.opportunityId) === 'PENDING'
          ? deadlineReminder(item.opportunity.closesAt)
          : null,
        opportunity: publicOpportunity(item.opportunity),
      })),
    })
  } catch (error) {
    next(error)
  }
})

const createSchema = z.object({
  body: z.object({ opportunityId: z.string().uuid() }),
})

savedRouter.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: req.valid.body.opportunityId, status: 'PUBLISHED' },
    })
    if (!opportunity) return fail(res, 404, 'NOT_FOUND', 'This opportunity is not available.')
    const item = await prisma.savedItem.upsert({
      where: { userId_opportunityId: { userId: req.auth.sub, opportunityId: opportunity.id } },
      update: {},
      create: { userId: req.auth.sub, opportunityId: opportunity.id },
    })
    return ok(res, { id: item.id, trackingStatus: item.trackingStatus }, 201)
  } catch (error) {
    next(error)
  }
})

const patchSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    trackingStatus: z.enum(['SAVED', 'APPLIED', 'INTERVIEWING', 'ACCEPTED', 'REJECTED']),
  }),
})

savedRouter.patch('/:id', validate(patchSchema), async (req, res, next) => {
  try {
    const existing = await prisma.savedItem.findFirst({
      where: { id: req.valid.params.id, userId: req.auth.sub },
    })
    if (!existing) return fail(res, 404, 'NOT_FOUND', 'Saved item not found.')
    const application = await prisma.application.findUnique({
      where: { userId_opportunityId: { userId: req.auth.sub, opportunityId: existing.opportunityId } },
    })
    if (application && application.status !== 'PENDING') {
      return fail(res, 403, 'DECIDED', 'The organization has already decided this application.')
    }
    const item = await prisma.savedItem.update({
      where: { id: existing.id },
      data: { trackingStatus: req.valid.body.trackingStatus },
    })
    return ok(res, { id: item.id, trackingStatus: item.trackingStatus })
  } catch (error) {
    next(error)
  }
})

savedRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.savedItem.findFirst({
      where: { id: req.params.id, userId: req.auth.sub },
    })
    if (!existing) return fail(res, 404, 'NOT_FOUND', 'Saved item not found.')
    await prisma.savedItem.delete({ where: { id: existing.id } })
    return ok(res, { deleted: true })
  } catch (error) {
    next(error)
  }
})
