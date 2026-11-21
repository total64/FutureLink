import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { fail, ok } from '../lib/http.js'
import { buildSummary, completeness } from '../lib/catalog.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { structureText } from '../services/structureText.js'
import { extractText } from 'unpdf'
import { generatePortfolio, normalizeUrl } from '../services/generatePortfolio.js'

const profileSchema = z.object({
  body: z.object({
    university: z.string().trim().max(160).optional(),
    fieldOfStudy: z.string().trim().max(160).optional(),
    educationLevel: z.string().trim().max(80).optional(),
    skills: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    interests: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    careerGoals: z.string().trim().max(800).optional(),
    bio: z.string().trim().max(800).optional(),
    portfolioUrl: z.string().trim().max(300).optional(),
    photoUrl: z.string().trim().max(300).optional(),
    phone: z.string().trim().max(40).optional(),
    template: z.enum(['modern', 'minimal', 'professional', 'creative']).optional(),
    experiences: z.array(z.object({
      role: z.string().trim().max(120).optional(),
      organization: z.string().trim().max(160).optional(),
      summary: z.string().trim().max(400).optional(),
    })).max(8).optional(),
    certifications: z.array(z.object({
      title: z.string().trim().max(160),
      issuer: z.string().trim().max(160).optional(),
      summary: z.string().trim().max(400).optional(),
    })).max(8).optional(),
    sourceNotes: z.object({
      careerNote: z.string().max(800).optional(),
      projects: z.array(z.object({
        title: z.string().max(120).optional(),
        note: z.string().max(400).optional(),
        tech: z.array(z.string().max(40)).max(8).optional(),
        url: z.string().max(300).optional(),
      })).max(8).optional(),
    }).optional(),
    locations: z.array(z.string().trim().max(80)).max(6).optional(),
    workModes: z.array(z.enum(['REMOTE', 'ONSITE', 'HYBRID'])).max(3).optional(),
    projects: z.array(z.object({
      title: z.string().trim().min(1).max(120),
      summary: z.string().trim().max(400).optional(),
      tech: z.array(z.string().trim().max(40)).max(8).optional(),
      url: z.string().trim().max(300).optional(),
    })).max(8).optional(),
    visibility: z.enum(['private', 'discoverable']).optional(),
  }),
})

function present(profile) {
  const { user, ...rest } = profile
  return {
    ...rest,
    projects: (Array.isArray(profile.projects) ? profile.projects : []).map((project) => ({
      ...project,
      url: normalizeUrl(project.url),
    })),
    experiences: Array.isArray(profile.experiences) ? profile.experiences : [],
    certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
  }
}

export const publicPortfolioRouter = Router()

publicPortfolioRouter.get('/:slug', async (req, res, next) => {
  try {
    const profile = await prisma.profile.findFirst({
      where: { slug: req.params.slug, published: true },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    })
    if (!profile) return fail(res, 404, 'NOT_FOUND', 'This portfolio is not published.')
    return ok(res, {
      ...present(profile),
      name: `${profile.user.firstName} ${profile.user.lastName}`.trim(),
      email: profile.user.email,
    })
  } catch (error) {
    next(error)
  }
})

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

const generateSchema = z.object({
  body: z.object({
    university: z.string().trim().max(160).optional(),
    fieldOfStudy: z.string().trim().max(160).optional(),
    educationLevel: z.string().trim().max(80).optional(),
    skills: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    interests: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    firstName: z.string().trim().max(80).optional(),
    lastName: z.string().trim().max(80).optional(),
    photoUrl: z.string().trim().max(300).optional(),
    phone: z.string().trim().max(40).optional(),
    careerNote: z.string().trim().max(800).optional(),
    experiences: z.array(z.object({
      role: z.string().trim().max(120).optional(),
      organization: z.string().trim().max(160).optional(),
      note: z.string().trim().max(400).optional(),
    })).max(8).optional(),
    certifications: z.array(z.object({
      title: z.string().trim().max(160).optional(),
      issuer: z.string().trim().max(160).optional(),
    })).max(8).optional(),
    locations: z.array(z.string().trim().max(80)).max(6).optional(),
    workModes: z.array(z.enum(['REMOTE', 'ONSITE', 'HYBRID'])).max(3).optional(),
    projects: z.array(z.object({
      title: z.string().trim().max(120).optional(),
      note: z.string().trim().max(400).optional(),
      tech: z.array(z.string().trim().max(40)).max(8).optional(),
      url: z.string().trim().max(300).optional(),
    })).max(8).optional(),
    portfolioUrl: z.string().trim().max(300).optional(),
    visibility: z.enum(['private', 'discoverable']).optional(),
  }),
})

