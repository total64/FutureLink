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

test('each venue keeps its own pin', () => {
  assert.equal(nearestCity(9.04, 38.76).name, 'Addis Ababa')
  const grouped = clusterHeld([
    { id: 'a', title: 'Design intern', location: 'Bole Atlas', type: 'INTERNSHIP', latitude: 9.01, longitude: 38.76 },
    { id: 'b', title: 'Campus night', location: 'Piassa', type: 'EVENT', latitude: 9.035, longitude: 38.75 },
    { location: 'Remote', type: 'EVENT', latitude: null, longitude: null },
  ])
  assert.equal(grouped.pins.length, 2)
  assert.deepEqual(grouped.pins.map((pin) => pin.name).sort(), ['Bole Atlas', 'Piassa'])
  assert.equal(grouped.pins.find((pin) => pin.name === 'Bole Atlas').spots[0].title, 'Design intern')
  assert.equal(grouped.unmapped[0].location, 'Remote')
})

test('listings at the same point share one pin', () => {
  const grouped = clusterHeld([
    { id: 'a', title: 'One', location: 'Bole Atlas', type: 'INTERNSHIP', latitude: 9.01, longitude: 38.76 },
    { id: 'b', title: 'Two', location: 'Bole Atlas', type: 'EVENT', latitude: 9.0101, longitude: 38.7601 },
  ])
  assert.equal(grouped.pins.length, 1)
  assert.equal(grouped.pins[0].name, 'Bole Atlas')
  assert.equal(grouped.pins[0].spots.length, 2)
})
