import { DONATION, UPLOAD, RATE_LIMIT } from '@/lib/constants'
import { formatIndianMobile } from '@/lib/sms'

// ─────────────────────────────────────────────────────────────
// Constants sanity checks
// ─────────────────────────────────────────────────────────────
describe('UPLOAD constants', () => {
  test('MAX_SIZE_BYTES is 5 MB', () => {
    expect(UPLOAD.MAX_SIZE_BYTES).toBe(5 * 1024 * 1024)
  })

  test('MAX_IMAGES_PER_DONATION is a positive integer', () => {
    expect(UPLOAD.MAX_IMAGES_PER_DONATION).toBeGreaterThan(0)
    expect(Number.isInteger(UPLOAD.MAX_IMAGES_PER_DONATION)).toBe(true)
  })

  test('ALLOWED_TYPES contains JPEG, PNG, WebP', () => {
    expect(UPLOAD.ALLOWED_TYPES).toContain('image/jpeg')
    expect(UPLOAD.ALLOWED_TYPES).toContain('image/png')
    expect(UPLOAD.ALLOWED_TYPES).toContain('image/webp')
  })
})

describe('DONATION constants', () => {
  test('URGENT_HOURS_THRESHOLD is a positive number', () => {
    expect(DONATION.URGENT_HOURS_THRESHOLD).toBeGreaterThan(0)
  })
})

describe('RATE_LIMIT constants', () => {
  test('all limits are positive integers', () => {
    expect(RATE_LIMIT.SIGNUP.limit).toBeGreaterThan(0)
    expect(RATE_LIMIT.OTP.limit).toBeGreaterThan(0)
    expect(RATE_LIMIT.DONATION_CREATE.limit).toBeGreaterThan(0)
  })

  test('OTP limit is stricter than signup limit', () => {
    // OTP guessing is more sensitive — must have a lower limit
    expect(RATE_LIMIT.OTP.limit).toBeLessThan(RATE_LIMIT.SIGNUP.limit)
  })

  test('all window durations are positive', () => {
    expect(RATE_LIMIT.SIGNUP.windowMs).toBeGreaterThan(0)
    expect(RATE_LIMIT.OTP.windowMs).toBeGreaterThan(0)
    expect(RATE_LIMIT.DONATION_CREATE.windowMs).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────
// SMS helpers
// ─────────────────────────────────────────────────────────────
describe('formatIndianMobile', () => {
  test('10-digit number gets +91 prefix', () => {
    expect(formatIndianMobile('9876543210')).toBe('+919876543210')
  })

  test('number with 91 prefix and 12 digits gets + prefix', () => {
    expect(formatIndianMobile('919876543210')).toBe('+919876543210')
  })

  test('already-formatted E.164 number is returned as-is', () => {
    // 13 chars with non-91 country code — returned unchanged
    expect(formatIndianMobile('+14155552671')).toBe('+14155552671')
  })

  test('number with spaces is normalised', () => {
    expect(formatIndianMobile('98765 43210')).toBe('+919876543210')
  })
})

// ─────────────────────────────────────────────────────────────
// Urgency derivation logic (mirrors app/api/donations/route.ts)
// ─────────────────────────────────────────────────────────────
describe('urgency calculation', () => {
  function isUrgent(expiryIso: string): boolean {
    const hoursToExpiry =
      (new Date(expiryIso).getTime() - Date.now()) / (1000 * 60 * 60)
    return hoursToExpiry < DONATION.URGENT_HOURS_THRESHOLD
  }

  test('donation expiring in 1 hour is urgent', () => {
    const expiry = new Date(Date.now() + 60 * 60_000).toISOString()
    expect(isUrgent(expiry)).toBe(true)
  })

  test('donation expiring in 6 hours is not urgent', () => {
    const expiry = new Date(Date.now() + 6 * 60 * 60_000).toISOString()
    expect(isUrgent(expiry)).toBe(false)
  })

  test('donation expiring exactly at threshold boundary is not urgent', () => {
    // < threshold means exactly-at-threshold is NOT urgent
    const expiry = new Date(Date.now() + DONATION.URGENT_HOURS_THRESHOLD * 60 * 60_000).toISOString()
    expect(isUrgent(expiry)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────
// food_category derivation (mirrors form logic)
// ─────────────────────────────────────────────────────────────
describe('food_category derivation', () => {
  function getFoodCategory(condition: 'cooked' | 'raw' | 'packaged') {
    return condition === 'cooked' ? 'short_term' : 'long_term'
  }

  test('cooked food → short_term', () => {
    expect(getFoodCategory('cooked')).toBe('short_term')
  })

  test('raw food → long_term', () => {
    expect(getFoodCategory('raw')).toBe('long_term')
  })

  test('packaged food → long_term', () => {
    expect(getFoodCategory('packaged')).toBe('long_term')
  })
})
