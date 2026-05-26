-- =============================================================
-- MealSaver — Seed Data (Development only)
-- Run AFTER schema.sql, rls_policies.sql, and functions.sql
-- WARNING: Do NOT run in production
--
-- HOW IT WORKS:
--   1. Inserts into auth.users first (Supabase auth table)
--   2. The handle_new_user() trigger auto-creates public.users rows
--   3. Then inserts donor/receiver profiles, donations, etc.
--
-- TEST LOGIN CREDENTIALS (all accounts):
--   Password: Test1234!
-- =============================================================

DO $$
DECLARE
  -- Fixed UUIDs so seed is idempotent (safe to re-run)
  admin_id        UUID := 'a0000000-0000-0000-0000-000000000001';
  donor1_id       UUID := 'b0000000-0000-0000-0000-000000000001';
  donor2_id       UUID := 'b0000000-0000-0000-0000-000000000002';
  receiver1_id    UUID := 'c0000000-0000-0000-0000-000000000001';
  receiver2_id    UUID := 'c0000000-0000-0000-0000-000000000002';

  donor1_profile_id   UUID;
  donor2_profile_id   UUID;
  receiver1_profile_id UUID;
  donation1_id    UUID := 'd0000000-0000-0000-0000-000000000001';
  donation2_id    UUID := 'd0000000-0000-0000-0000-000000000002';

BEGIN

