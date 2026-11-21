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

export function structureText(text) {
  const source = String(text || '')
  const lower = source.toLowerCase()
  const skills = SKILLS.filter((skill) => lower.includes(skill.toLowerCase()))
  const interests = INTERESTS.filter((interest) => lower.includes(interest.toLowerCase()))
  const educationLevel = LEVELS.find((level) => lower.includes(level.toLowerCase())) || ''
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
