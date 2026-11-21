const SKILLS = [
  'Figma', 'UX research', 'Prototyping', 'Python', 'JavaScript', 'TypeScript', 'React',
  'Node.js', 'SQL', 'PostgreSQL', 'Java', 'Flutter', 'UI design', 'User research',
  'Data analysis', 'Machine learning', 'Cybersecurity', 'Cloud', 'Product design',
  'HTML', 'CSS', 'Git', 'Django', 'Flask', 'Next.js', 'Vue',
]

const INTERESTS = [
  'Product design', 'Technology', 'Social impact', 'Artificial intelligence',
  'Cybersecurity', 'Data science', 'Software engineering', 'Community', 'Research',
  'Frontend', 'Backend',
]

const LEVELS = [
  ['undergraduate', 'Undergraduate'],
  ['bachelor', 'Undergraduate'],
  ['graduate', 'Graduate'],
  ['master', 'Graduate'],
  ['diploma', 'Diploma'],
  ['high school', 'High school'],
]

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').replace(/^[\s,.-]+|[\s,.-]+$/g, '').slice(0, 400)
}

function sentence(value) {
  const text = clean(value)
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function mentions(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text)
}

function unique(items, limit) {
  const seen = new Set()
  const result = []
  for (const item of items) {
    const text = clean(item)
    const key = text.toLowerCase()
    if (!text || seen.has(key)) continue
    seen.add(key)
    result.push(text)
    if (result.length >= limit) break
  }
  return result
}

function after(text, pattern) {
  const match = text.match(pattern)
  return match ? clean(match[1]) : ''
}

export function readPortfolioFacts(messages) {
  const text = messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .join('\n')
  const lower = text.toLowerCase()

  const university = after(text, /(?:at|from)\s+((?:[A-Z][\w&.'’-]*\s+){0,5}(?:University|College|Institute))/ )
    || after(text, /(?:university|college)\s*(?:is|:)\s*([^.\n]+)/i)

  const field = after(text, /(?:studying|study|studied|majoring in|major in|field of study is|field is)\s+([^.\n]+)/i)
    || (lower.includes('computer science') ? 'Computer Science' : '')
    || (lower.includes('software engineering') ? 'Software Engineering' : '')
    || (lower.includes('information systems') ? 'Information Systems' : '')

  const level = LEVELS.find(([word]) => lower.includes(word))?.[1] || ''

  const listedSkills = after(text, /skills?(?:\s+are|\s+include|:)\s+([^.\n]+)/i)
    .split(/,| and /i)
  const skills = unique([
    ...SKILLS.filter((skill) => mentions(lower, skill.toLowerCase())),
    ...listedSkills,
  ], 12)

  const listedInterests = after(text, /interested in\s+([^.\n]+)/i).split(/,| and /i)
  const interests = unique([
    ...INTERESTS.filter((interest) => mentions(lower, interest.toLowerCase())),
    ...listedInterests,
  ], 12)

  const projects = []
  const projectPattern = /(?:built|created|made|designed|worked on|project called|project:)\s+([^.\n]+)/gi
  for (const match of text.matchAll(projectPattern)) {
    const summary = clean(match[1])
    if (summary.length < 3) continue
    const title = sentence(summary.split(/ that | which | for | using /i)[0].replace(/^(a|an|the)\s+/i, '')).slice(0, 80)
    const tech = SKILLS.filter((skill) => mentions(summary, skill))
    projects.push({ title: title || 'Project', summary: sentence(summary), tech })
    if (projects.length >= 6) break
  }

  const careerGoals = after(text, /(?:i want(?:\s+to)?|i'd like to|my goal is|i am looking for|i'm looking for|looking for)\s+([^.\n]+)/i)
  const location = after(text, /(?:based in|live in|located in)\s+([^.\n]+)/i)

  const bioParts = []
  if (level || field || university) {
    bioParts.push([level, field ? `in ${field}` : '', university ? `at ${university}` : ''].filter(Boolean).join(' '))
  }
  if (skills.length) bioParts.push(`I use ${skills.slice(0, 5).join(', ')}`)
  if (projects[0]) bioParts.push(projects[0].summary.replace(/^(a|an|the)\s+/i, (word) => word.charAt(0).toUpperCase() + word.slice(1)))
  if (careerGoals) bioParts.push(careerGoals.toLowerCase().startsWith('to ') ? `I want ${careerGoals}` : `I want ${careerGoals}`)

  return {
    university,
    fieldOfStudy: field.replace(/^to\s+/i, ''),
    educationLevel: level,
    skills,
    interests,
    projects,
    careerGoals,
    locations: location ? [location] : [],
    bio: bioParts.join('. ').replace(/\.\./g, '.').trim(),
  }
}

function missingQuestion(facts) {
  if (!facts.university && !facts.fieldOfStudy) {
    return 'Where do you study, and what is your field?'
  }
  if (!facts.skills.length) {
    return 'Which tools or skills should be on the portfolio?'
  }
  if (!facts.projects.length) {
    return 'Tell me about one thing you have built or worked on.'
  }
  if (!facts.careerGoals) {
    return 'What kind of internship or role are you looking for?'
  }
  return ''
}

export function replyToPortfolioChat(messages) {
  const facts = readPortfolioFacts(messages)
  const last = [...messages].reverse().find((message) => message.role === 'user')?.content || ''
  const asksToBuild = /\b(build|create|draft|done|that'?s all|save|portfolio)\b/i.test(last)
  const question = missingQuestion(facts)
  const hasStory = Boolean(facts.bio && (facts.skills.length || facts.projects.length || facts.careerGoals || facts.university))
  const ready = hasStory && (asksToBuild || !question)

  let reply
  if (!last.trim()) {
    reply = 'Tell me about your studies, skills, a project, and the kind of work you want. I will turn that into your portfolio.'
  } else if (!hasStory) {
    reply = question || 'Add a little more about your studies or a project, and I will draft the portfolio.'
  } else if (question && !asksToBuild) {
    reply = `I can use this so far. ${question}`
  } else {
    const bits = [
      facts.university ? `studies at ${facts.university}` : '',
      facts.skills.length ? facts.skills.slice(0, 4).join(', ') : '',
      facts.projects[0] ? facts.projects[0].title : '',
    ].filter(Boolean)
    reply = `I drafted your portfolio${bits.length ? ` with ${bits.join(', ')}` : ''}. Save it if this looks right, or tell me what to change.`
  }

  return { reply, draft: facts, ready: ready || (hasStory && asksToBuild) }
}
