import { ok, serverError } from '@/lib/api/response'
import { clearSessionCookie } from '@/lib/auth/session'

// ─────────────────────────────────────────────────────────────
// POST /api/auth/logout
// Clears the session cookie
// ─────────────────────────────────────────────────────────────

export async function POST() {
  try {
    await clearSessionCookie()
    return ok({ message: 'Logged out successfully' })
  } catch (e) {
    console.error('[POST /api/auth/logout]', e)
    return serverError('Failed to log out')
  }
}
