import { auth } from '@clerk/nextjs/server'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

const roleDestination: Record<string, string> = {
  donor:            '/donor/dashboard',
  receiver:         '/ngo/dashboard',
  admin:            '/admin/dashboard',
  delivery_partner: '/delivery/dashboard',
}

export async function GET() {
  const { userId: clerkId } = await auth()

  if (!clerkId) redirect('/login')

  const [profile] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.clerk_id, clerkId))

  const dest = profile ? (roleDestination[profile.role] ?? '/donor/dashboard') : '/donor/dashboard'
  redirect(dest)
}
