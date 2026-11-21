import assert from 'node:assert/strict'
import test from 'node:test'
import { eligibility, scoreOpportunity } from './recommend.js'

const profile = {
  educationLevel: 'Undergraduate',
  skills: ['Figma', 'UX research', 'Python'],
  interests: ['Product design', 'Social impact'],
  careerGoals: 'I want to become a product designer solving real problems in Africa.',
  locations: ['Addis Ababa'],
  workModes: ['HYBRID', 'REMOTE'],
  projects: [{ title: 'Campus Connect', tech: ['Figma'] }],
}

test('a close listing scores higher than an unrelated one', () => {
  const design = scoreOpportunity(profile, {
    type: 'INTERNSHIP',
    category: 'Internships & Jobs',
    title: 'Product Design Intern',
    description: 'Design accessible products for African teams.',
    eligibility: 'Undergraduate students comfortable with Figma.',
    audience: 'Undergraduate',
    requiredSkills: ['Figma', 'UX research'],
    location: 'Addis Ababa, Ethiopia',
    workMode: 'HYBRID',
  })
  const network = scoreOpportunity(profile, {
    type: 'INTERNSHIP',
    category: 'Internships & Jobs',
    title: 'Network Operations Intern',
    description: 'Configure routers and monitor uptime.',
    eligibility: 'Graduate students only.',
    audience: 'Graduate',
    requiredSkills: ['Cisco', 'Linux'],
    location: 'Nairobi',
    workMode: 'ONSITE',
  })
  assert.equal(design.related, true)
  assert.equal(network.related, false)
  assert.equal(network.score, 0)
  assert.ok(design.score > network.score)
  assert.match(design.explanation, /Figma/)
  assert.equal(design.eligibility.overall, 'meets')
  assert.notEqual(network.eligibility.overall, 'meets')
})

test('location and education alone do not make a recommendation', () => {
  const result = scoreOpportunity(profile, {
    type: 'EVENT',
    category: 'Events',
    title: 'City Finance Forum',
    description: 'A public talk about municipal budgeting.',
    eligibility: 'Open to undergraduate students in Addis Ababa.',
    audience: 'Undergraduate',
    requiredSkills: ['Accounting'],
    location: 'Addis Ababa',
    workMode: 'HYBRID',
  })
  assert.equal(result.related, false)
  assert.equal(result.score, 0)
})

test('eligibility stays unknown when the profile has no facts to compare', () => {
  const result = eligibility({}, {
    audience: 'Undergraduate',
    requiredSkills: ['Figma'],
    workMode: 'HYBRID',
  })
  assert.equal(result.overall, 'unknown')
})
