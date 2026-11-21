export const ORGANIZER_TYPES = {
  INTERNSHIP: 'Internship',
  EVENT: 'Event',
}

export const TYPE_LABEL = {
  INTERNSHIP: 'Internships & Jobs',
  SCHOLARSHIP: 'Scholarships & Grants',
  EVENT: 'Events & Conferences',
  HACKATHON: 'Hackathons & Competitions',
  WORKSHOP: 'Workshops & Training',
  FELLOWSHIP: 'Fellowships & Exchange Programs',
  VOLUNTEERING: 'Volunteering Opportunities',
}

export const TYPE_BADGE = {
  INTERNSHIP: 'Internship',
  SCHOLARSHIP: 'Scholarship',
  EVENT: 'Event',
  HACKATHON: 'Hackathon',
  WORKSHOP: 'Workshop',
  FELLOWSHIP: 'Fellowship',
  VOLUNTEERING: 'Volunteering',
}

export const WORK_LABEL = {
  REMOTE: 'Remote',
  ONSITE: 'On-site',
  HYBRID: 'Hybrid',
  UNSPECIFIED: 'Flexible',
}

export const PAY_LABEL = {
  PAID: 'Paid',
  UNPAID: 'Unpaid',
  FUNDED: 'Fully funded',
  FREE: 'Free',
  UNSPECIFIED: 'Not specified',
}

export function formatDate(value) {
  if (!value) return 'Open'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Addis_Ababa',
  }).format(new Date(value))
}

export function decisionLabel(status) {
  if (status === 'ACCEPTED') return 'Accepted'
  if (status === 'REJECTED') return 'Not accepted'
  if (status === 'PENDING') return 'Waiting for a decision'
  return 'Applied'
}

export function statusLabel(status) {
  if (status === 'closing_soon') return 'Closing soon'
  if (status === 'closed') return 'Closed'
  if (status === 'upcoming') return 'Upcoming'
  if (status === 'draft') return 'Draft'
  return 'Active'
}
