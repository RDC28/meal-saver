import { withReceiver } from '@/lib/api/auth-guard'
import { db, donations, donation_receiver_notifications, notifications } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { validateBody, z } from '@/lib/api/validate'
import { ok, err, notFound, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

const rejectSchema = z.object({
  rejection_reason: z.string().max(500).optional(),
})

// ─────────────────────────────────────────────────────────────
// POST /api/donations/[id]/reject
// ─────────────────────────────────────────────────────────────
export const POST = withReceiver(
  async (req: NextRequest, { profile }, ctx: Ctx) => {
    const { id: donationId } = await ctx.params

    const { data: body, error: bodyErr } = await validateBody(req, rejectSchema)
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

    if (!['pending_acceptance', 'available'].includes(donation.status)) {
      return err(
        `This donation cannot be rejected — it has status "${donation.status}".`,
        409,
        'WRONG_STATUS'
      )
    }

    const [notification] = await db
      .select({ id: donation_receiver_notifications.id, response: donation_receiver_notifications.response })
      .from(donation_receiver_notifications)
      .where(
        and(
          eq(donation_receiver_notifications.donation_id, donationId),
          eq(donation_receiver_notifications.receiver_id, profile.id)
        )
      )

    if (!notification) {
      return err('You were not notified about this donation.', 403, 'NOT_ELIGIBLE')
    }

    if (notification.response !== 'no_response') {
      return err(
        `You already responded to this donation (${notification.response}).`,
        409,
        'ALREADY_RESPONDED'
      )
    }

    // Mark the notification as rejected
    await db
      .update(donation_receiver_notifications)
      .set({
        response:         'rejected',
        responded_at:     new Date(),
        rejection_reason: body?.rejection_reason ?? null,
      })
      .where(eq(donation_receiver_notifications.id, notification.id))

    // Check if ALL notified NGOs have now rejected
    const pendingResponses = await db
      .select({ id: donation_receiver_notifications.id })
      .from(donation_receiver_notifications)
      .where(
        and(
          eq(donation_receiver_notifications.donation_id, donationId),
          eq(donation_receiver_notifications.response, 'no_response')
        )
      )

    const allRejected = pendingResponses.length === 0

    if (allRejected) {
      try {
        await db
          .update(donations)
          .set({ status: 'available' })
          .where(eq(donations.id, donationId))

        await db.insert(notifications).values({
          user_id:             donation.donor_id,
          type:                'donation_rejected',
          title:               'All NGOs have rejected your donation',
          message:             `Unfortunately, all notified NGOs rejected your donation "${donation.title}". You can re-match or edit the listing.`,
          related_donation_id: donationId,
        })
      } catch { /* non-fatal */ }
    }

    return ok({
      message: allRejected
        ? 'Rejection recorded. All NGOs have responded — the donation is back to available.'
        : 'Rejection recorded. Other NGOs can still accept this donation.',
      all_rejected: allRejected,
    })
  }
)
