import { withAdmin } from '@/lib/api/auth-guard'
import { db, donations, users, receiver_profiles, donation_receiver_notifications, pickup_assignments, admin_actions, notifications } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { validateBody, z } from '@/lib/api/validate'
import { ok, err, notFound, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

const assignSchema = z.object({
  receiver_id: z.string().uuid('receiver_id must be a valid UUID'),
  pickup_type: z.enum(['ngo_pickup', 'donor_dropoff', 'delivery_partner']).default('ngo_pickup'),
  notes:       z.string().max(500).optional(),
})

// ─────────────────────────────────────────────────────────────
// POST /api/admin/donations/[id]/assign
// ─────────────────────────────────────────────────────────────
export const POST = withAdmin(
  async (req: NextRequest, { profile: admin }, ctx: Ctx) => {
    const { id: donationId } = await ctx.params

    const { data: body, error: bodyErr } = await validateBody(req, assignSchema)
    if (bodyErr) return bodyErr

    const [donation] = await db
      .select({
        id:          donations.id,
        donor_id:    donations.donor_id,
        status:      donations.status,
        title:       donations.title,
        pickup_city: donations.pickup_city,
      })
      .from(donations)
      .where(eq(donations.id, donationId))

    if (!donation) return notFound('Donation')

    const assignableStatuses = ['available', 'pending_acceptance']
    if (!assignableStatuses.includes(donation.status)) {
      return err(
        `Cannot assign donation with status "${donation.status}".`,
        409,
        'WRONG_STATUS'
      )
    }

    // Verify receiver exists and has a profile
    const [receiver] = await db
      .select({ id: users.id, role: users.role, full_name: users.full_name })
      .from(users)
      .where(and(eq(users.id, body.receiver_id), eq(users.role, 'receiver')))

    if (!receiver) return notFound('Receiver user')

    const [receiverProfile] = await db
      .select({ id: receiver_profiles.id })
      .from(receiver_profiles)
      .where(eq(receiver_profiles.user_id, body.receiver_id))

    if (!receiverProfile) {
      return err('Receiver has not set up their profile yet.', 400, 'PROFILE_REQUIRED')
    }

    // Upsert the notification row as accepted
    try {
      await db
        .insert(donation_receiver_notifications)
        .values({
          donation_id:  donationId,
          receiver_id:  body.receiver_id,
          response:     'accepted',
          responded_at: new Date(),
        })
        .onConflictDoUpdate({
          target:       [donation_receiver_notifications.donation_id, donation_receiver_notifications.receiver_id],
          set:          { response: 'accepted', responded_at: new Date() },
        })
    } catch { /* non-fatal */ }

    // Create pickup assignment
    let pickup
    try {
      const [result] = await db
        .insert(pickup_assignments)
        .values({
          donation_id:         donationId,
          receiver_id:         body.receiver_id,
          receiver_profile_id: receiverProfile.id,
          pickup_type:         body.pickup_type,
          pickup_status:       'assigned',
          pickup_notes:        body.notes ?? 'Manually assigned by admin',
        })
        .returning()
      pickup = result
    } catch (e: unknown) {
      const pgErr = e as { code?: string }
      if (pgErr?.code === '23505') {
        return err('A pickup assignment already exists for this donation.', 409, 'ALREADY_ASSIGNED')
      }
      console.error('[POST /api/admin/donations/[id]/assign]', e)
      return serverError('Failed to create pickup assignment')
    }

    // Update donation status
    try {
      await db
        .update(donations)
        .set({ status: 'pickup_assigned' })
        .where(eq(donations.id, donationId))
    } catch { /* non-fatal */ }

    // Notify receiver (non-fatal)
    try {
      await db.insert(notifications).values({
        user_id:             body.receiver_id,
        type:                'pickup_assigned',
        title:               'Donation assigned to you by admin',
        message:             `An admin has assigned the donation "${donation.title}" in ${donation.pickup_city} to your organisation. Please arrange pickup.`,
        related_donation_id: donationId,
      })
    } catch { /* non-fatal */ }

    // Log admin action (non-fatal)
    try {
      await db.insert(admin_actions).values({
        admin_id:    admin.id,
        action_type: 'manual_donation_assignment',
        target_type: 'donation',
        target_id:   donationId,
        description: `Assigned donation ${donationId} to ${receiver.full_name}`,
      })
    } catch { /* non-fatal */ }

    return ok({
      pickup,
      message: `Donation assigned to ${receiver.full_name} successfully.`,
    })
  }
)
