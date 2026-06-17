import { eq } from 'drizzle-orm'
import * as bcrypt from 'bcrypt'
import { db, donor_profiles, receiver_profiles, users } from '@/lib/db'
import { validateBody, z } from '@/lib/api/validate'
import { err, ok, serverError } from '@/lib/api/response'
import { setSessionCookie } from '@/lib/auth/session'

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Must be a valid email address'),
  password: z
    .string({ required_error: 'Password is required' }),
  role: z.enum(['donor', 'receiver', 'admin']).default('donor'),
})

export async function POST(req: Request) {
  try {
    const { data, error } = await validateBody(req, loginSchema)
    if (error || !data) return error ?? err('Invalid request body', 400, 'INVALID_BODY')

    const normalizedEmail = data.email.trim().toLowerCase()
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))

    if (!user) return err('Invalid email or password', 401, 'INVALID_CREDENTIALS')

    const isPasswordValid = await bcrypt.compare(data.password, user.password_hash ?? '')
    if (!isPasswordValid) return err('Invalid email or password', 401, 'INVALID_CREDENTIALS')
    if (!user.is_active) return err('Account is disabled', 403, 'ACCOUNT_DISABLED')

    if (data.role === 'donor') {
      const [profile] = await db
        .select({ id: donor_profiles.id })
        .from(donor_profiles)
        .where(eq(donor_profiles.user_id, user.id))

      if (!profile) return err('No donor profile exists for this account.', 403, 'ROLE_NOT_AVAILABLE')
    }

    if (data.role === 'receiver') {
      const [profile] = await db
        .select({ id: receiver_profiles.id })
        .from(receiver_profiles)
        .where(eq(receiver_profiles.user_id, user.id))

      if (!profile) return err('No NGO profile exists for this account.', 403, 'ROLE_NOT_AVAILABLE')
    }

    if (data.role === 'admin' && user.role !== 'admin') {
      return err('No admin access exists for this account.', 403, 'ROLE_NOT_AVAILABLE')
    }

    if (user.role !== data.role) {
      await db
        .update(users)
        .set({ role: data.role })
        .where(eq(users.id, user.id))
    }

    await setSessionCookie({ userId: user.id, role: data.role })

    return ok({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: data.role,
      },
      message: 'Logged in successfully',
    })
  } catch (e) {
    console.error('[POST /api/auth/login]', e)
    return serverError()
  }
}
