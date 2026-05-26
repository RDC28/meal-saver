-- =============================================================
-- MealSaver — PostgreSQL Helper Functions
-- Matching algorithm, impact calculations, and utilities
-- =============================================================

-- ────────────────────────────────────────────────────────────
-- 1. FIND NEARBY VERIFIED RECEIVERS
-- Core of the matching algorithm — returns NGOs sorted by:
--   1. Distance (nearest first)
--   2. Urgency compatibility
--   3. Capacity match
-- Usage: SELECT * FROM find_nearby_receivers(donation_id := '<uuid>');
-- ────────────────────────────────────────────────────────────
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
      (ST_Distance(rp.location::geography, v_donation.pickup_location::geography) / 1000)::NUMERIC,
      2
    )::FLOAT                                                      AS distance_km,
    rp.max_capacity_kg,
    (
      -- Food type compatibility
      (v_donation.food_type = 'veg'     AND rp.accepts_veg     = TRUE) OR
      (v_donation.food_type = 'non_veg' AND rp.accepts_non_veg = TRUE) OR
      (v_donation.food_type = 'vegan'   AND rp.accepts_vegan   = TRUE)
    ) AND (
      -- Food condition compatibility
      (v_donation.food_condition = 'cooked'   AND rp.accepts_cooked   = TRUE) OR
      (v_donation.food_condition = 'raw'      AND rp.accepts_raw      = TRUE) OR
      (v_donation.food_condition = 'packaged' AND rp.accepts_packaged  = TRUE)
    ) AND (
      -- Category compatibility
      (v_donation.food_category = 'short_term' AND rp.accepts_short_term = TRUE) OR
      (v_donation.food_category = 'long_term'  AND rp.accepts_long_term  = TRUE)
    ) AND (
      -- Capacity check (NULL max_capacity means no limit)
      rp.max_capacity_kg IS NULL OR rp.max_capacity_kg >= v_donation.quantity_kg
    )                                                             AS can_accept
  FROM receiver_profiles rp
  WHERE
    rp.verification_status = 'verified'
    AND rp.location IS NOT NULL
    AND v_donation.pickup_location IS NOT NULL
    -- Only return receivers within their own stated service area
    AND ST_DWithin(
      rp.location::geography,
      v_donation.pickup_location::geography,
      rp.service_area_km * 1000  -- convert km to meters
    )
    -- Exclude receivers already notified (prevents double-notification)
    AND rp.id NOT IN (
      SELECT drn.receiver_id
      FROM donation_receiver_notifications drn
      WHERE drn.donation_id = p_donation_id
        AND drn.response IN ('accepted', 'rejected')
    )
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 2. CALCULATE URGENCY SCORE
-- Returns 0–100: higher = more urgent
-- Used to prioritise short-term food and near-expiry donations
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_urgency_score(p_expiry_time TIMESTAMPTZ)
RETURNS INTEGER AS $$
DECLARE
  hours_remaining FLOAT;
BEGIN
  hours_remaining := EXTRACT(EPOCH FROM (p_expiry_time - NOW())) / 3600;

  IF hours_remaining <= 0 THEN
    RETURN 100;   -- already expired
  ELSIF hours_remaining <= 1 THEN
    RETURN 95;
  ELSIF hours_remaining <= 2 THEN
    RETURN 85;
  ELSIF hours_remaining <= 4 THEN
    RETURN 70;
  ELSIF hours_remaining <= 8 THEN
    RETURN 50;
  ELSIF hours_remaining <= 24 THEN
    RETURN 30;
  ELSE
    RETURN 10;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ────────────────────────────────────────────────────────────
-- 3. GENERATE IMPACT REPORT
-- Called automatically after delivery_confirmations insert
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_impact_report(p_donation_id UUID)
RETURNS UUID AS $$
DECLARE
  v_donation          donations%ROWTYPE;
  v_confirmation      delivery_confirmations%ROWTYPE;
  v_pickup            pickup_assignments%ROWTYPE;
  v_meals_saved       INTEGER;
  v_food_saved_kg     DECIMAL(10,2);
  v_co2_saved_kg      DECIMAL(10,2);
  v_report_id         UUID;
