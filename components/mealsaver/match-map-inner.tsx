'use client'

import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet'
import { Building2, Store } from 'lucide-react'

export type ReceiverPin = {
  id: string
  organization_name: string
  lat: number
  lng: number
  response: string | null
}

export type MatchMapProps = {
  donorLocation: { lat: number; lng: number }
  receivers: ReceiverPin[]
  heightClass?: string
}

// Donor pin icon (Orange)
const donorIcon = L.divIcon({
  className: 'mealsaver-donor-pin',
  html: `
    <svg viewBox="0 0 32 44" width="32" height="44" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 11 16 28 16 28s16-17 16-28C32 7.16 24.84 0 16 0z" fill="#f97316"/>
      <circle cx="16" cy="16" r="6" fill="#fff"/>
    </svg>
  `,
  iconSize: [32, 44],
  iconAnchor: [16, 44],
  popupAnchor: [0, -44]
})

// NGO pin icon (Blue for pending, Green for accepted)
const createNgoIcon = (status: string | null) => L.divIcon({
  className: 'mealsaver-ngo-pin',
  html: `
    <svg viewBox="0 0 32 44" width="32" height="44" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 11 16 28 16 28s16-17 16-28C32 7.16 24.84 0 16 0z" fill="${status === 'accepted' ? '#22c55e' : '#3b82f6'}"/>
      <circle cx="16" cy="16" r="6" fill="#fff"/>
    </svg>
  `,
  iconSize: [32, 44],
  iconAnchor: [16, 44],
  popupAnchor: [0, -44]
})

function MapBoundsFitter({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
  }, [map, points])
  return null
}

export default function MatchMapInner({ donorLocation, receivers, heightClass = 'h-80' }: MatchMapProps) {
  const allPoints = useMemo(() => {
    const pts: [number, number][] = [[donorLocation.lat, donorLocation.lng]]
    receivers.forEach(r => pts.push([r.lat, r.lng]))
    return pts
  }, [donorLocation, receivers])

  return (
    <div className={`relative overflow-hidden rounded-xl border border-border ${heightClass}`}>
      <MapContainer
        center={[donorLocation.lat, donorLocation.lng]}
        zoom={14}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Donor Marker */}
        <Marker position={[donorLocation.lat, donorLocation.lng]} icon={donorIcon}>
          <Popup className="rounded-lg shadow-sm">
            <div className="flex items-center gap-1.5 font-medium text-sm p-1">
              <Store size={14} className="text-orange-500" /> Pickup Location
            </div>
          </Popup>
        </Marker>

        {/* NGO Markers & Routing Lines */}
        {receivers.map((r) => {
          const isAccepted = r.response === 'accepted'
          const routeColor = isAccepted ? '#22c55e' : '#94a3b8'
          
          return (
            <div key={r.id}>
              {/* Line connecting donor to NGO */}
              <Polyline 
                positions={[[donorLocation.lat, donorLocation.lng], [r.lat, r.lng]]} 
                pathOptions={{ 
                  color: routeColor, 
                  weight: isAccepted ? 3 : 2, 
                  dashArray: isAccepted ? undefined : '5, 8',
                  opacity: 0.8
                }} 
              />
              
              {/* NGO Pin */}
              <Marker position={[r.lat, r.lng]} icon={createNgoIcon(r.response)}>
                <Popup className="rounded-lg shadow-sm">
                  <div className="flex flex-col gap-1 p-1">
                    <div className="flex items-center gap-1.5 font-medium text-sm">
                      <Building2 size={14} className={isAccepted ? 'text-green-500' : 'text-blue-500'} /> 
                      {r.organization_name}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full inline-block w-fit ${isAccepted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {isAccepted ? 'Accepted' : 'Notified / Pending'}
                    </span>
                  </div>
                </Popup>
              </Marker>
            </div>
          )
        })}

        <MapBoundsFitter points={allPoints} />
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm border border-border rounded-lg shadow-sm px-3 py-2 text-xs font-medium space-y-1.5 pointer-events-none">
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Donor</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Pending NGO</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /> Accepted NGO</div>
      </div>
    </div>
  )
}
