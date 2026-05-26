-- =============================================================
-- MealSaver — PostgreSQL Schema
-- Designed for Supabase (links to auth.users)
-- =============================================================

-- ────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";          -- spatial queries (nearest NGO)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";          -- fuzzy text search on food titles

-- ────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM (
  'donor',
  'receiver',
  'admin',
  'delivery_partner'
);

CREATE TYPE verification_status AS ENUM (
  'pending',
  'verified',
  'rejected',
  'suspended'
);

CREATE TYPE donation_status AS ENUM (
  'available',
  'pending_acceptance',
  'accepted',
  'pickup_assigned',
  'picked_up',
  'delivered',
  'expired',
  'cancelled',
  'rejected',
  'unsafe'
);

CREATE TYPE food_type AS ENUM (
  'veg',
  'non_veg',
  'vegan'
);

CREATE TYPE food_condition AS ENUM (
  'cooked',
  'raw',
  'packaged'
);

CREATE TYPE food_category AS ENUM (
  'short_term',   -- cooked food, cut veg, bakery – needs pickup within hours
  'long_term'     -- rice bags, dry groceries, packaged – can wait days
);

CREATE TYPE pickup_type AS ENUM (
  'ngo_pickup',        -- NGO sends someone to collect
  'donor_dropoff',     -- Donor drops off at NGO
  'delivery_partner'   -- Third-party logistics
);

CREATE TYPE pickup_status AS ENUM (
  'assigned',
  'in_progress',
  'verified',
  'completed',
  'failed'
);

CREATE TYPE notification_type AS ENUM (
  'donation_available',
  'donation_accepted',
  'donation_rejected',
  'pickup_assigned',
  'pickup_completed',
  'delivery_confirmed',
  'donation_expired',
  'verification_update',
  'general'
);

CREATE TYPE business_type AS ENUM (
  'restaurant',
  'bakery',
  'cafe',
  'caterer',
  'supermarket',
  'vegetable_vendor',
  'individual',
  'grocery',
  'other'
);

CREATE TYPE organization_type AS ENUM (
  'ngo',
  'shelter',
  'orphanage',
  'community_kitchen',
  'animal_shelter',
  'feeding_program',
  'other'
);

-- ────────────────────────────────────────────────────────────
-- USERS
-- Links to Supabase auth.users — created via trigger on signup
-- ────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT        NOT NULL UNIQUE,
  full_name     TEXT,
  phone         TEXT,
  avatar_url    TEXT,
  role          user_role   NOT NULL DEFAULT 'donor',
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Public profile linked to Supabase auth.users. Created automatically on signup via trigger.';

