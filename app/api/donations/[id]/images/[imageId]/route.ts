import { withDonor } from '@/lib/api/auth-guard'
import { db, donations, donation_images } from '@/lib/db'
import { eq, and, asc } from 'drizzle-orm'
import { ok, notFound, forbidden, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string; imageId: string }> }

// ─────────────────────────────────────────────────────────────
// DELETE /api/donations/[id]/images/[imageId]
//
// Remove a donation image. Donor must own the donation.
// If the deleted image was primary, promotes the next image to primary.
// ─────────────────────────────────────────────────────────────
export const DELETE = withDonor(
  async (_req: NextRequest, { profile }, ctx: Ctx) => {
    const { id: donationId, imageId } = await ctx.params

    // Verify donation ownership
    const [donation] = await db
      .select({ id: donations.id, donor_id: donations.donor_id })
      .from(donations)
      .where(eq(donations.id, donationId))

    if (!donation) return notFound('Donation')

    if (donation.donor_id !== profile.id) {
      return forbidden('You can only manage images for your own donations')
    }

    // Fetch the image record
    const [image] = await db
      .select()
      .from(donation_images)
      .where(
        and(
          eq(donation_images.id, imageId),
          eq(donation_images.donation_id, donationId)
        )
      )

    if (!image) return notFound('Image')

    // Optionally delete from Cloudinary (non-fatal)
    if (image.storage_path && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME!
        const apiKey    = process.env.CLOUDINARY_API_KEY!
        const apiSecret = process.env.CLOUDINARY_API_SECRET!
        const timestamp = Math.floor(Date.now() / 1000)
        const { createHash } = await import('crypto')
        const paramsToSign = `public_id=${image.storage_path}&timestamp=${timestamp}`
        const sig = createHash('sha1').update(paramsToSign + apiSecret).digest('hex')

        await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_id: image.storage_path,
            api_key:   apiKey,
            timestamp,
            signature: sig,
          }),
        })
      } catch {
        // Non-fatal
      }
    }

    // Delete the DB record
    try {
      await db
        .delete(donation_images)
        .where(eq(donation_images.id, imageId))
    } catch (e) {
      console.error('[DELETE /api/donations/[id]/images/[imageId]]', e)
      return serverError('Failed to delete image')
    }

    // If this was the primary image, promote the next one
    if (image.is_primary) {
      const [remaining] = await db
        .select({ id: donation_images.id })
        .from(donation_images)
        .where(eq(donation_images.donation_id, donationId))
        .orderBy(asc(donation_images.uploaded_at))
        .limit(1)

      if (remaining) {
        await db
          .update(donation_images)
          .set({ is_primary: true })
          .where(eq(donation_images.id, remaining.id))
      }
    }

    return ok({ message: 'Image deleted successfully', id: imageId })
  }
)
