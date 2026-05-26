import { withReceiver } from '@/lib/api/auth-guard'
import { db, donations, donation_receiver_notifications, pickup_assignments, receiver_profiles, notifications } from '@/lib/db'
import { eq, and, desc } from 'drizzle-orm'
import { validateBody, z } from '@/lib/api/validate'
import { ok, created, err, notFound, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────
// GET /api/pickups  — list the current receiver's pickups
// ─────────────────────────────────────────────────────────────
export const GET = withReceiver(async (_req: NextRequest, { profile }) => {
  const rows = await db
    .select({
      id:                    pickup_assignments.id,
      pickup_status:         pickup_assignments.pickup_status,
      pickup_type:           pickup_assignments.pickup_type,
      scheduled_pickup_time: pickup_assignments.scheduled_pickup_time,
      pickup_notes:          pickup_assignments.pickup_notes,
      otp_verified:          pickup_assignments.otp_verified,
      assigned_at:           pickup_assignments.assigned_at,
      donation_id:           pickup_assignments.donation_id,
      donation_title:        donations.title,
      donation_status:       donations.status,
      pickup_address:        donations.pickup_address,
      pickup_city:           donations.pickup_city,
      contact_number:        donations.contact_number,
      pickup_instructions:   donations.pickup_instructions,
      expiry_time:           donations.expiry_time,
      is_urgent:             donations.is_urgent,
    })
    .from(pickup_assignments)
    .leftJoin(donations, eq(donations.id, pickup_assignments.donation_id))
    .where(eq(pickup_assignments.receiver_id, profile.id))
    .orderBy(desc(pickup_assignments.assigned_at))

  return ok({ pickups: rows })
})

const createSchema = z.object({
  donation_id: z.string().uuid('donation_id must be a valid UUID'),
  pickup_type: z.enum(['ngo_pickup', 'donor_dropoff', 'delivery_partner'], {
    required_error: 'pickup_type is required',
  }),
  scheduled_pickup_time: z.string().datetime({ offset: true }).optional(),
  pickup_notes:          z.string().max(500).optional(),
})

// ─────────────────────────────────────────────────────────────
// POST /api/pickups
// ─────────────────────────────────────────────────────────────
export const POST = withReceiver(
  async (req: NextRequest, { profile }) => {
    const { data, error } = await validateBody(req, createSchema)
    if (error) return error

    // Verify the donation is accepted
    const [donation] = await db
      .select({
        id:          donations.id,
        donor_id:    donations.donor_id,
        status:      donations.status,
        title:       donations.title,
        pickup_city: donations.pickup_city,
      })
      .from(donations)
      .where(eq(donations.id, data.donation_id))

    if (!donation) return notFound('Donation')

    if (donation.status !== 'accepted') {
      return err(
        `Donation status is "${donation.status}". A pickup can only be created for accepted donations.`,
        409,
        'WRONG_STATUS'
      )
    }

    // Verify the NGO accepted this donation
    const [notif] = await db
      .select({ id: donation_receiver_notifications.id })
      .from(donation_receiver_notifications)
      .where(
        and(
          eq(donation_receiver_notifications.donation_id, data.donation_id),
          eq(donation_receiver_notifications.receiver_id, profile.id),
          eq(donation_receiver_notifications.response, 'accepted')
        )
      )

    if (!notif) {
      return err('You did not accept this donation.', 403, 'NOT_ELIGIBLE')
    }

    // Prevent duplicate pickup assignments
    const [existing] = await db
      .select({ id: pickup_assignments.id })
      .from(pickup_assignments)
      .where(eq(pickup_assignments.donation_id, data.donation_id))

    if (existing) {
      return err('A pickup assignment already exists for this donation.', 409, 'ALREADY_ASSIGNED')
    }

    // Get receiver profile ID
    const [receiverProfile] = await db
      .select({ id: receiver_profiles.id })
      .from(receiver_profiles)
      .where(eq(receiver_profiles.user_id, profile.id))

    if (!receiverProfile) {
      return err('Please complete your receiver profile first.', 400, 'PROFILE_REQUIRED')
    }

    // Create the pickup assignment
    const [pickup] = await db
      .insert(pickup_assignments)
      .values({
        donation_id:           data.donation_id,
        receiver_id:           profile.id,
        receiver_profile_id:   receiverProfile.id,
        pickup_type:           data.pickup_type,
        pickup_status:         'assigned',
        scheduled_pickup_time: data.scheduled_pickup_time ? new Date(data.scheduled_pickup_time) : undefined,
        pickup_notes:          data.pickup_notes ?? null,
      })
      .returning()

    if (!pickup) return serverError('Failed to create pickup assignment')

    // Update donation status → pickup_assigned (non-fatal, trigger handles it too)
    try {
      await db
        .update(donations)
        .set({ status: 'pickup_assigned' })
        .where(eq(donations.id, data.donation_id))
    } catch { /* non-fatal */ }

    // Notify the donor (non-fatal)
    try {
      await db.insert(notifications).values({
        user_id:             donation.donor_id,
        type:                'pickup_assigned',
        title:               'Pickup has been scheduled!',
        message:             `An NGO will pick up your donation "${donation.title}" soon. Have it ready!`,
        related_donation_id: data.donation_id,
      })
    } catch { /* non-fatal */ }

    return created({
      ...pickup,
      message: 'Pickup assignment created. Generate an OTP when you arrive at the donor location.',
    })
  }
)
