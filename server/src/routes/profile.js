import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { fail, ok } from '../lib/http.js'
import { buildSummary, completeness } from '../lib/catalog.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { structureText } from '../services/structureText.js'

const profileSchema = z.object({
  body: z.object({
    university: z.string().trim().max(160).optional(),
    fieldOfStudy: z.string().trim().max(160).optional(),
    educationLevel: z.string().trim().max(80).optional(),
    skills: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    interests: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    careerGoals: z.string().trim().max(800).optional(),
    bio: z.string().trim().max(800).optional(),
    locations: z.array(z.string().trim().max(80)).max(6).optional(),
    workModes: z.array(z.enum(['REMOTE', 'ONSITE', 'HYBRID'])).max(3).optional(),
    projects: z.array(z.object({
      title: z.string().trim().min(1).max(120),
      summary: z.string().trim().max(400).optional(),
      tech: z.array(z.string().trim().max(40)).max(8).optional(),
    })).max(8).optional(),
    visibility: z.enum(['private', 'discoverable']).optional(),
  }),
})

function present(profile) {
  return {
    ...profile,
    projects: Array.isArray(profile.projects) ? profile.projects : [],
  }
}

export const profileRouter = Router()

profileRouter.use(requireAuth, requireRole('SEEKER', 'ADMIN'))

profileRouter.get('/', async (req, res, next) => {
  try {
    const profile = await prisma.profile.upsert({
      where: { userId: req.auth.sub },
      update: {},
      create: { userId: req.auth.sub },
    })
    return ok(res, present(profile))
  } catch (error) {
    next(error)
  }
})

profileRouter.put('/', validate(profileSchema), async (req, res, next) => {
  try {
    const current = await prisma.profile.upsert({
      where: { userId: req.auth.sub },
      update: {},
      create: { userId: req.auth.sub },
    })
    const patch = Object.fromEntries(
      Object.entries(req.valid.body).filter(([, value]) => value !== undefined),
    )
    const nextProfile = {
      ...current,
      ...patch,
      projects: patch.projects ?? current.projects,
    }
    const saved = await prisma.profile.update({
      where: { userId: req.auth.sub },
      data: {
        ...patch,
        completeness: completeness(nextProfile),
        aiSummary: buildSummary(nextProfile),
        version: { increment: 1 },
      },
    })
    return ok(res, present(saved))
  } catch (error) {
    next(error)
  }
})

profileRouter.post('/structure', async (req, res, next) => {
  try {
    const text = String(req.body?.text || '').trim()
    if (text.length < 20) return fail(res, 400, 'VALIDATION', 'Write a few sentences so suggestions have something to read.')
    return ok(res, structureText(text))
  } catch (error) {
    next(error)
  }
})
