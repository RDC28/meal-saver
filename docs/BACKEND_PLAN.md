# MealSaver — Backend Development Plan

All backend code is built as **Next.js App Router API Route Handlers** in `app/api/`  
using the Supabase server client. Each part is independently testable.

---

## Shared Utilities (built first — used by all parts)

| File | Purpose | Status |
|------|---------|--------|
| `lib/api/response.ts` | Standard `ok()`, `created()`, `err()`, `unauthorized()`, etc. | ✅ Done |
| `lib/api/validate.ts` | Zod body + query param validation helpers | ✅ Done |
| `lib/api/auth-guard.ts` | `withAuth()` wrapper + role-specific shortcuts | ✅ Done |

---

## Part 1 — Authentication ✅ Done

**Folder:** `app/api/auth/`  
**Depends on:** Nothing (foundation for everything)

| Route | Method | What it does | Status |
|-------|--------|-------------|--------|
| `/api/auth/signup` | POST | Register new user (donor or receiver) | ✅ Done |
| `/api/auth/login` | POST | Sign in, return session + user profile | ✅ Done |
| `/api/auth/logout` | POST | Invalidate session | ✅ Done |
| `/api/auth/me` | GET | Get current user + profile completion status | ✅ Done |

**Test flow:**
```
POST /api/auth/signup  { email, password, full_name, role: "donor" }
POST /api/auth/login   { email, password }  → get session tokens
GET  /api/auth/me                           → see your profile
POST /api/auth/logout                       → session cleared
```

---

## Part 2 — Donor & Receiver Profiles ✅ Done

**Folder:** `app/api/donor/profile/`, `app/api/receiver/profile/`  
**Depends on:** Part 1

| Route | Method | What it does | Status |
|-------|--------|-------------|--------|
| `/api/donor/profile` | POST | Create donor business profile | ✅ Done |
| `/api/donor/profile` | GET | Fetch own donor profile | ✅ Done |
| `/api/donor/profile` | PUT | Update donor profile (address, license, etc.) | ✅ Done |
| `/api/receiver/profile` | POST | Create NGO/receiver profile | ✅ Done |
| `/api/receiver/profile` | GET | Fetch own receiver profile | ✅ Done |
| `/api/receiver/profile` | PUT | Update receiver profile (capacity, food prefs, location) | ✅ Done |

**Test flow:**
```
Login as donor
POST /api/donor/profile  { business_name, business_type, address, city, lat, lng }
GET  /api/donor/profile  → see your profile
PUT  /api/donor/profile  { city: "Mumbai" }
GET  /api/auth/me        → profile_complete: true
```

---

## Part 3 — Donations (Core CRUD + Image Upload)

**Folder:** `app/api/donations/`  
**Depends on:** Part 2

| Route | Method | What it does | Status |
|-------|--------|-------------|--------|
| `/api/donations` | POST | Create donation listing | ✅ Done |
| `/api/donations` | GET | List donations (filters: status, city, category, food_type) | ✅ Done |
| `/api/donations/[id]` | GET | Get single donation with images + donor info | ✅ Done |
| `/api/donations/[id]` | PUT | Update donation (only if status = available) | ✅ Done |
| `/api/donations/[id]` | DELETE | Delete donation (only if pending/available) | ✅ Done |
| `/api/donations/[id]/images` | POST | Upload food image to Supabase Storage | ✅ Done |
| `/api/donations/[id]/images/[imageId]` | DELETE | Remove a donation image | ✅ Done |

**Test flow:**
```
Login as donor (with completed profile)
POST /api/donations  { title, food_category, food_type, quantity_kg, expiry_time, ... }
POST /api/donations/:id/images  FormData with image file
GET  /api/donations              → list of available donations
GET  /api/donations/:id          → full donation detail
PUT  /api/donations/:id  { quantity_kg: 20 }
```

---

## Part 4 — Matching Engine & NGO Response

**Folder:** `app/api/donations/[id]/`, `app/api/receiver/donations/`  
**Depends on:** Part 3

| Route | Method | What it does | Status |
|-------|--------|-------------|--------|
| `/api/donations/[id]/match` | POST | Run `find_nearby_receivers()`, notify NGOs, status → `pending_acceptance` | ✅ Done |
| `/api/receiver/donations` | GET | List donations available near this NGO (filtered by preferences + location) | ✅ Done |
| `/api/donations/[id]/accept` | POST | NGO accepts donation, status → `accepted` | ✅ Done |
| `/api/donations/[id]/reject` | POST | NGO rejects, logs rejection, re-notifies next NGO | ✅ Done |
| `/api/donations/[id]/cancel` | POST | Donor cancels donation | ✅ Done |

**Test flow:**
```
Login as donor → POST /api/donations/:id/match
Login as NGO   → GET  /api/receiver/donations  → see donation in list
               → POST /api/donations/:id/accept
Login as donor → GET  /api/donations/:id       → status: "accepted"
```

---

## Part 5 — Pickup Management

**Folder:** `app/api/pickups/`  
**Depends on:** Part 4

