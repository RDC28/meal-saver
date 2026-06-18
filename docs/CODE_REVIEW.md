# MealSaver — Full Codebase Review

**Date:** 2026-05-26  
**Reviewer:** Claude Code  
**Branch:** main  

---

## Project Overview

- **Stack:** Next.js 16 (App Router), TypeScript, Clerk Auth, Neon PostgreSQL, Drizzle ORM, Tailwind v4, shadcn
- **Purpose:** Food rescue platform connecting food donors (restaurants, bakeries) with verified NGOs
- **Roles:** Donor, Receiver (NGO), Admin, Delivery Partner

---

## Critical Issues 🔴

### 1. Credentials Exposed in `.env.local`
**File:** `.env.local`

The file contains actual secrets that may be committed to git:
- Database password in `DATABASE_URL`
- Clerk secret key (`CLERK_SECRET_KEY=sk_test_...`)
- Hardcoded cron secret (`CRON_SECRET=mealsaver-cron-secret-change-in-production`)

**Actions:**
- Immediately rotate all credentials (Neon DB password, Clerk keys)
- Add `.env.local` to `.gitignore`
- Create `.env.example` with placeholder values only
- Use Vercel Environment Variables or a secrets manager in production

---

### 2. TypeScript Build Errors Silently Ignored
**File:** `next.config.mjs`

```js
typescript: { ignoreBuildErrors: true }
```

This suppresses all TypeScript errors at build time, hiding real bugs.

**Fix:** Remove this or set `ignoreBuildErrors: false`.

---

### 3. Cloudinary Signature Algorithm Bug
**File:** `app/api/donations/[id]/images/route.ts` (lines ~99–104)

The image upload signing logic builds both an HMAC-SHA256 and a SHA1 hash but uses only one. Cloudinary requires SHA1 for signed uploads. The code is inconsistent and the signing may be broken or accidentally working.

**Fix:** Use only `createHash('sha1')` on the sorted parameter string + secret, as Cloudinary's signing spec requires.

---

## High Priority Issues 🟡

### 4. Donation Creation Page is a Non-Functional Mockup
**File:** `app/donor/donations/new/page.tsx`

- `onSubmit={(e) => e.preventDefault()}` — form never submits
- Hardcoded values throughout (dates, phone `98765 43210`, food types, addresses)
- Images array uses emoji strings `['🍛', '🍱']` instead of real file upload
- No integration with `POST /api/donations` or `/api/donations/[id]/images`

**Fix:** Wire up React Hook Form → `POST /api/donations` → image upload endpoint.

---

### 5. OTP Delivered via In-App Notification (Not SMS)
**File:** `app/api/pickups/[id]/otp/route.ts`

The pickup OTP is returned in the API response and stored in the notifications table as plain text. This is a security risk if the notifications table is ever exposed.

**Fix:** Deliver OTP via SMS (Twilio / MSG91) rather than in-app notification. Do not store OTP in the notifications table.

---

### 6. N+1 Query in Admin Users Endpoint
**File:** `app/api/admin/users/route.ts`

Users are fetched first, then donor/receiver profiles are fetched separately in JavaScript. Filtering by `verification_status` and `city` also happens in JS after the DB fetch instead of in SQL.

**Fix:** Use a SQL JOIN on `donor_profiles` / `receiver_profiles` with WHERE clauses pushed into the query.

---

### 7. No Donor Verification Check Before Posting Donation
**File:** `app/api/donations/route.ts` (POST handler)

Donors can post donations without being verified. There is no check that the donor profile has `verification_status = 'verified'`.

**Fix:** Add a guard that rejects donation creation if donor is not verified, or clearly document that unverified donors are allowed.

---

### 8. `quantity_kg` Stored as String Instead of Decimal
**File:** `lib/db/schema.ts`, `app/api/donations/route.ts`

The schema defines `quantity_kg` as decimal but the route stores it as `String(data.quantity_kg)`. This causes a type mismatch in the ORM and may break numeric comparisons.

**Fix:** Parse as a number or use `.toString()` only at the database insertion layer, ensuring the schema and the insert type agree.

---

### 9. Assumed Database Functions May Not Exist
**Files:** `lib/donation-matching.ts`, `app/api/pickups/[id]/otp/route.ts`, `app/api/impact/donor/route.ts`

Several API routes call PostgreSQL functions directly via `db.execute(sql\`...\`)`  without any fallback:
- `find_nearby_receivers(donationId)`
- `generate_pickup_otp(pickupId)`
- `get_donor_impact_summary(userId)`

If the `database/functions.sql` file was never run against the Neon DB, these will fail silently or throw.

**Fix:** Add a startup check or migration that ensures these functions exist, and handle the case where they don't.

---

## Medium Priority Issues 🟠

### 10. No Rate Limiting on Critical Endpoints
**Files:** `app/api/auth/signup/route.ts`, `app/api/pickups/[id]/otp/route.ts`

No rate limiting is applied to signup, donation creation, or OTP generation. This enables abuse (brute-force OTP, spam signups).

**Fix:** Add rate limiting middleware (e.g., `@upstash/ratelimit` with Redis, or Vercel Edge middleware).

---

### 11. No CSRF Protection
**Affected:** All POST/PUT/DELETE routes

