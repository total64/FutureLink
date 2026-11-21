import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function SpotMap({ latitude, longitude, label }) {
  const node = useRef(null)

  useEffect(() => {
    if (!node.current || latitude == null || longitude == null) return undefined
    const map = L.map(node.current, { scrollWheelZoom: false, attributionControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)
    const marker = L.marker([latitude, longitude], {
      icon: L.divIcon({
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        html: '<span style="display:block;height:18px;width:18px;border-radius:999px;background:#18b87d;border:3px solid white;box-shadow:0 2px 8px rgba(23,48,40,.3)"></span>',
      }),
    }).addTo(map)
    if (label) marker.bindPopup(label)
    map.setView([latitude, longitude], 16)
    const timer = setTimeout(() => {
      map.invalidateSize()
      if (label) marker.openPopup()
    }, 50)
    return () => {
      clearTimeout(timer)
      map.remove()
    }
  }, [latitude, longitude, label])

  if (latitude == null || longitude == null) return null
  return <div ref={node} className="place-map mt-4 h-64 w-full" />
}
