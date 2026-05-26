import { withAdmin } from '@/lib/api/auth-guard'
import { db, users, donor_profiles, receiver_profiles } from '@/lib/db'
import { eq, or, ilike, desc, count, and } from 'drizzle-orm'
import { validateParams, z } from '@/lib/api/validate'
import { ok, serverError } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import type { NextRequest } from 'next/server'

const listSchema = z.object({
  role:                z.enum(['donor', 'receiver', 'admin', 'delivery_partner']).optional(),
  verification_status: z.enum(['pending', 'verified', 'rejected', 'suspended']).optional(),
  city:                z.string().optional(),
  search:              z.string().optional(),
  page:                z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit:               z.string().regex(/^\d+$/).transform(Number).default('25'),
})

// ─────────────────────────────────────────────────────────────
// GET /api/admin/users
//
// Uses LEFT JOINs so city/verification_status filtering and
// pagination totals are computed entirely in SQL (no post-filter JS).
// ─────────────────────────────────────────────────────────────
export const GET = withAdmin(
  async (req: NextRequest) => {
    const { data: params, error: paramErr } = validateParams(req, listSchema)
    if (paramErr) return paramErr as Response

    const { role, verification_status, city, search, page, limit } = params
    const offset = (page - 1) * limit

    try {
      const conditions = []

      if (role) {
        conditions.push(eq(users.role, role as 'donor' | 'receiver' | 'admin' | 'delivery_partner'))
      }
      if (search) {
        conditions.push(
          or(
            ilike(users.full_name, `%${search}%`),
            ilike(users.email, `%${search}%`)
          )!
        )
      }
      if (city) {
        conditions.push(
          or(
            ilike(donor_profiles.city, `%${city}%`),
            ilike(receiver_profiles.city, `%${city}%`)
          )!
        )
      }
      if (verification_status) {
        conditions.push(
          or(
            eq(donor_profiles.verification_status, verification_status as 'pending' | 'verified' | 'rejected' | 'suspended'),
            eq(receiver_profiles.verification_status, verification_status as 'pending' | 'verified' | 'rejected' | 'suspended')
          )!
        )
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined

      const [rows, [{ total }]] = await Promise.all([
        db
          .select({
            id:         users.id,
            email:      users.email,
            full_name:  users.full_name,
            phone:      users.phone,
            avatar_url: users.avatar_url,
            role:       users.role,
            is_active:  users.is_active,
            clerk_id:   users.clerk_id,
            created_at: users.created_at,
            updated_at: users.updated_at,
            // Donor profile (null when user has no donor profile)
            dp_id:                  donor_profiles.id,
            dp_business_name:       donor_profiles.business_name,
            dp_business_type:       donor_profiles.business_type,
            dp_city:                donor_profiles.city,
            dp_verification_status: donor_profiles.verification_status,
            dp_verified_at:         donor_profiles.verified_at,
            // Receiver profile (null when user has no receiver profile)
            rp_id:                  receiver_profiles.id,
            rp_organization_name:   receiver_profiles.organization_name,
            rp_organization_type:   receiver_profiles.organization_type,
            rp_city:                receiver_profiles.city,
            rp_verification_status: receiver_profiles.verification_status,
            rp_verified_at:         receiver_profiles.verified_at,
          })
          .from(users)
          .leftJoin(donor_profiles,    eq(donor_profiles.user_id,    users.id))
          .leftJoin(receiver_profiles, eq(receiver_profiles.user_id, users.id))
          .where(where)
          .orderBy(desc(users.created_at))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: count() })
          .from(users)
          .leftJoin(donor_profiles,    eq(donor_profiles.user_id,    users.id))
          .leftJoin(receiver_profiles, eq(receiver_profiles.user_id, users.id))
          .where(where),
      ])

      // Reshape flat JOIN rows into the nested profile format the API contract promises
      const enriched = rows.map(row => ({
        id:         row.id,
        email:      row.email,
        full_name:  row.full_name,
        phone:      row.phone,
        avatar_url: row.avatar_url,
        role:       row.role,
        is_active:  row.is_active,
        clerk_id:   row.clerk_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        donor_profiles: row.dp_id ? [{
          id:                  row.dp_id,
          user_id:             row.id,
          business_name:       row.dp_business_name,
          business_type:       row.dp_business_type,
          city:                row.dp_city,
          verification_status: row.dp_verification_status,
          verified_at:         row.dp_verified_at,
        }] : [],
        receiver_profiles: row.rp_id ? [{
          id:                  row.rp_id,
          user_id:             row.id,
          organization_name:   row.rp_organization_name,
          organization_type:   row.rp_organization_type,
          city:                row.rp_city,
          verification_status: row.rp_verification_status,
          verified_at:         row.rp_verified_at,
        }] : [],
      }))

      return ok({
        users: enriched,
        pagination: {
          page,
          limit,
          total: Number(total),
          pages: Math.ceil(Number(total) / limit),
        },
      })
    } catch (e) {
      logger.error('GET /api/admin/users', 'Failed to load users', e)
      return serverError('Failed to load users')
    }
  }
)