The app relies on Clerk session validation but does not verify CSRF tokens. A malicious site could trigger state-changing requests from authenticated users.

**Fix:** Use Next.js `headers()` to verify `Origin`/`Referer` on mutating requests, or add an explicit CSRF token mechanism.

---

### 12. Missing Input Sanitization on Text Fields
**Affected:** donation `description`, `pickup_instructions`, profile `bio`, etc.

No explicit HTML/XSS sanitization is done server-side on free-text inputs. If any field is ever rendered as raw HTML, this is an XSS vector.

**Fix:** Use a sanitizer (e.g., `DOMPurify` server-side or `sanitize-html`) on any field that could be rendered as HTML.

---

### 13. Magic Numbers Without Named Constants
**Files:** Multiple API routes

Values like `4` (hours for urgent), `5` (MB image limit), `5` (max images per donation) are scattered as inline literals.

**Fix:** Move to a shared `lib/constants.ts` file.

---

### 14. Console Logs May Leak Sensitive Data
**Files:** Multiple API routes

Several catch blocks log raw error objects (`console.error(error)`). In production these can surface database errors, stack traces, or internal details.

**Fix:** Use a structured logger (e.g., `pino`) with separate log levels, and ensure stack traces are never sent to the client.

---

### 15. Silent Failures with `.catch(() => null)`
**Files:** Multiple routes (e.g., `donation-matching.ts`)

Fire-and-forget async calls swallow errors silently:
```ts
notifyDonor(donationId).catch(() => null)
```

**Fix:** At minimum log the error; ideally use a background job queue (e.g., Inngest, BullMQ) for reliability.

---

## Low Priority / Code Quality 🔵

### 16. No Tests
No unit, integration, or end-to-end tests exist in the project.

**Fix:** Add at minimum integration tests for the critical paths: donation creation, acceptance, pickup OTP flow, admin verification.

---

### 17. No API Documentation
No OpenAPI/Swagger spec or README documenting the API surface.

**Fix:** Add a `docs/api.md` or integrate `swagger-jsdoc` to auto-generate docs.

---

### 18. `eslint-disable` Comments Masking Type Issues
**Files:** `lib/api/auth-guard.ts` and others

Multiple `@typescript-eslint/no-explicit-any` suppression comments indicate weak typing in the auth guard context type.

**Fix:** Define proper generic types for route context instead of suppressing lint.

---

### 19. `ignoreBuildErrors` Hides Downstream TS Errors
Already covered in #2 above, but worth noting that any existing TS errors (hidden by the config) should be surfaced and fixed.

---

### 20. No Soft Deletes
**File:** `app/api/auth/account/route.ts`

Account deletion is immediate and cascading — all user data is permanently deleted. This conflicts with GDPR requirements (30-day deletion period, audit trail) and with potential dispute resolution needs.

**Fix:** Add a `deleted_at` column and a soft-delete pattern; schedule hard deletes via a cron job after a retention period.

---

## Summary Table

| # | Priority | Category | File / Area |
|---|----------|----------|-------------|
| 1 | 🔴 Critical | Security | `.env.local` — credentials exposed |
| 2 | 🔴 Critical | Config | `next.config.mjs` — TS errors ignored |
| 3 | 🔴 Critical | Security | Image upload Cloudinary signing bug |
| 4 | 🟡 High | Feature | Donation new page is non-functional |
| 5 | 🟡 High | Security | OTP delivered via notification, not SMS |
| 6 | 🟡 High | Performance | N+1 queries in admin users endpoint |
| 7 | 🟡 High | Business Logic | No verification check before donation post |
| 8 | 🟡 High | Data | `quantity_kg` type mismatch |
| 9 | 🟡 High | Reliability | DB functions assumed to exist |
| 10 | 🟠 Medium | Security | No rate limiting |
| 11 | 🟠 Medium | Security | No CSRF protection |
| 12 | 🟠 Medium | Security | No server-side input sanitization |
| 13 | 🟠 Medium | Code Quality | Magic numbers without constants |
| 14 | 🟠 Medium | Observability | Raw error logging in production |
| 15 | 🟠 Medium | Reliability | Silent `.catch(() => null)` swallowing errors |
| 16 | 🔵 Low | Testing | No test suite |
| 17 | 🔵 Low | Docs | No API documentation |
| 18 | 🔵 Low | Code Quality | `eslint-disable` masking type issues |
| 19 | 🔵 Low | Code Quality | Residual TS errors hidden by config |
| 20 | 🔵 Low | Compliance | No soft deletes / GDPR retention |

---

## Recommended Action Order

**This week:**
1. Rotate all credentials in Neon and Clerk dashboards
2. Add `.env.local` to `.gitignore`, create `.env.example`
3. Fix `ignoreBuildErrors` → `false` and resolve TypeScript errors
4. Fix Cloudinary signature logic

**Next sprint:**
5. Wire up the donation creation form
6. Implement SMS OTP delivery (Twilio/MSG91)
7. Refactor admin users query to use SQL JOINs
8. Add rate limiting middleware
9. Add named constants file

**Backlog:**
10. Integration test suite
11. API documentation
12. Soft deletes + GDPR compliance
13. Structured logging
14. Background job queue for notifications
