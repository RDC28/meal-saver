import { withReceiver } from '@/lib/api/auth-guard'
import { db, donations, donation_images, donor_profiles, receiver_profiles } from '@/lib/db'
import { eq, and, ilike, inArray, desc, asc, count } from 'drizzle-orm'
import { validateParams, z } from '@/lib/api/validate'
import { ok, err, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

const listSchema = z.object({
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
  food_type:      z.enum(['veg', 'non_veg', 'vegan']).optional(),
  food_condition: z.enum(['cooked', 'raw', 'packaged']).optional(),
  is_urgent:      z.enum(['true', 'false']).transform(v => v === 'true').optional(),
})

// ─────────────────────────────────────────────────────────────
// GET /api/receiver/donations
//
// Returns available donations matched to the NGO's city and food preferences.
// ─────────────────────────────────────────────────────────────
export const GET = withReceiver(
  async (req: NextRequest, { profile }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawParams, error: paramErr } = validateParams(req, listSchema as any)
    if (paramErr) return paramErr as Response
    const params = rawParams as { page: number; limit: number; food_type?: string; food_condition?: string; is_urgent?: boolean }

    const { page, limit, food_type, food_condition, is_urgent } = params
    const offset = (page - 1) * limit

    // Load NGO's profile
    const [receiverProfile] = await db
      .select({
        city:           receiver_profiles.city,
        accepts_veg:    receiver_profiles.accepts_veg,
        accepts_non_veg: receiver_profiles.accepts_non_veg,
        accepts_vegan:  receiver_profiles.accepts_vegan,
        accepts_cooked: receiver_profiles.accepts_cooked,
        accepts_raw:    receiver_profiles.accepts_raw,
        accepts_packaged: receiver_profiles.accepts_packaged,
        service_area_km: receiver_profiles.service_area_km,
      })
      .from(receiver_profiles)
      .where(eq(receiver_profiles.user_id, profile.id))

    if (!receiverProfile) {
      return err('Please complete your receiver profile first.', 400, 'PROFILE_REQUIRED')
    }

    // Build accepted food type/condition filter lists
    const acceptedFoodTypes: string[] = []
    if (receiverProfile.accepts_veg)     acceptedFoodTypes.push('veg')
    if (receiverProfile.accepts_non_veg) acceptedFoodTypes.push('non_veg')
    if (receiverProfile.accepts_vegan)   acceptedFoodTypes.push('vegan')

    const acceptedConditions: string[] = []
    if (receiverProfile.accepts_cooked)   acceptedConditions.push('cooked')
    if (receiverProfile.accepts_raw)      acceptedConditions.push('raw')
    if (receiverProfile.accepts_packaged) acceptedConditions.push('packaged')

    // Build where conditions
    const conditions = [
      eq(donations.status, 'available'),
      ilike(donations.pickup_city, `%${receiverProfile.city}%`),
    ]

    // Filter by accepted food types (only if not accepting all)
    const foodTypeFilter = food_type ? [food_type] : acceptedFoodTypes
    if (foodTypeFilter.length > 0 && foodTypeFilter.length < 3) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conditions.push(inArray(donations.food_type, foodTypeFilter as any))
    }

    const conditionFilter = food_condition ? [food_condition] : acceptedConditions
    if (conditionFilter.length > 0 && conditionFilter.length < 3) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conditions.push(inArray(donations.food_condition, conditionFilter as any))
    }

    if (is_urgent !== undefined) {
      conditions.push(eq(donations.is_urgent, is_urgent))
    }

    const where = and(...conditions)

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

    return ok({
      donations: rows,
      pagination: {
        page,
        limit,
        total: Number(total),
        pages: Math.ceil(Number(total) / limit),
      },
      filters_applied: {
        city:                  receiverProfile.city,
        accepted_food_types:   acceptedFoodTypes,
        accepted_conditions:   acceptedConditions,
      },
    })
  }
)
