import { withReceiver } from '@/lib/api/auth-guard'
import { db, donations, donation_receiver_notifications, receiver_profiles } from '@/lib/db'
import { and, asc, count, desc, eq, ilike, inArray, sql, type SQL } from 'drizzle-orm'
import { validateParams, z } from '@/lib/api/validate'
import { ok, err } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type FoodType = 'veg' | 'non_veg' | 'vegan'
type FoodCondition = 'cooked' | 'raw' | 'packaged'

const receiverVisibleStatuses = ['available', 'pending_acceptance'] as const

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
  food_type: z.enum(['veg', 'non_veg', 'vegan']).optional(),
  food_condition: z.enum(['cooked', 'raw', 'packaged']).optional(),
  is_urgent: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
})

// ─────────────────────────────────────────────────────────────
// GET /api/receiver/donations
//
// Returns still-claimable donations inside the NGO's saved service radius.
// If either side is missing coordinates, city matching is used as a fallback.
// ─────────────────────────────────────────────────────────────
export const GET = withReceiver(
  async (req: NextRequest, { profile }) => {
    const { data: rawParams, error: paramErr } = validateParams(req, listSchema)
    if (paramErr) return paramErr

    const params = rawParams as {
      page: number
      limit: number
      food_type?: FoodType
      food_condition?: FoodCondition
      is_urgent?: boolean
    }
    const { page, limit, food_type, food_condition, is_urgent } = params
    const offset = (page - 1) * limit

    const [receiverProfile] = await db
      .select({
        city: receiver_profiles.city,
        service_area_km: receiver_profiles.service_area_km,
        accepts_veg: receiver_profiles.accepts_veg,
        accepts_non_veg: receiver_profiles.accepts_non_veg,
        accepts_vegan: receiver_profiles.accepts_vegan,
        accepts_cooked: receiver_profiles.accepts_cooked,
        accepts_raw: receiver_profiles.accepts_raw,
        accepts_packaged: receiver_profiles.accepts_packaged,
        latitude: sql<number | null>`ST_Y(${receiver_profiles.location}::geometry)`,
        longitude: sql<number | null>`ST_X(${receiver_profiles.location}::geometry)`,
      })
      .from(receiver_profiles)
      .where(eq(receiver_profiles.user_id, profile.id))

    if (!receiverProfile) {
      return err('Complete your NGO profile before viewing nearby donations.', 400, 'PROFILE_REQUIRED')
    }

    const acceptedFoodTypes: FoodType[] = []
    if (receiverProfile.accepts_veg) acceptedFoodTypes.push('veg')
    if (receiverProfile.accepts_non_veg) acceptedFoodTypes.push('non_veg')
    if (receiverProfile.accepts_vegan) acceptedFoodTypes.push('vegan')

    const acceptedConditions: FoodCondition[] = []
    if (receiverProfile.accepts_cooked) acceptedConditions.push('cooked')
    if (receiverProfile.accepts_raw) acceptedConditions.push('raw')
    if (receiverProfile.accepts_packaged) acceptedConditions.push('packaged')

    const receiverLat = Number(receiverProfile.latitude)
    const receiverLng = Number(receiverProfile.longitude)
    const radiusKm = Math.max(1, Number(receiverProfile.service_area_km ?? 10))
    const hasReceiverLocation = Number.isFinite(receiverLat) && Number.isFinite(receiverLng)
    const receiverPoint = hasReceiverLocation
      ? sql`ST_SetSRID(ST_MakePoint(${receiverLng}, ${receiverLat}), 4326)::geography`
      : null

    const conditions: SQL[] = [
      sql`(
        ${donations.status} = 'available'
        OR
        (
          ${donations.status} = 'pending_acceptance'
          AND EXISTS (
            SELECT 1
            FROM ${donation_receiver_notifications}
            WHERE ${donation_receiver_notifications.donation_id} = ${donations.id}
              AND ${donation_receiver_notifications.receiver_id} = ${profile.id}
              AND ${donation_receiver_notifications.response} = 'no_response'
          )
        )
      )`,
    ]

    if (receiverPoint) {
      conditions.push(sql`(
        (${donations.pickup_location} IS NOT NULL AND ST_DWithin(${donations.pickup_location}, ${receiverPoint}, ${radiusKm * 1000}))
        OR
        (${donations.pickup_location} IS NULL AND ${donations.pickup_city} ILIKE ${`%${receiverProfile.city}%`})
      )`)
    } else {
      conditions.push(ilike(donations.pickup_city, `%${receiverProfile.city}%`))
    }

    const foodTypeFilter = food_type ? [food_type] : acceptedFoodTypes
    if (foodTypeFilter.length > 0 && foodTypeFilter.length < 3) {
      conditions.push(inArray(donations.food_type, foodTypeFilter))
    }

    const conditionFilter = food_condition ? [food_condition] : acceptedConditions
    if (conditionFilter.length > 0 && conditionFilter.length < 3) {
      conditions.push(inArray(donations.food_condition, conditionFilter))
    }

    if (is_urgent !== undefined) {
      conditions.push(eq(donations.is_urgent, is_urgent))
    }

    const where = and(...conditions)
    const distanceExpr = receiverPoint
      ? sql<number>`ST_Distance(${donations.pickup_location}, ${receiverPoint}) / 1000`
      : sql<number | null>`NULL`

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: donations.id,
          donor_id: donations.donor_id,
          donor_profile_id: donations.donor_profile_id,
          title: donations.title,
          description: donations.description,
          food_category: donations.food_category,
          food_type: donations.food_type,
          food_condition: donations.food_condition,
          quantity_kg: donations.quantity_kg,
          quantity_description: donations.quantity_description,
          serves_approx: donations.serves_approx,
          preparation_time: donations.preparation_time,
          expiry_time: donations.expiry_time,
          pickup_address: donations.pickup_address,
          pickup_city: donations.pickup_city,
          pickup_location: donations.pickup_location,
          pickup_instructions: donations.pickup_instructions,
          contact_number: donations.contact_number,
          status: donations.status,
          is_urgent: donations.is_urgent,
          created_at: donations.created_at,
          updated_at: donations.updated_at,
          distance_km: distanceExpr,
        })
        .from(donations)
        .where(where)
        .orderBy(
          desc(donations.is_urgent),
          receiverPoint ? sql`${distanceExpr} ASC NULLS LAST` : asc(donations.expiry_time),
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
        city_fallback: receiverPoint ? null : receiverProfile.city,
        service_area_km: radiusKm,
        accepted_food_types: acceptedFoodTypes,
        accepted_conditions: acceptedConditions,
        statuses: receiverVisibleStatuses,
      },
    })
  }
)
