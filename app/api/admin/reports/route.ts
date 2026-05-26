import { withAdmin } from '@/lib/api/auth-guard'
import { db, donations, donor_profiles, receiver_profiles, impact_reports } from '@/lib/db'
import { eq, gte, count, sum } from 'drizzle-orm'
import { ok, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────
// GET /api/admin/reports
//
// Platform-wide impact and activity statistics.
// ─────────────────────────────────────────────────────────────
export const GET = withAdmin(
  async (_req: NextRequest) => {
    try {
      const statuses = [
        'available', 'pending_acceptance', 'accepted',
        'pickup_assigned', 'picked_up', 'delivered',
        'expired', 'cancelled',
      ] as const

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const [
        donationStatusCounts,
        impactTotals,
        recentDonations,
        pendingDonorVerifications,
        pendingReceiverVerifications,
      ] = await Promise.all([
        // Donation counts by status
        Promise.all(
          statuses.map(async s => {
            const [{ total }] = await db
              .select({ total: count() })
              .from(donations)
              .where(eq(donations.status, s))
            return { status: s, count: Number(total) }
          })
        ),

        // Aggregate impact stats
        db
          .select({
            total_meals_saved:   sum(impact_reports.meals_saved),
            total_kg_rescued:    sum(impact_reports.food_waste_reduced_kg),
            total_co2_saved:     sum(impact_reports.co2_impact_kg),
            total_people_served: sum(impact_reports.people_served),
            total_reports:       count(),
          })
          .from(impact_reports),

        // Last 7 days donations count
        db
          .select({ total: count() })
          .from(donations)
          .where(gte(donations.created_at, sevenDaysAgo)),

        // Pending donor verifications
        db
          .select({ total: count() })
          .from(donor_profiles)
          .where(eq(donor_profiles.verification_status, 'pending')),

        // Pending receiver verifications
        db
          .select({ total: count() })
          .from(receiver_profiles)
          .where(eq(receiver_profiles.verification_status, 'pending')),
      ])

      return ok({
        donations_by_status: donationStatusCounts,
        impact:              impactTotals[0] ?? null,
        recent_activity: {
          donations_last_7_days: Number(recentDonations[0]?.total ?? 0),
        },
        pending_verifications: {
          donors:    Number(pendingDonorVerifications[0]?.total ?? 0),
          receivers: Number(pendingReceiverVerifications[0]?.total ?? 0),
        },
        generated_at: new Date().toISOString(),
      })
    } catch (e) {
      console.error('[GET /api/admin/reports]', e)
      return serverError('Failed to load report data')
    }
  }
)
