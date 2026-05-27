import { auth, clerkClient } from '@clerk/nextjs/server'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { ok, serverError, unauthorized } from '@/lib/api/response'
import { logger } from '@/lib/logger'

// DELETE /api/auth/account
//
// Soft-deletes the caller's account: marks is_active=false so the row is
// retained for a 30-day GDPR retention period. A scheduled cleanup job
// should hard-delete rows where is_active=false AND updated_at < NOW()-30d.
//
// NOTE: to enable full GDPR tracking with a deleted_at timestamp, run
// database/migrations/001_soft_delete.sql and update this handler accordingly.
export const DELETE = async () => {
  try {
    const { userId: clerkId } = await auth()
    if (!clerkId) return unauthorized()

    const [profile] = await db
      .select({ id: users.id, clerk_id: users.clerk_id })
      .from(users)
      .where(eq(users.clerk_id, clerkId))

    // If a DB user exists, soft-delete it first so data retention rules remain intact.
    if (profile) {
      await db
        .update(users)
        .set({ is_active: false })
        .where(eq(users.id, profile.id))
    }

    // Remove Clerk identity even when DB row is missing (broken/incomplete accounts).
    const clerk = await clerkClient()
    await clerk.users.deleteUser(clerkId).catch(e => {
      logger.warn('DELETE /api/auth/account', 'Clerk delete failed', e)
    })

    return ok({ message: 'Account deactivated. Your data will be permanently deleted within 30 days.' })
  } catch (e) {
    logger.error('DELETE /api/auth/account', 'Failed to deactivate account', e)
    return serverError('Failed to delete account.')
  }
}
