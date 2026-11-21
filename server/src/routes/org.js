import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { fail, ok } from '../lib/http.js'
import { listingStatus, publicOpportunity } from '../lib/catalog.js'
import { closeExpired, parseDeadline } from '../lib/deadline.js'
import { classifyContent, restrictionMessage } from '../services/contentPolicy.js'
import { LIVE_TYPES, PLANS, priceFor, publishBlock, refreshSubscription, subscriptionView, usageFor } from '../services/plans.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { normalizeUrl } from '../services/generatePortfolio.js'
import { validate } from '../middleware/validate.js'

const questionSchema = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().min(2, 'Each question needs a label.').max(160),
  type: z.enum(['short', 'long', 'choice']),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
})

const opportunityBody = z.object({
  title: z.string().trim().min(3, 'Enter an opportunity title.'),
  type: z.enum(['INTERNSHIP', 'EVENT']),
  category: z.string().trim().min(2, 'Choose a category.'),
  description: z.string().trim().min(20, 'Describe the opportunity in a few sentences.'),
  responsibilities: z.string().trim().max(2000).optional(),
  eligibility: z.string().trim().max(2000).optional(),
  audience: z.string().trim().max(80).optional(),
  requiredSkills: z.array(z.string().trim().min(1)).max(12).optional(),
  location: z.string().trim().min(2, 'Enter a location.'),
  latitude: z.number().gte(-90).lte(90).nullable().optional(),
  longitude: z.number().gte(-180).lte(180).nullable().optional(),
  workMode: z.enum(['REMOTE', 'ONSITE', 'HYBRID']),
  compensation: z.enum(['PAID', 'UNPAID', 'FUNDED', 'FREE', 'UNSPECIFIED']),
  duration: z.string().trim().max(80).optional(),
  startsAt: z.string().optional(),
  closesAt: z.string().min(1, 'Enter an application deadline and time.'),
  applicationForm: z.array(questionSchema).max(12).optional(),
  featured: z.boolean().optional(),
  promoted: z.boolean().optional(),
  publish: z.boolean().optional(),
})

const createSchema = z.object({ body: opportunityBody })

async function ownedOrg(userId) {
  const org = await prisma.organization.findUnique({ where: { ownerUserId: userId } })
  return refreshSubscription(org)
}

async function withSubscription(org) {
  const [usage, pending] = await Promise.all([
    usageFor(org.id),
    prisma.payment.findFirst({ where: { orgId: org.id, status: 'PENDING' }, orderBy: { createdAt: 'desc' } }),
  ])
  return { ...org, subscription: subscriptionView(org, usage, pending) }
}

export const orgRouter = Router()
orgRouter.use(requireAuth, requireRole('PROVIDER'))
orgRouter.use(async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth.sub }, select: { status: true } })
    if (user?.status === 'banned') {
      return fail(res, 403, 'BANNED', 'This account is banned for repeated community-restricted content.')
    }
    return next()
  } catch (error) {
    return next(error)
  }
})

orgRouter.get('/me', async (req, res, next) => {
  try {
    const org = await ownedOrg(req.auth.sub)
    if (!org) return fail(res, 404, 'NOT_FOUND', 'Organization profile not found.')
    return ok(res, await withSubscription(org))
  } catch (error) {
    next(error)
  }
})

const profileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Enter the organization name.').max(120, 'The organization name is too long.'),
    description: z.string().trim().min(20, 'Describe the organization in a few sentences.').max(4000, 'The description is too long. Keep it under 4000 characters.'),
    website: z.string().trim().max(500, 'The website link is too long.').optional(),
    contactEmail: z.string().trim().email('Enter a contact email.'),
    phone: z.string().trim().min(7, 'Enter a phone number.').max(30, 'The phone number is too long.'),
    location: z.string().trim().min(2, 'Enter a location.').max(120, 'The location is too long.'),
    logoUrl: z.string().trim().max(2000, 'The logo link is too long. Paste a normal image address.').optional(),
    industry: z.string().trim().max(80, 'The industry is too long.').optional(),
  }),
})

