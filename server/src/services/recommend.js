function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9+#]+/g, ' ').trim()
}

function includesLoose(haystack, needle) {
  const left = normalize(haystack)
  const right = normalize(needle)
  if (!left || !right || right.length < 3) return false
  return ` ${left} `.includes(` ${right} `) || ` ${right} `.includes(` ${left} `)
}

export function eligibility(profile, opportunity) {
  const checks = []
  const skills = profile?.skills || []
  const required = opportunity.requiredSkills || []

  if (required.length) {
    const matched = required.filter((item) => skills.some((skill) => includesLoose(skill, item)))
    let skillState = 'unknown'
    if (skills.length && matched.length === required.length) skillState = 'met'
    else if (skills.length && matched.length) skillState = 'partial'
    else if (skills.length) skillState = 'missing'
    checks.push({
      label: `${matched.length ? matched.slice(0, 2).join(', ') : required.slice(0, 2).join(', ')} listed in your skills`,
      state: skillState,
    })
  }

  if (opportunity.audience) {
    const level = (profile?.educationLevel || '').toLowerCase()
    const audience = opportunity.audience.toLowerCase()
    let state = 'unknown'
    if (level && (audience.includes('any') || audience.includes(level))) state = 'met'
    else if (level) state = 'missing'
    checks.push({ label: opportunity.audience, state })
  }

  if (opportunity.workMode && opportunity.workMode !== 'UNSPECIFIED') {
    const modes = profile?.workModes || []
    let state = 'unknown'
    if (modes.length && (modes.includes(opportunity.workMode) || opportunity.workMode === 'REMOTE')) state = 'met'
    else if (modes.length) state = 'missing'
    const label = opportunity.workMode === 'ONSITE' ? 'on-site' : opportunity.workMode.toLowerCase()
    checks.push({ label: `Confirm availability for ${label} work`, state })
  }

  const known = checks.filter((check) => check.state !== 'unknown')
  let overall = 'unknown'
  if (known.length && known.every((check) => check.state === 'met')) overall = 'meets'
  else if (known.length) overall = 'partial'

  return { overall, checks }
}

function portfolioTerms(profile) {
  const terms = [
    ...(profile?.skills || []),
    ...(profile?.interests || []),
    profile?.fieldOfStudy,
  ]
  for (const project of profile?.projects || []) {
    if (Array.isArray(project.tech)) terms.push(...project.tech)
  }
  for (const item of profile?.experiences || []) {
    terms.push(item.role)
  }
  return [...new Set(terms.map((item) => String(item || '').trim()).filter((item) => normalize(item).length >= 3))]
}

function listingText(opportunity) {
  return [
    opportunity.title,
    opportunity.description,
    opportunity.responsibilities,
    opportunity.eligibility,
    opportunity.category,
    ...(opportunity.requiredSkills || []),
  ].filter(Boolean).join(' ')
}

export function scoreOpportunity(profile, opportunity) {
  const required = opportunity.requiredSkills || []
  const terms = portfolioTerms(profile)
  const evidence = [
    profile?.careerGoals,
    ...(profile?.projects || []).map((project) => `${project.title || ''} ${project.summary || ''}`),
    ...(profile?.experiences || []).map((item) => item.summary),
  ].filter(Boolean).join(' ')
  const listing = listingText(opportunity)

  const matchedSkills = required.filter((item) => (
    terms.some((term) => includesLoose(term, item)) || includesLoose(evidence, item)
  ))
  const mentioned = terms.filter((term) => (
    includesLoose(listing, term) && !matchedSkills.some((skill) => includesLoose(term, skill))
  ))
  const related = matchedSkills.length > 0 || mentioned.length > 0

  let score = 0
  if (related) {
    if (required.length) score += 70 * (matchedSkills.length / required.length)
    else if (matchedSkills.length) score += 55
    score += Math.min(25, mentioned.length * 10)
    const level = (profile?.educationLevel || '').toLowerCase()
    const audience = (opportunity.audience || '').toLowerCase()
    if (level && audience && (audience.includes('any') || audience.includes(level))) score += 5
    const locations = (profile?.locations || []).map((item) => item.toLowerCase())
    const place = (opportunity.location || '').toLowerCase()
    if (opportunity.workMode === 'REMOTE' || locations.some((item) => item && place.includes(item))) score += 5
  }

  const reasons = []
  if (matchedSkills.length) reasons.push(matchedSkills.slice(0, 3).join(', '))
  if (mentioned.length) reasons.push(mentioned.slice(0, 2).join(', '))

  return {
    score: related ? Math.min(100, Math.round(score)) : 0,
    related,
    explanation: related
      ? `Matched on ${reasons.join(' · ')}.`
      : 'This opportunity is not related to your portfolio.',
    reasons,
    eligibility: eligibility(profile, opportunity),
  }
}

export function rankOpportunities(profile, opportunities) {
  return opportunities
    .map((opportunity) => ({ opportunity, ...scoreOpportunity(profile, opportunity) }))
    .sort((left, right) => right.score - left.score)
}
