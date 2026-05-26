import { db, donations, notifications } from '@/lib/db'
import { eq, and, lt, inArray, sql } from 'drizzle-orm'
import { ok, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

// GET /api/cron/expire-donations
// Called by Vercel Cron every 15 minutes.
// Marks stale donations expired and notifies donors.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Find donations to expire
    const toExpire = await db
      .select({ id: donations.id, donor_id: donations.donor_id, title: donations.title })
      .from(donations)
      .where(
        and(
          inArray(donations.status, ['available', 'pending_acceptance']),
          lt(donations.expiry_time, sql`NOW()`)
        )
      )

    if (toExpire.length === 0) {
      return ok({ expired: 0, message: 'No donations to expire.' })
    }

    const ids = toExpire.map(d => d.id)

    // Bulk expire
    await db
      .update(donations)
      .set({ status: 'expired' })
      .where(inArray(donations.id, ids))

    // Notify each donor (non-fatal)
    try {
      await db.insert(notifications).values(
        toExpire.map(d => ({
          user_id:             d.donor_id,
          type:                'donation_expired' as const,
          title:               'Donation expired',
          message:             `Your donation "${d.title}" has expired and was not picked up.`,
          related_donation_id: d.id,
        }))
      )
    } catch { /* non-fatal */ }

    return ok({ expired: toExpire.length, ids })
  } catch (e) {
    console.error('[GET /api/cron/expire-donations]', e)
    return serverError('Cron job failed')
  }
}
