import { withAuth } from '@/lib/api/auth-guard'
import { db, notifications } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { ok, notFound, forbidden, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

// ─────────────────────────────────────────────────────────────
// PUT /api/notifications/[id]/read
// ─────────────────────────────────────────────────────────────
export const PUT = withAuth(
  async (_req: NextRequest, { profile }, ctx: Ctx) => {
    const { id } = await ctx.params

    const [notif] = await db
      .select({ id: notifications.id, user_id: notifications.user_id, is_read: notifications.is_read })
      .from(notifications)
      .where(eq(notifications.id, id))

    if (!notif) return notFound('Notification')

    if (notif.user_id !== profile.id) {
      return forbidden('You can only mark your own notifications as read')
    }

    if (notif.is_read) {
      return ok({ message: 'Already marked as read', id })
    }

    try {
      await db
        .update(notifications)
        .set({ is_read: true, read_at: new Date() })
        .where(eq(notifications.id, id))
    } catch (e) {
      console.error('[PUT /api/notifications/[id]/read]', e)
      return serverError('Failed to mark notification as read')
    }

    return ok({ message: 'Marked as read', id })
  }
)
