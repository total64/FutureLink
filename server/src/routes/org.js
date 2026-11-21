import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { fail, ok } from '../lib/http.js'
import { listingStatus, publicOpportunity } from '../lib/catalog.js'
import { closeExpired, parseDeadline } from '../lib/deadline.js'
import { classifyContent, restrictionMessage } from '../services/contentPolicy.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
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
  type: z.enum(['INTERNSHIP', 'SCHOLARSHIP', 'EVENT', 'HACKATHON', 'WORKSHOP', 'FELLOWSHIP', 'VOLUNTEERING']),
  category: z.string().trim().min(2, 'Choose a category.'),
  description: z.string().trim().min(20, 'Describe the opportunity in a few sentences.'),
  responsibilities: z.string().trim().max(2000).optional(),
  eligibility: z.string().trim().max(2000).optional(),
  audience: z.string().trim().max(80).optional(),
  requiredSkills: z.array(z.string().trim().min(1)).max(12).optional(),
  location: z.string().trim().min(2, 'Enter a location.'),
  workMode: z.enum(['REMOTE', 'ONSITE', 'HYBRID']),
  compensation: z.enum(['PAID', 'UNPAID', 'FUNDED', 'FREE', 'UNSPECIFIED']),
  duration: z.string().trim().max(80).optional(),
  closesAt: z.string().min(1, 'Enter an application deadline and time.'),
  applicationForm: z.array(questionSchema).max(12).optional(),
  publish: z.boolean().optional(),
})

const createSchema = z.object({ body: opportunityBody })

async function ownedOrg(userId) {
  return prisma.organization.findUnique({ where: { ownerUserId: userId } })
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
    return ok(res, org)
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
      where: { orgId: org.id, status: { not: 'REMOVED' } },
      orderBy: { updatedAt: 'desc' },
    })
    const ids = opportunities.map((item) => item.id)
    const applications = ids.length
      ? await prisma.application.count({ where: { opportunityId: { in: ids } } })
      : 0
    const active = opportunities.filter((item) => item.status === 'PUBLISHED' && listingStatus(item) !== 'closed')
    return ok(res, {
      organization: org,
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
        user: { select: { firstName: true, lastName: true, email: true } },
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
        applicant: row.user,
        opportunity: { id: row.opportunity.id, title: row.opportunity.title },
      })),
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
    if (wantsPublic && org.verificationStatus !== 'APPROVED') {
      return fail(res, 403, 'ORG_NOT_VERIFIED', 'Your organization must be verified before a listing can go public. Save it as a draft for now.')
    }
    const closesAt = parseDeadline(body.closesAt)
    if (!closesAt) return fail(res, 400, 'VALIDATION', 'Enter an application deadline and time.')
    if (wantsPublic && closesAt < new Date()) {
      return fail(res, 400, 'VALIDATION', 'The deadline has already passed.')
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
        location: body.location,
        workMode: body.workMode,
        compensation: body.compensation,
        duration: body.duration || '',
        closesAt,
        applyUrl: '',
        applicationForm: (body.applicationForm || []).map((question) => ({
          ...question,
          options: question.type === 'choice' ? (question.options || []) : [],
        })),
        contentClass,
        banReason: restricted ? 'Not tech-related. Held for admin review.' : '',
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
    if (org.verificationStatus !== 'APPROVED') {
      return fail(res, 403, 'ORG_NOT_VERIFIED', 'Your organization must be verified before a listing can go public.')
    }
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
