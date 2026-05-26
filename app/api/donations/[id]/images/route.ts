import { withDonor } from '@/lib/api/auth-guard'
import { db, donations, donation_images } from '@/lib/db'
import { eq, count } from 'drizzle-orm'
import { created, err, notFound, forbidden, serverError } from '@/lib/api/response'
import { UPLOAD } from '@/lib/constants'
import { logger } from '@/lib/logger'
import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

// ─────────────────────────────────────────────────────────────
// POST /api/donations/[id]/images
//
// Upload an image to Cloudinary for a donation.
// Field name: "image"
// ─────────────────────────────────────────────────────────────
export const POST = withDonor(
  async (req: NextRequest, { profile }, ctx: Ctx) => {
    const { id: donationId } = await ctx.params

    const [donation] = await db
      .select({ id: donations.id, donor_id: donations.donor_id, status: donations.status })
      .from(donations)
      .where(eq(donations.id, donationId))

    if (!donation) return notFound('Donation')

    if (donation.donor_id !== profile.id) {
      return forbidden('You can only upload images for your own donations')
    }

    if (!['available', 'pending_acceptance'].includes(donation.status)) {
      return err(
        'Images can only be added to available or pending donations',
        409,
        'WRONG_STATUS'
      )
    }

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return err('Request must be multipart/form-data', 400, 'INVALID_REQUEST')
    }

    const file = formData.get('image')
    if (!file || !(file instanceof File)) {
      return err('Field "image" is required and must be a file', 422, 'VALIDATION_ERROR')
    }

    if (!UPLOAD.ALLOWED_TYPES.includes(file.type as typeof UPLOAD.ALLOWED_TYPES[number])) {
      return err(
        `Invalid file type "${file.type}". Allowed: JPEG, PNG, WebP`,
        415,
        'INVALID_FILE_TYPE'
      )
    }

    if (file.size > UPLOAD.MAX_SIZE_BYTES) {
      return err(
        `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`,
        413,
        'FILE_TOO_LARGE'
      )
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(donation_images)
      .where(eq(donation_images.donation_id, donationId))

    if (Number(total) >= UPLOAD.MAX_IMAGES_PER_DONATION) {
      return err(
        `Maximum of ${UPLOAD.MAX_IMAGES_PER_DONATION} images per donation. Delete an existing image first.`,
        409,
        'IMAGE_LIMIT_REACHED'
      )
    }

    const isPrimary = Number(total) === 0

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey    = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      logger.error('POST /api/donations/[id]/images', 'Cloudinary env vars not configured')
      return serverError('Image upload is not configured. Please contact support.')
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const folder    = `mealsaver/donations/${donationId}`
    const publicId  = `${donationId}/${crypto.randomUUID()}`

    // Cloudinary signature: SHA1(sorted_params_string + api_secret)
    // Params must be sorted alphabetically by key.
    const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`
    const signature = createHash('sha1').update(paramsToSign + apiSecret).digest('hex')

    const uploadForm = new FormData()
    uploadForm.append('file', file)
    uploadForm.append('api_key', apiKey)
    uploadForm.append('timestamp', String(timestamp))
    uploadForm.append('signature', signature)
    uploadForm.append('folder', folder)
    uploadForm.append('public_id', publicId)

    let imageUrl: string
    let storagePath: string
    try {
      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: uploadForm }
      )
      if (!uploadRes.ok) {
        const errBody = await uploadRes.text()
        logger.error('POST /api/donations/[id]/images', 'Cloudinary upload error', errBody)
        return serverError('Failed to upload image. Please try again.')
      }
      const uploadData = await uploadRes.json() as { secure_url: string; public_id: string }
      imageUrl    = uploadData.secure_url
      storagePath = uploadData.public_id
    } catch (e) {
      logger.error('POST /api/donations/[id]/images', 'Cloudinary upload exception', e)
      return serverError('Failed to upload image. Please try again.')
    }

    try {
      const [imageRecord] = await db
        .insert(donation_images)
        .values({
          donation_id:  donationId,
          image_url:    imageUrl,
          storage_path: storagePath,
          is_primary:   isPrimary,
        })
        .returning()

      return created({
        ...imageRecord,
        message: isPrimary
          ? 'Image uploaded and set as primary photo.'
          : 'Image uploaded successfully.',
      })
    } catch (e) {
      logger.error('POST /api/donations/[id]/images', 'DB insert failed', e)
      return serverError('Failed to save image record')
    }
  }
)
