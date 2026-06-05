import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { ok, serverError } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { withAuth } from '@/lib/api/auth-guard'
import { clearSessionCookie } from '@/lib/auth/session'

// DELETE /api/auth/account
//
// Soft-deletes the caller's account: marks is_active=false so the row is
// retained for a 30-day GDPR retention period. A scheduled cleanup job
// should hard-delete rows where is_active=false AND updated_at < NOW()-30d.
//
// NOTE: to enable full GDPR tracking with a deleted_at timestamp, run
// database/migrations/001_soft_delete.sql and update this handler accordingly.
export const DELETE = withAuth(async (req, { profile }) => {
  try {
    await db
      .update(users)
      .set({ is_active: false })
      .where(eq(users.id, profile.id))

    await clearSessionCookie()

    return ok({ message: 'Account deactivated. Your data will be permanently deleted within 30 days.' })
  } catch (e) {
    logger.error('DELETE /api/auth/account', 'Failed to deactivate account', e)
    return serverError('Failed to delete account.')
  }
})
