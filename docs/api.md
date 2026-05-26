# MealSaver API Reference

All endpoints return JSON with shape `{ data, error: null }` on success or `{ data: null, error: { message, code } }` on failure.

Authentication is handled by Clerk. Protected routes require a valid Clerk session cookie.

---

## Auth

### `POST /api/auth/signup`
Create an account and (optionally) a donor or receiver profile in one step.

**Body**
```json
{
  "email": "string",
  "password": "string (min 8)",
  "full_name": "string",
  "phone": "string (optional)",
  "role": "donor | receiver",

  // Donor fields (required when role=donor)
  "business_name": "string",
  "business_type": "restaurant | bakery | cafe | caterer | supermarket | vegetable_vendor | individual | grocery | other",
  "address": "string",
  "city": "string",
  "food_license_number": "string (optional)",

  // Receiver fields (required when role=receiver)
  "organization_name": "string",
  "organization_type": "ngo | shelter | orphanage | community_kitchen | animal_shelter | feeding_program | other",
  "service_area_km": "number (1–100, default 10)",
  "accepts_veg": "boolean",
  "accepts_non_veg": "boolean",
  "accepts_vegan": "boolean",
  "accepts_cooked": "boolean",
  "accepts_raw": "boolean",
  "accepts_packaged": "boolean",
  "accepts_short_term": "boolean",
  "accepts_long_term": "boolean"
}
```

**Responses** — `201 Created` / `409 EMAIL_TAKEN` / `400 AUTH_ERROR`

---

### `GET /api/auth/me`
Returns the authenticated user's profile and completion status.

**Auth:** any signed-in user

---

### `PATCH /api/auth/me`
Update full name or phone number.

**Body** `{ full_name?, phone? }`

---

### `POST /api/auth/logout`
Revoke the current Clerk session.

---

### `DELETE /api/auth/account`
Soft-delete the caller's account (`is_active = false`). Data is retained for 30 days.

---

## Donations

### `GET /api/donations`
List donations. Role-based defaults apply (donors see their own; receivers see available).

**Auth:** any signed-in user

**Query params**
| Param | Type | Default |
|-------|------|---------|
| status | available \| pending_acceptance \| accepted \| pickup_assigned \| picked_up \| delivered \| expired \| cancelled \| rejected \| unsafe | — |
| city | string | — |
| food_category | short_term \| long_term | — |
| food_type | veg \| non_veg \| vegan | — |
| food_condition | cooked \| raw \| packaged | — |
| is_urgent | true \| false | — |
| my | true \| false | — |
| page | number | 1 |
| limit | number | 20 |

**Response** `{ donations: [...], pagination: { page, limit, total, pages } }`

---

### `POST /api/donations`
Create a new donation.

**Auth:** donor (profile must exist)  
**Rate limit:** 20 per IP per hour

**Body**
```json
{
  "title": "string (3–120)",
  "description": "string (optional, max 1000)",
  "food_category": "short_term | long_term",
  "food_type": "veg | non_veg | vegan",
  "food_condition": "cooked | raw | packaged",
  "quantity_kg": "number (positive)",
  "quantity_description": "string (optional)",
  "serves_approx": "integer (optional)",
  "preparation_time": "ISO 8601 datetime (optional)",
  "expiry_time": "ISO 8601 datetime (required, must be future)",
  "preferred_pickup_time": "ISO 8601 datetime (optional)",
  "pickup_address": "string (min 5)",
  "pickup_city": "string (min 2)",
  "pickup_latitude": "number (optional)",
  "pickup_longitude": "number (optional)",
  "pickup_instructions": "string (optional, max 500)",
  "contact_number": "string"
}
```

**Response** `201 Created` with donation object + NGO matching triggered in background.

---

### `GET /api/donations/:id`
Get a single donation with images and donor profile.

---

### `PUT /api/donations/:id`
Update a donation (title, quantity, times, etc.). Only `available` status donations can be edited.

**Auth:** donation owner (donor)

---

### `DELETE /api/donations/:id`
Cancel a donation. Only `available` or `cancelled` donations can be deleted.

