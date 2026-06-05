'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { AlertCircle, Loader2, MapPin, Search } from 'lucide-react'
import type { GeocodeResult } from '@/lib/geocoding'

export type LocationValue = {
  lat: number
  lng: number
  address?: string
  // Structured pieces parsed from the geocoder — let callers auto-fill form fields.
  street?: string
  city?: string
  state?: string
  postcode?: string
}

export type LocationPickerProps = {
  value: LocationValue | null
  defaultCenter?: { lat: number; lng: number }
  onChange: (value: LocationValue) => void
  placeholder?: string
  heightClass?: string
}

// Inline SVG pin icon — avoids Leaflet's default-icon asset-path pitfalls.
const pinIcon = L.divIcon({
  className: 'mealsaver-pin',
  html: `
    <svg viewBox="0 0 32 44" width="32" height="44" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 11 16 28 16 28s16-17 16-28C32 7.16 24.84 0 16 0z" fill="#1f8a42"/>
      <circle cx="16" cy="16" r="6" fill="#fff"/>
    </svg>
  `,
  iconSize: [32, 44],
  iconAnchor: [16, 44],
})

// Keeps the map view in sync with the selected value (when search/reverse-geocode updates it).
function MapView({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], map.getZoom() < 13 ? 14 : map.getZoom())
  }, [lat, lng, map])
  return null
}

// Captures the user's click on the map and routes it to the parent.
function MapClickCapture({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  const map = useMap()
  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => onClick(e.latlng.lat, e.latlng.lng)
    map.on('click', handler)
    return () => {
      map.off('click', handler)
    }
  }, [map, onClick])
  return null
}

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 } // Center of India

export default function LocationPickerInner({
  value,
  defaultCenter,
  onChange,
  placeholder = 'Search address, landmark, or pincode…',
  heightClass = 'h-72',
}: LocationPickerProps) {
  const initialCenter = useMemo(
    () => value ?? defaultCenter ?? DEFAULT_CENTER,
    // initialCenter is read once on mount; subsequent value changes flow through <MapView/>.
    [],
  )

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [searching, setSearching] = useState(false)
  const [reverseLoading, setReverseLoading] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    if (query.trim().length < 3) {
      setResults([])
      return
    }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error?.message ?? 'Search failed')
        setResults(json.data?.results ?? [])
        setMapError(null)
      } catch {
        setResults([])
        setMapError('Address search is unavailable right now. You can still click the map to set coordinates.')
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [query])

  const updateCoordsAndReverse = useCallback(
    async (lat: number, lng: number) => {
      onChange({ lat, lng, address: value?.address })
      setReverseLoading(true)
      try {
        const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error?.message ?? 'Lookup failed')
        const r = json.data?.result
        if (r) {
          onChange({
            lat,
            lng,
            address: r.display_name as string,
            street: r.address?.street,
            city: r.address?.city,
            state: r.address?.state,
            postcode: r.address?.postcode,
          })
        }
        setMapError(null)
      } catch {
        // Reverse geocoding is best-effort — coords are still set.
        setMapError('Address lookup failed, but the pinned coordinates were saved.')
      } finally {
        setReverseLoading(false)
      }
    },
    [onChange, value?.address],
  )

  const handleSelectResult = (r: GeocodeResult) => {
    onChange({
      lat: r.lat,
      lng: r.lng,
      address: r.display_name,
      street: r.address?.street,
      city: r.address?.city,
      state: r.address?.state,
      postcode: r.address?.postcode,
    })
    setQuery('')
    setResults([])
  }

  const handleUseMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setMapError('Your browser does not support location detection. Search or click the map instead.')
      return
    }
    setMapError(null)
    navigator.geolocation.getCurrentPosition(
      pos => updateCoordsAndReverse(pos.coords.latitude, pos.coords.longitude),
      err => {
        console.warn('[LocationPicker] geolocation denied', err)
        setMapError('Location access was blocked. Allow location access in the browser, or search/click the map.')
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {searching && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}

        {results.length > 0 && (
          <div className="absolute z-[1000] mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
            {results.map((r, i) => (
              <button
                key={`${r.lat}-${r.lng}-${i}`}
                type="button"
                onClick={() => handleSelectResult(r)}
                className="flex w-full items-start gap-2 border-b border-border px-3 py-2 text-left text-sm hover:bg-secondary last:border-b-0"
              >
                <MapPin size={13} className="mt-0.5 shrink-0 text-primary" />
                <span className="text-foreground">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className={`relative overflow-hidden rounded-lg border border-border ${heightClass}`}>
        <MapContainer
          center={[initialCenter.lat, initialCenter.lng]}
          zoom={value ? 14 : 5}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              tileerror: () => setMapError('Map tiles could not load. Check your internet connection, then try again.'),
              tileload: () => setMapError(null),
            }}
          />
          <MapClickCapture onClick={updateCoordsAndReverse} />
          {value && (
            <>
              <MapView lat={value.lat} lng={value.lng} />
              <Marker
                position={[value.lat, value.lng]}
                icon={pinIcon}
                draggable
                eventHandlers={{
                  dragend: e => {
                    const m = e.target as L.Marker
                    const pos = m.getLatLng()
                    updateCoordsAndReverse(pos.lat, pos.lng)
                  },
                }}
              />
            </>
          )}
        </MapContainer>
      </div>
      {mapError && (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/15 px-3 py-2 text-xs text-warning-foreground">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <span>{mapError}</span>
        </div>
      )}

      {/* Footer / selected address */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex min-w-0 items-center gap-1.5">
          {reverseLoading ? (
            <>
              <Loader2 size={11} className="animate-spin" /> Looking up address…
            </>
          ) : value ? (
            <>
              <MapPin size={11} className="text-primary" />
              <span className="truncate">
                {value.address ?? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`}
              </span>
            </>
          ) : (
            <span>Click the map, drag the pin, or search to pick a location.</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleUseMyLocation}
          className="rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-foreground hover:bg-secondary"
        >
          Use my location
        </button>
      </div>
    </div>
  )
}
