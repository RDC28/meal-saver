import { withAuth } from '@/lib/api/auth-guard'
import { db, notifications } from '@/lib/db'
import { eq, and, count } from 'drizzle-orm'
import { ok, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────
// GET /api/notifications/unread-count
// ─────────────────────────────────────────────────────────────
export const GET = withAuth(
  async (_req: NextRequest, { profile }) => {
    try {
      const [{ total }] = await db
        .select({ total: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.user_id, profile.id),
            eq(notifications.is_read, false)
          )
        )

      return ok({ count: Number(total) })
    } catch (e) {
      console.error('[GET /api/notifications/unread-count]', e)
      return serverError('Failed to load unread count')
    }
  }
)