profileRouter.post('/generate', validate(generateSchema), async (req, res, next) => {
  try {
    const body = req.valid.body
    const facts = [body.university, body.fieldOfStudy, ...(body.skills || []), ...(body.projects || []).map((item) => item.title)].filter(Boolean)
    if (facts.length < 2) {
      return fail(res, 400, 'VALIDATION', 'Add your studies and at least one skill or project before generating.')
    }
    if (body.portfolioUrl && !/^https?:\/\/\S+$/i.test(normalizeUrl(body.portfolioUrl))) {
      return fail(res, 400, 'VALIDATION', 'Enter a portfolio link such as https://github.com/your-name.')
    }
    const written = generatePortfolio(body)
    const current = await prisma.profile.upsert({
      where: { userId: req.auth.sub },
      update: {},
      create: { userId: req.auth.sub },
    })
    const nextProfile = {
      ...current,
      ...written,
      locations: body.locations ?? current.locations,
      workModes: body.workModes ?? current.workModes,
      visibility: body.visibility || current.visibility || 'private',
    }
    if (body.firstName || body.lastName) {
      await prisma.user.update({
        where: { id: req.auth.sub },
        data: {
          ...(body.firstName ? { firstName: body.firstName } : {}),
          ...(body.lastName ? { lastName: body.lastName } : {}),
        },
      })
    }
    const saved = await prisma.profile.update({
      where: { userId: req.auth.sub },
      data: {
        university: written.university,
        fieldOfStudy: written.fieldOfStudy,
        educationLevel: written.educationLevel,
        skills: written.skills,
        interests: written.interests,
        projects: written.projects,
        bio: written.bio,
        careerGoals: written.careerGoals,
        portfolioUrl: written.portfolioUrl,
        photoUrl: written.photoUrl,
        phone: written.phone,
        experiences: written.experiences,
        certifications: written.certifications,
        sourceNotes: written.sourceNotes,
        locations: nextProfile.locations,
        workModes: nextProfile.workModes,
        visibility: nextProfile.visibility,
        completeness: completeness(nextProfile),
        aiSummary: buildSummary(nextProfile),
        version: { increment: 1 },
      },
    })
    return ok(res, { profile: present(saved), missing: written.missing })
  } catch (error) {
    next(error)
  }
})

profileRouter.post('/github', async (req, res, next) => {
  try {
    const username = String(req.body?.username || '').trim().replace(/^@/, '')
    if (!/^[A-Za-z0-9-]{1,39}$/.test(username)) {
      return fail(res, 400, 'VALIDATION', 'Enter a public GitHub username.')
    }
    const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=6&sort=updated`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'FutureLink' },
    })
    if (!response.ok) return fail(res, 400, 'VALIDATION', 'Those public repositories could not be read.')
    const repos = await response.json()
    const projects = (Array.isArray(repos) ? repos : [])
      .filter((repo) => !repo.fork)
      .slice(0, 6)
      .map((repo) => ({
        title: repo.name,
        note: repo.description || '',
        tech: repo.language ? [repo.language] : [],
        url: repo.html_url,
      }))
    return ok(res, { projects })
  } catch (error) {
    next(error)
  }
})

profileRouter.post('/cv', async (req, res, next) => {
  try {
    const encoded = String(req.body?.pdf || '').replace(/^data:application\/pdf;base64,/, '')
    if (!encoded) return fail(res, 400, 'VALIDATION', 'Choose a PDF file.')
    const buffer = Buffer.from(encoded, 'base64')
    if (buffer.length < 5 || buffer.subarray(0, 5).toString() !== '%PDF-') {
      return fail(res, 400, 'VALIDATION', 'That file is not a PDF.')
    }
    if (buffer.length > 6_000_000) return fail(res, 400, 'VALIDATION', 'The PDF must be under 6 MB.')
    let extracted
    try {
      extracted = await extractText(new Uint8Array(buffer), { mergePages: true })
    } catch {
      return fail(res, 400, 'VALIDATION', 'That PDF could not be read. Try a text-based PDF, or paste the CV text.')
    }
    const text = String(extracted.text || '').replace(/\s+/g, ' ').trim()
    if (text.length < 20) return fail(res, 400, 'VALIDATION', 'No readable text was found in that PDF.')
    return ok(res, structureText(text.slice(0, 8000)))
  } catch (error) {
    next(error)
  }
})

profileRouter.post('/publish', async (req, res, next) => {
  try {
    const approved = req.body?.approved === true
    if (!approved) return fail(res, 400, 'VALIDATION', 'Approve the portfolio before publishing.')
    const user = await prisma.user.findUnique({ where: { id: req.auth.sub } })
    const current = await prisma.profile.findUnique({ where: { userId: req.auth.sub } })
    if (!current?.bio) return fail(res, 400, 'VALIDATION', 'Generate the portfolio before publishing.')
    const base = `${user.firstName} ${user.lastName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'student'
    let slug = current.slug || base
    let suffix = 2
    while (await prisma.profile.findFirst({ where: { slug, NOT: { userId: req.auth.sub } } })) {
      slug = `${base}-${suffix}`
      suffix += 1
    }
    const saved = await prisma.profile.update({
      where: { userId: req.auth.sub },
      data: { slug, published: true, visibility: 'discoverable' },
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
