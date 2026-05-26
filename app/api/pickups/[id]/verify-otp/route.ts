import { withAuth } from '@/lib/api/auth-guard'
import { db, pickup_assignments, donations } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { validateBody, z } from '@/lib/api/validate'
import { ok, err, notFound, forbidden, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

const verifySchema = z.object({
  otp: z
    .string({ required_error: 'OTP is required' })
    .regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
})

// ─────────────────────────────────────────────────────────────
// POST /api/pickups/[id]/verify-otp
// ─────────────────────────────────────────────────────────────
export const POST = withAuth(
  async (req: NextRequest, { profile }, ctx: Ctx) => {
    const { id } = await ctx.params

    const { data: body, error: bodyErr } = await validateBody(req, verifySchema)
    if (bodyErr) return bodyErr

    const [pickup] = await db
      .select({
        id:            pickup_assignments.id,
        receiver_id:   pickup_assignments.receiver_id,
        pickup_status: pickup_assignments.pickup_status,
        otp_code:      pickup_assignments.otp_code,
        otp_verified:  pickup_assignments.otp_verified,
        donation_id:   pickup_assignments.donation_id,
      })
      .from(pickup_assignments)
      .where(eq(pickup_assignments.id, id))

    if (!pickup) return notFound('Pickup assignment')

    // Load donor info for access control
    const [donation] = await db
      .select({ donor_id: donations.donor_id, title: donations.title })
      .from(donations)
      .where(eq(donations.id, pickup.donation_id))

    const isDonor    = donation?.donor_id === profile.id
    const isReceiver = pickup.receiver_id === profile.id
    const isAdmin    = profile.role === 'admin'

    if (!isDonor && !isReceiver && !isAdmin) {
      return forbidden('You are not involved in this pickup')
    }

    if (pickup.otp_verified) {
      return err('OTP has already been verified.', 409, 'ALREADY_VERIFIED')
    }

    if (pickup.pickup_status !== 'in_progress') {
      return err(
        `OTP verification is only available when pickup is in progress. Current status: "${pickup.pickup_status}".`,
        409,
        'WRONG_STATUS'
      )
    }

    if (!pickup.otp_code) {
      return err('No OTP has been generated for this pickup. Generate one first.', 400, 'NO_OTP')
    }

    if (body.otp !== pickup.otp_code) {
      return err('Incorrect OTP. Please try again.', 400, 'INVALID_OTP')
    }

    try {
      await db
        .update(pickup_assignments)
        .set({ otp_verified: true })
        .where(eq(pickup_assignments.id, id))
    } catch (e) {
      console.error('[POST /api/pickups/[id]/verify-otp]', e)
      return serverError('Failed to verify OTP')
    }

    return ok({
      message:      'OTP verified successfully! You can now mark the pickup as complete.',
      pickup_id:    id,
      otp_verified: true,
    })
  }
)
