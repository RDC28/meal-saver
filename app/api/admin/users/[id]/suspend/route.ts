import { withAdmin } from '@/lib/api/auth-guard'
import { db, users, admin_actions, notifications } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { validateBody, z } from '@/lib/api/validate'
import { ok, notFound, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

const suspendSchema = z.object({
  suspended: z.boolean({ required_error: 'suspended (boolean) required' }),
  reason: z.string().max(500).optional(),
})

export const PUT = withAdmin(async (req: NextRequest, { profile: admin }, ctx: Ctx) => {
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
    return serverError('Failed update user status')
  }

  try {
    await db.insert(admin_actions).values({
      admin_id: admin.id,
      action_type: body.suspended ? 'account_suspended' : 'account_reactivated',
      target_type: 'user',
      target_id: id,
      description: body.reason ?? null,
    })
  } catch {
    // non-fatal
  }

  try {
    await db.insert(notifications).values({
      user_id: id,
      type: 'general',
      title: body.suspended ? 'Account suspended' : 'Account reactivated',
      message: body.suspended
        ? `Your account has been suspended.${body.reason ? ` Reason: ${body.reason}` : ''}`
        : 'Your account has been reactivated by an admin.',
    })
  } catch {
    // non-fatal
  }

  return ok({
    message: body.suspended ? 'User suspended successfully' : 'User reactivated successfully',
    user_id: id,
    is_active: !body.suspended,
  })
})
