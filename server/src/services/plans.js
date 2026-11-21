import { prisma } from '../lib/prisma.js'

export const LIVE_TYPES = ['INTERNSHIP', 'EVENT']

const DAY = 24 * 60 * 60 * 1000

export const PLANS = {
  FREE: {
    code: 'FREE',
    name: 'Free',
    summary: 'For new organizations',
    prices: [{ period: 'NONE', amount: 0, label: 'Free' }],
    limits: { internships: 5, events: 5, promotedEvents: 0, campaigns: 0, featured: false },
    features: [
      'Create an organization profile',
      'Publish up to 5 internships',
      'Publish up to 5 events',
      'Basic application and registration management',
    ],
  },
  BASIC: {
    code: 'BASIC',
    name: 'Basic',
    summary: 'For growing organizations',
    prices: [{ period: 'MONTHLY', amount: 2500, label: '2,500 ETB / month' }],
    limits: { internships: 5, events: 5, promotedEvents: 2, campaigns: 1, featured: false },
    features: [
      '5 internships and 5 events',
      'Basic performance analytics',
      'Manage applications and registrations',
      'Promote up to 2 events',
      '1 basic advertisement campaign',
    ],
  },
  PREMIUM: {
    code: 'PREMIUM',
    name: 'Premium',
    summary: 'For active companies and large organizers',
    prices: [
      { period: 'MONTHLY', amount: 6000, label: '6,000 ETB / month' },
      { period: 'ANNUAL', amount: 60000, label: '60,000 ETB / year' },
    ],
    limits: { internships: 100, events: 100, promotedEvents: 20, campaigns: 5, featured: true },
    features: [
      'Up to 100 internships and 100 events (fair use)',
      'Featured internship and event listings',
      'Advanced advertisement campaigns',
      'Detailed campaign analytics',
      'Audience targeting',
      'Priority support',
    ],
  },
}

export function priceFor(plan, period) {
  const found = PLANS[plan]?.prices.find((item) => item.period === period)
  return found || null
}

export function periodDays(period) {
  if (period === 'ANNUAL') return 365
  if (period === 'MONTHLY') return 30
  return null
}

export async function refreshSubscription(org) {
  if (!org) return org
  if (org.subscriptionStatus === 'ACTIVE' && org.subscriptionEndsAt && org.subscriptionEndsAt < new Date()) {
    return prisma.organization.update({
      where: { id: org.id },
      data: { subscriptionStatus: 'EXPIRED' },
    })
  }
  return org
}

export async function usageFor(orgId) {
  const [internships, events, promotedEvents, campaigns] = await Promise.all([
    prisma.opportunity.count({ where: { orgId, type: 'INTERNSHIP', status: 'PUBLISHED' } }),
    prisma.opportunity.count({ where: { orgId, type: 'EVENT', status: 'PUBLISHED' } }),
    prisma.opportunity.count({ where: { orgId, type: 'EVENT', status: 'PUBLISHED', promoted: true } }),
    prisma.campaign.count({ where: { orgId, status: 'ACTIVE' } }),
  ])
  return { internships, events, promotedEvents, campaigns }
}

export function subscriptionView(org, usage, pendingPayment = null) {
  const active = org.subscriptionStatus === 'ACTIVE' && (org.plan === 'FREE' || org.plan === 'BASIC' || org.plan === 'PREMIUM')
  const plan = active ? PLANS[org.plan] : null
  const endsAt = org.subscriptionEndsAt
  const renewSoon = Boolean(active && endsAt && endsAt.getTime() - Date.now() < 7 * DAY && endsAt > new Date())
  return {
    plan: org.plan,
    status: org.subscriptionStatus,
    billingPeriod: org.billingPeriod,
    endsAt,
    active,
    renewSoon,
    limits: plan?.limits || { internships: 0, events: 0, promotedEvents: 0, campaigns: 0, featured: false },
    features: plan?.features || [],
    usage,
    pendingPayment,
  }
}

export function publishBlock(org, type, flags, usage, existing) {
  if (org.verificationStatus !== 'APPROVED') {
    return 'Your organization must be approved before a listing can go public.'
  }
  if (!org.profileSubmitted) {
    return 'Submit your organization profile before publishing.'
  }
  if (org.subscriptionStatus !== 'ACTIVE' || !PLANS[org.plan]) {
    return 'Choose a subscription and finish payment before publishing.'
  }
  if (!LIVE_TYPES.includes(type)) {
    return 'Organizations can publish internships and events for now.'
  }
  const limits = PLANS[org.plan].limits
  const alreadyLive = existing?.status === 'PUBLISHED'
  if (type === 'INTERNSHIP' && !alreadyLive && usage.internships >= limits.internships) {
    return `The ${org.plan.toLowerCase()} plan allows ${limits.internships} live internship${limits.internships === 1 ? '' : 's'}. Upgrade to publish another.`
  }
  if (type === 'EVENT' && !alreadyLive && usage.events >= limits.events) {
    return `The ${org.plan.toLowerCase()} plan allows ${limits.events} live event${limits.events === 1 ? '' : 's'}. Upgrade to publish another.`
  }
  if (flags.featured && !limits.featured) {
    return 'Featured listings are part of the Premium plan.'
  }
  if (flags.promoted) {
    if (type !== 'EVENT') return 'Only events can be promoted.'
    if (limits.promotedEvents < 1) return 'Promoted events start on the Basic plan.'
    const already = existing?.promoted && existing.status === 'PUBLISHED'
    if (!already && usage.promotedEvents >= limits.promotedEvents) {
      return `This plan can promote ${limits.promotedEvents} event${limits.promotedEvents === 1 ? '' : 's'}.`
    }
  }
  return ''
}