orgRouter.put('/profile', validate(profileSchema), async (req, res, next) => {
  try {
    const org = await ownedOrg(req.auth.sub)
    if (!org) return fail(res, 404, 'NOT_FOUND', 'Organization profile not found.')
    const body = req.valid.body
    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: {
        name: body.name,
        description: body.description,
        website: body.website || '',
        contactEmail: body.contactEmail,
        phone: body.phone,
        location: body.location,
        logoUrl: body.logoUrl || '',
        industry: body.industry || '',
        profileSubmitted: true,
        verificationStatus: org.verificationStatus === 'REJECTED' ? 'PENDING' : org.verificationStatus,
        reviewReason: org.verificationStatus === 'REJECTED' ? '' : org.reviewReason,
      },
    })
    return ok(res, await withSubscription(updated))
  } catch (error) {
    next(error)
  }
})

orgRouter.use(async (req, res, next) => {
  try {
    const org = await ownedOrg(req.auth.sub)
    if (!org) return fail(res, 404, 'NOT_FOUND', 'Organization profile not found.')
    if (!org.profileSubmitted || org.verificationStatus !== 'APPROVED') {
      return fail(res, 403, 'ORG_NOT_VERIFIED', 'Create your organization profile and wait for admin approval before opening the dashboard.')
    }
    return next()
  } catch (error) {
    return next(error)
  }
})

orgRouter.get('/plans', async (req, res, next) => {
  try {
    const org = await ownedOrg(req.auth.sub)
    if (!org) return fail(res, 404, 'NOT_FOUND', 'Organization profile not found.')
    return ok(res, {
      organization: await withSubscription(org),
      plans: Object.values(PLANS),
      paymentNote: 'Example prices. Pay by bank transfer or Telebirr, then enter the reference. An admin confirms the payment before a paid plan starts.',
    })
  } catch (error) {
    next(error)
  }
})

const subscribeSchema = z.object({
  body: z.object({
    plan: z.enum(['FREE', 'BASIC', 'PREMIUM']),
    billingPeriod: z.enum(['NONE', 'MONTHLY', 'ANNUAL']),
    method: z.string().trim().max(40).optional(),
    payerName: z.string().trim().max(80).optional(),
    reference: z.string().trim().max(80).optional(),
  }),
})

orgRouter.post('/subscription', validate(subscribeSchema), async (req, res, next) => {
  try {
    const org = await ownedOrg(req.auth.sub)
    if (!org) return fail(res, 404, 'NOT_FOUND', 'Organization profile not found.')
    if (!org.profileSubmitted) return fail(res, 403, 'PROFILE', 'Submit your organization profile first.')
    if (org.verificationStatus !== 'APPROVED') {
      return fail(res, 403, 'ORG_NOT_VERIFIED', 'An admin must approve the organization before you can choose a plan.')
    }
    const { plan, billingPeriod } = req.valid.body
    const price = priceFor(plan, billingPeriod)
    if (!price) return fail(res, 400, 'VALIDATION', 'Choose a billing period offered for that plan.')
    const pending = await prisma.payment.findFirst({ where: { orgId: org.id, status: 'PENDING' } })
    if (plan === 'FREE') {
      if (pending) {
        await prisma.payment.update({ where: { id: pending.id }, data: { status: 'REJECTED', reviewNote: 'Replaced by the Free plan.', reviewedAt: new Date() } })
      }
      const updated = await prisma.organization.update({
        where: { id: org.id },
        data: { plan: 'FREE', billingPeriod: 'NONE', subscriptionStatus: 'ACTIVE', subscriptionEndsAt: null },
      })
      return ok(res, await withSubscription(updated))
    }
    if (pending) return fail(res, 409, 'PAYMENT_PENDING', 'A payment is already waiting for admin confirmation.')
    const method = req.valid.body.method || ''
    const payerName = req.valid.body.payerName || ''
    const reference = req.valid.body.reference || ''
    if (!['Bank transfer', 'Telebirr'].includes(method)) return fail(res, 400, 'VALIDATION', 'Choose bank transfer or Telebirr.')
    if (payerName.length < 2 || reference.length < 4) return fail(res, 400, 'VALIDATION', 'Enter the payer name and payment reference.')
    const payment = await prisma.payment.create({
      data: { orgId: org.id, plan, billingPeriod, amount: price.amount, method, payerName, reference },
    })
    const data = org.subscriptionStatus === 'ACTIVE' ? {} : { subscriptionStatus: 'PENDING_PAYMENT' }
    const updated = await prisma.organization.update({ where: { id: org.id }, data })
    return ok(res, { organization: await withSubscription(updated), payment }, 201)
  } catch (error) {
    next(error)
  }
})

