import { withDonorOrAdmin } from '@/lib/api/auth-guard'
import { db, donations } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { runDonationMatch } from '@/lib/donation-matching'
import { ok, err, notFound, forbidden, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

// ─────────────────────────────────────────────────────────────
// POST /api/donations/[id]/match
// ─────────────────────────────────────────────────────────────
export const POST = withDonorOrAdmin(
  async (_req: NextRequest, { profile }, ctx: Ctx) => {
    const { id: donationId } = await ctx.params

    const [donation] = await db
      .select({
        id:          donations.id,
        donor_id:    donations.donor_id,
        status:      donations.status,
        pickup_city: donations.pickup_city,
      })
      .from(donations)
      .where(eq(donations.id, donationId))

    if (!donation) return notFound('Donation')

    if (profile.role !== 'admin' && donation.donor_id !== profile.id) {
      return forbidden('You can only match your own donations')
    }

    if (donation.status !== 'available') {
      return err(
        `Donation status is "${donation.status}". Only available donations can be matched.`,
        409,
        'WRONG_STATUS'
      )
    }

    const result = await runDonationMatch(donationId, donation.pickup_city)

    if (result.error) {
      return serverError('Matching algorithm failed.')
    }

    if (result.matched === 0) {
      return err(
        "No nearby verified NGOs found for this donation. Try again later or contact support.",
        404,
        'NO_MATCHES'
      )
    }

    const [updated] = await db
      .select({ id: donations.id, status: donations.status })
      .from(donations)
      .where(eq(donations.id, donationId))

    return ok({
      donation:          updated,
      matched_receivers: result.matched,
      message:           `${result.matched} NGO${result.matched !== 1 ? 's' : ''} notified. Waiting for acceptance.`,
    })
  }
)
