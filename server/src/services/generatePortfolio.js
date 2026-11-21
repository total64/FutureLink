function clean(value, limit = 400) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function sentence(value) {
  const text = clean(value).replace(/[.]+$/, '')
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function lowerFirst(value) {
  const text = sentence(value)
  if (!text) return ''
  return text.charAt(0).toLowerCase() + text.slice(1)
}

function list(items) {
  const values = items.map((item) => clean(item, 80)).filter(Boolean)
  if (values.length === 0) return ''
  if (values.length === 1) return values[0]
  if (values.length === 2) return `${values[0]} and ${values[1]}`
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`
}

export function normalizeUrl(value) {
  const text = clean(value, 300)
  if (!text) return ''
  if (/^https?:\/\//i.test(text)) return text
  return `https://${text}`
}

function article(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a'
}

function retell(note) {
  const text = lowerFirst(note)
  if (!text) return ''
  const help = text.match(/^helps?\s+(.+)$/i)
  if (help) return `It exists to help ${help[1]}, and it stands here as a working example of that idea`
  return `What it sets out to do is ${text}, written here as a finished piece of work`
}

function projectStory(project) {
  const detail = retell(project.note)
  const tools = list(project.tech.slice(0, 4))
  const made = tools ? ` The making relies on ${tools}.` : ''
  if (detail) return `${project.title} carries the same thread. ${detail}.${made}`
  if (tools) return `${project.title} is a public piece of the practice, made with ${tools}.`
  return `${project.title} belongs in this portfolio as finished work.`
}

export function generatePortfolio(input) {
  const university = clean(input.university, 160)
  const field = clean(input.fieldOfStudy, 160)
  const level = clean(input.educationLevel, 80)
  const skills = (input.skills || []).map((item) => clean(item, 40)).filter(Boolean).slice(0, 12)
  const interests = (input.interests || []).map((item) => clean(item, 40)).filter(Boolean).slice(0, 12)
  const careerNote = clean(input.careerNote || input.careerGoals, 800)
  const projects = (input.projects || [])
    .map((project) => ({
      title: clean(project.title, 120),
      note: clean(project.note || project.summary, 400),
      tech: (project.tech || []).map((item) => clean(item, 40)).filter(Boolean).slice(0, 8),
      url: normalizeUrl(project.url),
    }))
    .filter((project) => project.title)
    .slice(0, 8)
  const portfolioUrl = normalizeUrl(input.portfolioUrl)
  const photoUrl = normalizeUrl(input.photoUrl)
  const phone = clean(input.phone, 40)
  const experiences = (input.experiences || [])
    .map((item) => ({
      role: clean(item.role, 120),
      organization: clean(item.organization, 160),
      note: clean(item.note, 400),
    }))
    .filter((item) => item.role || item.organization)
    .slice(0, 8)
  const certifications = (input.certifications || [])
    .map((item) => ({
      title: clean(item.title, 160),
      issuer: clean(item.issuer, 160),
    }))
    .filter((item) => item.title)
    .slice(0, 8)

  let opening = 'This portfolio collects study and making into one story.'
  if (level && field && university) {
    opening = `The story starts with ${article(level)} ${level.toLowerCase()} student of ${field} at ${university}.`
  } else if (field && university) {
    opening = `The story starts with study in ${field} at ${university}.`
  } else if (field) {
    opening = `The story starts with study in ${field}.`
  } else if (university) {
    opening = `The story starts at ${university}.`
  }

  const skillLine = skills.length
    ? `${sentence(list(skills.slice(0, 5)))} ${skills.length === 1 ? 'shows' : 'show'} up as a way of working: the means for turning study into something another person can use.`
    : ''

  const interestLine = interests.length
    ? `The themes underneath the projects are ${list(interests.slice(0, 4).map((item) => lowerFirst(item)))}.`
    : ''

  const stories = projects.map(projectStory)
  const aimPhrase = lowerFirst(careerNote).replace(/^(i want to|i want|i'd like to|i would like to|my goal is to|my goal is|looking for)\s+/i, '')
  const aim = aimPhrase
    ? `The aim from here is ${aimPhrase}.`
    : 'The aim from here is a place to keep building with other people.'
  const linkLine = portfolioUrl ? 'More of the work sits at the portfolio link on this page.' : ''

  const bio = [opening, skillLine, interestLine, stories[0], aim, linkLine].filter(Boolean).join(' ').slice(0, 800)
  const careerGoals = aimPhrase
    ? `Building toward ${aimPhrase}, with the projects here as the evidence.`
    : ''

  const writtenExperiences = experiences.map((item) => {
    const place = [item.role, item.organization && `at ${item.organization}`].filter(Boolean).join(' ')
    const detail = retell(item.note)
    const summary = detail
      ? `${sentence(place)}. ${detail}.`
      : `${sentence(place)} is listed from the experience you provided.`
    return { role: item.role, organization: item.organization, summary: summary.slice(0, 400) }
  })
  const writtenCertificates = certifications.map((item) => ({
    title: item.title,
    issuer: item.issuer,
    summary: item.issuer
      ? `${item.title}, awarded by ${item.issuer}.`
      : `${item.title} is included because you listed it.`,
  }))

  const missing = []
  if (!photoUrl) missing.push('Add a profile picture if you have one.')
  if (!careerNote) missing.push('Add a short note about the work you want.')
  if (!university && !field) missing.push('Add your university or field of study.')
  if (!skills.length) missing.push('Add technical skills you actually use.')
  if (!projects.length) missing.push('Add a project you have worked on.')
  if (!experiences.length) missing.push('Add internships or work only if you have them.')
  if (!certifications.length) missing.push('Add a certificate only if you earned one.')
  if (!phone) missing.push('Add a phone number if you want it on the public page.')

  return {
    university,
    fieldOfStudy: field,
    educationLevel: level,
    skills,
    interests,
    bio,
    careerGoals: careerGoals.slice(0, 800),
    portfolioUrl,
    photoUrl,
    phone,
    experiences: writtenExperiences,
    certifications: writtenCertificates,
    projects: projects.map((project, index) => ({
      title: project.title,
      summary: stories[index].slice(0, 400),
      tech: project.tech,
      url: project.url,
    })),
    missing,
    sourceNotes: {
      careerNote,
      projects: projects.map((project) => ({
        title: project.title,
        note: project.note,
        tech: project.tech,
        url: project.url,
      })),
      experiences: experiences.map((item) => ({
        role: item.role,
        organization: item.organization,
        note: item.note,
      })),
      certifications,
    },
  }
}
