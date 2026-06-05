import { eq } from 'drizzle-orm'
import { db, users } from '@/lib/db'
import { err, ok, serverError } from '@/lib/api/response'
import { getSessionPayload } from '@/lib/auth/session'

export async function GET() {
  try {
    const payload = await getSessionPayload()
    
    if (!payload || !payload.userId) {
      return err('Unauthorized', 401, 'UNAUTHORIZED')
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        full_name: users.full_name,
        avatar_url: users.avatar_url,
        role: users.role,
        is_active: users.is_active,
      })
      .from(users)
      .where(eq(users.id, payload.userId as string))

    if (!user) {
      return err('User not found', 404, 'NOT_FOUND')
    }

    return ok({ user })
  } catch (e) {
    console.error('[GET /api/auth/me]', e)
    return serverError()
  }
}
