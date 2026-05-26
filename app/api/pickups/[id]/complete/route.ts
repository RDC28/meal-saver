import { withReceiver } from '@/lib/api/auth-guard'
import { db, pickup_assignments, donations, notifications } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { ok, err, notFound, forbidden, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

// ─────────────────────────────────────────────────────────────
// POST /api/pickups/[id]/complete
// ─────────────────────────────────────────────────────────────
export const POST = withReceiver(
  async (_req: NextRequest, { profile }, ctx: Ctx) => {
    const { id } = await ctx.params

    const [pickup] = await db
      .select({
        id:            pickup_assignments.id,
        receiver_id:   pickup_assignments.receiver_id,
        pickup_status: pickup_assignments.pickup_status,
        otp_verified:  pickup_assignments.otp_verified,
        donation_id:   pickup_assignments.donation_id,
      })
      .from(pickup_assignments)
      .where(eq(pickup_assignments.id, id))

    if (!pickup) return notFound('Pickup assignment')

    if (pickup.receiver_id !== profile.id) {
      return forbidden('You can only complete your own pickups')
    }

    if (pickup.pickup_status === 'completed') {
      return err('This pickup is already marked as complete.', 409, 'ALREADY_COMPLETED')
    }

    if (pickup.pickup_status !== 'in_progress') {
      return err(
        `Cannot complete a pickup with status "${pickup.pickup_status}". It must be in_progress.`,
        409,
        'WRONG_STATUS'
      )
    }

    if (!pickup.otp_verified) {
      return err(
        'OTP verification is required before marking a pickup as complete.',
        400,
        'OTP_NOT_VERIFIED'
      )
    }

    // Mark pickup as completed
    try {
      await db
        .update(pickup_assignments)
        .set({
          pickup_status:      'completed',
          actual_pickup_time: new Date(),
        })
        .where(eq(pickup_assignments.id, id))
    } catch (e) {
      console.error('[POST /api/pickups/[id]/complete]', e)
      return serverError('Failed to complete pickup')
    }

    // Update donation status → picked_up
    const [updatedDonation] = await db
      .update(donations)
      .set({ status: 'picked_up' })
      .where(eq(donations.id, pickup.donation_id))
      .returning()

    // Notify the donor (non-fatal)
    try {
      const [donation] = await db
        .select({ donor_id: donations.donor_id, title: donations.title })
        .from(donations)
        .where(eq(donations.id, pickup.donation_id))

      if (donation) {
        await db.insert(notifications).values({
          user_id:             donation.donor_id,
          type:                'pickup_completed',
          title:               'Food picked up successfully!',
          message:             `Your donation "${donation.title}" has been collected. Thank you for making a difference!`,
          related_donation_id: pickup.donation_id,
        })
      }
    } catch { /* non-fatal */ }

    return ok({
      message:   'Pickup completed! Please confirm delivery once the food reaches the beneficiaries.',
      pickup_id: id,
      donation:  updatedDonation,
    })
  }
)
