import { withAdmin } from '@/lib/api/auth-guard'
import { db, users, admin_actions, notifications } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { validateBody, z } from '@/lib/api/validate'
import { ok, notFound, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

const suspendSchema = z.object({
  suspended: z.boolean({ required_error: 'suspended (boolean) is required' }),
  reason:    z.string().max(500).optional(),
})

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/users/[id]/suspend
// ─────────────────────────────────────────────────────────────
export const PUT = withAdmin(
  async (req: NextRequest, { profile: admin }, ctx: Ctx) => {
    const { id } = await ctx.params

    const { data: body, error: bodyErr } = await validateBody(req, suspendSchema)
    if (bodyErr) return bodyErr

    const [user] = await db
      .select({ id: users.id, is_active: users.is_active, full_name: users.full_name, email: users.email })
      .from(users)
      .where(eq(users.id, id))

    if (!user) return notFound('User')

    try {
      await db
        .update(users)
        .set({ is_active: !body.suspended })
        .where(eq(users.id, id))
    } catch (e) {
      console.error('[PUT /api/admin/users/[id]/suspend]', e)
      return serverError('Failed to update user status')
    }

    // Log admin action (non-fatal)
    try {
      await db.insert(admin_actions).values({
        admin_id:    admin.id,
        action_type: body.suspended ? 'account_suspended' : 'account_reactivated',
        target_type: 'user',
        target_id:   id,
        description: body.reason ?? null,
      })
    } catch { /* non-fatal */ }

    // Notify the user (non-fatal)
    try {
      await db.insert(notifications).values({
        user_id: id,
        type:    'general',
        title:   body.suspended ? 'Account suspended' : 'Account reactivated',
        message: body.suspended
          ? `Your account has been suspended. ${body.reason ? 'Reason: ' + body.reason : 'Contact support for details.'}`
          : 'Your account has been reactivated. Welcome back!',
      })
    } catch { /* non-fatal */ }

    return ok({
      message:   body.suspended
        ? `${user.full_name ?? user.email} has been suspended`
        : `${user.full_name ?? user.email}'s account has been reactivated`,
      user_id:   id,
      is_active: !body.suspended,
    })
  }
)
