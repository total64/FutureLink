const SKILLS = [
  'Figma', 'UX research', 'Prototyping', 'Python', 'JavaScript', 'TypeScript', 'React',
  'Node.js', 'SQL', 'PostgreSQL', 'Java', 'Flutter', 'UI design', 'User research',
  'Data analysis', 'Machine learning', 'Cybersecurity', 'Cloud', 'Product design',
]

const INTERESTS = [
  'Product design', 'Technology', 'Social impact', 'Artificial intelligence',
  'Cybersecurity', 'Data science', 'Software engineering', 'Community', 'Research',
]

const LEVELS = ['Undergraduate', 'Graduate', 'Diploma', 'High school']

function mentions(source, phrase) {
  const pattern = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|[^a-z0-9])${pattern}(?![a-z0-9])`, 'i').test(source)
}

export function structureText(text) {
  const source = String(text || '')
  const skills = SKILLS.filter((skill) => mentions(source, skill))
  const interests = INTERESTS.filter((interest) => mentions(source, interest))
  const educationLevel = LEVELS.find((level) => mentions(source, level)) || ''
  const universityMatch = source.match(/([A-Z][\w&.'’-]*(?:\s+[A-Z][\w&.'’-]*)*\s+University)/ )
  return {
    skills,
    interests,
    educationLevel,
    university: universityMatch ? universityMatch[1] : '',
    careerGoals: source.trim(),
    note: 'Suggestions use only words found in your text. Nothing is saved until you confirm.',
  }
}
