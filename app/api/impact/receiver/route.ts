import { withReceiver } from '@/lib/api/auth-guard'
import { db, impact_reports } from '@/lib/db'
import { eq, desc, sql } from 'drizzle-orm'
import { ok, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────
// GET /api/impact/receiver
//
// Returns the logged-in NGO's cumulative impact summary.
// ─────────────────────────────────────────────────────────────
export const GET = withReceiver(
  async (_req: NextRequest, { profile }) => {
    // Call DB function
    let summary: unknown
    try {
      const result = await db.execute(
        sql`SELECT * FROM get_receiver_impact_summary(${profile.id}::uuid)`
      )
      summary = result.rows[0] ?? null
    } catch (e) {
      console.error('[GET /api/impact/receiver] RPC error:', e)
      return serverError('Failed to load impact summary.')
    }

    // Recent impact reports
    const recentReports = await db
      .select({
        id:                    impact_reports.id,
        meals_saved:           impact_reports.meals_saved,
        food_waste_reduced_kg: impact_reports.food_waste_reduced_kg,
        co2_impact_kg:         impact_reports.co2_impact_kg,
        people_served:         impact_reports.people_served,
        report_generated_at:   impact_reports.report_generated_at,
        donation_id:           impact_reports.donation_id,
      })
      .from(impact_reports)
      .where(eq(impact_reports.receiver_id, profile.id))
      .orderBy(desc(impact_reports.report_generated_at))
      .limit(5)

    return ok({
      summary,
      recent_reports: recentReports,
    })
  }
)
