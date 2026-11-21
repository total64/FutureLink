const TECH = [
  'software', 'developer', 'development', 'programming', 'programmer', 'coding', 'code',
  'computer', 'computing', 'data', 'database', 'design', 'ux', 'ui', 'product',
  'engineering', 'engineer', 'hackathon', 'internship', 'intern', 'tech', 'technology',
  'digital', 'web', 'website', 'mobile', 'app', 'ai', 'cyber', 'security', 'cloud',
  'python', 'javascript', 'react', 'frontend', 'backend', 'startup', 'robotics',
  'hardware', 'network', 'devops', 'stem', 'innovation', 'research', 'workshop',
]

const RESTRICTED = [
  'politics', 'political', 'election', 'religion', 'religious', 'church', 'mosque',
  'adult', 'porn', 'gambling', 'casino', 'betting', 'alcohol', 'beer', 'drugs',
  'weapon', 'hate', 'dating', 'nightlife', 'nightclub', 'fashion', 'cooking',
  'recipe', 'wedding', 'football', 'soccer',
]

export const RESTRICTED_LIMIT = 3

function tokens(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean),
  )
}

function mentions(text, words) {
  const bag = tokens(text)
  const raw = String(text || '').toLowerCase()
  return words.some((word) => (word.includes(' ') ? raw.includes(word) : bag.has(word)))
}

export function classifyContent(parts) {
  const text = parts.filter(Boolean).join(' ')
  if (mentions(text, RESTRICTED)) return 'RESTRICTED'
  if (mentions(text, TECH)) return 'TECH'
  return 'RESTRICTED'
}

export function restrictionMessage(strikes) {
  if (strikes >= RESTRICTED_LIMIT) {
    return 'This account is banned. Community-restricted content was posted repeatedly. Organizations may only publish tech-related listings.'
  }
  return `This listing is community restricted because it is not tech-related, so it was not published. Restricted posts: ${strikes} of ${RESTRICTED_LIMIT}. Another restricted post can lead to an account ban.`
}
