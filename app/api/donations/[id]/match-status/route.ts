import { withDonorOrAdmin } from '@/lib/api/auth-guard'
import { db, donations, donation_receiver_notifications, receiver_profiles } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { ok, notFound, forbidden } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export const GET = withDonorOrAdmin(
  async (_req: NextRequest, { profile }, ctx: Ctx) => {
    const { id: donationId } = await ctx.params

    const [donation] = await db
      .select({
        id: donations.id,
        donor_id: donations.donor_id,
        status: donations.status,
        lat: sql<number>`ST_Y(${donations.pickup_location}::geometry)`.as('lat'),
        lng: sql<number>`ST_X(${donations.pickup_location}::geometry)`.as('lng'),
      })
      .from(donations)
      .where(eq(donations.id, donationId))

    if (!donation) return notFound('Donation')

    if (profile.role !== 'admin' && donation.donor_id !== profile.id) {
      return forbidden('You can only view your own donations')
    }

    const notifiedReceivers = await db
      .select({
        id: receiver_profiles.id,
        user_id: receiver_profiles.user_id,
        organization_name: receiver_profiles.organization_name,
        response: donation_receiver_notifications.response,
        lat: sql<number>`ST_Y(${receiver_profiles.location}::geometry)`.as('lat'),
        lng: sql<number>`ST_X(${receiver_profiles.location}::geometry)`.as('lng'),
      })
      .from(donation_receiver_notifications)
      .innerJoin(receiver_profiles, eq(receiver_profiles.user_id, donation_receiver_notifications.receiver_id))
      .where(eq(donation_receiver_notifications.donation_id, donationId))

    return ok({
      donation: {
        id: donation.id,
        status: donation.status,
        lat: donation.lat,
        lng: donation.lng,
      },
      notifiedReceivers: notifiedReceivers.map(r => ({
        id: r.id,
        user_id: r.user_id,
        organization_name: r.organization_name,
        response: r.response,
        lat: r.lat,
        lng: r.lng,
      })),
    })
  }
)
