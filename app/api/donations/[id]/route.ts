import { withAuth, withDonor } from '@/lib/api/auth-guard'
import {
  db,
  donations,
  donation_images,
  donor_profiles,
  donation_receiver_notifications,
  pickup_assignments,
  receiver_profiles,
} from '@/lib/db'
import { and, eq, sql } from 'drizzle-orm'
import { validateBody, z } from '@/lib/api/validate'
import { err, forbidden, notFound, ok, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().max(1000).optional(),
  food_category: z.enum(['short_term', 'long_term']).optional(),
  food_type: z.enum(['veg', 'non_veg', 'vegan']).optional(),
  food_condition: z.enum(['cooked', 'raw', 'packaged']).optional(),
  quantity_kg: z.number().positive().max(10000).optional(),
  quantity_description: z.string().max(200).optional(),
  serves_approx: z.number().int().positive().optional(),
  preparation_time: z.string().datetime({ offset: true }).optional(),
  expiry_time: z.string().datetime({ offset: true }).optional(),
  preferred_pickup_time: z.string().datetime({ offset: true }).optional(),
  pickup_address: z.string().min(5).optional(),
  pickup_city: z.string().min(2).optional(),
  pickup_latitude: z.number().min(-90).max(90).optional(),
  pickup_longitude: z.number().min(-180).max(180).optional(),
  pickup_instructions: z.string().max(500).optional(),
  contact_number: z
    .string()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, 'Invalid contact number format')
    .optional(),
})

function distanceKm(
  from: { latitude: number | string | null; longitude: number | string | null },
  to: { latitude: number | string | null; longitude: number | string | null },
) {
  const lat1 = Number(from.latitude)
  const lng1 = Number(from.longitude)
  const lat2 = Number(to.latitude)
  const lng2 = Number(to.longitude)
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null

  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2

  return 2 * 6371 * Math.asin(Math.sqrt(a))
}

