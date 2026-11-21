import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { fail, ok } from '../lib/http.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { classifyContent } from '../services/contentPolicy.js'
import { periodDays } from '../services/plans.js'

export const adminRouter = Router()
adminRouter.use(requireAuth, requireRole('ADMIN'))

adminRouter.get('/dashboard', async (_req, res, next) => {
  try {
    const [seekers, providers, admins, organizations, pending, listings, applications, restricted, banned, pendingPayments] = await Promise.all([
      prisma.user.count({ where: { role: 'SEEKER' } }),
      prisma.user.count({ where: { role: 'PROVIDER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.organization.count(),
      prisma.organization.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.opportunity.count({ where: { status: 'PUBLISHED' } }),
      prisma.application.count(),
      prisma.opportunity.count({ where: { contentClass: 'RESTRICTED', status: { not: 'REMOVED' } } }),
      prisma.user.count({ where: { status: 'banned' } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
    ])
    return ok(res, { seekers, providers, admins, organizations, pending, listings, applications, restricted, banned, pendingPayments })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/organizations', async (_req, res, next) => {
  try {
    const items = await prisma.organization.findMany({
      include: {
        owner: { select: { email: true, firstName: true, lastName: true, status: true } },
        _count: { select: { opportunities: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok(res, { items })
  } catch (error) {
    next(error)
  }
})

const reviewSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    reason: z.string().trim().max(400).optional(),
  }),
})

adminRouter.patch('/organizations/:id', validate(reviewSchema), async (req, res, next) => {
  try {
    const existing = await prisma.organization.findUnique({ where: { id: req.valid.params.id } })
    if (!existing) return fail(res, 404, 'NOT_FOUND', 'Organization not found.')
    const profileText = classifyContent([existing.name, existing.description, existing.industry])
    const organization = await prisma.organization.update({
      where: { id: existing.id },
      data: {
        verificationStatus: req.valid.body.status,
        reviewReason: req.valid.body.reason || '',
        portfolioStatus: req.valid.body.status === 'APPROVED'
          ? (profileText === 'RESTRICTED' ? 'PENDING' : 'APPROVED')
          : existing.portfolioStatus,
        ...(req.valid.body.status === 'APPROVED' && existing.plan !== 'BASIC' && existing.plan !== 'PREMIUM'
          ? { plan: 'FREE', billingPeriod: 'NONE', subscriptionStatus: 'ACTIVE', subscriptionEndsAt: null }
          : {}),
      },
    })
    return ok(res, organization)
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/organizations/:id/activity', async (req, res, next) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { email: true, firstName: true, lastName: true, status: true, createdAt: true } },
        opportunities: {
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { applications: true } } },
        },
      },
    })
    if (!organization) return fail(res, 404, 'NOT_FOUND', 'Organization not found.')
    return ok(res, {
      organization,
      readOnly: true,
      listings: organization.opportunities.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        status: item.status,
        contentClass: item.contentClass,
        banReason: item.banReason,
        closesAt: item.closesAt,
        viewCount: item.viewCount,
        applications: item._count.applications,
        createdAt: item.createdAt,
      })),
    })
  } catch (error) {
    next(error)
  }
})

const portfolioSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['APPROVED', 'DECLINED']),
    note: z.string().trim().max(400).optional(),
  }),
})

adminRouter.patch('/organizations/:id/portfolio', validate(portfolioSchema), async (req, res, next) => {
  try {
    const existing = await prisma.organization.findUnique({ where: { id: req.valid.params.id } })
    if (!existing) return fail(res, 404, 'NOT_FOUND', 'Organization not found.')
    const organization = await prisma.organization.update({
      where: { id: existing.id },
      data: {
        portfolioStatus: req.valid.body.status,
        portfolioNote: req.valid.body.note || '',
      },
    })
    return ok(res, organization)
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/organizations/:id/ban', async (req, res, next) => {
  try {
    const organization = await prisma.organization.findUnique({ where: { id: req.params.id } })
    if (!organization) return fail(res, 404, 'NOT_FOUND', 'Organization not found.')
    await prisma.user.update({ where: { id: organization.ownerUserId }, data: { status: 'banned' } })
    await prisma.opportunity.updateMany({
      where: { orgId: organization.id, status: { not: 'REMOVED' } },
      data: { status: 'REMOVED', banReason: 'Account banned by admin.' },
    })
    await prisma.refreshToken.updateMany({
      where: { userId: organization.ownerUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    return ok(res, { banned: true })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/content', async (_req, res, next) => {
  try {
    const items = await prisma.opportunity.findMany({
      where: { contentClass: 'RESTRICTED', status: { not: 'REMOVED' } },
      include: { org: { select: { id: true, name: true, restrictedPosts: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return ok(res, {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        status: item.status,
        banReason: item.banReason,
        createdAt: item.createdAt,
        organization: item.org,
      })),
    })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/opportunities/:id/ban', async (req, res, next) => {
  try {
    const existing = await prisma.opportunity.findUnique({ where: { id: req.params.id } })
    if (!existing) return fail(res, 404, 'NOT_FOUND', 'Listing not found.')
    const item = await prisma.opportunity.update({
      where: { id: existing.id },
      data: { status: 'REMOVED', contentClass: 'RESTRICTED', banReason: 'Banned by admin as community-restricted content.' },
    })
    return ok(res, { id: item.id, status: item.status })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/payments', async (_req, res, next) => {
  try {
    const items = await prisma.payment.findMany({
      include: { org: { select: { id: true, name: true, plan: true, subscriptionStatus: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return ok(res, { items })
  } catch (error) {
    next(error)
  }
})

const paymentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['VERIFIED', 'REJECTED']),
    note: z.string().trim().max(400).optional(),
  }),
})

adminRouter.post('/payments/:id/review', validate(paymentSchema), async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.valid.params.id } })
    if (!payment) return fail(res, 404, 'NOT_FOUND', 'Payment not found.')
    if (payment.status !== 'PENDING') return fail(res, 409, 'DECIDED', 'This payment was already reviewed.')
    if (req.valid.body.status === 'REJECTED') {
      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REJECTED', reviewNote: req.valid.body.note || '', reviewedAt: new Date() },
      })
      const org = await prisma.organization.findUnique({ where: { id: payment.orgId } })
      if (org?.subscriptionStatus === 'PENDING_PAYMENT') {
        await prisma.organization.update({ where: { id: org.id }, data: { subscriptionStatus: 'NONE' } })
      }
      return ok(res, updated)
    }
    const days = periodDays(payment.billingPeriod)
    if (!days) return fail(res, 400, 'VALIDATION', 'This payment has no billing period.')
    const org = await prisma.organization.findUnique({ where: { id: payment.orgId } })
    const now = new Date()
    const extend = org.subscriptionStatus === 'ACTIVE' && org.plan === payment.plan && org.subscriptionEndsAt && org.subscriptionEndsAt > now
    const start = extend ? org.subscriptionEndsAt : now
    const endsAt = new Date(start.getTime() + days * 24 * 60 * 60 * 1000)
    const [updated] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'VERIFIED', reviewNote: req.valid.body.note || '', reviewedAt: now },
      }),
      prisma.organization.update({
        where: { id: payment.orgId },
        data: {
          plan: payment.plan,
          billingPeriod: payment.billingPeriod,
          subscriptionStatus: 'ACTIVE',
          subscriptionEndsAt: endsAt,
        },
      }),
    ])
    return ok(res, updated)
  } catch (error) {
    next(error)
  }
})
