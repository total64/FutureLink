import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const pinIcon = L.divIcon({
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: '<span style="display:block;height:18px;width:18px;border-radius:999px;background:#18b87d;border:3px solid white;box-shadow:0 2px 8px rgba(23,48,40,.3)"></span>',
})

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
    const timer = setTimeout(() => map.invalidateSize(), 50)
    mapRef.current = map
    return () => {
      clearTimeout(timer)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || latitude == null || longitude == null) return undefined
    if (!markerRef.current) {
      markerRef.current = L.marker([latitude, longitude], { icon: pinIcon, draggable: true }).addTo(map)
      markerRef.current.on('dragend', () => {
        const point = markerRef.current.getLatLng()
        onPickRef.current(point.lat, point.lng)
      })
    } else {
      markerRef.current.setLatLng([latitude, longitude])
    }
    map.setView([latitude, longitude], Math.max(map.getZoom(), 16))
    return undefined
  }, [latitude, longitude])

  return <div ref={node} className="place-map h-72 w-full rounded-2xl" />
}
