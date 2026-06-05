import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { getSessionPayload } from '@/lib/auth/session'

const roleDestination: Record<string, string> = {
  donor:            '/donor/dashboard',
  receiver:         '/ngo/dashboard',
  admin:            '/admin/dashboard',
  delivery_partner: '/delivery/dashboard',
}

export async function GET(req: Request) {
  const session = await getSessionPayload()
  
  if (!session || !session.userId) redirect('/login')

  // Allow local UI work even when DB is not configured.
  if (!process.env.DATABASE_URL) redirect('/')

  const { db, users, donor_profiles, receiver_profiles } = await import('@/lib/db')

  const [profile] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, session.userId as string))

  if (!profile) redirect('/register')

  const [donorProfile, receiverProfile] = await Promise.all([
    db
      .select({ id: donor_profiles.id })
      .from(donor_profiles)
      .where(eq(donor_profiles.user_id, profile.id))
      .then(rows => rows[0] ?? null),
    db
      .select({ id: receiver_profiles.id })
      .from(receiver_profiles)
      .where(eq(receiver_profiles.user_id, profile.id))
      .then(rows => rows[0] ?? null),
  ])

  const requestedRole = new URL(req.url).searchParams.get('role')
  let resolvedRole = profile.role

  if (requestedRole === 'donor' && donorProfile) resolvedRole = 'donor'
  if (requestedRole === 'receiver' && receiverProfile) resolvedRole = 'receiver'

  if (resolvedRole !== profile.role) {
    await db
      .update(users)
      .set({ role: resolvedRole })
      .where(eq(users.id, profile.id))
  }

  const dest = roleDestination[resolvedRole] ?? '/donor/dashboard'
  redirect(dest)
}
