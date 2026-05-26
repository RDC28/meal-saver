import { clerkClient } from '@clerk/nextjs/server'
import { withAuth } from '@/lib/api/auth-guard'
import { validateBody, z } from '@/lib/api/validate'
import { ok, err, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

const schema = z.object({
  new_password: z
    .string({ required_error: 'new_password is required' })
    .min(8, 'Password must be at least 8 characters'),
})

// PUT /api/auth/change-password
export const PUT = withAuth(async (req: NextRequest, { profile }) => {
  const { data, error } = await validateBody(req, schema)
  if (error) return error

  if (!profile.clerk_id) {
    return err('No Clerk account linked to this user.', 400, 'NO_CLERK_ID')
  }

  try {
    const clerk = await clerkClient()
    await clerk.users.updateUser(profile.clerk_id, {
      password: data.new_password,
    })
    return ok({ message: 'Password updated successfully.' })
  } catch (e: unknown) {
    const clerkError = e as { errors?: { message?: string }[] }
    const message = clerkError?.errors?.[0]?.message ?? 'Failed to update password'
    console.error('[PUT /api/auth/change-password]', e)
    return serverError(message)
  }
})
