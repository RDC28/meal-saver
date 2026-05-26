import { withAuth } from '@/lib/api/auth-guard'
import { db, notifications } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { ok, notFound, forbidden, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

// ─────────────────────────────────────────────────────────────
// DELETE /api/notifications/[id]
// ─────────────────────────────────────────────────────────────
export const DELETE = withAuth(
  async (_req: NextRequest, { profile }, ctx: Ctx) => {
    const { id } = await ctx.params

    const [notif] = await db
      .select({ id: notifications.id, user_id: notifications.user_id })
      .from(notifications)
      .where(eq(notifications.id, id))

    if (!notif) return notFound('Notification')

    if (notif.user_id !== profile.id) {
      return forbidden('You can only delete your own notifications')
    }

    try {
      await db.delete(notifications).where(eq(notifications.id, id))
    } catch (e) {
      console.error('[DELETE /api/notifications/[id]]', e)
      return serverError('Failed to delete notification')
    }

    return ok({ message: 'Notification deleted', id })
  }
)
