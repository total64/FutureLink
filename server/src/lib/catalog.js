import { applicationFields } from './applicationForm.js'

export const OPPORTUNITY_TYPES = [
  { id: 'INTERNSHIP', label: 'Internships & Jobs' },
  { id: 'SCHOLARSHIP', label: 'Scholarships & Grants' },
  { id: 'EVENT', label: 'Events & Conferences' },
  { id: 'HACKATHON', label: 'Hackathons & Competitions' },
  { id: 'WORKSHOP', label: 'Workshops & Training' },
  { id: 'FELLOWSHIP', label: 'Fellowships & Exchange Programs' },
  { id: 'VOLUNTEERING', label: 'Volunteering Opportunities' },
]

export const TYPE_LABEL = Object.fromEntries(OPPORTUNITY_TYPES.map((item) => [item.id, item.label]))

export const WORK_MODE_LABEL = {
  REMOTE: 'Remote',
  ONSITE: 'On-site',
  HYBRID: 'Hybrid',
  UNSPECIFIED: 'Not specified',
}

export const COMPENSATION_LABEL = {
  PAID: 'Paid',
  UNPAID: 'Unpaid',
  FUNDED: 'Fully funded',
  FREE: 'Free',
  UNSPECIFIED: 'Not specified',
}

export function listingStatus(opportunity, now = new Date()) {
  if (opportunity.status === 'CLOSED' || opportunity.status === 'REMOVED') return 'closed'
  if (opportunity.status === 'DRAFT') return 'draft'
  if (opportunity.closesAt && opportunity.closesAt < now) return 'closed'
  if (opportunity.closesAt && opportunity.closesAt.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return 'closing_soon'
  }
  if (opportunity.startsAt && opportunity.startsAt > now) return 'upcoming'
  return 'open'
}

export function publicOpportunity(opportunity, extra = {}) {
  return {
    id: opportunity.id,
    title: opportunity.title,
    type: opportunity.type,
    category: opportunity.category,
    description: opportunity.description,
    responsibilities: opportunity.responsibilities,
    eligibility: opportunity.eligibility,
    audience: opportunity.audience,
    requiredSkills: opportunity.requiredSkills,
    location: opportunity.location,
    latitude: opportunity.latitude ?? null,
    longitude: opportunity.longitude ?? null,
    workMode: opportunity.workMode,
    compensation: opportunity.compensation,
    duration: opportunity.duration,
    closesAt: opportunity.closesAt,
    startsAt: opportunity.startsAt,
    applicationForm: applicationFields(opportunity),
    status: opportunity.status,
    listingStatus: listingStatus(opportunity),
    viewCount: opportunity.viewCount,
    applyClicks: opportunity.applyClicks,
    featured: Boolean(opportunity.featured),
    promoted: Boolean(opportunity.promoted),
    organization: opportunity.org
      ? {
          id: opportunity.org.id,
          name: opportunity.org.name,
          location: opportunity.org.location,
          verified: opportunity.org.verificationStatus === 'APPROVED',
          industry: opportunity.org.industry,
          description: opportunity.org.portfolioStatus === 'DECLINED' ? '' : opportunity.org.description,
          website: opportunity.org.portfolioStatus === 'DECLINED' ? '' : opportunity.org.website,
        }
      : null,
    ...extra,
  }
}

export function completeness(profile) {
  const checks = [
    Boolean(profile.university),
    Boolean(profile.fieldOfStudy),
    Boolean(profile.educationLevel),
    (profile.skills || []).length > 0,
    (profile.interests || []).length > 0,
    Boolean(profile.careerGoals),
    Boolean(profile.bio) || (Array.isArray(profile.projects) && profile.projects.length > 0),
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export function buildSummary(profile) {
  const parts = []
  if (profile.fieldOfStudy && profile.educationLevel) {
    parts.push(`${profile.educationLevel} in ${profile.fieldOfStudy}`)
  } else if (profile.educationLevel) {
    parts.push(profile.educationLevel)
  }
  if (profile.university) parts.push(`at ${profile.university}`)
  const who = parts.join(' ')
  const interests = (profile.interests || []).slice(0, 3)
  const interestLine = interests.length ? ` Focused on ${interests.join(', ')}.` : ''
  const goal = profile.careerGoals ? ` ${profile.careerGoals.trim()}` : ''
  const summary = `${who ? `${who}.` : ''}${interestLine}${goal}`.trim()
  return summary
}

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    organization: user.organization
      ? {
          id: user.organization.id,
          name: user.organization.name,
          verificationStatus: user.organization.verificationStatus,
          profileSubmitted: user.organization.profileSubmitted,
          location: user.organization.location,
        }
      : null,
  }
}
