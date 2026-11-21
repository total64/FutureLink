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

export function openWhere(now = new Date()) {
  return {
    status: 'PUBLISHED',
    org: { verificationStatus: 'APPROVED' },
    OR: [{ closesAt: null }, { closesAt: { gte: now } }],
  }
}
