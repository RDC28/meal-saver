import { searchAddress, reverseGeocode } from '@/lib/geocoding'
import { ok, err, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────
// GET /api/geocode?q=<address>           → forward geocode
// GET /api/geocode?lat=<n>&lng=<n>       → reverse geocode
//
// Proxies Nominatim/LocationIQ so the User-Agent header is set
// server-side and the upstream URL/key stays out of the browser.
// ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')

    if (lat && lng) {
      const latN = Number(lat)
      const lngN = Number(lng)
      if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
        return err('lat and lng must be valid numbers', 400, 'INVALID_COORDS')
      }
      const result = await reverseGeocode(latN, lngN)
      return ok({ result })
    }

    if (q) {
      if (q.trim().length < 3) {
        return ok({ results: [] })
      }
      const results = await searchAddress(q, 6)
      return ok({ results })
    }

    return err('Provide either ?q= or ?lat=&lng=', 400, 'MISSING_PARAMS')
  } catch (e) {
    console.error('[GET /api/geocode]', e)
    return serverError('Geocoding failed. Please try again.')
  }
}
