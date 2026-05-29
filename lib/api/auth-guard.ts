import { auth } from '@clerk/nextjs/server'
import { db, donor_profiles, receiver_profiles, users } from '@/lib/db'
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
type RouteParams = Record<string, string | string[]>
export type RouteContext = { params?: Promise<RouteParams> }

// The handler shape every protected route must match
export type ProtectedHandler<TCtx = RouteContext> = (
  req: NextRequest,
  auth: AuthContext,
  routeCtx: TCtx
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
export function withAuth<TCtx = RouteContext>(
  handler: ProtectedHandler<TCtx>,
  allowedRoles?: UserRole[]
) {
  return async (req: NextRequest, routeCtx: TCtx = {} as TCtx) => {
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

      // 4. Role guard. Donor/receiver access follows profile existence so a
      // dual-role account is not locked out when its active role changes.
      if (allowedRoles && !(await hasAllowedRole(profile, allowedRoles))) {
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

async function hasAllowedRole(profile: User, allowedRoles: UserRole[]): Promise<boolean> {
  if (allowedRoles.includes(profile.role)) return true
  if (allowedRoles.includes('admin') && profile.role === 'admin') return true

  const checks: Promise<boolean>[] = []

  if (allowedRoles.includes('donor')) {
    checks.push(
      db
        .select({ id: donor_profiles.id })
        .from(donor_profiles)
        .where(eq(donor_profiles.user_id, profile.id))
        .limit(1)
        .then(rows => rows.length > 0)
    )
  }

  if (allowedRoles.includes('receiver')) {
    checks.push(
      db
        .select({ id: receiver_profiles.id })
        .from(receiver_profiles)
        .where(eq(receiver_profiles.user_id, profile.id))
        .limit(1)
        .then(rows => rows.length > 0)
    )
  }

  if (checks.length === 0) return false
  return (await Promise.all(checks)).some(Boolean)
}

// ─────────────────────────────────────────────────────────────
// Role-specific convenience wrappers
// ─────────────────────────────────────────────────────────────
export const withDonor             = <TCtx = RouteContext>(h: ProtectedHandler<TCtx>) => withAuth(h, ['donor'])
export const withReceiver          = <TCtx = RouteContext>(h: ProtectedHandler<TCtx>) => withAuth(h, ['receiver'])
export const withAdmin             = <TCtx = RouteContext>(h: ProtectedHandler<TCtx>) => withAuth(h, ['admin'])
export const withDonorOrAdmin      = <TCtx = RouteContext>(h: ProtectedHandler<TCtx>) => withAuth(h, ['donor', 'admin'])
export const withReceiverOrAdmin   = <TCtx = RouteContext>(h: ProtectedHandler<TCtx>) => withAuth(h, ['receiver', 'admin'])
