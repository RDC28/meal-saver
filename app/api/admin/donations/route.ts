import { withAdmin } from '@/lib/api/auth-guard'
import { db, donations, donation_images, donor_profiles, users } from '@/lib/db'
import { eq, ilike, and, desc, count } from 'drizzle-orm'
import { validateParams, z } from '@/lib/api/validate'
import { ok, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

const listSchema = z.object({
  status: z
    .enum([
      'available', 'pending_acceptance', 'accepted',
      'pickup_assigned', 'picked_up', 'delivered',
      'expired', 'cancelled', 'rejected', 'unsafe',
    ])
    .optional(),
  city:     z.string().optional(),
  food_type: z.enum(['veg', 'non_veg', 'vegan']).optional(),
  donor_id: z.string().uuid().optional(),
  page:     z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit:    z.string().regex(/^\d+$/).transform(Number).default('25'),
})

// ─────────────────────────────────────────────────────────────
// GET /api/admin/donations
// ─────────────────────────────────────────────────────────────
export const GET = withAdmin(
  async (req: NextRequest) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawParams, error: paramErr } = validateParams(req, listSchema as any)
    if (paramErr) return paramErr as Response
    const params = rawParams as { status?: string; city?: string; food_type?: string; donor_id?: string; page: number; limit: number }

    const { status, city, food_type, donor_id, page, limit } = params
    const offset = (page - 1) * limit

    const conditions = []
    /* eslint-disable @typescript-eslint/no-explicit-any */
    if (status)    conditions.push(eq(donations.status,    status    as any))
    if (city)      conditions.push(ilike(donations.pickup_city, `%${city}%`))
    if (food_type) conditions.push(eq(donations.food_type, food_type as any))
    if (donor_id)  conditions.push(eq(donations.donor_id, donor_id))
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const where = conditions.length > 0 ? and(...conditions) : undefined

    try {
      const [rows, [{ total }]] = await Promise.all([
        db
          .select()
          .from(donations)
          .where(where)
          .orderBy(desc(donations.created_at))
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
      })
    } catch (e) {
      console.error('[GET /api/admin/donations]', e)
      return serverError('Failed to load donations')
    }
  }
)
