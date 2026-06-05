import { cookies } from 'next/headers'
import { signJWT, verifyJWT } from './jwt'

export const SESSION_COOKIE = 'mealsaver_session'

export async function setSessionCookie(payload: { userId: string, role: string }) {
  const token = await signJWT(payload)
  
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getSessionPayload() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (!token) return null

  return await verifyJWT(token)
}
