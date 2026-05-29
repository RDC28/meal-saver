// ─────────────────────────────────────────────────────────────
// Geocoding — forward (address → lat/lng) and reverse (lat/lng → address).
//
// Uses Nominatim (OpenStreetMap) by default — free, no key.
// Set LOCATIONIQ_API_KEY in env to switch to LocationIQ (5k req/day free).
// Both speak the same response shape, so the call site doesn't change.
// ─────────────────────────────────────────────────────────────

export type GeocodeResult = {
  lat: number
  lng: number
  display_name: string
}

const NOMINATIM_BASE = process.env.NEXT_PUBLIC_NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org'
const LOCATIONIQ_KEY = process.env.LOCATIONIQ_API_KEY
const USER_AGENT = process.env.NOMINATIM_USER_AGENT || 'MealSaver/0.1 (contact: admin@mealsaver.local)'

function endpoint(path: string, params: Record<string, string>): string {
  const url = new URL(`${NOMINATIM_BASE}${path}`)
  url.searchParams.set('format', 'json')
  if (LOCATIONIQ_KEY) url.searchParams.set('key', LOCATIONIQ_KEY)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return url.toString()
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Geocoding upstream failed: ${res.status}`)
  return res.json() as Promise<T>
}

export async function searchAddress(query: string, limit = 5): Promise<GeocodeResult[]> {
  const q = query.trim()
  if (!q) return []

  type NominatimHit = { lat: string; lon: string; display_name: string }
  const hits = await fetchJson<NominatimHit[]>(
    endpoint('/search', { q, limit: String(limit), countrycodes: 'in', addressdetails: '0' })
  )

  return hits.map(h => ({
    lat: parseFloat(h.lat),
    lng: parseFloat(h.lon),
    display_name: h.display_name,
  }))
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  type NominatimReverse = { lat: string; lon: string; display_name: string; error?: string }
  const hit = await fetchJson<NominatimReverse>(
    endpoint('/reverse', { lat: String(lat), lon: String(lng) })
  )
  if (hit.error || !hit.lat) return null

  return {
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    display_name: hit.display_name,
  }
}
