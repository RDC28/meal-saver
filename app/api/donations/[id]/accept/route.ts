import { withReceiver } from '@/lib/api/auth-guard'
import { db, donations, donation_receiver_notifications, receiver_profiles, notifications } from '@/lib/db'
import { eq, and, ne, inArray } from 'drizzle-orm'
import { validateBody, z } from '@/lib/api/validate'
import { ok, err, notFound, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

const acceptSchema = z.object({
  scheduled_pickup_time: z.string().datetime({ offset: true }).optional(),
  pickup_notes:          z.string().max(500).optional(),
})

// ─────────────────────────────────────────────────────────────
// POST /api/donations/[id]/accept
// ─────────────────────────────────────────────────────────────
export const POST = withReceiver(
  async (req: NextRequest, { profile }, ctx: Ctx) => {
    const { id: donationId } = await ctx.params

    const { data: body, error: bodyErr } = await validateBody(req, acceptSchema)
    if (bodyErr) return bodyErr

    // Verify the receiver has a profile
    const [receiverProfile] = await db
      .select({ id: receiver_profiles.id })
      .from(receiver_profiles)
      .where(eq(receiver_profiles.user_id, profile.id))

    if (!receiverProfile) {
      return err('You must complete your receiver profile before accepting donations.', 400, 'PROFILE_REQUIRED')
    }

    let updatedDonation: typeof donations.$inferSelect | null = null

    try {
      await db.transaction(async (tx) => {
        // Atomic status claim — only one NGO wins the race
        const [claimed] = await tx
          .update(donations)
          .set({ status: 'accepted' })
          .where(
            and(
              eq(donations.id, donationId),
              inArray(donations.status, ['pending_acceptance', 'available'])
            )
          )
          .returning()

        if (!claimed) {
          // Someone else already accepted, or wrong status
          const [current] = await tx
            .select({ status: donations.status })
            .from(donations)
            .where(eq(donations.id, donationId))

          if (!current) throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' })
          throw Object.assign(
            new Error(`This donation cannot be accepted — status is "${current.status}".`),
            { code: 'WRONG_STATUS', status: current.status }
          )
        }

        updatedDonation = claimed

        // Upsert the notification row for this receiver
        await tx
          .insert(donation_receiver_notifications)
          .values({
            donation_id: donationId,
            receiver_id: profile.id,
            response:    'accepted',
            responded_at: new Date(),
          })
          .onConflictDoUpdate({
            target: [donation_receiver_notifications.donation_id, donation_receiver_notifications.receiver_id],
            set: { response: 'accepted', responded_at: new Date() },
          })

        // Mark all other pending notifications as expired
        await tx
          .update(donation_receiver_notifications)
          .set({ response: 'no_response' })
          .where(
            and(
              eq(donation_receiver_notifications.donation_id, donationId),
              ne(donation_receiver_notifications.receiver_id, profile.id),
              eq(donation_receiver_notifications.response, 'no_response')
            )
          )
      })
    } catch (e: unknown) {
      const err2 = e as { code?: string; message?: string; status?: string }
      if (err2.code === 'NOT_FOUND') return notFound('Donation')
      if (err2.code === 'WRONG_STATUS') {
        return err(err2.message ?? 'Cannot accept donation', 409, 'WRONG_STATUS')
      }
      console.error('[POST /api/donations/[id]/accept]', e)
      return serverError('Failed to accept donation')
    }

    // Notify the donor (non-fatal, outside transaction)
    try {
      const [donation] = await db
        .select({ donor_id: donations.donor_id, title: donations.title, pickup_city: donations.pickup_city })
        .from(donations)
        .where(eq(donations.id, donationId))

      if (donation) {
        await db.insert(notifications).values({
          user_id:             donation.donor_id,
          type:                'donation_accepted',
          title:               'Your donation has been accepted!',
          message:             `An NGO in ${donation.pickup_city} accepted your donation "${donation.title}". They will be in touch soon.`,
          related_donation_id: donationId,
        })
      }
    } catch { /* non-fatal */ }

    return ok({
      donation: updatedDonation,
      message:  'Donation accepted! The donor has been notified. Please arrange pickup.',
    })
  }
)
