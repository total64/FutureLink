import assert from 'node:assert/strict'
import test from 'node:test'
import { clusterHeld, groupPlaces, locate, nearestCity } from './places.js'

test('city names inside a venue string share one map pin', () => {
  assert.equal(locate('Addis Ababa, Ethiopia').name, 'Addis Ababa')
  assert.equal(locate('Addis Ababa').name, 'Addis Ababa')
  assert.equal(locate('Remote'), null)
  const grouped = groupPlaces([
    { location: 'Addis Ababa', internships: 2, events: 0 },
    { location: 'Addis Ababa, Ethiopia', internships: 6, events: 1 },
    { location: 'Online', internships: 0, events: 1 },
  ])
  assert.equal(grouped.pins.length, 1)
  assert.equal(grouped.pins[0].internships, 8)
  assert.equal(grouped.pins[0].events, 1)
  assert.equal(grouped.unmapped[0].location, 'Online')
})

test('a map click near Addis Ababa is named Addis Ababa', () => {
  assert.equal(nearestCity(9.04, 38.76).name, 'Addis Ababa')
  const grouped = clusterHeld([
    { location: 'Bole', type: 'INTERNSHIP', latitude: 9.01, longitude: 38.76 },
    { location: 'Piassa', type: 'EVENT', latitude: 9.035, longitude: 38.75 },
    { location: 'Remote', type: 'EVENT', latitude: null, longitude: null },
  ])
  assert.equal(grouped.pins.length, 1)
  assert.equal(grouped.pins[0].internships, 1)
  assert.equal(grouped.pins[0].events, 1)
  assert.equal(grouped.unmapped[0].location, 'Remote')
})
