import { withAuth, withDonor } from '@/lib/api/auth-guard'
import { db, donations, donation_images, donor_profiles } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { validateBody, z } from '@/lib/api/validate'
import { ok, err, notFound, forbidden, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────

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

type Ctx = { params: Promise<{ id: string }> }

// ─────────────────────────────────────────────────────────────
// GET /api/donations/[id]
// ─────────────────────────────────────────────────────────────
export const GET = withAuth(
  async (_req: NextRequest, _auth, ctx: Ctx) => {
    const { id } = await ctx.params

    const [donation] = await db
      .select()
      .from(donations)
      .where(eq(donations.id, id))

    if (!donation) return notFound('Donation')

    const [images, [donorProfile]] = await Promise.all([
      db.select().from(donation_images).where(eq(donation_images.donation_id, id)),
      db
        .select({
          id:                  donor_profiles.id,
          business_name:       donor_profiles.business_name,
          business_type:       donor_profiles.business_type,
          city:                donor_profiles.city,
          phone:               donor_profiles.phone,
          verification_status: donor_profiles.verification_status,
        })
        .from(donor_profiles)
        .where(eq(donor_profiles.id, donation.donor_profile_id)),
    ])

    return ok({ ...donation, donation_images: images, donor_profiles: donorProfile ?? null })
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

    if (donation.donor_id !== profile.id) {
      return forbidden('You can only edit your own donations')
    }

    if (donation.status !== 'available') {
      return err(
        `Cannot edit a donation with status "${donation.status}". Only available donations can be updated.`,
        409,
        'WRONG_STATUS'
      )
    }

    const { pickup_latitude, pickup_longitude, expiry_time, quantity_kg, ...rest } = body

    if (expiry_time && new Date(expiry_time) <= new Date()) {
      return err('expiry_time must be in the future', 422, 'VALIDATION_ERROR')
    }

    let is_urgent: boolean | undefined
    if (expiry_time) {
      const hoursToExpiry =
        (new Date(expiry_time).getTime() - Date.now()) / (1000 * 60 * 60)
      is_urgent = hoursToExpiry < 4
    }

    const locationUpdate: { pickup_location?: string } = {}
    if (pickup_latitude != null && pickup_longitude != null) {
      locationUpdate.pickup_location = `POINT(${pickup_longitude} ${pickup_latitude})`
    }

    const updatePayload: Record<string, unknown> = {
      ...rest,
      ...(expiry_time && { expiry_time: new Date(expiry_time) }),
      ...(is_urgent !== undefined && { is_urgent }),
      ...(quantity_kg !== undefined && { quantity_kg: String(quantity_kg) }),
      ...locationUpdate,
    }
    // Convert any remaining datetime strings to Date objects
    if (typeof updatePayload.preparation_time === 'string') {
      updatePayload.preparation_time = new Date(updatePayload.preparation_time as string)
    }
    if (typeof updatePayload.preferred_pickup_time === 'string') {
      updatePayload.preferred_pickup_time = new Date(updatePayload.preferred_pickup_time as string)
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

    if (donation.donor_id !== profile.id) {
      return forbidden('You can only delete your own donations')
    }

    const deletableStatuses = ['available', 'cancelled']
    if (!deletableStatuses.includes(donation.status)) {
      return err(
        `Cannot delete a donation with status "${donation.status}". Cancel it first if it's been accepted.`,
        409,
        'WRONG_STATUS'
      )
    }

    // Delete the donation (images cascade via FK)
    await db.delete(donations).where(eq(donations.id, id))

    return ok({ message: 'Donation deleted successfully', id })
  }
)
