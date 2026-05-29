'use client'

import dynamic from 'next/dynamic'
import type { LocationPickerProps, LocationValue } from './location-picker-inner'

// Leaflet touches `window` on import, so the picker must mount client-side only.
const LocationPickerInner = dynamic(() => import('./location-picker-inner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-lg border border-border bg-secondary/40 text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
})

export type { LocationPickerProps, LocationValue }

export function LocationPicker(props: LocationPickerProps) {
  return <LocationPickerInner {...props} />
}
