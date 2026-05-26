import { withReceiver } from '@/lib/api/auth-guard'
import { db, receiver_profiles } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { validateBody, z } from '@/lib/api/validate'
import { ok, created, conflict, notFound, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────

const organizationTypes = [
  'ngo', 'shelter', 'orphanage', 'community_kitchen',
  'animal_shelter', 'feeding_program', 'other',
] as const

const createSchema = z.object({
  organization_name: z
    .string({ required_error: 'Organization name is required' })
    .min(2, 'Organization name must be at least 2 characters')
    .max(150),
  organization_type: z.enum(organizationTypes, {
    required_error: 'Organization type is required',
    invalid_type_error: `Organization type must be one of: ${organizationTypes.join(', ')}`,
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
  service_area_km: z
    .number()
    .int()
    .min(1, 'Service area must be at least 1 km')
    .max(100, 'Service area cannot exceed 100 km')
    .default(10),
  max_capacity_kg: z
    .number()
    .positive('Capacity must be a positive number')
    .optional(),
  accepts_veg:         z.boolean().default(true),
  accepts_non_veg:     z.boolean().default(false),
  accepts_vegan:       z.boolean().default(true),
  accepts_cooked:      z.boolean().default(true),
  accepts_raw:         z.boolean().default(true),
  accepts_packaged:    z.boolean().default(true),
  accepts_short_term:  z.boolean().default(true),
  accepts_long_term:   z.boolean().default(true),
  registration_number: z.string().optional(),
})

const updateSchema = createSchema.partial()

// ─────────────────────────────────────────────────────────────
// GET /api/receiver/profile
// ─────────────────────────────────────────────────────────────
export const GET = withReceiver(async (_req: NextRequest, { profile }) => {
  const [data] = await db
    .select()
    .from(receiver_profiles)
    .where(eq(receiver_profiles.user_id, profile.id))

  if (!data) return notFound('Receiver profile')

  return ok(data)
})

// ─────────────────────────────────────────────────────────────
// POST /api/receiver/profile
// ─────────────────────────────────────────────────────────────
export const POST = withReceiver(async (req: NextRequest, { profile }) => {
  const { data, error } = await validateBody(req, createSchema)
  if (error) return error

  // Prevent duplicates
  const [existing] = await db
    .select({ id: receiver_profiles.id })
    .from(receiver_profiles)
    .where(eq(receiver_profiles.user_id, profile.id))

  if (existing) {
    return conflict('Receiver profile already exists. Use PUT to update it.')
  }

  const { latitude, longitude, max_capacity_kg, ...rest } = data

  const location =
    latitude != null && longitude != null
      ? `POINT(${longitude} ${latitude})`
      : null

  try {
    const [newProfile] = await db
      .insert(receiver_profiles)
      .values({
        ...rest,
        user_id:         profile.id,
        location:        location ?? undefined,
        max_capacity_kg: max_capacity_kg != null ? String(max_capacity_kg) : undefined,
      })
      .returning()

    return created({
      ...newProfile,
      message: 'Profile created. Your organisation is pending verification by the MealSaver team.',
    })
  } catch (e) {
    console.error('[POST /api/receiver/profile]', e)
    return serverError('Failed to create profile')
  }
})

// ─────────────────────────────────────────────────────────────
// PUT /api/receiver/profile
// ─────────────────────────────────────────────────────────────
export const PUT = withReceiver(async (req: NextRequest, { profile }) => {
  const { data, error } = await validateBody(req, updateSchema)
  if (error) return error

  if (Object.keys(data).length === 0) {
    return serverError('No fields provided to update')
  }

  const { latitude, longitude, max_capacity_kg, ...rest } = data

  const locationUpdate: { location?: string } = {}
  if (latitude != null && longitude != null) {
    locationUpdate.location = `POINT(${longitude} ${latitude})`
  }

  const updatePayload = {
    ...rest,
    ...locationUpdate,
    ...(max_capacity_kg != null ? { max_capacity_kg: String(max_capacity_kg) } : {}),
  }

  try {
    const [updated] = await db
      .update(receiver_profiles)
      .set(updatePayload)
      .where(eq(receiver_profiles.user_id, profile.id))
      .returning()

    if (!updated) {
      return notFound('Receiver profile — create it first with POST /api/receiver/profile')
    }

    return ok(updated)
  } catch (e) {
    console.error('[PUT /api/receiver/profile]', e)
    return serverError('Failed to update profile')
  }
})
