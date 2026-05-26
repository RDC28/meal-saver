import { withAuth } from '@/lib/api/auth-guard'
import { db, notifications } from '@/lib/db'
import { eq, and, desc, count } from 'drizzle-orm'
import { validateParams, z } from '@/lib/api/validate'
import { ok, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

const listSchema = z.object({
  page:        z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit:       z.string().regex(/^\d+$/).transform(Number).default('20'),
  unread_only: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
})

// ─────────────────────────────────────────────────────────────
// GET /api/notifications
// ─────────────────────────────────────────────────────────────
export const GET = withAuth(
  async (req: NextRequest, { profile }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawParams, error: paramErr } = validateParams(req, listSchema as any)
    if (paramErr) return paramErr as Response
    const params = rawParams as { page: number; limit: number; unread_only?: boolean }

    const { page, limit, unread_only } = params
    const offset = (page - 1) * limit

    const conditions = [eq(notifications.user_id, profile.id)]
    if (unread_only) {
      conditions.push(eq(notifications.is_read, false))
    }
    const where = and(...conditions)

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.created_at))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(notifications).where(where),
    ])

    return ok({
      notifications: rows,
      pagination: {
        page,
        limit,
        total: Number(total),
        pages: Math.ceil(Number(total) / limit),
      },
    })
  }
)