**Auth:** donation owner (donor)

---

### `POST /api/donations/:id/accept`
Accept a donation as an NGO. Uses a database transaction to prevent race conditions.

**Auth:** receiver

---

### `POST /api/donations/:id/reject`
Reject a donation that was matched to this receiver.

**Auth:** receiver

---

### `POST /api/donations/:id/images`
Upload an image for a donation (multipart/form-data, field: `image`).

**Auth:** donation owner (donor)  
**Constraints:** JPEG/PNG/WebP, max 5 MB, max 5 images per donation

---

### `DELETE /api/donations/:id/images/:imageId`
Remove an image. If the deleted image was primary, the next image is promoted.

---

## Pickups

### `GET /api/pickups`
List pickup assignments for the current receiver.

**Auth:** receiver

---

### `POST /api/pickups`
Create a pickup assignment for an accepted donation.

**Auth:** receiver

**Body** `{ donation_id, scheduled_pickup_time?, pickup_notes? }`

---

### `GET /api/pickups/:id`
Get a single pickup assignment with donation details.

---

### `POST /api/pickups/:id/otp`
Generate a 6-digit OTP for pickup verification. OTP is sent to the donor via SMS (if Twilio is configured) or in-app notification.

**Auth:** receiver (must own the pickup)  
**Rate limit:** 3 per IP per 5 minutes

---

### `POST /api/pickups/:id/verify-otp`
Verify the OTP provided by the receiver. Transitions status to `verified`.

**Auth:** donor | receiver | admin

**Body** `{ otp: "string (6 digits)" }`

---

### `POST /api/pickups/:id/complete`
Mark pickup as complete. Requires OTP to have been verified first.

**Auth:** receiver

---

## Impact

### `GET /api/impact/donor`
Get impact summary and recent reports for the authenticated donor.

**Auth:** donor

---

### `GET /api/impact/receiver`
Get impact summary for the authenticated receiver.

**Auth:** receiver

---

### `GET /api/impact/:donationId`
Get the impact report for a specific donation.

---

## Notifications

### `GET /api/notifications`
List notifications for the current user (paginated).

### `GET /api/notifications/unread-count`
Get count of unread notifications.

### `POST /api/notifications/read-all`
Mark all notifications as read.

### `PATCH /api/notifications/:id/read`
Mark a single notification as read.

### `DELETE /api/notifications/:id`
Delete a notification.

---

## Admin

All admin endpoints require `role = admin`.

### `GET /api/admin/users`
List all users with joined donor/receiver profiles. Supports filtering by role, city, verification_status, and free-text search.

**Query params:** `role`, `verification_status`, `city`, `search`, `page`, `limit`

### `GET /api/admin/users/:id`
Get a single user with full profile and donation history.

### `PUT /api/admin/users/:id/verify`
Approve or reject a user's verification. Sends an in-app notification.

### `PUT /api/admin/users/:id/suspend`
Suspend or reinstate an account.

### `GET /api/admin/donations`
List all donations with filters. Supports `status`, `city`, `donor_id`, `page`, `limit`.

### `POST /api/admin/donations/:id/assign`
Manually assign a donation to a receiver (bypasses the normal acceptance flow).

### `GET /api/admin/reports`
Get aggregate stats for the admin dashboard.

---

## Cron

### `GET /api/cron/expire-donations`
Marks stale donations (`available` or `pending_acceptance`) as `expired` and notifies donors.

**Auth:** `Authorization: Bearer <CRON_SECRET>` header  
**Schedule:** every 15 minutes (configured in `vercel.json`)

---

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| UNAUTHORIZED | 401 | Not signed in |
| FORBIDDEN | 403 | Signed in but wrong role |
| NOT_FOUND | 404 | Resource does not exist |
| VALIDATION_ERROR | 422 | Invalid request body |
| INVALID_PARAMS | 422 | Invalid query parameters |
| CONFLICT | 409 | State conflict (e.g. donation already accepted) |
| RATE_LIMITED | 429 | Too many requests |
| SERVER_ERROR | 500 | Internal error |
