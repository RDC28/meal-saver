import { auth, clerkClient } from '@clerk/nextjs/server'
import { ok, serverError } from '@/lib/api/response'

// ─────────────────────────────────────────────────────────────
// POST /api/auth/logout
// Revokes the current Clerk session — works even if already logged out.
// ─────────────────────────────────────────────────────────────

export async function POST() {
  try {
    const { sessionId } = await auth()

    if (sessionId) {
      const clerk = await clerkClient()
      await clerk.sessions.revokeSession(sessionId)
    }

    return ok({ message: 'Logged out successfully' })
  } catch (e) {
    console.error('[POST /api/auth/logout]', e)
    return serverError('Failed to log out')
  }
}
