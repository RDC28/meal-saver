import { withDonorOrAdmin } from '@/lib/api/auth-guard'
import { db, donations, donation_receiver_notifications, notifications } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { validateBody, z } from '@/lib/api/validate'
import { ok, err, notFound, forbidden, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
})

// ─────────────────────────────────────────────────────────────
// POST /api/donations/[id]/cancel
// ─────────────────────────────────────────────────────────────
export const POST = withDonorOrAdmin(
  async (req: NextRequest, { profile }, ctx: Ctx) => {
    const { id: donationId } = await ctx.params

    const { data: body, error: bodyErr } = await validateBody(req, cancelSchema)
    if (bodyErr) return bodyErr

    const [donation] = await db
      .select({
        id:       donations.id,
        donor_id: donations.donor_id,
        status:   donations.status,
        title:    donations.title,
      })
      .from(donations)
      .where(eq(donations.id, donationId))

    if (!donation) return notFound('Donation')

    // Ownership check (admin bypasses)
    if (profile.role !== 'admin' && donation.donor_id !== profile.id) {
      return forbidden('You can only cancel your own donations')
    }

    const cancellableStatuses = ['available', 'pending_acceptance', 'accepted']
    if (!cancellableStatuses.includes(donation.status)) {
      return err(
        `Cannot cancel a donation with status "${donation.status}". Food is already in transit or delivered.`,
        409,
        'WRONG_STATUS'
      )
    }

    // Find any accepted NGO to notify
    const [acceptedNotif] = await db
      .select({ receiver_id: donation_receiver_notifications.receiver_id })
      .from(donation_receiver_notifications)
      .where(
        and(
          eq(donation_receiver_notifications.donation_id, donationId),
          eq(donation_receiver_notifications.response, 'accepted')
        )
      )

    // Update status
    const [updated] = await db
      .update(donations)
      .set({ status: 'cancelled' })
      .where(eq(donations.id, donationId))
      .returning()

    if (!updated) return serverError('Failed to cancel donation')

    // Notify accepted NGO (non-fatal)
    if (acceptedNotif?.receiver_id) {
      try {
        await db.insert(notifications).values({
          user_id:             acceptedNotif.receiver_id,
          type:                'general',
          title:               'Donation cancelled by donor',
          message:             `The donor has cancelled the donation "${donation.title}". We're sorry for the inconvenience.`,
          related_donation_id: donationId,
        })
      } catch { /* non-fatal */ }
    }

    return ok({
      donation: updated,
      message: 'Donation cancelled successfully.',
    })
  }
)
