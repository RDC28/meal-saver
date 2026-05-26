import { withAuth } from '@/lib/api/auth-guard'
import { db, pickup_assignments, donations, donation_images, receiver_profiles } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { ok, notFound, forbidden } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

// ─────────────────────────────────────────────────────────────
// GET /api/pickups/[id]
// ─────────────────────────────────────────────────────────────
export const GET = withAuth(
  async (_req: NextRequest, { profile }, ctx: Ctx) => {
    const { id } = await ctx.params

    const [pickup] = await db
      .select()
      .from(pickup_assignments)
      .where(eq(pickup_assignments.id, id))

    if (!pickup) return notFound('Pickup assignment')

    // Load related donation info
    const [donation] = await db
      .select({
        id:                   donations.id,
        title:                donations.title,
        status:               donations.status,
        pickup_address:       donations.pickup_address,
        pickup_city:          donations.pickup_city,
        pickup_instructions:  donations.pickup_instructions,
        contact_number:       donations.contact_number,
        donor_id:             donations.donor_id,
      })
      .from(donations)
      .where(eq(donations.id, pickup.donation_id))

    const images = donation
      ? await db
          .select({ image_url: donation_images.image_url, is_primary: donation_images.is_primary })
          .from(donation_images)
          .where(eq(donation_images.donation_id, pickup.donation_id))
      : []

    const [receiverProfile] = await db
      .select({ organization_name: receiver_profiles.organization_name, phone: receiver_profiles.phone })
      .from(receiver_profiles)
      .where(eq(receiver_profiles.id, pickup.receiver_profile_id))

    // Access control: donor, receiver, or admin
    const isDonor    = donation?.donor_id === profile.id
    const isReceiver = pickup.receiver_id === profile.id
    const isAdmin    = profile.role === 'admin'

    if (!isReceiver && !isDonor && !isAdmin) {
      return forbidden('You do not have access to this pickup')
    }

    return ok({
      ...pickup,
      donations:         donation ? { ...donation, donation_images: images } : null,
      receiver_profiles: receiverProfile ?? null,
    })
  }
)
