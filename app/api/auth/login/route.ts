// NOTE: Login is now handled by Clerk's hosted UI at /login.
// This route is kept as a stub for any legacy clients that POST to it.
// Real auth flow: Clerk SignIn component → redirect to dashboard.

import { ok } from '@/lib/api/response'

export async function POST() {
  return ok({
    message: 'Login is handled via Clerk. Visit /login to authenticate.',
  })
}
