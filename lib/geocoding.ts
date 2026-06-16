// ─────────────────────────────────────────────────────────────
// Geocoding — forward (address → lat/lng) and reverse (lat/lng → address).
//
// Uses Nominatim (OpenStreetMap) by default — free, no key.
// Set LOCATIONIQ_API_KEY in env to switch to LocationIQ (5k req/day free).
// Both speak the same response shape, so the call site doesn't change.
// ─────────────────────────────────────────────────────────────

// Structured pieces parsed from the upstream address object — used to
// auto-fill form fields (street address, city, etc.) when a user picks a spot.
export type GeocodeAddress = {
  street?: string
  city?: string
  state?: string
  postcode?: string
  country?: string
}

export type GeocodeResult = {
  lat: number
  lng: number
  display_name: string
  address?: GeocodeAddress
}

// Nominatim's address object spreads the locality across several keys
// depending on the place — collapse them into a predictable shape.
type NominatimAddress = {
  house_number?: string
  road?: string
  neighbourhood?: string
  suburb?: string
  village?: string
  town?: string
  city?: string
  municipality?: string
  county?: string
  state_district?: string
  state?: string
  postcode?: string
  country?: string
}

function normalizeAddress(a?: NominatimAddress): GeocodeAddress | undefined {
  if (!a) return undefined
  const streetParts = [
    [a.house_number, a.road].filter(Boolean).join(' ').trim(),
    a.neighbourhood,
    a.suburb,
  ].filter((part, index, parts): part is string => Boolean(part) && parts.indexOf(part) === index)
  const street = streetParts.join(', ') || undefined
  const city = a.city || a.town || a.village || a.municipality || a.suburb || a.county || undefined
  return {
    street: street ?? a.neighbourhood ?? a.suburb,
    city,
    state: a.state,
    postcode: a.postcode,
    country: a.country,
  }
}

const NOMINATIM_BASE = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org'
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
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Geocoding upstream failed: ${res.status}`)
    return res.json() as Promise<T>
  } finally {
    clearTimeout(timeout)
  }
}

export async function searchAddress(query: string, limit = 5): Promise<GeocodeResult[]> {
  const q = query.trim()
  if (!q) return []

  type NominatimHit = { lat: string; lon: string; display_name: string; address?: NominatimAddress }
  const hits = await fetchJson<NominatimHit[]>(
    endpoint('/search', { q, limit: String(limit), countrycodes: 'in', addressdetails: '1' })
  )

  return hits.map(h => ({
    lat: parseFloat(h.lat),
    lng: parseFloat(h.lon),
    display_name: h.display_name,
    address: normalizeAddress(h.address),
  }))
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  type NominatimReverse = { lat: string; lon: string; display_name: string; address?: NominatimAddress; error?: string }
  const hit = await fetchJson<NominatimReverse>(
    endpoint('/reverse', { lat: String(lat), lon: String(lng), addressdetails: '1' })
  )
  if (hit.error || !hit.lat) return null

  return {
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    display_name: hit.display_name,
    address: normalizeAddress(hit.address),
  }
}
