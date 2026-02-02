-- ============================================
-- PostgreSQL Row Level Security (RLS) Policies
-- for Dolbom Application
-- ============================================

-- ============================================
-- Enable RLS on all tables
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS Table Policies
-- (Note: auth.uid() is provided by Supabase)
-- ============================================

-- Users can view their own profile
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- System can insert/view admins (for initial setup)
CREATE POLICY users_admin_insert ON users
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- MANAGER_PROFILES Table Policies
-- ============================================

-- Managers can view their own profile
CREATE POLICY manager_profiles_select_own ON manager_profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- Managers can update their own profile
CREATE POLICY manager_profiles_update_own ON manager_profiles
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- All authenticated users can view active manager profiles (for service matching)
CREATE POLICY manager_profiles_select_public ON manager_profiles
  FOR SELECT
  USING (is_active = true);

-- ============================================
-- SERVICE_REQUESTS Table Policies
-- ============================================

-- Customers can view their own requests
CREATE POLICY service_requests_select_own_customer ON service_requests
  FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can create requests
CREATE POLICY service_requests_insert_customer ON service_requests
  FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Customers can update their own requests
CREATE POLICY service_requests_update_own_customer ON service_requests
  FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Managers can view all requests (for matching)
CREATE POLICY service_requests_select_all_managers ON service_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'MANAGER'
    )
  );

-- ============================================
-- APPLICATIONS Table Policies
-- ============================================

-- Managers can view their own applications
CREATE POLICY applications_select_own_manager ON applications
  FOR SELECT
  USING (manager_id = auth.uid());

-- Customers can view applications for their requests
CREATE POLICY applications_select_own_customer ON applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = applications.request_id AND sr.customer_id = auth.uid()
    )
  );

-- Managers can create applications
CREATE POLICY applications_insert_manager ON applications
  FOR INSERT
  WITH CHECK (
    manager_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'MANAGER'
    )
  );

-- Customers can update applications for their requests
CREATE POLICY applications_update_customer ON applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = applications.request_id AND sr.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = applications.request_id AND sr.customer_id = auth.uid()
    )
  );

-- ============================================
-- BOOKINGS Table Policies
-- ============================================

-- Customers can view bookings for their requests
CREATE POLICY bookings_select_customer ON bookings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = bookings.request_id AND sr.customer_id = auth.uid()
    )
  );

-- Managers can view their own bookings
CREATE POLICY bookings_select_manager ON bookings
  FOR SELECT
  USING (manager_id = auth.uid());

-- System can insert bookings (from application acceptance)
CREATE POLICY bookings_insert ON bookings
  FOR INSERT
  WITH CHECK (true);

-- Managers can update their own bookings
CREATE POLICY bookings_update_manager ON bookings
  FOR UPDATE
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

-- ============================================
-- REVIEWS Table Policies
-- ============================================

-- Users can view reviews about managers they're interested in
CREATE POLICY reviews_select ON reviews
  FOR SELECT
  USING (true);

-- Customers can create reviews for completed bookings
CREATE POLICY reviews_insert_customer ON reviews
  FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN service_requests sr ON b.request_id = sr.id
      WHERE b.id = reviews.booking_id AND sr.customer_id = auth.uid()
    )
  );

-- ============================================
-- NOTIFICATIONS Table Policies
-- ============================================

-- Users can view their own notifications
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System can insert notifications
CREATE POLICY notifications_insert ON notifications
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- BILLING_KEYS Table Policies
-- ============================================

-- Users can view their own billing keys
CREATE POLICY billing_keys_select_own ON billing_keys
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert billing keys
CREATE POLICY billing_keys_insert ON billing_keys
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own billing keys
CREATE POLICY billing_keys_update_own ON billing_keys
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- PAYMENTS Table Policies
-- ============================================

-- Customers can view their own payments
CREATE POLICY payments_select_customer ON payments
  FOR SELECT
  USING (customer_id = auth.uid());

-- Managers can view payments for their bookings
CREATE POLICY payments_select_manager ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = payments.booking_id AND b.manager_id = auth.uid()
    )
  );

-- System can insert payments
CREATE POLICY payments_insert ON payments
  FOR INSERT
  WITH CHECK (true);

-- System can update payments (payment status changes)
CREATE POLICY payments_update ON payments
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- SETTLEMENTS Table Policies
-- ============================================

-- Managers can view their own settlements
CREATE POLICY settlements_select_own ON settlements
  FOR SELECT
  USING (manager_id = auth.uid());

-- System can insert/update settlements
CREATE POLICY settlements_insert ON settlements
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY settlements_update ON settlements
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- DEVICE_TOKENS Table Policies
-- ============================================

-- Managers can view their own device tokens
CREATE POLICY manager_device_tokens_select_own ON manager_device_tokens
  FOR SELECT
  USING (manager_id = auth.uid());

-- Managers can insert their device tokens
CREATE POLICY manager_device_tokens_insert ON manager_device_tokens
  FOR INSERT
  WITH CHECK (manager_id = auth.uid());

-- Managers can update their device tokens
CREATE POLICY manager_device_tokens_update_own ON manager_device_tokens
  FOR UPDATE
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

-- Users can view their own device tokens
CREATE POLICY user_device_tokens_select_own ON user_device_tokens
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their device tokens
CREATE POLICY user_device_tokens_insert ON user_device_tokens
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their device tokens
CREATE POLICY user_device_tokens_update_own ON user_device_tokens
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- ADMINS Table Policies
-- ============================================

-- Admins table is protected (no direct RLS for security)
-- Access should be controlled via application layer only
CREATE POLICY admins_restrict ON admins
  FOR SELECT
  USING (false);

CREATE POLICY admins_insert_only ON admins
  FOR INSERT
  WITH CHECK (true);
