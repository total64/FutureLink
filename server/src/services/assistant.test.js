import assert from 'node:assert/strict'
import test from 'node:test'
import { guide, mentionedPlace } from './assistant.js'

const places = [
  { location: 'Addis Ababa, Ethiopia', internships: 3, events: 1 },
  { location: 'Remote', internships: 0, events: 2 },
]

test('a place named in the question is the held place', () => {
  const found = mentionedPlace('which internships are held in addis ababa, ethiopia', places)
  assert.equal(found.place.location, 'Addis Ababa, Ethiopia')
})

test('students are guided to the portfolio without invented experience', () => {
  const answer = guide({ role: 'SEEKER', message: 'How do I build my portfolio?', places })
  assert.match(answer.reply, /Build my portfolio/)
  assert.equal(answer.links[0].to, '/profile')
})

test('an organization is guided to review the portfolio', () => {
  const answer = guide({ role: 'PROVIDER', message: 'How do I accept an applicant?', places })
  assert.match(answer.reply, /accept or reject/i)
  assert.equal(answer.links[0].to, '/org/applications')
})

test('listing answers use the held place and real results only', () => {
  const answer = guide({
    role: 'GUEST',
    message: 'events in Remote',
    places,
    listings: [{ id: 'event-1', title: 'Campus Day', location: 'Remote' }],
  })
  assert.match(answer.reply, /held in Remote/)
  assert.equal(answer.links[0].to, '/opportunities/event-1')
})