| Route | Method | What it does | Status |
|-------|--------|-------------|--------|
| `/api/pickups` | POST | Assign pickup, status → `pickup_assigned` | ✅ Done |
| `/api/pickups/[id]` | GET | Get pickup details | ✅ Done |
| `/api/pickups/[id]/otp` | POST | Generate 6-digit OTP for in-person verification | ✅ Done |
| `/api/pickups/[id]/verify-otp` | POST | Submit OTP → marks `otp_verified = true` | ✅ Done |
| `/api/pickups/[id]/complete` | POST | Mark pickup complete → donation status → `picked_up` | ✅ Done |

**Test flow:**
```
After NGO accepts donation:
POST /api/pickups                  { donation_id, pickup_type: "ngo_pickup" }
POST /api/pickups/:id/otp          → get OTP code
POST /api/pickups/:id/verify-otp  { otp: "123456" }
POST /api/pickups/:id/complete
GET  /api/donations/:id            → status: "picked_up"
```

---

## Part 6 — Delivery Confirmation & Impact Reports

**Folder:** `app/api/deliveries/`, `app/api/impact/`  
**Depends on:** Part 5

| Route | Method | What it does | Status |
|-------|--------|-------------|--------|
| `/api/deliveries` | POST | Receiver confirms delivery, quantity, food condition | ✅ Done |
| `/api/impact/donor` | GET | Donor's impact summary (meals saved, kg rescued, CO2) | ✅ Done |
| `/api/impact/receiver` | GET | NGO's impact summary | ✅ Done |
| `/api/impact/[donationId]` | GET | Single donation impact report | ✅ Done |

**Note:** The `trigger_generate_impact_report()` DB trigger fires automatically on delivery  
confirmation insert — impact reports are created by the database, not the API.

**Test flow:**
```
After pickup complete:
POST /api/deliveries  { pickup_assignment_id, quantity_received_kg, food_condition_on_arrival }
→ DB trigger auto-creates impact_reports row
→ donation status → "delivered"

GET /api/impact/donor    → { total_donations, meals_saved, kg_rescued, co2_saved }
GET /api/impact/:donationId → full impact report
```

---

## Part 7 — Notifications

**Folder:** `app/api/notifications/`  
**Depends on:** Part 4 (notifications created during matching)

| Route | Method | What it does | Status |
|-------|--------|-------------|--------|
| `/api/notifications` | GET | Fetch user's notifications (paginated, newest first) | ✅ Done |
| `/api/notifications/unread-count` | GET | Count of unread notifications (for badge) | ✅ Done |
| `/api/notifications/[id]/read` | PUT | Mark single notification as read | ✅ Done |
| `/api/notifications/read-all` | PUT | Mark all notifications as read | ✅ Done |
| `/api/notifications/[id]` | DELETE | Delete a notification | ✅ Done |

**Test flow:**
```
Trigger a donation match (Part 4)
Login as NGO → GET /api/notifications → see "New donation near you!"
PUT /api/notifications/:id/read
GET /api/notifications/unread-count → { count: 0 }
```

---

## Part 8 — Admin Routes

**Folder:** `app/api/admin/`  
**Depends on:** Parts 1–6

| Route | Method | What it does | Status |
|-------|--------|-------------|--------|
| `/api/admin/users` | GET | List all users with verification status + filters | ✅ Done |
| `/api/admin/users/[id]` | GET | Get single user with full profile | ✅ Done |
| `/api/admin/users/[id]/verify` | PUT | Approve or reject donor/NGO verification | ✅ Done |
| `/api/admin/users/[id]/suspend` | PUT | Suspend or reactivate an account | ✅ Done |
| `/api/admin/donations` | GET | View all donations with full filters | ✅ Done |
| `/api/admin/donations/[id]/assign` | POST | Manually assign a donation to a specific NGO | ✅ Done |
| `/api/admin/reports` | GET | Platform-wide impact stats | ✅ Done |

**Test flow:**
```
Login as admin
GET  /api/admin/users?role=receiver&status=pending → list unverified NGOs
PUT  /api/admin/users/:id/verify  { status: "verified" }
→ NGO can now accept donations
GET  /api/admin/reports → { total_donations, total_meals_saved, active_ngos }
```

---

## Build Order

```
Shared Utilities (response, validate, auth-guard) ✅
    │
    ▼
Part 1 — Auth (signup, login, logout, me) ✅
    │
    ▼
Part 2 — Profiles (donor + receiver)
    │
    ▼
Part 3 — Donations CRUD + image upload
    │
    ▼
Part 4 — Matching engine + NGO accept/reject
    │
    ├──▶ Part 5 — Pickup management
    │           │
    │           ▼
    │    Part 6 — Delivery + Impact reports
    │
    └──▶ Part 7 — Notifications (parallel with Part 5)

Part 8 — Admin (built last, depends on all above)
```

---

## API Response Format (consistent across all routes)

**Success:**
```json
{
  "data": { "..." },
  "error": null
}
```

**Error:**
```json
{
  "data": null,
  "error": {
    "message": "Human-readable description",
    "code": "SNAKE_CASE_CODE"
  }
}
```

**Common error codes:**

| Code | HTTP | When |
|------|------|------|
| `UNAUTHORIZED` | 401 | Not logged in |
| `FORBIDDEN` | 403 | Wrong role / suspended |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 422 | Bad request body |
| `CONFLICT` | 409 | Duplicate (e.g. email taken) |
| `SERVER_ERROR` | 500 | Unexpected failure |
