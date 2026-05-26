import { withAuth } from '@/lib/api/auth-guard'
import { db, users, donor_profiles, receiver_profiles } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { validateBody, z } from '@/lib/api/validate'
import { ok, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me
// Returns the current user's profile + profile completion status.
// Protected — requires a valid Clerk session.
// ─────────────────────────────────────────────────────────────

export const GET = withAuth(async (_req: NextRequest, { profile }) => {
  let profileComplete = false
  let profileId: string | null = null

  if (profile.role === 'donor') {
    const [donorProfile] = await db
      .select({ id: donor_profiles.id, verification_status: donor_profiles.verification_status })
      .from(donor_profiles)
      .where(eq(donor_profiles.user_id, profile.id))

    profileComplete = !!donorProfile
    profileId = donorProfile?.id ?? null
  } else if (profile.role === 'receiver') {
    const [receiverProfile] = await db
      .select({ id: receiver_profiles.id, verification_status: receiver_profiles.verification_status })
      .from(receiver_profiles)
      .where(eq(receiver_profiles.user_id, profile.id))

    profileComplete = !!receiverProfile
    profileId = receiverProfile?.id ?? null
  } else {
    profileComplete = true
  }

  return ok({
    id:               profile.id,
    email:            profile.email,
    full_name:        profile.full_name,
    phone:            profile.phone,
    avatar_url:       profile.avatar_url,
    role:             profile.role,
    is_active:        profile.is_active,
    profile_complete: profileComplete,
    profile_id:       profileId,
    created_at:       profile.created_at,
  })
})

const patchSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, 'Invalid phone number format')
    .optional(),
})

// PATCH /api/auth/me — update full_name and/or phone on the users table
export const PATCH = withAuth(async (req: NextRequest, { profile }) => {
  const { data, error } = await validateBody(req, patchSchema)
  if (error) return error

  if (!data.full_name && !data.phone) {
    return ok({ message: 'Nothing to update.' })
  }

  try {
    const [updated] = await db
      .update(users)
      .set({
        ...(data.full_name ? { full_name: data.full_name } : {}),
        ...(data.phone     ? { phone:     data.phone }     : {}),
      })
      .where(eq(users.id, profile.id))
      .returning({ id: users.id, full_name: users.full_name, phone: users.phone })

    return ok(updated)
  } catch (e) {
    console.error('[PATCH /api/auth/me]', e)
    return serverError('Failed to update account details.')
  }
})
