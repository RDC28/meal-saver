# MealSaver — Database

## Files

| File | Purpose | Run order |
|------|---------|-----------|
| `schema.sql` | Tables, enums, indexes, triggers | **1st** |
| `rls_policies.sql` | Row Level Security policies | **2nd** |
| `functions.sql` | Matching algorithm + helper functions | **3rd** |
| `seed.sql` | Sample data for development only | Last (dev only) |

## Quick Start

Open the Supabase SQL Editor and run each file in order.  
See [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) for full instructions.

## Entity Relationship Diagram

```
┌─────────────┐         ┌─────────────────┐
│  auth.users │──1:1───▶│     users        │
│  (Supabase) │         │  id, email,      │
└─────────────┘         │  role, phone     │
                         └────────┬────────┘
                                  │ 1:1
               ┌──────────────────┼──────────────────┐
               ▼                  ▼                   ▼
    ┌──────────────────┐ ┌──────────────────┐ (admin/delivery)
    │  donor_profiles  │ │receiver_profiles │
    │  business_name   │ │organization_name │
    │  location(GIS)   │ │location(GIS)     │
    │  business_type   │ │service_area_km   │
    │  fssai_number    │ │accepts_veg/etc   │
    └────────┬─────────┘ └────────┬─────────┘
             │ 1:many             │ 1:many
             ▼                   ▼
    ┌─────────────────┐  ┌────────────────────────────────┐
    │   donations     │  │  donation_receiver_notifications│
    │  title, qty_kg  │  │  (tracks NGO responses)        │
    │  food_type      │◀─│  donation_id, receiver_id      │
    │  expiry_time    │  │  response: accepted/rejected   │
    │  status         │  └────────────────────────────────┘
    │  pickup_location│
    └────────┬────────┘
             │ 1:1
             ▼
    ┌───────────────────┐
    │ pickup_assignments│
    │  receiver_id      │
    │  pickup_type      │
    │  otp_code         │
    │  pickup_status    │
    └────────┬──────────┘
             │ 1:1
             ▼
    ┌──────────────────────┐
    │ delivery_confirmations│
    │  quantity_received   │
    │  food_condition      │
    │  is_food_safe        │
    └────────┬─────────────┘
             │ triggers
             ▼
    ┌──────────────────┐
    │  impact_reports  │
    │  meals_saved     │
    │  food_saved_kg   │
    │  co2_impact_kg   │
    └──────────────────┘

Supporting:
    donations ──1:many──▶ donation_images
    users     ──1:many──▶ notifications
    users     ──1:many──▶ user_verifications
    admins    ──1:many──▶ admin_actions
```

## Key Design Decisions

### PostGIS for Location
- `donor_profiles.location` and `receiver_profiles.location` are `GEOGRAPHY(POINT, 4326)`
- `donations.pickup_location` is also `GEOGRAPHY(POINT, 4326)`
- All stored as `POINT(longitude latitude)` (note: lon before lat in WKT)
- `find_nearby_receivers()` uses `ST_DWithin()` for radius filtering + `ST_Distance()` for sorting

### Donation Status Machine
```
available → pending_acceptance → accepted → pickup_assigned → picked_up → delivered
         ↘ expired (no pickup within expiry_time)
         ↘ cancelled (donor cancelled)
         ↘ rejected (all NGOs declined)
         ↘ unsafe (food found unsafe after inspection)
```

### Auto-triggers
- `handle_new_user()` — creates `users` row on Supabase auth signup
- `update_updated_at_column()` — keeps `updated_at` fresh on all major tables
- `trigger_donation_pickup_status()` — syncs donation status when pickup is assigned/completed
- `trigger_generate_impact_report()` — auto-creates impact report on delivery confirmation

### Matching Algorithm
`find_nearby_receivers(donation_id)` filters by:
1. `verification_status = 'verified'`
2. NGO within their own `service_area_km`
3. Food type compatibility (veg/non-veg/vegan)
4. Food condition compatibility (cooked/raw/packaged)
5. Category compatibility (short-term / long-term)
6. Capacity check
7. Excludes NGOs already notified for this donation

Results sorted by distance ascending (nearest first).