orgRouter.get('/dashboard', async (req, res, next) => {
  try {
    const org = await ownedOrg(req.auth.sub)
    if (!org) return fail(res, 404, 'NOT_FOUND', 'Organization profile not found.')
    await closeExpired()
    const opportunities = await prisma.opportunity.findMany({
      where: { orgId: org.id, status: { not: 'REMOVED' }, type: { in: LIVE_TYPES } },
      orderBy: { updatedAt: 'desc' },
    })
    const ids = opportunities.map((item) => item.id)
    const applications = ids.length
      ? await prisma.application.count({ where: { opportunityId: { in: ids } } })
      : 0
    const active = opportunities.filter((item) => item.status === 'PUBLISHED' && listingStatus(item) !== 'closed')
    return ok(res, {
      organization: await withSubscription(org),
      stats: {
        activeOpportunities: active.length,
        totalApplications: applications,
        views: opportunities.reduce((sum, item) => sum + item.viewCount, 0),
        drafts: opportunities.filter((item) => item.status === 'DRAFT').length,
      },
      opportunities: opportunities.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        type: item.type,
        closesAt: item.closesAt,
        applyClicks: item.applyClicks,
        viewCount: item.viewCount,
        status: item.status,
        featured: item.featured,
        promoted: item.promoted,
        listingStatus: listingStatus(item),
      })),
    })
  } catch (error) {
    next(error)
  }
})

