import { withReceiver } from '@/lib/api/auth-guard'
import { db, donations, donation_receiver_notifications, receiver_profiles, notifications } from '@/lib/db'
import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import { validateBody, z } from '@/lib/api/validate'
import { ok, err, notFound, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

const acceptSchema = z.object({
  scheduled_pickup_time: z.string().datetime({ offset: true }).optional(),
  pickup_notes: z.string().max(500).optional(),
})

function isInsideServiceArea(
  distanceKm: number | string | null,
  radiusKm: number,
  pickupCity: string,
  receiverCity: string,
) {
  const distance = distanceKm == null ? null : Number(distanceKm)
  if (distance != null && Number.isFinite(distance)) return distance <= radiusKm

  const pickup = pickupCity.trim().toLowerCase()
  const receiver = receiverCity.trim().toLowerCase()
  return pickup.includes(receiver) || receiver.includes(pickup)
}

// ─────────────────────────────────────────────────────────────
// POST /api/donations/[id]/accept
// ─────────────────────────────────────────────────────────────
export const POST = withReceiver(
  async (req: NextRequest, { profile }, ctx: Ctx) => {
    const { id: donationId } = await ctx.params

    const { error: bodyErr } = await validateBody(req, acceptSchema)
    if (bodyErr) return bodyErr

    const [receiverProfile] = await db
      .select({
        id: receiver_profiles.id,
        verification_status: receiver_profiles.verification_status,
        city: receiver_profiles.city,
        service_area_km: receiver_profiles.service_area_km,
        max_capacity_kg: receiver_profiles.max_capacity_kg,
        accepts_veg: receiver_profiles.accepts_veg,
        accepts_non_veg: receiver_profiles.accepts_non_veg,
        accepts_vegan: receiver_profiles.accepts_vegan,
        accepts_cooked: receiver_profiles.accepts_cooked,
        accepts_raw: receiver_profiles.accepts_raw,
        accepts_packaged: receiver_profiles.accepts_packaged,
        accepts_short_term: receiver_profiles.accepts_short_term,
        accepts_long_term: receiver_profiles.accepts_long_term,
        latitude: sql<number | null>`ST_Y(${receiver_profiles.location}::geometry)`,
        longitude: sql<number | null>`ST_X(${receiver_profiles.location}::geometry)`,
      })
      .from(receiver_profiles)
      .where(eq(receiver_profiles.user_id, profile.id))

    if (!receiverProfile) return err('Complete NGO profile before accepting donations.', 400, 'PROFILE_REQUIRED')
    if (receiverProfile.verification_status !== 'verified') {
      return err('Your NGO must be verified before accepting donations.', 403, 'NOT_VERIFIED')
    }

    const receiverLat = Number(receiverProfile.latitude)
    const receiverLng = Number(receiverProfile.longitude)
    const receiverPoint = Number.isFinite(receiverLat) && Number.isFinite(receiverLng)
      ? sql`ST_SetSRID(ST_MakePoint(${receiverLng}, ${receiverLat}), 4326)::geography`
      : null
    const distanceExpr = receiverPoint
      ? sql<number | null>`ST_Distance(${donations.pickup_location}, ${receiverPoint}) / 1000`
      : sql<number | null>`NULL`

    const [donationToAccept] = await db
      .select({
        id: donations.id,
        status: donations.status,
        food_type: donations.food_type,
        food_condition: donations.food_condition,
        food_category: donations.food_category,
        quantity_kg: donations.quantity_kg,
        pickup_city: donations.pickup_city,
        distance_km: distanceExpr,
      })
      .from(donations)
      .where(eq(donations.id, donationId))

    if (!donationToAccept) return notFound('Donation')
    if (!['pending_acceptance', 'available'].includes(donationToAccept.status)) {
      return err(
        `Donation cannot be accepted because status is "${donationToAccept.status}".`,
        409,
        'WRONG_STATUS',
      )
    }

    const [existingNotification] = await db
      .select({ response: donation_receiver_notifications.response })
      .from(donation_receiver_notifications)
      .where(
        and(
          eq(donation_receiver_notifications.donation_id, donationId),
          eq(donation_receiver_notifications.receiver_id, profile.id),
        )
      )

    if (donationToAccept.status === 'pending_acceptance' && !existingNotification) {
      return err('This donation was not matched to your NGO.', 403, 'NOT_MATCHED')
    }

    if (existingNotification && existingNotification.response !== 'no_response') {
      return err(
        `You already responded to this donation (${existingNotification.response}).`,
        409,
        'ALREADY_RESPONDED',
      )
    }

    const acceptsFoodType =
      (donationToAccept.food_type === 'veg' && receiverProfile.accepts_veg) ||
      (donationToAccept.food_type === 'non_veg' && receiverProfile.accepts_non_veg) ||
      (donationToAccept.food_type === 'vegan' && receiverProfile.accepts_vegan)
    const acceptsCondition =
      (donationToAccept.food_condition === 'cooked' && receiverProfile.accepts_cooked) ||
      (donationToAccept.food_condition === 'raw' && receiverProfile.accepts_raw) ||
      (donationToAccept.food_condition === 'packaged' && receiverProfile.accepts_packaged)
    const acceptsCategory =
      (donationToAccept.food_category === 'short_term' && receiverProfile.accepts_short_term) ||
      (donationToAccept.food_category === 'long_term' && receiverProfile.accepts_long_term)
    const hasCapacity =
      receiverProfile.max_capacity_kg == null ||
      Number(receiverProfile.max_capacity_kg) >= Number(donationToAccept.quantity_kg)
    const withinServiceArea = isInsideServiceArea(
      donationToAccept.distance_km,
      Math.max(1, Number(receiverProfile.service_area_km ?? 10)),
      donationToAccept.pickup_city,
      receiverProfile.city,
    )

    if (!acceptsFoodType || !acceptsCondition || !acceptsCategory || !hasCapacity || !withinServiceArea) {
      return err('This donation does not match your NGO profile or service radius.', 403, 'NOT_ELIGIBLE')
    }

    let updatedDonation: typeof donations.$inferSelect | null = null

    try {
      await db.transaction(async (tx) => {
        const [claimed] = await tx
          .update(donations)
          .set({ status: 'accepted' })
          .where(
            and(
              eq(donations.id, donationId),
              inArray(donations.status, ['pending_acceptance', 'available']),
            )
          )
          .returning()

        if (!claimed) {
          const [current] = await tx
            .select({ status: donations.status })
            .from(donations)
            .where(eq(donations.id, donationId))

          if (!current) throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' })
          throw Object.assign(
            new Error(`This donation cannot be accepted because status is "${current.status}".`),
            { code: 'WRONG_STATUS', status: current.status },
          )
        }

        updatedDonation = claimed

        await tx
          .insert(donation_receiver_notifications)
          .values({
            donation_id: donationId,
            receiver_id: profile.id,
            response: 'accepted',
            responded_at: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              donation_receiver_notifications.donation_id,
              donation_receiver_notifications.receiver_id,
            ],
            set: { response: 'accepted', responded_at: new Date() },
          })

        await tx
          .update(donation_receiver_notifications)
          .set({ response: 'no_response' })
          .where(
            and(
              eq(donation_receiver_notifications.donation_id, donationId),
              ne(donation_receiver_notifications.receiver_id, profile.id),
              eq(donation_receiver_notifications.response, 'no_response'),
            )
          )
      })
    } catch (e: unknown) {
      const claimError = e as { code?: string; message?: string }
      if (claimError.code === 'NOT_FOUND') return notFound('Donation')
      if (claimError.code === 'WRONG_STATUS') {
        return err(claimError.message ?? 'Cannot accept donation', 409, 'WRONG_STATUS')
      }
      console.error('[POST /api/donations/[id]/accept]', e)
      return serverError('Failed to accept donation')
    }

    try {
      const [donation] = await db
        .select({ donor_id: donations.donor_id, title: donations.title, pickup_city: donations.pickup_city })
        .from(donations)
        .where(eq(donations.id, donationId))

      if (donation) {
        await db.insert(notifications).values({
          user_id: donation.donor_id,
          type: 'donation_accepted',
          title: 'Your donation has been accepted!',
          message: `An NGO in ${donation.pickup_city} accepted your donation "${donation.title}". They will be in touch soon.`,
          related_donation_id: donationId,
        })
      }
    } catch {
      // Donor notification is best-effort; the acceptance has already been saved.
    }

    return ok({
      donation: updatedDonation,
      distance_km: donationToAccept.distance_km,
      message: 'Donation accepted successfully.',
    })
  }
)
