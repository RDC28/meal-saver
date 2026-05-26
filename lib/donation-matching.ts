import { db, donations, donation_receiver_notifications, notifications } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'
import { fireAndForget } from './queue'
import { logger } from './logger'

type MatchResult = { matched: number; error?: string }

export async function runDonationMatch(donationId: string, pickupCity: string): Promise<MatchResult> {
  try {
    const result = await db.execute(
      sql`SELECT * FROM find_nearby_receivers(${donationId}::uuid)`
    )
    const matches = result.rows as {
      receiver_id: string
      user_id: string
      organization_name: string
      distance_km: number
    }[]

    if (!matches || matches.length === 0) {
      return { matched: 0 }
    }

    await db
      .insert(donation_receiver_notifications)
      .values(matches.map(m => ({
        donation_id: donationId,
        receiver_id: m.receiver_id,
        response:    'no_response' as const,
      })))
      .onConflictDoNothing()

    await db
      .update(donations)
      .set({ status: 'pending_acceptance' })
      .where(eq(donations.id, donationId))

    // Notify receivers — non-critical, run in background
    fireAndForget(
      () => db.insert(notifications).values(
        matches.map(m => ({
          user_id:             m.user_id,
          type:                'donation_available' as const,
          title:               'New donation available near you!',
          message:             `A food donation is available for pickup in ${pickupCity}. Act quickly!`,
          related_donation_id: donationId,
        }))
      ),
      '[runDonationMatch] notify receivers'
    )

    return { matched: matches.length }
  } catch (e) {
    logger.error('[runDonationMatch]', 'Matching failed', e)
    return { matched: 0, error: String(e) }
  }
}
