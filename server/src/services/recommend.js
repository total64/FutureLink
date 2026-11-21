const STOP = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'into', 'want', 'have', 'will', 'about', 'more'])

function tokens(value) {
  return new Set(
    String(value || '')
      .toLowerCase()
      .split(/[^a-z0-9+#]+/)
      .filter((word) => word.length > 2 && !STOP.has(word)),
  )
}

function includesLoose(haystack, needle) {
  const left = haystack.toLowerCase()
  const right = needle.toLowerCase()
  return left.includes(right) || right.includes(left)
}

function overlapRatio(required, owned) {
  if (!required.length) return 0
  const hits = required.filter((item) => owned.some((ownedItem) => includesLoose(ownedItem, item)))
  return hits.length / required.length
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

export function scoreOpportunity(profile, opportunity) {
  const skills = profile?.skills || []
  const interests = profile?.interests || []
  const required = opportunity.requiredSkills || []

  const skillScore = required.length ? overlapRatio(required, skills) : skills.length ? 0.35 : 0

  const blob = `${opportunity.type} ${opportunity.category} ${opportunity.title} ${opportunity.description}`.toLowerCase()
  const interestHits = interests.filter((interest) => blob.includes(interest.toLowerCase()))
  const interestScore = interests.length ? interestHits.length / interests.length : 0

  const goalTokens = tokens(profile?.careerGoals)
  const listingTokens = tokens(`${opportunity.title} ${opportunity.description} ${opportunity.category} ${opportunity.eligibility}`)
  let goalHits = 0
  for (const token of goalTokens) {
    if (listingTokens.has(token)) goalHits += 1
  }
  const goalScore = goalTokens.size ? Math.min(1, goalHits / Math.min(6, goalTokens.size)) : 0

  const level = (profile?.educationLevel || '').toLowerCase()
  const audience = (opportunity.audience || '').toLowerCase()
  let educationScore = 0.55
  if (audience && level && (audience.includes('any') || audience.includes(level))) educationScore = 1
  else if (audience && level) educationScore = 0.2

  const projectTech = []
  for (const project of profile?.projects || []) {
    if (Array.isArray(project.tech)) projectTech.push(...project.tech)
  }
  const experienceScore = required.length ? overlapRatio(required, projectTech.concat(skills)) : 0.45

  const locations = (profile?.locations || []).map((item) => item.toLowerCase())
  const place = (opportunity.location || '').toLowerCase()
  const modes = profile?.workModes || []
  let locationScore = 0.5
  if (opportunity.workMode === 'REMOTE') locationScore = 1
  else if (locations.some((item) => place.includes(item))) locationScore = 1
  else if (modes.includes(opportunity.workMode)) locationScore = 0.75
  else if (!locations.length && !modes.length) locationScore = 0.5
  else locationScore = 0.25

  const score = Math.round(
    100 *
      (0.3 * skillScore +
        0.25 * interestScore +
        0.15 * goalScore +
        0.1 * educationScore +
        0.1 * experienceScore +
        0.1 * locationScore),
  )

  const reasons = []
  const matchedSkills = required.filter((item) => skills.some((skill) => includesLoose(skill, item)))
  if (matchedSkills.length) reasons.push(matchedSkills.slice(0, 3).join(', '))
  if (interestHits.length) reasons.push(interestHits.slice(0, 2).join(' + '))
  if (goalScore >= 0.34) reasons.push('your stated goals')

  const explanation = reasons.length
    ? `Matched on ${reasons.join(' · ')}.`
    : 'This listing is open. Add skills and interests so the explanation can name a specific overlap.'

  return {
    score,
    explanation,
    reasons,
    eligibility: eligibility(profile, opportunity),
  }
}

export function rankOpportunities(profile, opportunities) {
  return opportunities
    .map((opportunity) => ({ opportunity, ...scoreOpportunity(profile, opportunity) }))
    .sort((left, right) => right.score - left.score)
}