orgRouter.get('/applications', async (req, res, next) => {
  try {
    const org = await ownedOrg(req.auth.sub)
    if (!org) return fail(res, 404, 'NOT_FOUND', 'Organization profile not found.')
    const rows = await prisma.application.findMany({
      where: { opportunity: { orgId: org.id } },
      include: {
        opportunity: true,
        user: { select: { firstName: true, lastName: true, email: true, profile: { select: { skills: true, bio: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok(res, {
      items: rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        status: row.status,
        answers: row.answers || {},
        form: Array.isArray(row.opportunity.applicationForm) && row.opportunity.applicationForm.length
          ? row.opportunity.applicationForm
          : [{ id: 'why', label: 'Why are you applying?', type: 'long', required: true, options: [] }],
        applicant: {
          firstName: row.user.firstName,
          lastName: row.user.lastName,
          email: row.user.email,
          hasPortfolio: Boolean(row.user.profile?.bio),
        },
        gaps: (row.opportunity.requiredSkills || []).filter((skill) => !(row.user.profile?.skills || []).some((known) => known.toLowerCase() === skill.toLowerCase())),
        opportunity: { id: row.opportunity.id, title: row.opportunity.title },
      })),
    })
  } catch (error) {
    next(error)
  }
})

orgRouter.get('/applications/:id', async (req, res, next) => {
  try {
    const org = await ownedOrg(req.auth.sub)
    if (!org) return fail(res, 404, 'NOT_FOUND', 'Organization profile not found.')
    const row = await prisma.application.findFirst({
      where: { id: req.params.id, opportunity: { orgId: org.id } },
      include: {
        opportunity: { select: { id: true, title: true, type: true } },
        user: { select: { firstName: true, lastName: true, email: true, profile: true } },
      },
    })
    if (!row) return fail(res, 404, 'NOT_FOUND', 'Application not found.')
    const profile = row.user.profile
    return ok(res, {
      id: row.id,
      status: row.status,
      opportunity: row.opportunity,
      applicant: { firstName: row.user.firstName, lastName: row.user.lastName, email: row.user.email },
      portfolio: profile?.bio ? {
        ...profile,
        projects: (Array.isArray(profile.projects) ? profile.projects : []).map((project) => ({
          ...project,
          url: normalizeUrl(project.url),
        })),
        experiences: Array.isArray(profile.experiences) ? profile.experiences : [],
        certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
      } : null,
    })
  } catch (error) {
    next(error)
  }
})

orgRouter.get('/talent', async (req, res, next) => {
  try {
    const org = await ownedOrg(req.auth.sub)
    if (!org) return fail(res, 404, 'NOT_FOUND', 'Organization profile not found.')
    if (org.verificationStatus !== 'APPROVED') {
      return ok(res, { items: [], locked: true })
    }
    const profiles = await prisma.profile.findMany({
      where: { visibility: 'discoverable' },
      include: { user: { select: { firstName: true, lastName: true } } },
      take: 30,
    })
    return ok(res, {
      locked: false,
      items: profiles.map((profile) => ({
        id: profile.id,
        name: `${profile.user.firstName} ${profile.user.lastName}`,
        university: profile.university,
        fieldOfStudy: profile.fieldOfStudy,
        educationLevel: profile.educationLevel,
        skills: profile.skills,
        interests: profile.interests,
        careerGoals: profile.careerGoals,
      })),
    })
  } catch (error) {
    next(error)
  }
})

orgRouter.post('/opportunities', validate(createSchema), async (req, res, next) => {
  try {
    const org = await ownedOrg(req.auth.sub)
    if (!org) return fail(res, 404, 'NOT_FOUND', 'Organization profile not found.')
    const body = req.valid.body
    const wantsPublic = Boolean(body.publish)
    const featured = Boolean(body.featured)
    const promoted = Boolean(body.promoted)
    const usage = await usageFor(org.id)
    if (wantsPublic) {
      const blocked = publishBlock(org, body.type, { featured, promoted }, usage, null)
      if (blocked) return fail(res, 403, 'PLAN', blocked)
    } else if (!LIVE_TYPES.includes(body.type)) {
      return fail(res, 400, 'VALIDATION', 'Organizations can publish internships and events for now.')
    }
    const closesAt = parseDeadline(body.closesAt)
    if (!closesAt) return fail(res, 400, 'VALIDATION', body.type === 'EVENT' ? 'Enter when registration closes.' : 'Enter an application deadline and time.')
    if (wantsPublic && closesAt < new Date()) {
      return fail(res, 400, 'VALIDATION', 'The deadline has already passed.')
    }
    const startsAt = body.startsAt ? parseDeadline(body.startsAt) : null
    if (body.type === 'EVENT' && !startsAt) return fail(res, 400, 'VALIDATION', 'Enter when the event starts.')
    if (body.workMode !== 'REMOTE' && (body.latitude == null || body.longitude == null)) {
      return fail(res, 400, 'VALIDATION', 'Click the map where this internship or event is held.')
    }
    const form = body.applicationForm || []
    for (const question of form) {
      if (question.type === 'choice' && (question.options || []).length < 2) {
        return fail(res, 400, 'VALIDATION', `Add at least two choices for “${question.label}”.`)
      }
    }
    const questions = body.applicationForm || []
    for (const question of questions) {
      if (question.type === 'choice' && (question.options || []).length < 2) {
        return fail(res, 400, 'VALIDATION', `Add at least two choices for “${question.label}”.`)
      }
    }
    const contentClass = classifyContent([
      body.title,
      body.category,
      body.description,
      body.eligibility,
      body.audience,
      ...(body.requiredSkills || []),
      ...(body.applicationForm || []).map((question) => question.label),
    ])
    const restricted = wantsPublic && contentClass === 'RESTRICTED'
    let strikes = org.restrictedPosts
    if (restricted) {
      strikes += 1
      await prisma.organization.update({ where: { id: org.id }, data: { restrictedPosts: strikes } })
      if (strikes >= 3) {
        await prisma.user.update({ where: { id: org.ownerUserId }, data: { status: 'banned' } })
        await prisma.opportunity.updateMany({
          where: { orgId: org.id, status: 'PUBLISHED' },
          data: { status: 'REMOVED', banReason: 'Account banned for repeated community-restricted content.' },
        })
      }
    }
    const created = await prisma.opportunity.create({
      data: {
        orgId: org.id,
        title: body.title,
        type: body.type,
        category: body.category,
        description: body.description,
        responsibilities: body.responsibilities || '',
        eligibility: body.eligibility || 'Open to interested applicants.',
        audience: body.audience || '',
        requiredSkills: body.requiredSkills || [],
        location: body.workMode === 'REMOTE' ? (body.location || 'Remote') : body.location,
        latitude: body.workMode === 'REMOTE' ? null : body.latitude,
        longitude: body.workMode === 'REMOTE' ? null : body.longitude,
        workMode: body.workMode,
        compensation: body.compensation,
        duration: body.duration || '',
        startsAt,
        closesAt,
        applyUrl: '',
        applicationForm: (body.applicationForm || []).map((question) => ({
          ...question,
          options: question.type === 'choice' ? (question.options || []) : [],
        })),
        contentClass,
        banReason: restricted ? 'Not tech-related. Held for admin review.' : '',
        featured: featured && !restricted && wantsPublic,
        promoted: promoted && !restricted && wantsPublic,
        status: restricted ? 'DRAFT' : (wantsPublic ? 'PUBLISHED' : 'DRAFT'),
      },
      include: { org: true },
    })
    if (restricted) {
      return fail(res, 403, strikes >= 3 ? 'ACCOUNT_BANNED' : 'CONTENT_RESTRICTED', restrictionMessage(strikes))
    }
    return ok(res, publicOpportunity(created), 201)
  } catch (error) {
    next(error)
  }
})

orgRouter.post('/opportunities/:id/publish', async (req, res, next) => {
  try {
    const org = await ownedOrg(req.auth.sub)
    if (!org) return fail(res, 404, 'NOT_FOUND', 'Organization profile not found.')
    const existing = await prisma.opportunity.findFirst({
      where: { id: req.params.id, orgId: org.id, status: { in: ['DRAFT', 'CLOSED'] } },
    })
    if (!existing) return fail(res, 404, 'NOT_FOUND', 'Draft opportunity not found.')
    if (!existing.closesAt || existing.closesAt < new Date()) {
      return fail(res, 400, 'VALIDATION', 'Set a future deadline and time before publishing.')
    }
    if (existing.contentClass === 'RESTRICTED') {
      return fail(res, 403, 'CONTENT_RESTRICTED', 'This listing is community restricted and cannot be published. Only tech-related content can go public.')
    }
    const usage = await usageFor(org.id)
    const blocked = publishBlock(org, existing.type, { featured: existing.featured, promoted: existing.promoted }, usage, existing)
    if (blocked) return fail(res, 403, 'PLAN', blocked)
    const updated = await prisma.opportunity.update({
      where: { id: existing.id },
      data: { status: 'PUBLISHED' },
      include: { org: true },
    })
    return ok(res, publicOpportunity(updated))
  } catch (error) {
    next(error)
  }
})

orgRouter.get('/analytics', async (req, res, next) => {
  try {
    const org = await ownedOrg(req.auth.sub)
    if (!org) return fail(res, 404, 'NOT_FOUND', 'Organization profile not found.')
    if (org.subscriptionStatus !== 'ACTIVE' || org.plan === 'FREE' || org.plan === 'NONE') {
      return fail(res, 403, 'PLAN', 'Performance analytics starts on the Basic plan.')
    }
    const listings = await prisma.opportunity.findMany({
      where: { orgId: org.id, type: { in: LIVE_TYPES }, status: { not: 'REMOVED' } },
      include: { _count: { select: { applications: true } } },
      orderBy: { viewCount: 'desc' },
    })
    const totals = {
      views: listings.reduce((sum, item) => sum + item.viewCount, 0),
      applications: listings.reduce((sum, item) => sum + item._count.applications, 0),
      internships: listings.filter((item) => item.type === 'INTERNSHIP' && item.status === 'PUBLISHED').length,
      events: listings.filter((item) => item.type === 'EVENT' && item.status === 'PUBLISHED').length,
    }
    const payload = {
      plan: org.plan,
      totals,
      listings: listings.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        views: item.viewCount,
        applications: item._count.applications,
        featured: item.featured,
        promoted: item.promoted,
        status: item.status,
      })),
    }
    if (org.plan === 'PREMIUM') {
      const applicants = await prisma.application.findMany({
        where: { opportunity: { orgId: org.id } },
        include: { user: { include: { profile: true } } },
        take: 200,
      })
      const audience = {}
      for (const row of applicants) {
        const key = row.user.profile?.fieldOfStudy || 'Not specified'
        audience[key] = (audience[key] || 0) + 1
      }
      payload.audience = audience
      payload.campaigns = await prisma.campaign.findMany({ where: { orgId: org.id }, orderBy: { createdAt: 'desc' } })
    }
    return ok(res, payload)
  } catch (error) {
    next(error)
  }
})

const campaignSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3, 'Enter a campaign title.'),
    message: z.string().trim().min(10, 'Describe the campaign.'),
    audience: z.string().trim().max(120).optional(),
  }),
})

