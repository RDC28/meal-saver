import { withReceiver } from '@/lib/api/auth-guard'
import { db, donations, donation_receiver_notifications, receiver_profiles, pickup_assignments, notifications } from '@/lib/db'
import { and, eq, sql } from 'drizzle-orm'
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

export const POST = withReceiver(async (req: NextRequest, { profile }, ctx: Ctx) => {
  const { id: donationId } = await ctx.params
  const { data: body, error: bodyErr } = await validateBody(req, acceptSchema)
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
    })
    .from(receiver_profiles)
    .where(eq(receiver_profiles.user_id, profile.id))

  if (!receiverProfile) return err('Receiver profile not found', 404, 'PROFILE_NOT_FOUND')
  if (receiverProfile.verification_status !== 'verified') {
    return err('Please complete NGO verification before accepting donations.', 403, 'NOT_VERIFIED')
  }

  const [donationToAccept] = await db
    .select({
      id: donations.id,
      donor_id: donations.donor_id,
      title: donations.title,
      status: donations.status,
      food_type: donations.food_type,
      food_condition: donations.food_condition,
      food_category: donations.food_category,
      quantity_kg: donations.quantity_kg,
      pickup_city: donations.pickup_city,
      distance_km: sql<number | null>`NULL`,
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
      ),
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

  try {
    const [claimed] = await db
      .update(donations)
      .set({ status: 'accepted' })
      .where(
        and(
          eq(donations.id, donationId),
          eq(donations.status, donationToAccept.status),
        ),
      )
      .returning()

    if (!claimed) {
      return err('This donation is no longer available.', 409, 'WRONG_STATUS')
    }

    await db
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
        set: {
          response: 'accepted',
          responded_at: new Date(),
        },
      })

    await db
      .insert(pickup_assignments)
      .values({
        donation_id: donationId,
        receiver_id: profile.id,
        receiver_profile_id: receiverProfile.id,
        pickup_type: 'ngo_pickup',
        pickup_status: 'assigned',
        scheduled_pickup_time: body.scheduled_pickup_time ? new Date(body.scheduled_pickup_time) : null,
        pickup_notes: body.pickup_notes ?? null,
      })
      .onConflictDoUpdate({
        target: pickup_assignments.donation_id,
        set: {
          receiver_id: profile.id,
          receiver_profile_id: receiverProfile.id,
          pickup_type: 'ngo_pickup',
          pickup_status: 'assigned',
          scheduled_pickup_time: body.scheduled_pickup_time ? new Date(body.scheduled_pickup_time) : null,
          pickup_notes: body.pickup_notes ?? null,
          actual_pickup_time: null,
        },
      })

    await db.insert(notifications).values({
      user_id: donationToAccept.donor_id,
      type: 'donation_accepted',
      title: 'Your donation has been accepted!',
      message: `An NGO accepted your donation "${donationToAccept.title}". They will be in touch soon.`,
      related_donation_id: donationId,
    })

    return ok({
      donation: claimed,
      distance_km: donationToAccept.distance_km,
      message: 'Donation accepted successfully.',
    })
  } catch (e) {
    console.error('[POST /api/donations/[id]/accept]', e)
    return serverError('Failed to accept donation')
  }
})
