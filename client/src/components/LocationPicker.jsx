import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function LocationPicker({ latitude, longitude, onPick }) {
  const node = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  useEffect(() => {
    if (!node.current || mapRef.current) return undefined
    const map = L.map(node.current, { scrollWheelZoom: false }).setView([9.03, 38.75], 6)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)
    map.on('click', (event) => {
      onPickRef.current(event.latlng.lat, event.latlng.lng)
    })
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || latitude == null || longitude == null) return undefined
    if (!markerRef.current) {
      markerRef.current = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          html: '<span style="display:block;height:18px;width:18px;border-radius:999px;background:#18b87d;border:3px solid white;box-shadow:0 2px 8px rgba(23,48,40,.3)"></span>',
        }),
      }).addTo(map)
    } else {
      markerRef.current.setLatLng([latitude, longitude])
    }
    map.setView([latitude, longitude], Math.max(map.getZoom(), 11))
    return undefined
  }, [latitude, longitude])

  return <div ref={node} className="place-map h-64 w-full rounded-2xl" />
}
