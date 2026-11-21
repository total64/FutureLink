function norm(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function mentionedPlace(text, places) {
  const source = norm(text)
  const ordered = [...places].sort((left, right) => right.location.length - left.location.length)
  const exact = ordered.find((place) => source.includes(norm(place.location)))
  if (exact) return { place: exact, choices: [] }
  const words = source.split(/[^a-z0-9]+/).filter((word) => word.length >= 4)
  const choices = places.filter((place) => words.some((word) => norm(place.location).includes(word)))
  if (choices.length === 1) return { place: choices[0], choices: [] }
  return { place: null, choices }
}

function wants(text, pattern) {
  return pattern.test(text)
}

export function guide({ role = 'GUEST', message = '', history = [], places = [], listings = [] }) {
  const text = norm(message)
  const recent = history
    .filter((item) => item?.role === 'user')
    .slice(-3)
    .map((item) => item.content)
    .join(' ')
  const blob = `${recent} ${text}`.trim()
  const { place, choices } = mentionedPlace(blob, places)
  const internships = wants(text, /\bintern/)
  const events = wants(text, /\bevents?\b/)
  const howTo = wants(text, /\b(how|can i|do i|should i|help|guide|explain)\b/)
  const placeQuestion = !howTo && (wants(text, /\bwhere (are|is)\b/) || Boolean(place))

  if (choices.length > 1 && !howTo && (placeQuestion || internships || events)) {
    return {
      reply: `More than one open place matches that. Choose one: ${choices.map((item) => item.location).join(', ')}.`,
      links: choices.slice(0, 4).map((item) => ({
        label: item.location,
        to: `/discover?location=${encodeURIComponent(item.location)}`,
      })),
    }
  }

  if (placeQuestion && !place) {
    const relevant = places.filter((item) => {
      if (internships && !events) return item.internships > 0
      if (events && !internships) return item.events > 0
      return item.internships + item.events > 0
    })
    if (!relevant.length) {
      const kind = internships && !events ? 'internships' : events && !internships ? 'events' : 'internships or events'
      return { reply: `No open ${kind} have a held place right now.`, links: [{ label: 'Browse listings', to: '/discover' }] }
    }
    const lines = relevant.map((item) => {
      const parts = []
      if ((!events || internships) && item.internships) parts.push(`${item.internships} internship${item.internships === 1 ? '' : 's'}`)
      if ((!internships || events) && item.events) parts.push(`${item.events} event${item.events === 1 ? '' : 's'}`)
      return `${item.location} (${parts.join(', ')})`
    })
    return {
      reply: `They are held in ${lines.join('; ')}. Use Held in on Discover to show only that place.`,
      links: relevant.slice(0, 4).map((item) => ({
        label: item.location,
        to: `/discover?location=${encodeURIComponent(item.location)}${internships && !events ? '&type=INTERNSHIP' : ''}${events && !internships ? '&type=EVENT' : ''}`,
      })),
    }
  }

  if (!howTo && (internships || events || place)) {
    const kind = internships && !events ? 'internships' : events && !internships ? 'events' : 'internships and events'
    const held = place ? ` held in ${place.location}` : ''
    if (!listings.length) {
      return {
        reply: `Nothing open matches ${kind}${held}. Try another place, or browse every open listing.`,
        links: [{ label: 'Browse listings', to: place ? `/discover?location=${encodeURIComponent(place.location)}` : '/discover' }],
      }
    }
    return {
      reply: `Here are open ${kind}${held}. Opening one lets you read the details and apply. Acceptance is a separate decision.`,
      links: listings.slice(0, 5).map((item) => ({
        label: `${item.title} · ${item.location || 'Place not set'}`,
        to: `/opportunities/${item.id}`,
      })),
    }
  }

  if (wants(text, /\b(portfolio|cv|resume|pdf|project)\b/)) {
    if (role === 'PROVIDER') {
      return {
        reply: 'When a student applies, open Applications and choose View portfolio. Accept the application if it fits, or reject it if it does not. The student sees that decision.',
        links: [{ label: 'Applications', to: '/org/applications' }],
      }
    }
    if (role === 'GUEST') {
      return {
        reply: 'Students build a portfolio from what they have actually done. Create a student account, then use Build my portfolio. A PDF CV and project links can be included. Nothing is published until you approve it.',
        links: [{ label: 'Create a student account', to: '/register?as=seeker' }],
      }
    }
    return {
      reply: 'Open Build my portfolio. Add your education, skills, projects and their links, and a PDF or text CV. Generate uses only those facts. Review it, then approve it before publishing.',
      links: [{ label: 'Build my portfolio', to: '/profile' }, { label: 'View portfolio', to: '/portfolio' }],
    }
  }

  if (wants(text, /\b(apply|application|applicant|deadline|accept|accepted|reject|rejected|decision)\b/)) {
    if (role === 'PROVIDER') {
      return {
        reply: 'Open Applications for your internships and events. View the student’s portfolio, then accept or reject. Pending applications keep their deadline reminder for the student.',
        links: [{ label: 'Review applications', to: '/org/applications' }],
      }
    }
    return {
      reply: 'Open an internship or event and apply on this site. Track the decision under Applications. Deadline reminders stay only while an application is pending.',
      links: role === 'GUEST'
        ? [{ label: 'Create a student account', to: '/register?as=seeker' }]
        : [{ label: 'Find an internship or event', to: '/discover' }, { label: 'My applications', to: '/applications' }],
    }
  }

  if (wants(text, /\b(publish|create|post|plan|subscription|payment|free plan|venue)\b/)) {
    if (role === 'ADMIN') {
      return {
        reply: 'Organizations submit a profile, then you approve the account. Basic and Premium start after you confirm the payment they submitted.',
        links: [{ label: 'Accounts', to: '/admin/organizations' }, { label: 'Payments', to: '/admin/payments' }],
      }
    }
    if (role !== 'PROVIDER') {
      return {
        reply: 'Organizations publish internships and events. They complete a profile, wait for approval, choose a plan, and set the place where the opportunity is held.',
        links: [{ label: 'Create an organization account', to: '/register?as=provider' }],
      }
    }
    return {
      reply: 'Finish the organization profile and wait for approval. Choose a plan, then create an internship or event and enter the place it is held. Students apply here, and you accept or reject from their portfolio.',
      links: [{ label: 'Organization profile', to: '/org/profile' }, { label: 'Plans', to: '/org/plans' }, { label: 'Create opportunity', to: '/org/publish' }],
    }
  }

  if (wants(text, /\b(recommend|match|for you)\b/)) {
    return {
      reply: role === 'SEEKER'
        ? 'For you lists only internships and events that overlap your portfolio. Use Held in to keep just the ones in a place.'
        : 'Students see For you after they build a portfolio. It shows related internships and events, not every open listing.',
      links: [{ label: 'For you', to: '/discover?type=FOR_YOU' }],
    }
  }

  if (role === 'ADMIN' && wants(text, /\b(approve|account|payment|review)\b/)) {
    return {
      reply: 'Review organization accounts before they can publish. Confirm a payment only when the transfer or Telebirr reference matches.',
      links: [{ label: 'Accounts', to: '/admin/organizations' }, { label: 'Payments', to: '/admin/payments' }],
    }
  }

  if (role === 'PROVIDER') {
    return {
      reply: 'I can help you publish an internship or event, set the place it is held, review a student’s portfolio, and accept or reject an application.',
      links: [{ label: 'Create opportunity', to: '/org/publish' }, { label: 'Applications', to: '/org/applications' }],
    }
  }
  if (role === 'ADMIN') {
    return {
      reply: 'I can help you review organization accounts, restricted content, and payments.',
      links: [{ label: 'Accounts', to: '/admin/organizations' }, { label: 'Payments', to: '/admin/payments' }],
    }
  }
  if (role === 'GUEST') {
    return {
      reply: 'I can help you find internships and events by the place they are held, or explain how students and organizations join.',
      links: [{ label: 'Browse listings', to: '/discover' }, { label: 'Create account', to: '/register' }],
    }
  }
  return {
    reply: 'I can help you build a portfolio, find internships and events by the place they are held, and follow an application.',
    links: [{ label: 'Build my portfolio', to: '/profile' }, { label: 'Browse by place', to: '/discover' }],
  }
}
