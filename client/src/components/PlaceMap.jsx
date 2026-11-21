import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function countLabel(pin) {
  const parts = []
  if (pin.internships) parts.push(`${pin.internships} internship${pin.internships === 1 ? '' : 's'}`)
  if (pin.events) parts.push(`${pin.events} event${pin.events === 1 ? '' : 's'}`)
  return parts.join(', ') || 'Open'
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]))
}

function pinKey(pin) {
  return `${pin.lat},${pin.lng}`
}

export default function PlaceMap({ pins, selected, onSelect }) {
  const node = useRef(null)
  const mapRef = useRef(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!node.current || mapRef.current) return undefined
    const map = L.map(node.current, { scrollWheelZoom: false, attributionControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)
    map.setView([9.03, 38.75], 6)
    const timer = setTimeout(() => map.invalidateSize(), 50)
    mapRef.current = map
    return () => {
      clearTimeout(timer)
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return undefined
    const layer = L.layerGroup().addTo(map)
    const bounds = []
    for (const pin of pins) {
      const active = selected === pinKey(pin)
      const short = pin.name.length > 32 ? `${pin.name.slice(0, 30)}…` : pin.name
      const marker = L.marker([pin.lat, pin.lng], {
        icon: L.divIcon({
          className: '',
          iconSize: [220, 28],
          iconAnchor: [7, 14],
          html: `<span style="display:inline-flex;align-items:center;gap:6px;max-width:220px"><span style="height:14px;width:14px;flex:none;border-radius:999px;background:${active ? '#0f8f62' : '#18b87d'};border:2px solid white;box-shadow:0 1px 4px rgba(23,48,40,.35)"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-radius:999px;background:white;padding:2px 8px;font-size:12px;font-weight:600;color:#173028;box-shadow:0 1px 4px rgba(23,48,40,.2)">${escapeHtml(short)}</span></span>`,
        }),
      })
      const links = (pin.spots || []).map((spot) => `<div><a href="/opportunities/${encodeURIComponent(spot.id)}">${escapeHtml(spot.title)}</a></div>`).join('')
      marker.bindPopup(`<strong>${escapeHtml(pin.name)}</strong><br/>${countLabel(pin)}${links ? `<div style="margin-top:6px">${links}</div>` : ''}`)
      marker.on('click', () => onSelectRef.current(pin))
      marker.addTo(layer)
      bounds.push([pin.lat, pin.lng])
    }
    const key = bounds.map((point) => point.join(',')).join('|')
    if (map._pinKey !== key) {
      map._pinKey = key
      if (bounds.length === 1) map.setView(bounds[0], 15)
      else if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
    }
    return () => layer.remove()
  }, [pins, selected])

  return <div ref={node} className="place-map h-80 w-full" />
}
