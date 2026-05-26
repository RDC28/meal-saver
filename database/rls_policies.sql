-- =============================================================
-- MealSaver — Row Level Security (RLS) Policies
-- Run AFTER schema.sql in the Supabase SQL editor
-- =============================================================

-- ────────────────────────────────────────────────────────────
-- Helper function — get current user's role
-- NOTE: Must live in public schema — Supabase blocks writes to auth schema
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- USERS TABLE
-- ────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Anyone can read basic public profiles
CREATE POLICY "Users are publicly readable"
  ON users FOR SELECT
  USING (TRUE);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Users can delete their own account (CASCADE handles related data)
CREATE POLICY "Users can delete own account"
  ON users FOR DELETE
  USING (auth.uid() = id);

-- Inserts handled by the handle_new_user() trigger (SECURITY DEFINER)
-- No manual INSERT policy needed

-- ────────────────────────────────────────────────────────────
-- DONOR PROFILES
-- ────────────────────────────────────────────────────────────
ALTER TABLE donor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Donor profiles are publicly readable"
  ON donor_profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "Donors can insert their own profile"
  ON donor_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Donors can update their own profile"
  ON donor_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can update any donor profile (e.g., verification status)
CREATE POLICY "Admins can update any donor profile"
  ON donor_profiles FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- ────────────────────────────────────────────────────────────
-- RECEIVER PROFILES
-- ────────────────────────────────────────────────────────────
ALTER TABLE receiver_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Receiver profiles are publicly readable"
  ON receiver_profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "Receivers can insert their own profile"
  ON receiver_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Receivers can update their own profile"
  ON receiver_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any receiver profile"
  ON receiver_profiles FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- ────────────────────────────────────────────────────────────
-- DONATIONS
-- ────────────────────────────────────────────────────────────
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Available donations visible to everyone (for NGO browsing)
CREATE POLICY "Available donations are publicly readable"
  ON donations FOR SELECT
  USING (
    status = 'available'
    OR auth.uid() = donor_id        -- donor can always see own donations
    OR public.get_my_role() IN ('admin', 'receiver')  -- admins & receivers see all
  );

CREATE POLICY "Donors can create donations"
  ON donations FOR INSERT
  WITH CHECK (
    auth.uid() = donor_id
    AND public.get_my_role() = 'donor'
  );

CREATE POLICY "Donors can update their own donations"
  ON donations FOR UPDATE
  USING (auth.uid() = donor_id);

CREATE POLICY "Admins can update any donation"
  ON donations FOR UPDATE
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Donors can delete their own pending donations"
  ON donations FOR DELETE
  USING (
    auth.uid() = donor_id
    AND status IN ('available', 'pending_acceptance')
  );

-- ────────────────────────────────────────────────────────────
-- DONATION IMAGES
-- ────────────────────────────────────────────────────────────
ALTER TABLE donation_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Donation images are publicly readable"
  ON donation_images FOR SELECT
  USING (TRUE);

CREATE POLICY "Donors can insert images for their donations"
  ON donation_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM donations d
      WHERE d.id = donation_id AND d.donor_id = auth.uid()
    )
  );

CREATE POLICY "Donors can delete their donation images"
  ON donation_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM donations d
      WHERE d.id = donation_id AND d.donor_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────
-- DONATION RECEIVER NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
ALTER TABLE donation_receiver_notifications ENABLE ROW LEVEL SECURITY;

-- Receivers can see notifications sent to them
CREATE POLICY "Receivers see their own notifications"
  ON donation_receiver_notifications FOR SELECT
  USING (auth.uid() = receiver_id OR public.get_my_role() = 'admin');

-- System/Admin inserts notifications
CREATE POLICY "Admins can insert notifications"
  ON donation_receiver_notifications FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

-- Receivers can update their own response
CREATE POLICY "Receivers can respond to notifications"
  ON donation_receiver_notifications FOR UPDATE
  USING (auth.uid() = receiver_id);

-- ────────────────────────────────────────────────────────────
-- PICKUP ASSIGNMENTS
-- ────────────────────────────────────────────────────────────
ALTER TABLE pickup_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pickup assignments visible to involved parties"
  ON pickup_assignments FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    OR auth.uid() = receiver_id
    OR auth.uid() = delivery_partner_id
    OR EXISTS (
      SELECT 1 FROM donations d
      WHERE d.id = donation_id AND d.donor_id = auth.uid()
    )
  );

CREATE POLICY "Admins and receivers can create pickup assignments"
  ON pickup_assignments FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin', 'receiver'));

CREATE POLICY "Admins and receivers can update pickup assignments"
  ON pickup_assignments FOR UPDATE
  USING (
    public.get_my_role() = 'admin'
    OR auth.uid() = receiver_id
    OR auth.uid() = delivery_partner_id
  );

-- ────────────────────────────────────────────────────────────
-- DELIVERY CONFIRMATIONS
-- ────────────────────────────────────────────────────────────
ALTER TABLE delivery_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Delivery confirmations visible to involved parties"
  ON delivery_confirmations FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    OR auth.uid() = receiver_id
    OR EXISTS (
      SELECT 1 FROM donations d
      WHERE d.id = donation_id AND d.donor_id = auth.uid()
    )
  );

CREATE POLICY "Receivers can create delivery confirmations"
  ON delivery_confirmations FOR INSERT
  WITH CHECK (auth.uid() = receiver_id);

-- ────────────────────────────────────────────────────────────
-- IMPACT REPORTS
-- ────────────────────────────────────────────────────────────
ALTER TABLE impact_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Impact reports visible to donor and receiver"
  ON impact_reports FOR SELECT
  USING (
    public.get_my_role() = 'admin'
    OR auth.uid() = donor_id
    OR auth.uid() = receiver_id
  );

CREATE POLICY "System can insert impact reports"
  ON impact_reports FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

-- ────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System/admin can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Users can mark their notifications as read"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- USER VERIFICATIONS
-- ────────────────────────────────────────────────────────────
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own verification docs"
  ON user_verifications FOR SELECT
  USING (auth.uid() = user_id OR public.get_my_role() = 'admin');

CREATE POLICY "Users can upload their own documents"
  ON user_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update verification status"
  ON user_verifications FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- ────────────────────────────────────────────────────────────
-- ADMIN ACTIONS (audit log — read-only for non-admins)
-- ────────────────────────────────────────────────────────────
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can see audit log"
  ON admin_actions FOR SELECT
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Only admins can insert audit log"
  ON admin_actions FOR INSERT
  WITH CHECK (public.get_my_role() = 'admin');
