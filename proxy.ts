import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { RATE_LIMIT } from '@/lib/constants'

// ── Public routes — never require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/how-it-works',
  '/for-donors',
  '/for-ngos',
  '/impact-overview',
  '/login(.*)',
  '/register',
  '/donor/register',
  '/ngo/register',
  '/api/auth/signup',
  '/api/geocode',
  '/api/cron/(.*)',
])

// ─────────────────────────────────────────────────────────────
// In-memory sliding-window rate limiter.
// Works correctly in development and single-instance deployments.
// For multi-instance Vercel (Pro/Team), replace with @upstash/ratelimit.
// ─────────────────────────────────────────────────────────────
const store = new Map<string, { count: number; reset: number }>()

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now   = Date.now()
  const entry = store.get(key)
  if (!entry || entry.reset <= now) {
    store.set(key, { count: 1, reset: now + windowMs })
    return false
  }
  if (entry.count >= limit) return true
  entry.count++
  return false
}

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
}

function tooManyRequests(): NextResponse {
  return NextResponse.json(
    { data: null, error: { message: 'Too many requests. Please slow down and try again.', code: 'RATE_LIMITED' } },
    { status: 429 }
  )
}

// ─────────────────────────────────────────────────────────────
// Proxy — Clerk auth + rate limiting
// ─────────────────────────────────────────────────────────────
export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl
  const method = request.method
  const ip     = getIp(request)

  // Rate limit: POST /api/auth/signup
  if (pathname === '/api/auth/signup' && method === 'POST') {
    if (isRateLimited(`signup:${ip}`, RATE_LIMIT.SIGNUP.limit, RATE_LIMIT.SIGNUP.windowMs)) {
      return tooManyRequests()
    }
  }

  // Rate limit: POST /api/donations
  if (pathname === '/api/donations' && method === 'POST') {
    if (isRateLimited(`donation:${ip}`, RATE_LIMIT.DONATION_CREATE.limit, RATE_LIMIT.DONATION_CREATE.windowMs)) {
      return tooManyRequests()
    }
  }

  // Rate limit: POST /api/pickups/:id/otp
  if (/^\/api\/pickups\/[^/]+\/otp$/.test(pathname) && method === 'POST') {
    if (isRateLimited(`otp:${ip}`, RATE_LIMIT.OTP.limit, RATE_LIMIT.OTP.windowMs)) {
      return tooManyRequests()
    }
  }

  // Clerk auth guard
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
