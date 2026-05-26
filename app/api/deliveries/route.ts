import { withReceiver } from '@/lib/api/auth-guard'
import { db, pickup_assignments, delivery_confirmations, donations, notifications } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { validateBody, z } from '@/lib/api/validate'
import { created, err, notFound, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

const confirmSchema = z.object({
  pickup_assignment_id: z.string().uuid('pickup_assignment_id must be a valid UUID'),
  quantity_received_kg: z.number().positive().max(10000).optional(),
  food_condition_on_arrival: z
    .enum(['excellent', 'good', 'fair', 'poor', 'unsafe'])
    .optional(),
  is_food_safe: z.boolean({ required_error: 'is_food_safe is required' }),
  receiver_notes: z.string().max(1000).optional(),
})

// ─────────────────────────────────────────────────────────────
// POST /api/deliveries
// ─────────────────────────────────────────────────────────────
export const POST = withReceiver(
  async (req: NextRequest, { profile }) => {
    const { data, error } = await validateBody(req, confirmSchema)
    if (error) return error

    // Load the pickup assignment
    const [pickup] = await db
      .select({
        id:            pickup_assignments.id,
        receiver_id:   pickup_assignments.receiver_id,
        pickup_status: pickup_assignments.pickup_status,
        donation_id:   pickup_assignments.donation_id,
      })
      .from(pickup_assignments)
      .where(eq(pickup_assignments.id, data.pickup_assignment_id))

    if (!pickup) return notFound('Pickup assignment')

    if (pickup.receiver_id !== profile.id) {
      return err('You can only confirm deliveries for your own pickups.', 403, 'FORBIDDEN')
    }

    if (pickup.pickup_status !== 'completed') {
      return err(
        `Cannot confirm delivery — pickup status is "${pickup.pickup_status}". Complete the pickup first.`,
        409,
        'WRONG_STATUS'
      )
    }

    // Prevent duplicate delivery confirmations
    const [existing] = await db
      .select({ id: delivery_confirmations.id })
      .from(delivery_confirmations)
      .where(eq(delivery_confirmations.pickup_assignment_id, data.pickup_assignment_id))

    if (existing) {
      return err('Delivery has already been confirmed for this pickup.', 409, 'ALREADY_CONFIRMED')
    }

    // Create delivery confirmation record
    const [delivery] = await db
      .insert(delivery_confirmations)
      .values({
        pickup_assignment_id:     data.pickup_assignment_id,
        donation_id:              pickup.donation_id,
        receiver_id:              profile.id,
        quantity_received_kg:     data.quantity_received_kg != null ? String(data.quantity_received_kg) : undefined,
        food_condition_on_arrival: data.food_condition_on_arrival ?? null,
        is_food_safe:             data.is_food_safe,
        receiver_notes:           data.receiver_notes ?? null,
      })
      .returning()

    if (!delivery) return serverError('Failed to create delivery confirmation')

    // Update donation status
    const newStatus = data.is_food_safe ? 'delivered' : 'unsafe'
    try {
      await db
        .update(donations)
        .set({ status: newStatus })
        .where(eq(donations.id, pickup.donation_id))

      await db
        .update(pickup_assignments)
        .set({ pickup_status: 'verified' })
        .where(eq(pickup_assignments.id, data.pickup_assignment_id))
    } catch { /* non-fatal */ }

    // Trigger impact report generation (non-fatal)
    try {
      await db.execute(
        sql`SELECT generate_impact_report(${pickup.donation_id}::uuid)`
      )
    } catch (e) {
      console.error('[POST /api/deliveries] Impact report generation failed:', e)
    }

    // Notify the donor (non-fatal)
    try {
      const [donation] = await db
        .select({ donor_id: donations.donor_id, title: donations.title })
        .from(donations)
        .where(eq(donations.id, pickup.donation_id))

      if (donation) {
        await db.insert(notifications).values({
          user_id:             donation.donor_id,
          type:                'delivery_confirmed',
          title:               data.is_food_safe
            ? 'Delivery confirmed! Food reached the beneficiaries'
            : 'Delivery confirmed — food safety issue reported',
          message:             data.is_food_safe
            ? `Your donation "${donation.title}" has been successfully distributed. Check your impact report!`
            : `Your donation "${donation.title}" was received but flagged as unsafe. Please contact support.`,
          related_donation_id: pickup.donation_id,
        })
      }
    } catch { /* non-fatal */ }

    return created({
      delivery,
      message: data.is_food_safe
        ? 'Delivery confirmed! Your impact report will be ready shortly.'
        : 'Delivery confirmed. The unsafe food flag has been recorded.',
    })
  }
)