// ─────────────────────────────────────────────────────────────
// GET /api/donations/[id]
// ─────────────────────────────────────────────────────────────
export const GET = withAuth(
  async (_req: NextRequest, { profile }, ctx: Ctx) => {
    const { id } = await ctx.params

    const [donation] = await db
      .select()
      .from(donations)
      .where(eq(donations.id, id))

    if (!donation) return notFound('Donation')

    const isOwner = donation.donor_id === profile.id
    const isAdmin = profile.role === 'admin'
    let canViewFull = isOwner || isAdmin

    if (profile.role === 'receiver') {
      const [[receiverProfile], [notification], [pickup], [pickupCoords]] = await Promise.all([
        db
          .select({
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
          .where(eq(receiver_profiles.user_id, profile.id)),
        db
          .select({
            id: donation_receiver_notifications.id,
            response: donation_receiver_notifications.response,
          })
          .from(donation_receiver_notifications)
          .where(
            and(
              eq(donation_receiver_notifications.donation_id, id),
              eq(donation_receiver_notifications.receiver_id, profile.id),
            )
          ),
        db
          .select({ id: pickup_assignments.id })
          .from(pickup_assignments)
          .where(
            and(
              eq(pickup_assignments.donation_id, id),
              eq(pickup_assignments.receiver_id, profile.id),
            )
          ),
        db
          .select({
            latitude: sql<number | null>`ST_Y(${donations.pickup_location}::geometry)`,
            longitude: sql<number | null>`ST_X(${donations.pickup_location}::geometry)`,
          })
          .from(donations)
          .where(eq(donations.id, id)),
      ])

      const receiverIsVerified = receiverProfile?.verification_status === 'verified'
      const computedDistanceKm = receiverProfile && pickupCoords
        ? distanceKm(receiverProfile, pickupCoords)
        : null
      const cityMatches = receiverProfile
        ? donation.pickup_city.toLowerCase().includes(receiverProfile.city.toLowerCase()) ||
          receiverProfile.city.toLowerCase().includes(donation.pickup_city.toLowerCase())
        : false
      const withinServiceArea = receiverProfile
        ? computedDistanceKm == null
          ? cityMatches
          : computedDistanceKm <= Math.max(1, Number(receiverProfile.service_area_km ?? 10))
        : false
      const acceptsFoodType = receiverProfile ? (
        (donation.food_type === 'veg' && receiverProfile.accepts_veg) ||
        (donation.food_type === 'non_veg' && receiverProfile.accepts_non_veg) ||
        (donation.food_type === 'vegan' && receiverProfile.accepts_vegan)
      ) : false
      const acceptsCondition = receiverProfile ? (
        (donation.food_condition === 'cooked' && receiverProfile.accepts_cooked) ||
        (donation.food_condition === 'raw' && receiverProfile.accepts_raw) ||
        (donation.food_condition === 'packaged' && receiverProfile.accepts_packaged)
      ) : false
      const acceptsCategory = receiverProfile ? (
        (donation.food_category === 'short_term' && receiverProfile.accepts_short_term) ||
        (donation.food_category === 'long_term' && receiverProfile.accepts_long_term)
      ) : false
      const hasCapacity = receiverProfile
        ? receiverProfile.max_capacity_kg == null ||
          Number(receiverProfile.max_capacity_kg) >= Number(donation.quantity_kg)
        : false
      const availableEligible =
        donation.status === 'available' &&
        withinServiceArea &&
        acceptsFoodType &&
        acceptsCondition &&
        acceptsCategory &&
        hasCapacity
      const activeInvitation =
        notification?.response === 'no_response' ||
        notification?.response === 'accepted'

      canViewFull = receiverIsVerified && (!!pickup || activeInvitation || availableEligible)
    }

    if (!canViewFull) return forbidden('You do not have access to this donation')

    const [images, [donorProfile]] = await Promise.all([
      db.select().from(donation_images).where(eq(donation_images.donation_id, id)),
      db
        .select({
          id: donor_profiles.id,
          business_name: donor_profiles.business_name,
          business_type: donor_profiles.business_type,
          city: donor_profiles.city,
          phone: donor_profiles.phone,
          verification_status: donor_profiles.verification_status,
        })
        .from(donor_profiles)
        .where(eq(donor_profiles.id, donation.donor_profile_id)),
    ])

    return ok({
      ...donation,
      donation_images: images,
      donor_profiles: donorProfile ?? null,
    })
  }
)

// ─────────────────────────────────────────────────────────────
// PUT /api/donations/[id]
// ─────────────────────────────────────────────────────────────
export const PUT = withDonor(
  async (req: NextRequest, { profile }, ctx: Ctx) => {
    const { id } = await ctx.params
    const { data: body, error: bodyErr } = await validateBody(req, updateSchema)
    if (bodyErr) return bodyErr

    const [donation] = await db
      .select({ id: donations.id, donor_id: donations.donor_id, status: donations.status })
      .from(donations)
      .where(eq(donations.id, id))

    if (!donation) return notFound('Donation')
    if (donation.donor_id !== profile.id) return forbidden('You can only edit your own donations')
    if (donation.status !== 'available') {
      return err(
        `Cannot edit donation with status "${donation.status}". Only available donations can be updated.`,
        409,
        'WRONG_STATUS',
      )
    }

    const { pickup_latitude, pickup_longitude, expiry_time, quantity_kg, ...rest } = body
    if (expiry_time && new Date(expiry_time) <= new Date()) {
      return err('expiry_time must be in future', 422, 'VALIDATION_ERROR')
    }

    let is_urgent: boolean | undefined
    if (expiry_time) {
      const hoursToExpiry = (new Date(expiry_time).getTime() - Date.now()) / (1000 * 60 * 60)
      is_urgent = hoursToExpiry < 4
    }

    const updatePayload: Record<string, unknown> = {
      ...rest,
      ...(expiry_time && { expiry_time: new Date(expiry_time) }),
      ...(is_urgent !== undefined && { is_urgent }),
      ...(quantity_kg !== undefined && { quantity_kg: String(quantity_kg) }),
      ...(pickup_latitude != null && pickup_longitude != null
        ? { pickup_location: `POINT(${pickup_longitude} ${pickup_latitude})` }
        : {}),
    }

    if (typeof updatePayload.preparation_time === 'string') {
      updatePayload.preparation_time = new Date(updatePayload.preparation_time)
    }
    if (typeof updatePayload.preferred_pickup_time === 'string') {
      updatePayload.preferred_pickup_time = new Date(updatePayload.preferred_pickup_time)
    }

    if (Object.keys(updatePayload).length === 0) {
      return err('No updatable fields provided', 422, 'VALIDATION_ERROR')
    }

    try {
      const [updated] = await db
        .update(donations)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set(updatePayload as any)
        .where(eq(donations.id, id))
        .returning()

      return ok(updated)
    } catch (e) {
      console.error('[PUT /api/donations/[id]]', e)
      return serverError('Failed to update donation')
    }
  }
)

// ─────────────────────────────────────────────────────────────
// DELETE /api/donations/[id]
// ─────────────────────────────────────────────────────────────
export const DELETE = withDonor(
  async (_req: NextRequest, { profile }, ctx: Ctx) => {
    const { id } = await ctx.params

    const [donation] = await db
      .select({ id: donations.id, donor_id: donations.donor_id, status: donations.status })
      .from(donations)
      .where(eq(donations.id, id))

    if (!donation) return notFound('Donation')
    if (donation.donor_id !== profile.id) return forbidden('You can only delete your own donations')

    const deletableStatuses = ['available', 'cancelled']
    if (!deletableStatuses.includes(donation.status)) {
      return err(
        `Cannot delete donation with status "${donation.status}". Cancel it first if it has been accepted.`,
        409,
        'WRONG_STATUS',
      )
    }

    await db.delete(donations).where(eq(donations.id, id))
    return ok({ message: 'Donation deleted successfully', id })
  }
)
