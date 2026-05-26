import { withAuth } from '@/lib/api/auth-guard'
import { db, notifications } from '@/lib/db'
import { eq, and, count } from 'drizzle-orm'
import { ok, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────
// PUT /api/notifications/read-all
// ─────────────────────────────────────────────────────────────
export const PUT = withAuth(
  async (_req: NextRequest, { profile }) => {
    try {
      // Count before update
      const [{ total }] = await db
        .select({ total: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.user_id, profile.id),
            eq(notifications.is_read, false)
          )
        )

      await db
        .update(notifications)
        .set({ is_read: true, read_at: new Date() })
        .where(
          and(
            eq(notifications.user_id, profile.id),
            eq(notifications.is_read, false)
          )
        )

      const markedCount = Number(total)
      return ok({
        message: `Marked ${markedCount} notification${markedCount !== 1 ? 's' : ''} as read`,
        marked_count: markedCount,
      })
    } catch (e) {
      console.error('[PUT /api/notifications/read-all]', e)
      return serverError('Failed to mark notifications as read')
    }
  }
)
