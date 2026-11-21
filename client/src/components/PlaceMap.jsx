import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function countLabel(pin) {
  const parts = []
  if (pin.internships) parts.push(`${pin.internships} internship${pin.internships === 1 ? '' : 's'}`)
  if (pin.events) parts.push(`${pin.events} event${pin.events === 1 ? '' : 's'}`)
  return parts.join(', ') || 'Open'
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
    mapRef.current = map
    return () => {
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
      const active = selected === pin.name
      const marker = L.marker([pin.lat, pin.lng], {
        icon: L.divIcon({
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          html: `<span style="display:flex;height:36px;width:36px;align-items:center;justify-content:center;border-radius:999px;background:${active ? '#0f8f62' : '#18b87d'};color:white;font-size:12px;font-weight:700;border:3px solid white;box-shadow:0 2px 8px rgba(23,48,40,.25)">${pin.internships + pin.events}</span>`,
        }),
      })
      marker.bindPopup(`<strong>${pin.name}</strong><br/>${countLabel(pin)}`)
      marker.on('click', () => onSelectRef.current(pin.name))
      marker.addTo(layer)
      bounds.push([pin.lat, pin.lng])
    }
    if (bounds.length === 1) map.setView(bounds[0], 11)
    else if (bounds.length > 1) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 8 })
    return () => layer.remove()
  }, [pins, selected])

  return <div ref={node} className="place-map h-72 w-full" />
}
