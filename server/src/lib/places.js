const CITIES = [
  ['addis ababa', 'Addis Ababa', 9.032, 38.7469],
  ['dire dawa', 'Dire Dawa', 9.5931, 41.8661],
  ['bahir dar', 'Bahir Dar', 11.5936, 37.3908],
  ['hawassa', 'Hawassa', 7.0621, 38.4764],
  ['mekelle', 'Mekelle', 13.4967, 39.4753],
  ['mekele', 'Mekelle', 13.4967, 39.4753],
  ['adama', 'Adama', 8.54, 39.27],
  ['nazret', 'Adama', 8.54, 39.27],
  ['gondar', 'Gondar', 12.603, 37.4521],
  ['jimma', 'Jimma', 7.6734, 36.8344],
  ['dessie', 'Dessie', 11.1333, 39.6333],
  ['harar', 'Harar', 9.3139, 42.1181],
  ['jijiga', 'Jijiga', 9.35, 42.8],
  ['shashamane', 'Shashamane', 7.2004, 38.6035],
  ['arba minch', 'Arba Minch', 6.0333, 37.55],
  ['debre birhan', 'Debre Birhan', 9.68, 39.53],
  ['debre markos', 'Debre Markos', 10.3333, 37.7333],
  ['nekemte', 'Nekemte', 9.0833, 36.55],
  ['asella', 'Asella', 7.95, 39.1167],
  ['nairobi', 'Nairobi', -1.2921, 36.8219],
  ['ethiopia', 'Ethiopia', 9.145, 40.4897],
]

export function haversine(lat1, lng1, lat2, lng2) {
  const radius = 6371
  const toRad = (value) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * radius * Math.asin(Math.sqrt(a))
}

export function nearestCity(lat, lng, withinKm = 40) {
  let best = null
  let bestKm = Infinity
  for (const [, name, cityLat, cityLng] of CITIES) {
    const km = haversine(lat, lng, cityLat, cityLng)
    if (km < bestKm) {
      best = { name, lat: cityLat, lng: cityLng }
      bestKm = km
    }
  }
  if (!best || bestKm > withinKm) return null
  return { ...best, km: bestKm }
}

export function locate(location) {
  const text = String(location || '').toLowerCase().replace(/\s+/g, ' ').trim()
  if (!text || /^(remote|online|virtual|anywhere)$/.test(text)) return null
  const hit = CITIES
    .filter(([key]) => text.includes(key))
    .sort((left, right) => right[0].length - left[0].length)[0]
  if (!hit) return null
  return { name: hit[1], lat: hit[2], lng: hit[3] }
}

export function clusterHeld(rows, radiusKm = 15) {
  const clusters = []
  const unmapped = new Map()
  for (const row of rows) {
    const stored = row.latitude != null && row.longitude != null
    const known = stored ? null : locate(row.location)
    const lat = stored ? row.latitude : known?.lat
    const lng = stored ? row.longitude : known?.lng
    if (lat == null || lng == null) {
      const label = String(row.location || '').trim() || 'Unspecified'
      const current = unmapped.get(label.toLowerCase()) || { location: label, internships: 0, events: 0 }
      if (row.type === 'EVENT') current.events += 1
      else current.internships += 1
      unmapped.set(label.toLowerCase(), current)
      continue
    }
    let cluster = clusters.find((item) => haversine(item.lat, item.lng, lat, lng) <= radiusKm)
    if (!cluster) {
      const city = nearestCity(lat, lng)
      cluster = {
        name: city?.name || String(row.location || 'Selected place'),
        lat,
        lng,
        internships: 0,
        events: 0,
        locations: [],
      }
      clusters.push(cluster)
    }
    if (row.type === 'EVENT') cluster.events += 1
    else cluster.internships += 1
    if (row.location && !cluster.locations.includes(row.location)) cluster.locations.push(row.location)
  }
  return {
    pins: clusters.sort((left, right) => left.name.localeCompare(right.name)),
    unmapped: [...unmapped.values()],
  }
}

export function groupPlaces(places) {
  const pins = new Map()
  const unmapped = []
  for (const place of places) {
    const pin = locate(place.location)
    if (!pin) {
      unmapped.push(place)
      continue
    }
    const current = pins.get(pin.name) || {
      name: pin.name,
      lat: pin.lat,
      lng: pin.lng,
      internships: 0,
      events: 0,
      locations: [],
    }
    current.internships += place.internships || 0
    current.events += place.events || 0
    current.locations.push(place.location)
    pins.set(pin.name, current)
  }
  return {
    pins: [...pins.values()].sort((left, right) => left.name.localeCompare(right.name)),
    unmapped,
  }
}