-- ─────────────────────────────────────────────────────────────
-- STEP 1: Insert into auth.users FIRST
-- The handle_new_user() trigger will auto-create public.users rows.
-- raw_user_meta_data carries full_name and role for the trigger.
-- ─────────────────────────────────────────────────────────────
INSERT INTO auth.users (
  id,
  aud,
  role,                     -- postgres role (always 'authenticated')
  email,
  encrypted_password,       -- bcrypt hash of 'Test1234!'
  email_confirmed_at,       -- pre-confirmed so login works immediately
  raw_app_meta_data,
  raw_user_meta_data,       -- trigger reads: full_name, role, avatar_url
  created_at,
  updated_at
)
VALUES
  (
    admin_id,
    'authenticated', 'authenticated',
    'admin@mealsaver.in',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"MealSaver Admin","role":"admin"}',
    NOW(), NOW()
  ),
  (
    donor1_id,
    'authenticated', 'authenticated',
    'sharma.cafe@example.com',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Rajesh Sharma","role":"donor"}',
    NOW(), NOW()
  ),
  (
    donor2_id,
    'authenticated', 'authenticated',
    'greenleaf@example.com',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Priya Verma","role":"donor"}',
    NOW(), NOW()
  ),
  (
    receiver1_id,
    'authenticated', 'authenticated',
    'hopefound@example.com',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Hope Foundation NGO","role":"receiver"}',
    NOW(), NOW()
  ),
  (
    receiver2_id,
    'authenticated', 'authenticated',
    'annapoorna@example.com',
    crypt('Test1234!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Annapoorna Trust","role":"receiver"}',
    NOW(), NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- STEP 2: Update phone numbers on public.users
-- The trigger doesn't set phone — patch it here.
-- ─────────────────────────────────────────────────────────────
UPDATE public.users SET phone = '+919999000001' WHERE id = admin_id;
UPDATE public.users SET phone = '+919876543210' WHERE id = donor1_id;
UPDATE public.users SET phone = '+919123456789' WHERE id = donor2_id;
UPDATE public.users SET phone = '+911234567890' WHERE id = receiver1_id;
UPDATE public.users SET phone = '+910987654321' WHERE id = receiver2_id;

-- ─────────────────────────────────────────────────────────────
-- STEP 3: Donor Profiles
-- ─────────────────────────────────────────────────────────────
INSERT INTO donor_profiles (
  user_id, business_name, business_type, phone,
  address, city, state, pincode,
  location,
  food_license_number, verification_status, verified_at, verified_by
) VALUES
  (
    donor1_id,
    'Sharma Café & Restaurant', 'cafe', '+919876543210',
    '12 MG Road, Connaught Place', 'New Delhi', 'Delhi', '110001',
    ST_GeogFromText('POINT(77.2090 28.6139)'),
    'FSSAI-DL-2024-001', 'verified', NOW() - INTERVAL '30 days', admin_id
  ),
  (
    donor2_id,
    'Green Leaf Supermarket', 'supermarket', '+919123456789',
    '45 Brigade Road, Vasant Vihar', 'New Delhi', 'Delhi', '110057',
    ST_GeogFromText('POINT(77.1674 28.5672)'),
    'FSSAI-DL-2024-002', 'verified', NOW() - INTERVAL '15 days', admin_id
  )
ON CONFLICT (user_id) DO NOTHING;

SELECT id INTO donor1_profile_id FROM donor_profiles WHERE user_id = donor1_id;
SELECT id INTO donor2_profile_id FROM donor_profiles WHERE user_id = donor2_id;

-- ─────────────────────────────────────────────────────────────
-- STEP 4: Receiver Profiles (NGOs)
-- ─────────────────────────────────────────────────────────────
INSERT INTO receiver_profiles (
  user_id, organization_name, organization_type, phone,
  address, city, state, pincode,
  location,
  service_area_km, max_capacity_kg,
  accepts_veg, accepts_non_veg, accepts_cooked, accepts_raw, accepts_packaged,
  registration_number, verification_status, verified_at, verified_by
) VALUES
  (
    receiver1_id,
    'Hope Foundation', 'ngo', '+911234567890',
    '8 Lodhi Colony Market', 'New Delhi', 'Delhi', '110003',
    ST_GeogFromText('POINT(77.2330 28.5902)'),
    15, 200.00,
    TRUE, TRUE, TRUE, TRUE, TRUE,
    'NGO-DL-2019-0042', 'verified', NOW() - INTERVAL '60 days', admin_id
  ),
  (
    receiver2_id,
    'Annapoorna Trust', 'community_kitchen', '+910987654321',
    '3 Karol Bagh Extension', 'New Delhi', 'Delhi', '110005',
    ST_GeogFromText('POINT(77.1904 28.6508)'),
    10, 100.00,
    TRUE, FALSE, TRUE, TRUE, TRUE,
    'TRUST-DL-2021-0088', 'verified', NOW() - INTERVAL '45 days', admin_id
  )
ON CONFLICT (user_id) DO NOTHING;

SELECT id INTO receiver1_profile_id FROM receiver_profiles WHERE user_id = receiver1_id;

-- ─────────────────────────────────────────────────────────────
-- STEP 5: Sample Donations
-- ─────────────────────────────────────────────────────────────
INSERT INTO donations (
  id, donor_id, donor_profile_id,
  title, description,
  food_category, food_type, food_condition,
  quantity_kg, quantity_description, serves_approx,
  preparation_time, expiry_time,
  pickup_address, pickup_city, pickup_location,
  pickup_instructions, contact_number,
  status, is_urgent
) VALUES
  (
    donation1_id,
    donor1_id, donor1_profile_id,
    'Freshly cooked Dal Makhani & Rice',
    '50 portions of dal makhani with basmati rice, prepared this morning',
    'short_term', 'veg', 'cooked',
    15.00, '50 full meals in steel trays', 50,
    NOW() - INTERVAL '2 hours',
    NOW() + INTERVAL '3 hours',
    '12 MG Road, Connaught Place', 'New Delhi',
    ST_GeogFromText('POINT(77.2090 28.6139)'),
    'Call before coming. Enter from back gate. Ask for Ramesh.',
    '+919876543210',
    'available', TRUE
  ),
  (
    donation2_id,
    donor2_id, donor2_profile_id,
    'Surplus Rice Bags & Atta',
    'Unopened 10kg rice bags and 5kg atta packs, expiry 6 months away',
    'long_term', 'veg', 'packaged',
    80.00, '5x 10kg rice bags + 6x 5kg atta packs', 250,
    NULL,
    NOW() + INTERVAL '180 days',
    '45 Brigade Road, Vasant Vihar', 'New Delhi',
    ST_GeogFromText('POINT(77.1674 28.5672)'),
    'Available Mon–Sat, 10am–5pm. Contact Priya.',
    '+919123456789',
    'available', FALSE
  )
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- STEP 6: Sample Notification
-- ─────────────────────────────────────────────────────────────
INSERT INTO notifications (user_id, type, title, message, data)
VALUES (
  receiver1_id,
  'donation_available',
  'New donation near you!',
  'Sharma Café has 50 meals of Dal Makhani available — pickup within 3 hours.',
  jsonb_build_object('donation_id', donation1_id, 'distance_km', 1.8)
)
ON CONFLICT DO NOTHING;

RAISE NOTICE '✅ Seed complete. Login with any email below, password: Test1234!';
RAISE NOTICE '   admin@mealsaver.in      (admin)';
RAISE NOTICE '   sharma.cafe@example.com (donor)';
RAISE NOTICE '   greenleaf@example.com   (donor)';
RAISE NOTICE '   hopefound@example.com   (receiver)';
RAISE NOTICE '   annapoorna@example.com  (receiver)';

END $$;
