import { prisma } from './prisma.js'

const ADDIS_OFFSET = '+03:00'

export async function closeExpired(now = new Date()) {
  await prisma.opportunity.updateMany({
    where: { status: 'PUBLISHED', closesAt: { lt: now } },
    data: { status: 'CLOSED' },
  })
}

export function parseDeadline(value) {
  const text = String(value || '').trim()
  if (!text) return null
  let iso = text
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) iso = `${text}T23:59:00${ADDIS_OFFSET}`
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) iso = `${text}:00${ADDIS_OFFSET}`
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(text)) iso = `${text}${ADDIS_OFFSET}`
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date
}

export function deadlineReminder(closesAt, now = new Date()) {
  if (!closesAt) return null
  const end = new Date(closesAt)
  if (Number.isNaN(end.getTime())) return null
  const hours = (end.getTime() - now.getTime()) / 36e5
  if (hours < 0) return { level: 'passed', label: 'Deadline passed' }
  if (hours < 24) return { level: 'today', label: 'Deadline is today' }
  if (hours < 48) return { level: 'soon', label: 'Deadline is tomorrow' }
  const days = Math.ceil(hours / 24)
  if (days <= 7) return { level: 'soon', label: `Deadline in ${days} days` }
  return { level: 'upcoming', label: `Deadline in ${days} days` }
}

export function openWhere(now = new Date()) {
  return {
    status: 'PUBLISHED',
    type: { in: ['INTERNSHIP', 'EVENT'] },
    org: { verificationStatus: 'APPROVED' },
    OR: [{ closesAt: null }, { closesAt: { gte: now } }],
  }
}
