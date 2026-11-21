const HEADERS = {
  'User-Agent': 'FutureLink/1.0 (local education demo)',
  Accept: 'application/json',
}

export function labelFromParts(item) {
  const address = item?.address || {}
  const parts = [
    item?.name,
    address.road,
    address.suburb || address.neighbourhood || address.quarter,
    address.city || address.town || address.village,
  ].filter(Boolean)
  const unique = []
  for (const part of parts) {
    if (!unique.some((known) => known.toLowerCase() === String(part).toLowerCase())) unique.push(part)
  }
  const label = unique.slice(0, 3).join(', ')
  return (label || item?.display_name || '').slice(0, 120)
}

async function nominatim(path) {
  const response = await fetch(`https://nominatim.openstreetmap.org/${path}`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw new Error('Place search failed')
  return response.json()
}

export async function searchPlaces(query) {
  const rows = await nominatim(`search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`)
  return (Array.isArray(rows) ? rows : []).map((item) => ({
    name: labelFromParts(item),
    lat: Number(item.lat),
    lng: Number(item.lon),
  })).filter((item) => item.name && Number.isFinite(item.lat) && Number.isFinite(item.lng))
}

export async function reversePlace(lat, lng) {
  const item = await nominatim(`reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`)
  const name = labelFromParts(item)
  if (!name || !Number.isFinite(Number(item.lat))) return null
  return { name, lat: Number(item.lat), lng: Number(item.lon) }
}
