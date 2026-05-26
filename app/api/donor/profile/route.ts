import { withDonor } from '@/lib/api/auth-guard'
import { db, donor_profiles } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { validateBody, z } from '@/lib/api/validate'
import { ok, created, conflict, notFound, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────

const businessTypes = [
  'restaurant', 'bakery', 'cafe', 'caterer',
  'supermarket', 'vegetable_vendor', 'individual', 'grocery', 'other',
] as const

const createSchema = z.object({
  business_name: z
    .string({ required_error: 'Business name is required' })
    .min(2, 'Business name must be at least 2 characters')
    .max(100),
  business_type: z.enum(businessTypes, {
    required_error: 'Business type is required',
    invalid_type_error: `Business type must be one of: ${businessTypes.join(', ')}`,
  }),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, 'Invalid phone number format')
    .optional(),
  address: z
    .string({ required_error: 'Address is required' })
    .min(5, 'Please enter a full address'),
  city: z
    .string({ required_error: 'City is required' })
    .min(2),
  state: z.string().optional(),
  pincode: z
    .string()
    .regex(/^[0-9]{5,10}$/, 'Invalid pincode')
    .optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  food_license_number: z.string().optional(),
  gst_number: z.string().optional(),
})

const updateSchema = createSchema.partial()

// ─────────────────────────────────────────────────────────────
// GET /api/donor/profile
// ─────────────────────────────────────────────────────────────
export const GET = withDonor(async (_req: NextRequest, { profile }) => {
  const [data] = await db
    .select()
    .from(donor_profiles)
    .where(eq(donor_profiles.user_id, profile.id))

  if (!data) return notFound('Donor profile')

  return ok(data)
})

// ─────────────────────────────────────────────────────────────
// POST /api/donor/profile
// ─────────────────────────────────────────────────────────────
export const POST = withDonor(async (req: NextRequest, { profile }) => {
  const { data, error } = await validateBody(req, createSchema)
  if (error) return error

  // Prevent creating a duplicate profile
  const [existing] = await db
    .select({ id: donor_profiles.id })
    .from(donor_profiles)
    .where(eq(donor_profiles.user_id, profile.id))

  if (existing) {
    return conflict('Donor profile already exists. Use PUT to update it.')
  }

  const { latitude, longitude, ...rest } = data

  const location =
    latitude != null && longitude != null
      ? `POINT(${longitude} ${latitude})`
      : null

  try {
    const [newProfile] = await db
      .insert(donor_profiles)
      .values({
        ...rest,
        user_id:  profile.id,
        location: location ?? undefined,
      })
      .returning()

    return created({
      ...newProfile,
      message: 'Profile created. Your account is pending verification by the MealSaver team.',
    })
  } catch (e) {
    console.error('[POST /api/donor/profile]', e)
    return serverError('Failed to create profile')
  }
})

// ─────────────────────────────────────────────────────────────
// PUT /api/donor/profile
// ─────────────────────────────────────────────────────────────
export const PUT = withDonor(async (req: NextRequest, { profile }) => {
  const { data, error } = await validateBody(req, updateSchema)
  if (error) return error

  if (Object.keys(data).length === 0) {
    return serverError('No fields provided to update')
  }

  const { latitude, longitude, ...rest } = data

  const locationUpdate: { location?: string } = {}
  if (latitude != null && longitude != null) {
    locationUpdate.location = `POINT(${longitude} ${latitude})`
  }

  const updatePayload = { ...rest, ...locationUpdate }

  try {
    const [updated] = await db
      .update(donor_profiles)
      .set(updatePayload)
      .where(eq(donor_profiles.user_id, profile.id))
      .returning()

    if (!updated) {
      return notFound('Donor profile — create it first with POST /api/donor/profile')
    }

    return ok(updated)
  } catch (e) {
    console.error('[PUT /api/donor/profile]', e)
    return serverError('Failed to update profile')
  }
})