-- ────────────────────────────────────────────────────────────
-- DONOR PROFILES
-- ────────────────────────────────────────────────────────────
CREATE TABLE donor_profiles (
  id                    UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID              NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name         TEXT              NOT NULL,
  business_type         business_type     NOT NULL DEFAULT 'restaurant',
  phone                 TEXT,
  address               TEXT              NOT NULL,
  city                  TEXT              NOT NULL,
  state                 TEXT,
  pincode               TEXT,
  -- PostGIS geography column — store as POINT(longitude, latitude)
  location              GEOGRAPHY(POINT, 4326),
  food_license_number   TEXT,             -- FSSAI or equivalent
  gst_number            TEXT,
  verification_status   verification_status NOT NULL DEFAULT 'pending',
  verified_at           TIMESTAMPTZ,
  verified_by           UUID              REFERENCES users(id),
  created_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN donor_profiles.location IS 'PostGIS POINT(longitude latitude) — used for nearby-receiver matching.';

-- ────────────────────────────────────────────────────────────
-- RECEIVER PROFILES (NGOs, Shelters, etc.)
-- ────────────────────────────────────────────────────────────
CREATE TABLE receiver_profiles (
  id                      UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID                NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  organization_name       TEXT                NOT NULL,
  organization_type       organization_type   NOT NULL DEFAULT 'ngo',
  phone                   TEXT,
  address                 TEXT                NOT NULL,
  city                    TEXT                NOT NULL,
  state                   TEXT,
  pincode                 TEXT,
  location                GEOGRAPHY(POINT, 4326),
  service_area_km         INTEGER             NOT NULL DEFAULT 10,   -- max travel distance
  max_capacity_kg         DECIMAL(10,2),                             -- max food they can handle at once
  -- food preferences
  accepts_veg             BOOLEAN             NOT NULL DEFAULT TRUE,
  accepts_non_veg         BOOLEAN             NOT NULL DEFAULT FALSE,
  accepts_vegan           BOOLEAN             NOT NULL DEFAULT TRUE,
  accepts_cooked          BOOLEAN             NOT NULL DEFAULT TRUE,
  accepts_raw             BOOLEAN             NOT NULL DEFAULT TRUE,
  accepts_packaged        BOOLEAN             NOT NULL DEFAULT TRUE,
  accepts_short_term      BOOLEAN             NOT NULL DEFAULT TRUE,
  accepts_long_term       BOOLEAN             NOT NULL DEFAULT TRUE,
  -- verification
  registration_number     TEXT,               -- NGO / trust registration
  verification_status     verification_status NOT NULL DEFAULT 'pending',
  verified_at             TIMESTAMPTZ,
  verified_by             UUID                REFERENCES users(id),
  created_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- DONATIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE donations (
  id                      UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_id                UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  donor_profile_id        UUID              NOT NULL REFERENCES donor_profiles(id),
  -- Food details
  title                   TEXT              NOT NULL,
  description             TEXT,
  food_category           food_category     NOT NULL,
  food_type               food_type         NOT NULL,
  food_condition          food_condition    NOT NULL,
  quantity_kg             DECIMAL(10,2)     NOT NULL CHECK (quantity_kg > 0),
  quantity_description    TEXT,             -- human-friendly: "50 bread loaves", "3 trays of biryani"
  serves_approx           INTEGER,          -- estimated number of people
  -- Timing
  preparation_time        TIMESTAMPTZ,      -- when food was prepared (cooked food)
  expiry_time             TIMESTAMPTZ       NOT NULL, -- must be picked up before this
  preferred_pickup_time   TIMESTAMPTZ,
  -- Pickup location
  pickup_address          TEXT              NOT NULL,
  pickup_city             TEXT              NOT NULL,
  pickup_location         GEOGRAPHY(POINT, 4326),
  pickup_instructions     TEXT,
  contact_number          TEXT              NOT NULL,
  -- Status & metadata
  status                  donation_status   NOT NULL DEFAULT 'available',
  is_urgent               BOOLEAN           NOT NULL DEFAULT FALSE,
  admin_notes             TEXT,
  created_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  CONSTRAINT expiry_after_now CHECK (expiry_time > created_at)
);

COMMENT ON COLUMN donations.food_category IS 'short_term = cooked/perishable (hours), long_term = dry goods (days/weeks)';
COMMENT ON COLUMN donations.serves_approx IS 'Estimated meals — used for impact_reports.meals_saved';

-- ────────────────────────────────────────────────────────────
-- DONATION IMAGES
-- ────────────────────────────────────────────────────────────
CREATE TABLE donation_images (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id   UUID        NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  image_url     TEXT        NOT NULL,          -- Supabase Storage or Cloudinary URL
  storage_path  TEXT,                          -- Supabase Storage bucket path (for deletion)
  is_primary    BOOLEAN     NOT NULL DEFAULT FALSE,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- DONATION RECEIVER NOTIFICATIONS
-- Tracks which NGOs were notified + their response
-- Used by matching algorithm and emergency fallback
-- ────────────────────────────────────────────────────────────
CREATE TABLE donation_receiver_notifications (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id     UUID        NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  receiver_id     UUID        NOT NULL REFERENCES users(id),
  notified_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response        TEXT        CHECK (response IN ('accepted', 'rejected', 'no_response')) DEFAULT 'no_response',
  responded_at    TIMESTAMPTZ,
  rejection_reason TEXT,

  UNIQUE(donation_id, receiver_id)
);

COMMENT ON TABLE donation_receiver_notifications IS 'Tracks which NGOs received a donation notification and how they responded. Used for matching, fallback, and reliability scoring.';

-- ────────────────────────────────────────────────────────────
-- PICKUP ASSIGNMENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE pickup_assignments (
  id                    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id           UUID            NOT NULL UNIQUE REFERENCES donations(id) ON DELETE CASCADE,
  receiver_id           UUID            NOT NULL REFERENCES users(id),
  receiver_profile_id   UUID            NOT NULL REFERENCES receiver_profiles(id),
  pickup_type           pickup_type     NOT NULL DEFAULT 'ngo_pickup',
  delivery_partner_id   UUID            REFERENCES users(id),    -- populated if pickup_type = delivery_partner
  pickup_status         pickup_status   NOT NULL DEFAULT 'assigned',
  scheduled_pickup_time TIMESTAMPTZ,
  actual_pickup_time    TIMESTAMPTZ,
  otp_code              TEXT,           -- 4-6 digit code for verification at pickup
  otp_verified          BOOLEAN         NOT NULL DEFAULT FALSE,
  pickup_notes          TEXT,
  assigned_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- DELIVERY CONFIRMATIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE delivery_confirmations (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  pickup_assignment_id      UUID        NOT NULL UNIQUE REFERENCES pickup_assignments(id) ON DELETE CASCADE,
  donation_id               UUID        NOT NULL REFERENCES donations(id),
  receiver_id               UUID        NOT NULL REFERENCES users(id),
  quantity_received_kg      DECIMAL(10,2),
  food_condition_on_arrival TEXT,       -- 'good', 'acceptable', 'poor'
  is_food_safe              BOOLEAN     NOT NULL DEFAULT TRUE,
  receiver_notes            TEXT,
  confirmed_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- IMPACT REPORTS
-- Auto-generated after delivery confirmation
-- ────────────────────────────────────────────────────────────
CREATE TABLE impact_reports (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id               UUID        NOT NULL UNIQUE REFERENCES donations(id) ON DELETE CASCADE,
  donor_id                  UUID        NOT NULL REFERENCES users(id),
  receiver_id               UUID        NOT NULL REFERENCES users(id),
  meals_saved               INTEGER,            -- calculated from serves_approx
  food_waste_reduced_kg     DECIMAL(10,2),      -- = quantity_received_kg
  co2_impact_kg             DECIMAL(10,2),      -- estimated: ~2.5kg CO2 per kg food saved
  people_served             INTEGER,
  receiver_confirmed        BOOLEAN     NOT NULL DEFAULT FALSE,
  donor_report_generated    BOOLEAN     NOT NULL DEFAULT FALSE,
  report_generated_at       TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN impact_reports.co2_impact_kg IS 'Estimated CO2 saved. Formula: food_waste_reduced_kg * 2.5 (industry average)';

-- ────────────────────────────────────────────────────────────
-- NOTIFICATIONS (in-app)
-- ────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id                    UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                  notification_type   NOT NULL,
  title                 TEXT                NOT NULL,
  message               TEXT                NOT NULL,
  related_donation_id   UUID                REFERENCES donations(id) ON DELETE SET NULL,
  data                  JSONB               NOT NULL DEFAULT '{}',
  is_read               BOOLEAN             NOT NULL DEFAULT FALSE,
  read_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- USER VERIFICATIONS (document uploads)
-- ────────────────────────────────────────────────────────────
CREATE TABLE user_verifications (
  id                UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type     TEXT                NOT NULL,   -- 'fssai', 'ngo_registration', 'gst', 'identity'
  document_url      TEXT                NOT NULL,   -- Supabase Storage URL
  storage_path      TEXT,
  status            verification_status NOT NULL DEFAULT 'pending',
  reviewed_by       UUID                REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  uploaded_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- ADMIN ACTIONS (audit log)
-- ────────────────────────────────────────────────────────────
CREATE TABLE admin_actions (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id      UUID        NOT NULL REFERENCES users(id),
  action_type   TEXT        NOT NULL,    -- 'verify_user', 'reject_donation', 'manual_assign', etc.
  target_type   TEXT        NOT NULL,    -- 'user', 'donation', 'pickup', 'receiver'
  target_id     UUID        NOT NULL,
  description   TEXT,
  metadata      JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────

-- Donations — most queried table
CREATE INDEX idx_donations_status        ON donations(status);
CREATE INDEX idx_donations_donor_id      ON donations(donor_id);
CREATE INDEX idx_donations_expiry_time   ON donations(expiry_time);
CREATE INDEX idx_donations_category      ON donations(food_category);
CREATE INDEX idx_donations_created_at    ON donations(created_at DESC);
CREATE INDEX idx_donations_location      ON donations USING GIST(pickup_location);  -- spatial

-- Donor/Receiver spatial lookups
CREATE INDEX idx_donor_profiles_location    ON donor_profiles    USING GIST(location);
CREATE INDEX idx_receiver_profiles_location ON receiver_profiles USING GIST(location);
CREATE INDEX idx_receiver_profiles_status   ON receiver_profiles(verification_status);

-- Pickup assignments
CREATE INDEX idx_pickup_assignments_donation_id ON pickup_assignments(donation_id);
CREATE INDEX idx_pickup_assignments_receiver_id ON pickup_assignments(receiver_id);
CREATE INDEX idx_pickup_assignments_status      ON pickup_assignments(pickup_status);

-- Notifications
CREATE INDEX idx_notifications_user_id  ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread   ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Impact reports
CREATE INDEX idx_impact_reports_donor_id    ON impact_reports(donor_id);
CREATE INDEX idx_impact_reports_receiver_id ON impact_reports(receiver_id);

-- Full-text search on donation titles
CREATE INDEX idx_donations_title_trgm ON donations USING gin(title gin_trgm_ops);

-- Donation receiver notifications
CREATE INDEX idx_drn_donation_id  ON donation_receiver_notifications(donation_id);
CREATE INDEX idx_drn_receiver_id  ON donation_receiver_notifications(receiver_id);

-- ────────────────────────────────────────────────────────────
-- TRIGGERS — updated_at auto-update
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_donor_profiles_updated_at
  BEFORE UPDATE ON donor_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_receiver_profiles_updated_at
  BEFORE UPDATE ON receiver_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_pickup_assignments_updated_at
  BEFORE UPDATE ON pickup_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- TRIGGER — Auto-create user profile on Supabase signup
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'donor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fires on every new Supabase auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
