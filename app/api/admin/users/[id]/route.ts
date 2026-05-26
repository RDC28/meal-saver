import { withAdmin } from '@/lib/api/auth-guard'
import { db, users, donor_profiles, receiver_profiles, donations } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { ok, notFound } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

// ─────────────────────────────────────────────────────────────
// GET /api/admin/users/[id]
// ─────────────────────────────────────────────────────────────
export const GET = withAdmin(
  async (_req: NextRequest, _auth, ctx: Ctx) => {
    const { id } = await ctx.params

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))

    if (!user) return notFound('User')

    const [donorProfile, receiverProfile, recentDonations] = await Promise.all([
      db.select().from(donor_profiles).where(eq(donor_profiles.user_id, id)),
      db.select().from(receiver_profiles).where(eq(receiver_profiles.user_id, id)),
      db
        .select({
          id:          donations.id,
          title:       donations.title,
          status:      donations.status,
          created_at:  donations.created_at,
          pickup_city: donations.pickup_city,
        })
        .from(donations)
        .where(eq(donations.donor_id, id))
        .orderBy(desc(donations.created_at))
        .limit(10),
    ])

    return ok({
      ...user,
      donor_profiles:    donorProfile,
      receiver_profiles: receiverProfile,
      recent_donations:  recentDonations,
    })
  }
)
