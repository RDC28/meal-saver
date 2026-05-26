import { withAuth, withDonor } from '@/lib/api/auth-guard'
import {
  db, donations, donation_images, donor_profiles,
  donationStatusEnum, foodCategoryEnum, foodTypeEnum, foodConditionEnum,
} from '@/lib/db'
import { eq, and, ilike, inArray, desc, asc, count, sql } from 'drizzle-orm'

type DonationStatus  = typeof donationStatusEnum.enumValues[number]
type FoodCategory    = typeof foodCategoryEnum.enumValues[number]
type FoodType        = typeof foodTypeEnum.enumValues[number]
type FoodCondition   = typeof foodConditionEnum.enumValues[number]
import { validateBody, validateParams, z } from '@/lib/api/validate'
import { ok, created, err, serverError } from '@/lib/api/response'
import { runDonationMatch } from '@/lib/donation-matching'
import { fireAndForget } from '@/lib/queue'
import { logger } from '@/lib/logger'
import { DONATION } from '@/lib/constants'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────

const createSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(3, 'Title must be at least 3 characters')
    .max(120),
  description: z.string().max(1000).optional(),

  food_category: z.enum(['short_term', 'long_term'], {
    required_error: 'food_category is required (short_term | long_term)',
  }),
  food_type: z.enum(['veg', 'non_veg', 'vegan'], {
    required_error: 'food_type is required (veg | non_veg | vegan)',
  }),
  food_condition: z.enum(['cooked', 'raw', 'packaged'], {
    required_error: 'food_condition is required (cooked | raw | packaged)',
  }),

  quantity_kg: z
    .number({ required_error: 'quantity_kg is required' })
    .positive('quantity_kg must be positive')
    .max(10000),
  quantity_description: z.string().max(200).optional(),
  serves_approx: z.number().int().positive().optional(),

  preparation_time: z.string().datetime({ offset: true }).optional(),
  expiry_time: z
    .string({ required_error: 'expiry_time is required' })
    .datetime({ offset: true }),
  preferred_pickup_time: z.string().datetime({ offset: true }).optional(),

  pickup_address: z
    .string({ required_error: 'pickup_address is required' })
    .min(5),
  pickup_city: z
    .string({ required_error: 'pickup_city is required' })
    .min(2),
  pickup_latitude: z.number().min(-90).max(90).optional(),
  pickup_longitude: z.number().min(-180).max(180).optional(),
  pickup_instructions: z.string().max(500).optional(),

  contact_number: z
    .string({ required_error: 'contact_number is required' })
    .regex(/^\+?[0-9\s\-()]{7,20}$/, 'Invalid contact number format'),
})

const listSchema = z.object({
  status: z
    .enum([
      'available', 'pending_acceptance', 'accepted',
      'pickup_assigned', 'picked_up', 'delivered',
      'expired', 'cancelled', 'rejected', 'unsafe',
    ])
    .optional(),
  city: z.string().optional(),
  food_category: z.enum(['short_term', 'long_term']).optional(),
  food_type: z.enum(['veg', 'non_veg', 'vegan']).optional(),
  food_condition: z.enum(['cooked', 'raw', 'packaged']).optional(),
  is_urgent: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default('1'),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .default('20'),
  my: z
    .enum(['true', 'false'])
    .transform(v => v === 'true')
    .optional(),
})

