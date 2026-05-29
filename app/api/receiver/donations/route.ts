import { withReceiver } from '@/lib/api/auth-guard'
import { db, donations, receiver_profiles } from '@/lib/db'
import { eq, and, ilike, inArray, desc, asc, count, sql } from 'drizzle-orm'
import { validateParams, z } from '@/lib/api/validate'
import { ok, err } from '@/lib/api/response'
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

    // Load NGO's profile (location returned as raw WKT for sql joining)
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
        location:        receiver_profiles.location,
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

    // If the NGO has pinned a location, compute distance via PostGIS and sort nearest-first
    // (urgent donations still bubble to the top).
    const hasLocation = receiverProfile.location != null
    const distanceExpr = hasLocation
      ? sql<number>`ST_Distance(${donations.pickup_location}::geography, ${receiverProfile.location}::geography) / 1000`
      : sql<number | null>`NULL`

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          // Include all donation columns + computed distance_km
          id:                  donations.id,
          donor_id:            donations.donor_id,
          donor_profile_id:    donations.donor_profile_id,
          title:               donations.title,
          description:         donations.description,
          food_category:       donations.food_category,
          food_type:           donations.food_type,
          food_condition:      donations.food_condition,
          quantity_kg:         donations.quantity_kg,
          quantity_description: donations.quantity_description,
          serves_approx:       donations.serves_approx,
          preparation_time:    donations.preparation_time,
          expiry_time:         donations.expiry_time,
          pickup_address:      donations.pickup_address,
          pickup_city:         donations.pickup_city,
          pickup_location:     donations.pickup_location,
          pickup_instructions: donations.pickup_instructions,
          contact_number:      donations.contact_number,
          status:              donations.status,
          is_urgent:           donations.is_urgent,
          created_at:          donations.created_at,
          updated_at:          donations.updated_at,
          distance_km:         distanceExpr,
        })
        .from(donations)
        .where(where)
        .orderBy(
          desc(donations.is_urgent),
          hasLocation ? asc(distanceExpr) : asc(donations.expiry_time),
        )
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
