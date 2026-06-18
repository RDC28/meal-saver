import { withDonor } from '@/lib/api/auth-guard'
import { db, donations, pickup_assignments, notifications, impact_reports } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { validateBody, z } from '@/lib/api/validate'
import { ok, err, notFound, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

const verifySchema = z.object({
  otp: z.string().length(6),
})

export const POST = withDonor(async (req: NextRequest, { profile }, ctx: Ctx) => {
  const { id: donationId } = await ctx.params
  const { data: body, error: bodyErr } = await validateBody(req, verifySchema)
  if (bodyErr) return bodyErr

  const [donation] = await db
    .select()
    .from(donations)
    .where(eq(donations.id, donationId))

  if (!donation) return notFound('Donation')
  if (donation.donor_id !== profile.id) {
    return err('You do not have permission to verify this donation handover.', 403, 'FORBIDDEN')
  }

  if (donation.status !== 'pickup_assigned') {
    return err('Donation is not in a state waiting for handover verification.', 400, 'INVALID_STATE')
  }

  const [pickup] = await db
    .select()
    .from(pickup_assignments)
    .where(eq(pickup_assignments.donation_id, donationId))

  if (!pickup) return notFound('Pickup Assignment')

  if (pickup.otp_code !== body.otp) {
    return err('Invalid OTP code. Please ask the NGO representative for the correct 6-digit code.', 400, 'INVALID_OTP')
  }

  try {
    // 1. Mark pickup as verified
    await db
      .update(pickup_assignments)
      .set({
        otp_verified: true,
        actual_pickup_time: new Date(),
        pickup_status: 'completed'
      })
      .where(eq(pickup_assignments.id, pickup.id))

    // 2. Mark donation as picked_up
    await db
      .update(donations)
      .set({ status: 'picked_up' })
      .where(eq(donations.id, donationId))

    // 3. Automatically create an initial impact report using the database trigger or manual insert
    // Since there is a database trigger for impact_reports, we just notify
    await db.insert(notifications).values([
      {
        user_id: pickup.receiver_id,
        type: 'pickup_completed',
        title: 'Food Picked Up Successfully!',
        message: `You successfully picked up "${donation.title}". Please confirm delivery when you arrive at your facility.`,
        related_donation_id: donationId,
      },
      {
        user_id: donation.donor_id,
        type: 'general',
        title: 'Handover Verified',
        message: `Your food "${donation.title}" has been securely handed over. Impact stats will be available soon!`,
        related_donation_id: donationId,
      }
    ])

    return ok({ message: 'Handover verified successfully' })
  } catch (error) {
    console.error('[POST /api/donations/[id]/verify-handover]', error)
    return serverError('Failed to verify handover')
  }
})
