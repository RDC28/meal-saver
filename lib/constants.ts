export const UPLOAD = {
  MAX_SIZE_BYTES:          5 * 1024 * 1024,
  MAX_IMAGES_PER_DONATION: 5,
  ALLOWED_TYPES:           ['image/jpeg', 'image/png', 'image/webp'] as const,
} as const

export const DONATION = {
  URGENT_HOURS_THRESHOLD: 4,
} as const

export const RATE_LIMIT = {
  SIGNUP:          { limit: 5,  windowMs: 15 * 60_000 },
  OTP:             { limit: 3,  windowMs:  5 * 60_000 },
  DONATION_CREATE: { limit: 20, windowMs: 60 * 60_000 },
  GEOCODE:         { limit: 60, windowMs: 60 * 1000 },
} as const