orgRouter.get('/campaigns', async (req, res, next) => {
  try {
    const org = await ownedOrg(req.auth.sub)
    if (!org) return fail(res, 404, 'NOT_FOUND', 'Organization profile not found.')
    const items = await prisma.campaign.findMany({ where: { orgId: org.id }, orderBy: { createdAt: 'desc' } })
    return ok(res, { items, organization: await withSubscription(org) })
  } catch (error) {
    next(error)
  }
})

orgRouter.post('/campaigns', validate(campaignSchema), async (req, res, next) => {
  try {
    const org = await ownedOrg(req.auth.sub)
    if (!org) return fail(res, 404, 'NOT_FOUND', 'Organization profile not found.')
    if (org.subscriptionStatus !== 'ACTIVE' || !['BASIC', 'PREMIUM'].includes(org.plan)) {
      return fail(res, 403, 'PLAN', 'Advertisement campaigns start on the Basic plan.')
    }
    const limits = PLANS[org.plan].limits
    const active = await prisma.campaign.count({ where: { orgId: org.id, status: 'ACTIVE' } })
    if (active >= limits.campaigns) {
      return fail(res, 403, 'PLAN', `This plan allows ${limits.campaigns} active campaign${limits.campaigns === 1 ? '' : 's'}.`)
    }
    const audience = req.valid.body.audience || ''
    if (org.plan !== 'PREMIUM' && audience) {
      return fail(res, 403, 'PLAN', 'Audience targeting is part of the Premium plan.')
    }
    const campaign = await prisma.campaign.create({
      data: {
        orgId: org.id,
        title: req.valid.body.title,
        message: req.valid.body.message,
        audience: org.plan === 'PREMIUM' ? audience : '',
        kind: org.plan === 'PREMIUM' ? 'advanced' : 'basic',
      },
    })
    return ok(res, campaign, 201)
  } catch (error) {
    next(error)
  }
})

const reviewSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ status: z.enum(['ACCEPTED', 'REJECTED']) }),
})

orgRouter.patch('/applications/:id', validate(reviewSchema), async (req, res, next) => {
  try {
    const org = await ownedOrg(req.auth.sub)
    if (!org) return fail(res, 404, 'NOT_FOUND', 'Organization profile not found.')
    const existing = await prisma.application.findFirst({
      where: { id: req.valid.params.id, opportunity: { orgId: org.id } },
    })
    if (!existing) return fail(res, 404, 'NOT_FOUND', 'Application not found.')
    const status = req.valid.body.status
    const application = await prisma.application.update({
      where: { id: existing.id },
      data: { status, reviewedAt: new Date() },
    })
    await prisma.savedItem.updateMany({
      where: { userId: existing.userId, opportunityId: existing.opportunityId },
      data: { trackingStatus: status },
    })
    return ok(res, { id: application.id, status: application.status })
  } catch (error) {
    next(error)
  }
})
