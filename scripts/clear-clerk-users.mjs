// ─────────────────────────────────────────────────────────────
// One-off maintenance script: wipe all Clerk users.
//
// Context: the Neon `users` table was truncated, leaving Clerk accounts
// orphaned (auth exists, no matching DB row). This resets Clerk to match
// the now-empty database for a clean slate.
//
// Usage (Node 20+ loads the env file natively, no dotenv needed):
//   node --env-file=.env.local scripts/clear-clerk-users.mjs          # DRY RUN — lists, deletes nothing
//   node --env-file=.env.local scripts/clear-clerk-users.mjs --yes    # actually deletes every user
// ─────────────────────────────────────────────────────────────

import { createClerkClient } from '@clerk/backend'

const secretKey = process.env.CLERK_SECRET_KEY
if (!secretKey) {
  console.error('✗ CLERK_SECRET_KEY is not set (.env.local / .env). Aborting.')
  process.exit(1)
}

const confirmed = process.argv.includes('--yes')
const clerk = createClerkClient({ secretKey })

const isProdKey = secretKey.startsWith('sk_live_')
if (isProdKey) {
  console.warn('⚠  This is a LIVE Clerk key (sk_live_) — these are PRODUCTION users.')
}

async function main() {
  // Page through every user (Clerk caps getUserList at 500 per call).
  const all = []
  const pageSize = 100
  for (let offset = 0; ; offset += pageSize) {
    const { data } = await clerk.users.getUserList({ limit: pageSize, offset })
    all.push(...data)
    if (data.length < pageSize) break
  }

  if (all.length === 0) {
    console.log('✓ No Clerk users found — nothing to do.')
    return
  }

  console.log(`Found ${all.length} Clerk user(s):`)
  for (const u of all) {
    const email = u.emailAddresses?.[0]?.emailAddress ?? '(no email)'
    console.log(`  • ${u.id}  ${email}`)
  }

  if (!confirmed) {
    console.log('\nDRY RUN — no users were deleted.')
    console.log('Re-run with  --yes  to delete all of the above.')
    return
  }

  console.log('\nDeleting…')
  let ok = 0
  let failed = 0
  for (const u of all) {
    try {
      await clerk.users.deleteUser(u.id)
      ok++
      process.stdout.write('.')
    } catch (e) {
      failed++
      console.error(`\n✗ Failed to delete ${u.id}:`, e?.errors?.[0]?.message ?? e?.message ?? e)
    }
  }
  console.log(`\n✓ Deleted ${ok} user(s).${failed ? `  ${failed} failed.` : ''}`)
}

main().catch(e => {
  console.error('✗ Script error:', e)
  process.exit(1)
})
