import { eq } from 'drizzle-orm'
import * as bcrypt from 'bcrypt'
import { db, users } from '@/lib/db'
import { validateBody, z } from '@/lib/api/validate'
import { err, ok, serverError } from '@/lib/api/response'
import { setSessionCookie } from '@/lib/auth/session'

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Must be a valid email address'),
  password: z
    .string({ required_error: 'Password is required' }),
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

    if (!user) {
      return err('Invalid email or password', 401, 'INVALID_CREDENTIALS')
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password_hash ?? '')
    
    if (!isPasswordValid) {
      return err('Invalid email or password', 401, 'INVALID_CREDENTIALS')
    }

    if (!user.is_active) {
       return err('Account is disabled', 403, 'ACCOUNT_DISABLED')
    }

    await setSessionCookie({ userId: user.id, role: user.role })

    return ok({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
      message: 'Logged in successfully',
    })
  } catch (e) {
    console.error('[POST /api/auth/login]', e)
    return serverError()
  }
}
