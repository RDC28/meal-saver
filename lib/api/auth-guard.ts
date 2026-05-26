import { auth } from '@clerk/nextjs/server'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { unauthorized, forbidden, serverError } from './response'
import type { User, UserRole } from '@/lib/db'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────
// Auth context injected into every protected handler
// ─────────────────────────────────────────────────────────────
export type AuthContext = {
  user: {
    id: string       // our Neon UUID
    clerkId: string  // Clerk's user_xxx ID
  }
  profile: User     // row from public.users
}

// Next.js App Router route context (contains params for dynamic routes)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RouteContext = { params?: Promise<any> }

// The handler shape every protected route must match
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ProtectedHandler = (
  req: NextRequest,
  auth: AuthContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routeCtx: any
) => Promise<Response>

// ─────────────────────────────────────────────────────────────
// withAuth — wraps a route handler with Clerk auth + role check
//
// Usage (any logged-in user):
//   export const GET = withAuth(async (req, { user, profile }) => { ... })
//
// Usage (specific roles only):
//   export const POST = withAuth(async (req, { profile }) => { ... }, ['admin'])
//
// Usage (dynamic route with params):
//   export const GET = withAuth(async (req, auth, ctx) => {
//     const { id } = await ctx.params!
//   })
// ─────────────────────────────────────────────────────────────
export function withAuth(
  handler: ProtectedHandler,
  allowedRoles?: UserRole[]
) {
  return async (req: NextRequest, routeCtx: RouteContext = {}) => {
    try {
      // 1. Get Clerk session
      const { userId: clerkId } = await auth()

      if (!clerkId) return unauthorized()

      // 2. Load our user row via clerk_id
      const [profile] = await db
        .select()
        .from(users)
        .where(eq(users.clerk_id, clerkId))

      if (!profile) {
        return unauthorized('Account setup incomplete. Please sign up again or contact support.')
      }

      // 3. Check account is active
      if (!profile.is_active) {
        return forbidden('Your account has been suspended. Contact support.')
      }

      // 4. Role guard
      if (allowedRoles && !allowedRoles.includes(profile.role)) {
        return forbidden(`This action requires one of: ${allowedRoles.join(', ')}`)
      }

      // 5. Call the actual handler
      return handler(
        req,
        { user: { id: profile.id, clerkId }, profile },
        routeCtx
      )
    } catch (e) {
      console.error('[withAuth] Unexpected error:', e)
      return serverError()
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Role-specific convenience wrappers
// ─────────────────────────────────────────────────────────────
export const withDonor             = (h: ProtectedHandler) => withAuth(h, ['donor'])
export const withReceiver          = (h: ProtectedHandler) => withAuth(h, ['receiver'])
export const withAdmin             = (h: ProtectedHandler) => withAuth(h, ['admin'])
export const withDonorOrAdmin      = (h: ProtectedHandler) => withAuth(h, ['donor', 'admin'])
export const withReceiverOrAdmin   = (h: ProtectedHandler) => withAuth(h, ['receiver', 'admin'])