// ─────────────────────────────────────────────────────────────
// GET /api/donations
// ─────────────────────────────────────────────────────────────
export const GET = withAuth(async (req: NextRequest, { profile }) => {
  const { data: params, error: paramError } = validateParams(req, listSchema)
  if (paramError) return paramError as Response

  const { status, city, food_category, food_type, food_condition, is_urgent, page, limit, my } = params
  const offset = (page - 1) * limit

  const conditions = []

  // Role-specific defaults
  if (my || profile.role === 'donor') {
    conditions.push(eq(donations.donor_id, profile.id))
  } else if (profile.role === 'receiver' && !status) {
    conditions.push(eq(donations.status, 'available'))
  }

  if (status)         conditions.push(eq(donations.status,         status         as DonationStatus))
  if (city)           conditions.push(ilike(donations.pickup_city, `%${city}%`))
  if (food_category)  conditions.push(eq(donations.food_category,  food_category  as FoodCategory))
  if (food_type)      conditions.push(eq(donations.food_type,      food_type      as FoodType))
  if (food_condition) conditions.push(eq(donations.food_condition, food_condition as FoodCondition))
  if (is_urgent !== undefined) conditions.push(eq(donations.is_urgent, is_urgent))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(donations)
      .where(where)
      .orderBy(desc(donations.is_urgent), asc(donations.expiry_time))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(donations).where(where),
  ])

  // Fetch images for each donation
  const donationIds = rows.map(d => d.id)
  const images = donationIds.length > 0
    ? await db
        .select()
        .from(donation_images)
        .where(inArray(donation_images.donation_id, donationIds))
    : []

  // Fetch donor profiles
  const donorProfileIds = [...new Set(rows.map(d => d.donor_profile_id))]
  const donorProfiles = donorProfileIds.length > 0
    ? await db
        .select({
          id:            donor_profiles.id,
          business_name: donor_profiles.business_name,
          business_type: donor_profiles.business_type,
          city:          donor_profiles.city,
        })
        .from(donor_profiles)
        .where(inArray(donor_profiles.id, donorProfileIds))
    : []

  const enriched = rows.map(d => ({
    ...d,
    donation_images:  images.filter(img => img.donation_id === d.id),
    donor_profiles:   donorProfiles.find(dp => dp.id === d.donor_profile_id) ?? null,
  }))

  return ok({
    donations: enriched,
    pagination: {
      page,
      limit,
      total: Number(total),
      pages: Math.ceil(Number(total) / limit),
    },
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/donations
// ─────────────────────────────────────────────────────────────
export const POST = withDonor(async (req: NextRequest, { profile }) => {
  const { data, error } = await validateBody(req, createSchema)
  if (error) return error

  // Ensure donor has a profile
  const [donorProfile] = await db
    .select({ id: donor_profiles.id })
    .from(donor_profiles)
    .where(eq(donor_profiles.user_id, profile.id))

  if (!donorProfile) {
    return err(
      'You must complete your donor profile before posting a donation.',
      400,
      'PROFILE_REQUIRED'
    )
  }

  // Validate expiry time is in the future
  if (new Date(data.expiry_time) <= new Date()) {
    return err('expiry_time must be in the future', 422, 'VALIDATION_ERROR')
  }

  const { pickup_latitude, pickup_longitude, ...rest } = data

  const pickup_location =
    pickup_latitude != null && pickup_longitude != null
      ? `POINT(${pickup_longitude} ${pickup_latitude})`
      : null

  const hoursToExpiry =
    (new Date(data.expiry_time).getTime() - Date.now()) / (1000 * 60 * 60)
  const is_urgent = hoursToExpiry < DONATION.URGENT_HOURS_THRESHOLD

  try {
    const [donation] = await db
      .insert(donations)
      .values({
        title:                data.title,
        description:          data.description ?? null,
        food_category:        data.food_category,
        food_type:            data.food_type,
        food_condition:       data.food_condition,
        quantity_kg:          String(data.quantity_kg),
        quantity_description: data.quantity_description ?? null,
        serves_approx:        data.serves_approx ?? null,
        preparation_time:     data.preparation_time ? new Date(data.preparation_time) : undefined,
        expiry_time:          new Date(data.expiry_time),
        preferred_pickup_time: data.preferred_pickup_time ? new Date(data.preferred_pickup_time) : undefined,
        pickup_address:       data.pickup_address,
        pickup_city:          data.pickup_city,
        pickup_instructions:  data.pickup_instructions ?? null,
        contact_number:       data.contact_number,
        donor_id:             profile.id,
        donor_profile_id:     donorProfile.id,
        pickup_location:      pickup_location ?? undefined,
        is_urgent,
        status:               'available',
      })
      .returning()

    // Kick off NGO matching in the background — non-fatal
    if (donation) {
      fireAndForget(
        () => runDonationMatch(donation.id, donation.pickup_city),
        'POST /api/donations [matching]'
      )
    }

    return created({
      ...donation,
      message: 'Donation listed successfully. NGOs in your area will be notified.',
    })
  } catch (e) {
    logger.error('POST /api/donations', 'Failed to create donation', e)
    return serverError('Failed to create donation')
  }
})