BEGIN
  SELECT * INTO v_donation     FROM donations              WHERE id = p_donation_id;
  SELECT * INTO v_pickup       FROM pickup_assignments     WHERE donation_id = p_donation_id;
  SELECT * INTO v_confirmation FROM delivery_confirmations WHERE donation_id = p_donation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No delivery confirmation for donation %', p_donation_id;
  END IF;

  -- Use actual received quantity if available, else estimated
  v_food_saved_kg := COALESCE(v_confirmation.quantity_received_kg, v_donation.quantity_kg);

  -- Meals saved: use serves_approx if set, else estimate ~0.3kg per meal
  v_meals_saved := COALESCE(
    v_donation.serves_approx,
    ROUND(v_food_saved_kg / 0.3)::INTEGER
  );

  -- CO2 saved: industry average ~2.5kg CO2 per kg food rescued
  v_co2_saved_kg := v_food_saved_kg * 2.5;

  INSERT INTO impact_reports (
    donation_id, donor_id, receiver_id,
    meals_saved, food_waste_reduced_kg, co2_impact_kg, people_served,
    receiver_confirmed, report_generated_at
  )
  VALUES (
    p_donation_id,
    v_donation.donor_id,
    v_pickup.receiver_id,
    v_meals_saved,
    v_food_saved_kg,
    v_co2_saved_kg,
    v_meals_saved,
    TRUE,
    NOW()
  )
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 4. MARK EXPIRED DONATIONS
-- Run as a Supabase CRON job every 15 minutes via pg_cron
-- or call from your backend scheduler
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION expire_stale_donations()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE donations
  SET
    status     = 'expired',
    updated_at = NOW()
  WHERE
    status IN ('available', 'pending_acceptance')
    AND expiry_time < NOW();

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 5. DONOR IMPACT SUMMARY
-- Returns aggregated stats for a donor's dashboard
-- ────────────────────────────────────────────────────────────
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
    COUNT(d.id)                             AS total_donations,
    COALESCE(SUM(ir.meals_saved), 0)        AS total_meals_saved,
    COALESCE(SUM(ir.food_waste_reduced_kg), 0) AS total_kg_rescued,
    COALESCE(SUM(ir.co2_impact_kg), 0)     AS total_co2_saved_kg,
    COUNT(d.id) FILTER (WHERE d.status = 'delivered')  AS donations_delivered,
    COUNT(d.id) FILTER (WHERE d.status = 'expired')    AS donations_expired
  FROM donations d
  LEFT JOIN impact_reports ir ON ir.donation_id = d.id
  WHERE d.donor_id = p_donor_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 6. NGO IMPACT SUMMARY
-- ────────────────────────────────────────────────────────────
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
    COUNT(pa.id)                                 AS total_accepted,
    COALESCE(SUM(ir.meals_saved), 0)             AS total_meals_served,
    COALESCE(SUM(ir.food_waste_reduced_kg), 0)   AS total_kg_received,
    COALESCE(SUM(ir.co2_impact_kg), 0)           AS total_co2_impact_kg
  FROM pickup_assignments pa
  LEFT JOIN impact_reports ir ON ir.donation_id = pa.donation_id
  WHERE pa.receiver_id = p_receiver_id
    AND pa.pickup_status = 'completed';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 7. TRIGGER — Auto-generate impact report on delivery confirm
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_generate_impact_report()
RETURNS TRIGGER AS $$
BEGIN
  -- Fire asynchronously after delivery confirmed
  IF NEW.is_food_safe = TRUE THEN
    PERFORM generate_impact_report(NEW.donation_id);
  END IF;

  -- Update donation status to 'delivered'
  UPDATE donations
  SET status = 'delivered', updated_at = NOW()
  WHERE id = NEW.donation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_impact_report
  AFTER INSERT ON delivery_confirmations
  FOR EACH ROW EXECUTE FUNCTION trigger_generate_impact_report();

-- ────────────────────────────────────────────────────────────
-- 8. TRIGGER — Update donation status when pickup assigned
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_donation_pickup_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When a pickup assignment is created → donation = 'pickup_assigned'
  IF TG_OP = 'INSERT' THEN
    UPDATE donations SET status = 'pickup_assigned', updated_at = NOW()
    WHERE id = NEW.donation_id;
  END IF;

  -- When pickup is completed → donation = 'picked_up'
  IF TG_OP = 'UPDATE' AND NEW.pickup_status = 'completed' THEN
    UPDATE donations SET status = 'picked_up', updated_at = NOW()
    WHERE id = NEW.donation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_donation_pickup_status
  AFTER INSERT OR UPDATE ON pickup_assignments
  FOR EACH ROW EXECUTE FUNCTION trigger_donation_pickup_status();

-- ────────────────────────────────────────────────────────────
-- 9. GENERATE OTP for pickup verification
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_pickup_otp(p_pickup_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_otp TEXT;
BEGIN
  -- Generate a 6-digit numeric OTP
  v_otp := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  UPDATE pickup_assignments
  SET otp_code = v_otp, updated_at = NOW()
  WHERE id = p_pickup_id;

  RETURN v_otp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
