-- =============================================================
-- MealSaver — Combined Database Setup
-- Compatible with: Neon, Railway, Render, Supabase, any Postgres
--
-- Sections:
--   1. Extensions
--   2. Enums
--   3. Tables + Indexes
--   4. updated_at triggers
--   5. Business logic functions
--   6. Business logic triggers
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "postgis";      -- spatial queries (nearest NGO)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- fuzzy text search on titles


-- ─────────────────────────────────────────────────────────────
-- 2. ENUMS
-- ─────────────────────────────────────────────────────────────
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
  'short_term',   -- cooked food, cut veg, bakery — needs pickup within hours
  'long_term'     -- rice bags, dry groceries, packaged — can wait days
);

CREATE TYPE pickup_type AS ENUM (
  'ngo_pickup',
  'donor_dropoff',
  'delivery_partner'
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


-- ─────────────────────────────────────────────────────────────
-- 3. TABLES
--
-- NOTE (Neon / non-Supabase):
--   users.id is a plain UUID primary key — no FK to auth.users.
--   Your auth provider (Clerk, Auth.js, etc.) must write the
--   user row here on signup via a webhook or API call.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT        NOT NULL UNIQUE,
  full_name     TEXT,
  phone         TEXT,
  avatar_url    TEXT,
  role          user_role   NOT NULL DEFAULT 'donor',
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  location              GEOGRAPHY(POINT, 4326),
  food_license_number   TEXT,
  gst_number            TEXT,
  verification_status   verification_status NOT NULL DEFAULT 'pending',
  verified_at           TIMESTAMPTZ,
  verified_by           UUID              REFERENCES users(id),
  created_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

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
  service_area_km         INTEGER             NOT NULL DEFAULT 10,
  max_capacity_kg         DECIMAL(10,2),
  accepts_veg             BOOLEAN             NOT NULL DEFAULT TRUE,
  accepts_non_veg         BOOLEAN             NOT NULL DEFAULT FALSE,
  accepts_vegan           BOOLEAN             NOT NULL DEFAULT TRUE,
  accepts_cooked          BOOLEAN             NOT NULL DEFAULT TRUE,
  accepts_raw             BOOLEAN             NOT NULL DEFAULT TRUE,
  accepts_packaged        BOOLEAN             NOT NULL DEFAULT TRUE,
  accepts_short_term      BOOLEAN             NOT NULL DEFAULT TRUE,
  accepts_long_term       BOOLEAN             NOT NULL DEFAULT TRUE,
  registration_number     TEXT,
  verification_status     verification_status NOT NULL DEFAULT 'pending',
  verified_at             TIMESTAMPTZ,
  verified_by             UUID                REFERENCES users(id),
  created_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE TABLE donations (
  id                      UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_id                UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  donor_profile_id        UUID              NOT NULL REFERENCES donor_profiles(id),
  title                   TEXT              NOT NULL,
  description             TEXT,
  food_category           food_category     NOT NULL,
  food_type               food_type         NOT NULL,
  food_condition          food_condition    NOT NULL,
  quantity_kg             DECIMAL(10,2)     NOT NULL CHECK (quantity_kg > 0),
  quantity_description    TEXT,
  serves_approx           INTEGER,
  preparation_time        TIMESTAMPTZ,
  expiry_time             TIMESTAMPTZ       NOT NULL,
  preferred_pickup_time   TIMESTAMPTZ,
  pickup_address          TEXT              NOT NULL,
  pickup_city             TEXT              NOT NULL,
  pickup_location         GEOGRAPHY(POINT, 4326),
  pickup_instructions     TEXT,
  contact_number          TEXT              NOT NULL,
  status                  donation_status   NOT NULL DEFAULT 'available',
  is_urgent               BOOLEAN           NOT NULL DEFAULT FALSE,
  admin_notes             TEXT,
  created_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  CONSTRAINT expiry_after_now CHECK (expiry_time > created_at)
);

CREATE TABLE donation_images (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id   UUID        NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  image_url     TEXT        NOT NULL,
  storage_path  TEXT,
  is_primary    BOOLEAN     NOT NULL DEFAULT FALSE,
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE donation_receiver_notifications (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id      UUID        NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  receiver_id      UUID        NOT NULL REFERENCES users(id),
  notified_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response         TEXT        CHECK (response IN ('accepted', 'rejected', 'no_response')) DEFAULT 'no_response',
  responded_at     TIMESTAMPTZ,
  rejection_reason TEXT,

  UNIQUE(donation_id, receiver_id)
);

CREATE TABLE pickup_assignments (
  id                    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id           UUID            NOT NULL UNIQUE REFERENCES donations(id) ON DELETE CASCADE,
  receiver_id           UUID            NOT NULL REFERENCES users(id),
  receiver_profile_id   UUID            NOT NULL REFERENCES receiver_profiles(id),
  pickup_type           pickup_type     NOT NULL DEFAULT 'ngo_pickup',
  delivery_partner_id   UUID            REFERENCES users(id),
  pickup_status         pickup_status   NOT NULL DEFAULT 'assigned',
  scheduled_pickup_time TIMESTAMPTZ,
  actual_pickup_time    TIMESTAMPTZ,
  otp_code              TEXT,
  otp_verified          BOOLEAN         NOT NULL DEFAULT FALSE,
  pickup_notes          TEXT,
  assigned_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE delivery_confirmations (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  pickup_assignment_id      UUID        NOT NULL UNIQUE REFERENCES pickup_assignments(id) ON DELETE CASCADE,
  donation_id               UUID        NOT NULL REFERENCES donations(id),
  receiver_id               UUID        NOT NULL REFERENCES users(id),
  quantity_received_kg      DECIMAL(10,2),
  food_condition_on_arrival TEXT,
  is_food_safe              BOOLEAN     NOT NULL DEFAULT TRUE,
  receiver_notes            TEXT,
  confirmed_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE impact_reports (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id               UUID        NOT NULL UNIQUE REFERENCES donations(id) ON DELETE CASCADE,
  donor_id                  UUID        NOT NULL REFERENCES users(id),
  receiver_id               UUID        NOT NULL REFERENCES users(id),
  meals_saved               INTEGER,
  food_waste_reduced_kg     DECIMAL(10,2),
  co2_impact_kg             DECIMAL(10,2),
  people_served             INTEGER,
  receiver_confirmed        BOOLEAN     NOT NULL DEFAULT FALSE,
  donor_report_generated    BOOLEAN     NOT NULL DEFAULT FALSE,
  report_generated_at       TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE user_verifications (
  id                UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type     TEXT                NOT NULL,
  document_url      TEXT                NOT NULL,
  storage_path      TEXT,
  status            verification_status NOT NULL DEFAULT 'pending',
  reviewed_by       UUID                REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  uploaded_at       TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_actions (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id      UUID        NOT NULL REFERENCES users(id),
  action_type   TEXT        NOT NULL,
  target_type   TEXT        NOT NULL,
  target_id     UUID        NOT NULL,
  description   TEXT,
  metadata      JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX idx_donations_status        ON donations(status);
CREATE INDEX idx_donations_donor_id      ON donations(donor_id);
CREATE INDEX idx_donations_expiry_time   ON donations(expiry_time);
CREATE INDEX idx_donations_category      ON donations(food_category);
CREATE INDEX idx_donations_created_at    ON donations(created_at DESC);
CREATE INDEX idx_donations_location      ON donations USING GIST(pickup_location);

CREATE INDEX idx_donor_profiles_location    ON donor_profiles    USING GIST(location);
CREATE INDEX idx_receiver_profiles_location ON receiver_profiles USING GIST(location);
CREATE INDEX idx_receiver_profiles_status   ON receiver_profiles(verification_status);

CREATE INDEX idx_pickup_assignments_donation_id ON pickup_assignments(donation_id);
CREATE INDEX idx_pickup_assignments_receiver_id ON pickup_assignments(receiver_id);
CREATE INDEX idx_pickup_assignments_status      ON pickup_assignments(pickup_status);

CREATE INDEX idx_notifications_user_id  ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread   ON notifications(user_id, is_read) WHERE is_read = FALSE;

CREATE INDEX idx_impact_reports_donor_id    ON impact_reports(donor_id);
CREATE INDEX idx_impact_reports_receiver_id ON impact_reports(receiver_id);

CREATE INDEX idx_donations_title_trgm ON donations USING gin(title gin_trgm_ops);

CREATE INDEX idx_drn_donation_id  ON donation_receiver_notifications(donation_id);
CREATE INDEX idx_drn_receiver_id  ON donation_receiver_notifications(receiver_id);


-- ─────────────────────────────────────────────────────────────
-- 4. updated_at TRIGGERS
-- ─────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────
-- 5. BUSINESS LOGIC FUNCTIONS
-- ─────────────────────────────────────────────────────────────

-- Find nearby verified NGOs for a donation (matching algorithm)
CREATE OR REPLACE FUNCTION find_nearby_receivers(p_donation_id UUID)
RETURNS TABLE (
  receiver_id         UUID,
  user_id             UUID,
  organization_name   TEXT,
  organization_type   organization_type,
  phone               TEXT,
  distance_km         FLOAT,
  max_capacity_kg     DECIMAL,
  can_accept          BOOLEAN
) AS $$
DECLARE
  v_donation donations%ROWTYPE;
BEGIN
  SELECT * INTO v_donation FROM donations WHERE id = p_donation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donation % not found', p_donation_id;
  END IF;

  RETURN QUERY
  SELECT
    rp.id                                                         AS receiver_id,
    rp.user_id,
    rp.organization_name,
    rp.organization_type,
    rp.phone,
    ROUND(
      (ST_Distance(rp.location::geography, v_donation.pickup_location::geography) / 1000)::NUMERIC, 2
    )::FLOAT                                                      AS distance_km,
    rp.max_capacity_kg,
    (
      (v_donation.food_type = 'veg'     AND rp.accepts_veg     = TRUE) OR
      (v_donation.food_type = 'non_veg' AND rp.accepts_non_veg = TRUE) OR
      (v_donation.food_type = 'vegan'   AND rp.accepts_vegan   = TRUE)
    ) AND (
      (v_donation.food_condition = 'cooked'   AND rp.accepts_cooked   = TRUE) OR
      (v_donation.food_condition = 'raw'      AND rp.accepts_raw      = TRUE) OR
      (v_donation.food_condition = 'packaged' AND rp.accepts_packaged  = TRUE)
    ) AND (
      (v_donation.food_category = 'short_term' AND rp.accepts_short_term = TRUE) OR
      (v_donation.food_category = 'long_term'  AND rp.accepts_long_term  = TRUE)
    ) AND (
      rp.max_capacity_kg IS NULL OR rp.max_capacity_kg >= v_donation.quantity_kg
    )                                                             AS can_accept
  FROM receiver_profiles rp
  WHERE
    rp.verification_status = 'verified'
    AND rp.location IS NOT NULL
    AND v_donation.pickup_location IS NOT NULL
    AND ST_DWithin(
      rp.location::geography,
      v_donation.pickup_location::geography,
      rp.service_area_km * 1000
    )
    AND rp.id NOT IN (
      SELECT drn.receiver_id FROM donation_receiver_notifications drn
      WHERE drn.donation_id = p_donation_id
        AND drn.response IN ('accepted', 'rejected')
    )
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Urgency score (0–100)
CREATE OR REPLACE FUNCTION calculate_urgency_score(p_expiry_time TIMESTAMPTZ)
RETURNS INTEGER AS $$
DECLARE
  hours_remaining FLOAT;
BEGIN
  hours_remaining := EXTRACT(EPOCH FROM (p_expiry_time - NOW())) / 3600;
  IF    hours_remaining <= 0  THEN RETURN 100;
  ELSIF hours_remaining <= 1  THEN RETURN 95;
  ELSIF hours_remaining <= 2  THEN RETURN 85;
  ELSIF hours_remaining <= 4  THEN RETURN 70;
  ELSIF hours_remaining <= 8  THEN RETURN 50;
  ELSIF hours_remaining <= 24 THEN RETURN 30;
  ELSE                             RETURN 10;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Generate impact report after delivery
CREATE OR REPLACE FUNCTION generate_impact_report(p_donation_id UUID)
RETURNS UUID AS $$
DECLARE
  v_donation     donations%ROWTYPE;
  v_confirmation delivery_confirmations%ROWTYPE;
  v_pickup       pickup_assignments%ROWTYPE;
  v_meals_saved  INTEGER;
  v_food_kg      DECIMAL(10,2);
  v_co2_kg       DECIMAL(10,2);
  v_report_id    UUID;
BEGIN
  SELECT * INTO v_donation     FROM donations              WHERE id = p_donation_id;
  SELECT * INTO v_pickup       FROM pickup_assignments     WHERE donation_id = p_donation_id;
  SELECT * INTO v_confirmation FROM delivery_confirmations WHERE donation_id = p_donation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No delivery confirmation for donation %', p_donation_id;
  END IF;

  v_food_kg     := COALESCE(v_confirmation.quantity_received_kg, v_donation.quantity_kg);
  v_meals_saved := COALESCE(v_donation.serves_approx, ROUND(v_food_kg / 0.3)::INTEGER);
  v_co2_kg      := v_food_kg * 2.5;

  INSERT INTO impact_reports (
    donation_id, donor_id, receiver_id,
    meals_saved, food_waste_reduced_kg, co2_impact_kg, people_served,
    receiver_confirmed, report_generated_at
  )
  VALUES (
    p_donation_id, v_donation.donor_id, v_pickup.receiver_id,
    v_meals_saved, v_food_kg, v_co2_kg, v_meals_saved,
    TRUE, NOW()
  )
  ON CONFLICT (donation_id) DO NOTHING
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark expired donations (call from a cron job every 15 min)
CREATE OR REPLACE FUNCTION expire_stale_donations()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE donations
  SET status = 'expired', updated_at = NOW()
  WHERE status IN ('available', 'pending_acceptance')
    AND expiry_time < NOW();

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Donor impact summary
CREATE OR REPLACE FUNCTION get_donor_impact_summary(p_donor_id UUID)
RETURNS TABLE (
  total_donations     BIGINT,
  total_meals_saved   BIGINT,
  total_kg_rescued    NUMERIC,
  total_co2_saved_kg  NUMERIC,
  donations_delivered BIGINT,
  donations_expired   BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(d.id),
    COALESCE(SUM(ir.meals_saved), 0),
    COALESCE(SUM(ir.food_waste_reduced_kg), 0),
    COALESCE(SUM(ir.co2_impact_kg), 0),
    COUNT(d.id) FILTER (WHERE d.status = 'delivered'),
    COUNT(d.id) FILTER (WHERE d.status = 'expired')
  FROM donations d
  LEFT JOIN impact_reports ir ON ir.donation_id = d.id
  WHERE d.donor_id = p_donor_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Receiver impact summary
CREATE OR REPLACE FUNCTION get_receiver_impact_summary(p_receiver_id UUID)
RETURNS TABLE (
  total_accepted      BIGINT,
  total_meals_served  BIGINT,
  total_kg_received   NUMERIC,
  total_co2_impact_kg NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(pa.id),
    COALESCE(SUM(ir.meals_saved), 0),
    COALESCE(SUM(ir.food_waste_reduced_kg), 0),
    COALESCE(SUM(ir.co2_impact_kg), 0)
  FROM pickup_assignments pa
  LEFT JOIN impact_reports ir ON ir.donation_id = pa.donation_id
  WHERE pa.receiver_id = p_receiver_id
    AND pa.pickup_status = 'completed';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Generate pickup OTP
CREATE OR REPLACE FUNCTION generate_pickup_otp(p_pickup_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_otp TEXT;
BEGIN
  v_otp := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  UPDATE pickup_assignments SET otp_code = v_otp, updated_at = NOW() WHERE id = p_pickup_id;
  RETURN v_otp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────
-- 6. BUSINESS LOGIC TRIGGERS
-- ─────────────────────────────────────────────────────────────

-- Auto-generate impact report when delivery is confirmed
CREATE OR REPLACE FUNCTION trigger_generate_impact_report()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_food_safe = TRUE THEN
    PERFORM generate_impact_report(NEW.donation_id);
  END IF;
  UPDATE donations SET status = 'delivered', updated_at = NOW() WHERE id = NEW.donation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_impact_report
  AFTER INSERT ON delivery_confirmations
  FOR EACH ROW EXECUTE FUNCTION trigger_generate_impact_report();

-- Auto-update donation status on pickup changes
CREATE OR REPLACE FUNCTION trigger_donation_pickup_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE donations SET status = 'pickup_assigned', updated_at = NOW() WHERE id = NEW.donation_id;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.pickup_status = 'completed' THEN
    UPDATE donations SET status = 'picked_up', updated_at = NOW() WHERE id = NEW.donation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_donation_pickup_status
  AFTER INSERT OR UPDATE ON pickup_assignments
  FOR EACH ROW EXECUTE FUNCTION trigger_donation_pickup_status();
