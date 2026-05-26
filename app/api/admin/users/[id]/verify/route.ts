import { withAdmin } from '@/lib/api/auth-guard'
import { db, users, donor_profiles, receiver_profiles, admin_actions, notifications } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { validateBody, z } from '@/lib/api/validate'
import { ok, err, notFound, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

const verifySchema = z.object({
  status: z.enum(['verified', 'rejected'], {
    required_error: 'status must be "verified" or "rejected"',
  }),
  notes: z.string().max(500).optional(),
})

// ─────────────────────────────────────────────────────────────
// PUT /api/admin/users/[id]/verify
// ─────────────────────────────────────────────────────────────
export const PUT = withAdmin(
  async (req: NextRequest, { profile: admin }, ctx: Ctx) => {
    const { id } = await ctx.params

    const { data: body, error: bodyErr } = await validateBody(req, verifySchema)
    if (bodyErr) return bodyErr

    const [user] = await db
      .select({ id: users.id, email: users.email, full_name: users.full_name, role: users.role })
      .from(users)
      .where(eq(users.id, id))

    if (!user) return notFound('User')

    const now        = new Date()
    const isVerified = body.status === 'verified'

    try {
      if (user.role === 'donor') {
        await db
          .update(donor_profiles)
          .set({
            verification_status: body.status,
            verified_at:         isVerified ? now : null,
            verified_by:         isVerified ? admin.id : null,
          })
          .where(eq(donor_profiles.user_id, id))
      } else if (user.role === 'receiver') {
        await db
          .update(receiver_profiles)
          .set({
            verification_status: body.status,
            verified_at:         isVerified ? now : null,
            verified_by:         isVerified ? admin.id : null,
          })
          .where(eq(receiver_profiles.user_id, id))
      } else {
        return err('Only donor and receiver accounts can be verified.', 400, 'INVALID_ROLE')
      }
    } catch (e) {
      console.error('[PUT /api/admin/users/[id]/verify]', e)
      return serverError('Failed to update verification status')
    }

    // Log the admin action (non-fatal)
    try {
      await db.insert(admin_actions).values({
        admin_id:    admin.id,
        action_type: `verification_${body.status}`,
        target_type: 'user',
        target_id:   id,
        description: body.notes ?? null,
      })
    } catch { /* non-fatal */ }

    // Notify the user (non-fatal)
    try {
      await db.insert(notifications).values({
        user_id: id,
        type:    'verification_update',
        title:   isVerified ? 'Your account has been verified!' : 'Verification request rejected',
        message: isVerified
          ? 'You can now fully use the MealSaver platform. Welcome aboard!'
          : `Your verification was not approved. ${body.notes ? 'Reason: ' + body.notes : 'Please contact support for details.'}`,
      })
    } catch { /* non-fatal */ }

    return ok({
      message: `User ${body.status} successfully`,
      user_id: id,
      status:  body.status,
    })
  }
)
