import * as bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { db, users } from '@/lib/db'
import { withAuth } from '@/lib/api/auth-guard'
import { validateBody, z } from '@/lib/api/validate'
import { ok, err, serverError } from '@/lib/api/response'
import type { NextRequest } from 'next/server'

const schema = z.object({
  current_password: z
    .string({ required_error: 'current_password is required' })
    .min(1, 'Current password is required'),
  new_password: z
    .string({ required_error: 'new_password is required' })
    .min(8, 'Password must be at least 8 characters'),
})

// PUT /api/auth/change-password
export const PUT = withAuth(async (req: NextRequest, { profile }) => {
  const { data, error } = await validateBody(req, schema)
  if (error) return error

  try {
    const isPasswordValid = await bcrypt.compare(data.current_password, profile.password_hash ?? '')
    
    if (!isPasswordValid) {
      return err('Current password is incorrect.', 403, 'INVALID_CURRENT_PASSWORD')
    }

    const hashedNewPassword = await bcrypt.hash(data.new_password, 10)

    await db
      .update(users)
      .set({ password_hash: hashedNewPassword })
      .where(eq(users.id, profile.id))

    return ok({ message: 'Password updated successfully.' })
  } catch (e: unknown) {
    console.error('[PUT /api/auth/change-password]', e)
    return serverError('Failed to update password')
  }
})
