# MealSaver — Supabase Setup Guide

This guide walks you through connecting MealSaver to Supabase (hosted PostgreSQL) from scratch.

---

## Table of Contents

1. [Create Supabase Project](#1-create-supabase-project)
2. [Enable Extensions](#2-enable-extensions)
3. [Run the Schema](#3-run-the-schema)
4. [Run RLS Policies](#4-run-rls-policies)
5. [Run Helper Functions](#5-run-helper-functions)
6. [Configure Storage Buckets](#6-configure-storage-buckets)
7. [Connect from Next.js](#7-connect-from-nextjs)
8. [Environment Variables](#8-environment-variables)
9. [Set Up Authentication](#9-set-up-authentication)
10. [Optional: Schedule Cron Jobs](#10-optional-schedule-cron-jobs)
11. [Local Development with Supabase CLI](#11-local-development-with-supabase-cli)
12. [Database Schema Overview](#12-database-schema-overview)

---

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Fill in:
   - **Project name**: `mealsaver`
   - **Database password**: (save this — you need it later)
   - **Region**: Choose the region closest to your users (e.g., `ap-south-1` for India)
4. Click **Create new project** — wait ~2 minutes for provisioning

---

## 2. Enable Extensions

In your Supabase dashboard:

1. Go to **Database → Extensions**
2. Enable:
   - `uuid-ossp` — for `uuid_generate_v4()`
   - `postgis` — for spatial/location queries (nearest NGO matching)
   - `pg_trgm` — for fuzzy text search on food titles

Or paste this in the **SQL Editor** and run it:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

---

## 3. Run the Schema

1. Go to **SQL Editor** → **New query**
2. Open `database/schema.sql` from this repo
3. Copy the entire contents and paste into the editor
4. Click **Run** (or `Ctrl+Enter`)

This creates:
- All enums (user_role, donation_status, etc.)
- All tables (users, donations, pickup_assignments, etc.)
- All indexes (spatial, status, timestamps)
- All triggers (updated_at, auto user profile creation on signup)

> ⚠️ Run in order: `schema.sql` → `rls_policies.sql` → `functions.sql`

---

## 4. Run RLS Policies

1. Open a new SQL query
2. Copy and paste `database/rls_policies.sql`
3. Click **Run**

Row Level Security ensures:
- Donors only see/edit their own donations
- NGOs only see notifications sent to them
- Admins have full access
- Sensitive data (impact reports, verifications) only visible to involved parties

---

## 5. Run Helper Functions

1. Open a new SQL query
2. Copy and paste `database/functions.sql`
3. Click **Run**

This creates:
- `find_nearby_receivers(donation_id)` — matching algorithm
- `calculate_urgency_score(expiry_time)` — urgency scoring
- `generate_impact_report(donation_id)` — auto impact tracking
- `expire_stale_donations()` — mark expired donations
- `get_donor_impact_summary(donor_id)` — dashboard stats
- `get_receiver_impact_summary(receiver_id)` — NGO stats
- `generate_pickup_otp(pickup_id)` — OTP for pickup verification

---

## 6. Configure Storage Buckets

In Supabase, go to **Storage → New bucket** and create:

### Bucket 1: `donation-images`
- **Public**: Yes (images shown to all users)
- **File size limit**: 5MB
- **Allowed MIME types**: `image/jpeg, image/png, image/webp`

### Bucket 2: `verification-documents`
- **Public**: No (private — admin review only)
- **File size limit**: 10MB
- **Allowed MIME types**: `image/jpeg, image/png, application/pdf`

### Storage RLS Policies

Go to **Storage → Policies** and add:

**For `donation-images`:**
```sql
-- Allow authenticated donors to upload to their folder
CREATE POLICY "Donors upload own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'donation-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public to view images
CREATE POLICY "Public can view donation images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'donation-images');
```

**For `verification-documents`:**
```sql
-- Only owner can upload
CREATE POLICY "Users upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Only owner and admin can view
CREATE POLICY "Users view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);
```

---

## 7. Connect from Next.js

### Install the Supabase client

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Create the Supabase client files

**`lib/supabase/client.ts`** — for use in Client Components:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`lib/supabase/server.ts`** — for use in Server Components / API Routes:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

**`lib/supabase/middleware.ts`** — for session refresh in middleware:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  await supabase.auth.getUser()
  return supabaseResponse
}
```

**`middleware.ts`** (at project root):
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Example: Fetching donations in a Server Component
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function DonationsPage() {
  const supabase = await createClient()

  const { data: donations, error } = await supabase
    .from('donations')
    .select(`
      *,
      donor_profiles (business_name, city),
      donation_images (image_url, is_primary)
    `)
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return <div>{/* render donations */}</div>
}
```

### Example: Calling the matching function
```typescript
const { data: nearbyReceivers } = await supabase
  .rpc('find_nearby_receivers', { p_donation_id: donationId })
```

---

## 8. Environment Variables

Create a `.env.local` file in the project root:

```env
# ── Supabase (public — safe to expose in browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ── Supabase (secret — server-side only, never expose to browser)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ── App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Google Maps (for distance display on frontend)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key

# ── Cloudinary (optional — if not using Supabase Storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Where to find your Supabase keys:

1. Go to your Supabase project dashboard
2. Click **Settings → API**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon (public)** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role (secret)** key → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ Never commit `.env.local` to git. It's already in `.gitignore`.

---

## 9. Set Up Authentication

Supabase handles auth out of the box. Configure:

### Email Auth (default)
1. Go to **Authentication → Providers**
2. **Email** is enabled by default

### Configure redirect URLs
1. Go to **Authentication → URL Configuration**
2. Set **Site URL**: `http://localhost:3000` (dev) / `https://yourdomain.com` (prod)
3. Add to **Redirect URLs**:
   - `http://localhost:3000/**`
   - `https://yourdomain.com/**`

### Pass user role on signup

When calling `supabase.auth.signUp()`, pass the role in metadata — the `handle_new_user` trigger picks it up automatically:

```typescript
await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: {
      full_name: 'Rajesh Sharma',
      role: 'donor',          // 'donor' | 'receiver' | 'admin'
    }
  }
})
```

The `handle_new_user` trigger in `schema.sql` automatically creates the row in `public.users` when auth signup succeeds.

---

## 10. Optional: Schedule Cron Jobs

To automatically expire stale donations, use Supabase's `pg_cron` extension:

### Enable pg_cron
In the SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;
```

### Schedule the expiry job (every 15 minutes)
```sql
SELECT cron.schedule(
  'expire-stale-donations',      -- job name
  '*/15 * * * *',                -- every 15 minutes
  $$ SELECT expire_stale_donations(); $$
);
```

### View scheduled jobs
```sql
SELECT * FROM cron.job;
```

---

## 11. Local Development with Supabase CLI

For a fully local dev setup (runs Supabase on your machine):

### Install Supabase CLI
```bash
npm install supabase --save-dev
```

### Initialize
```bash
npx supabase init
```

### Start local Supabase
```bash
npx supabase start
```

This gives you:
- Local PostgreSQL on `localhost:54322`
- Local Supabase Studio at `http://localhost:54323`
- Local API at `http://localhost:54321`

### Link to your remote project
```bash
npx supabase login
npx supabase link --project-ref your-project-ref
```

### Push migrations to remote
```bash
# Convert schema.sql to a migration
npx supabase migration new initial_schema
# Copy schema.sql content into supabase/migrations/<timestamp>_initial_schema.sql

npx supabase db push
```

---

## 12. Database Schema Overview

```
auth.users (Supabase managed)
    │
    └─ users (linked via trigger on signup)
            │
            ├─ donor_profiles
            │       └─ donations ──────────┐
            │               └─ donation_images │
            │                               │
            └─ receiver_profiles            │
                    └─ pickup_assignments ◄─┘
                            │
                            └─ delivery_confirmations
                                    │
                                    └─ impact_reports


Supporting tables:
  ├─ donation_receiver_notifications  (matching + fallback tracking)
  ├─ notifications                    (in-app alerts)
  ├─ user_verifications               (document uploads for verification)
  └─ admin_actions                    (audit log)
```

### Key Tables Summary

| Table | Purpose |
|-------|---------|
| `users` | Public profile — links to Supabase auth |
| `donor_profiles` | Business details for food donors |
| `receiver_profiles` | NGO/shelter details with location + food prefs |
| `donations` | Food donation listings with status lifecycle |
| `donation_images` | Photos of donated food |
| `donation_receiver_notifications` | Tracks which NGOs were notified + response |
| `pickup_assignments` | Coordinates pickup between donor and receiver |
| `delivery_confirmations` | Receiver confirms delivery + food condition |
| `impact_reports` | Auto-generated: meals saved, kg rescued, CO2 saved |
| `notifications` | In-app notifications for all users |
| `user_verifications` | KYC documents for donor/NGO verification |
| `admin_actions` | Audit log of all admin operations |

### Donation Status Flow

```
available
    └─ pending_acceptance (NGOs notified, awaiting response)
            ├─ accepted (NGO accepted)
            │       └─ pickup_assigned
            │               └─ picked_up
            │                       └─ delivered ✅
            ├─ rejected (all NGOs rejected → emergency fallback)
            ├─ expired (expiry_time passed with no pickup)
            └─ cancelled (donor cancelled)
```

---

## Need Help?

- Supabase docs: https://supabase.com/docs
- PostGIS in Supabase: https://supabase.com/docs/guides/database/extensions/postgis
- Next.js + Supabase Auth: https://supabase.com/docs/guides/auth/server-side/nextjs
