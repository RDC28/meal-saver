import { withAuth } from '@/lib/api/auth-guard'
import { db, impact_reports, donations, donation_images } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { ok, notFound, forbidden } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ donationId: string }> }

// ─────────────────────────────────────────────────────────────
// GET /api/impact/[donationId]
// ─────────────────────────────────────────────────────────────
export const GET = withAuth(
  async (_req: NextRequest, { profile }, ctx: Ctx) => {
    const { donationId } = await ctx.params

    const [report] = await db
      .select()
      .from(impact_reports)
      .where(eq(impact_reports.donation_id, donationId))

    if (!report) return notFound('Impact report')

    // Access control: only donor, receiver, or admin
    const isDonor    = report.donor_id    === profile.id
    const isReceiver = report.receiver_id === profile.id
    const isAdmin    = profile.role       === 'admin'

    if (!isDonor && !isReceiver && !isAdmin) {
      return forbidden('You do not have access to this impact report')
    }

    // Load the related donation
    const [donation] = await db
      .select({
        id:             donations.id,
        title:          donations.title,
        food_type:      donations.food_type,
        food_condition: donations.food_condition,
        quantity_kg:    donations.quantity_kg,
        pickup_city:    donations.pickup_city,
        pickup_address: donations.pickup_address,
        created_at:     donations.created_at,
      })
      .from(donations)
      .where(eq(donations.id, donationId))

    const images = donation
      ? await db
          .select({ image_url: donation_images.image_url, is_primary: donation_images.is_primary })
          .from(donation_images)
          .where(eq(donation_images.donation_id, donationId))
      : []

    return ok({
      ...report,
      donations: donation ? { ...donation, donation_images: images } : null,
    })
  }
)
