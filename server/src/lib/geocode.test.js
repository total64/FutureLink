import assert from 'node:assert/strict'
import test from 'node:test'
import { labelFromParts } from './geocode.js'

test('a map result keeps the street and neighborhood', () => {
  const label = labelFromParts({
    name: 'Atlas',
    display_name: 'Atlas, long address',
    address: { road: 'Cameroon Street', suburb: 'Bole', city: 'Addis Ababa' },
  })
  assert.equal(label, 'Atlas, Cameroon Street, Bole')
})
