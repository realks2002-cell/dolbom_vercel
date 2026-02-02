-- ============================================
-- PostgreSQL Triggers for Dolbom
-- ============================================

-- ============================================
-- Trigger: Update updated_at column automatically
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_manager_profiles_updated_at
BEFORE UPDATE ON manager_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_service_requests_updated_at
BEFORE UPDATE ON service_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_billing_keys_updated_at
BEFORE UPDATE ON billing_keys
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_manager_device_tokens_updated_at
BEFORE UPDATE ON manager_device_tokens
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_device_tokens_updated_at
BEFORE UPDATE ON user_device_tokens
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Function: Apply for service request (transaction-safe)
-- Ensures atomic operation: create application + update request status
-- ============================================

CREATE OR REPLACE FUNCTION apply_to_service_request(
  p_request_id UUID,
  p_manager_id UUID,
  p_message VARCHAR(500) DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  application_id UUID,
  error_message VARCHAR(500)
) AS $$
DECLARE
  v_application_id UUID;
  v_request_status service_request_status;
BEGIN
  -- Check if request exists and get its status
  SELECT status INTO v_request_status
  FROM service_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request_status IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Service request not found'::VARCHAR(500);
    RETURN;
  END IF;

  -- Check if request status allows application
  IF v_request_status NOT IN ('PENDING', 'MATCHING', 'CONFIRMED') THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Cannot apply to this request status'::VARCHAR(500);
    RETURN;
  END IF;

  -- Check if manager already applied
  IF EXISTS (SELECT 1 FROM applications WHERE request_id = p_request_id AND manager_id = p_manager_id) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Manager already applied to this request'::VARCHAR(500);
    RETURN;
  END IF;

  -- Create application
  v_application_id := uuid_generate_v4();
  INSERT INTO applications (id, request_id, manager_id, status, message, created_at)
  VALUES (v_application_id, p_request_id, p_manager_id, 'PENDING', p_message, CURRENT_TIMESTAMP);

  -- Update request status to MATCHING (if not already)
  IF v_request_status IN ('PENDING', 'CONFIRMED') THEN
    UPDATE service_requests
    SET status = 'MATCHING'
    WHERE id = p_request_id;
  END IF;

  RETURN QUERY SELECT true, v_application_id, NULL::VARCHAR(500);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: Accept/Reject application and update booking
-- ============================================

CREATE OR REPLACE FUNCTION process_application(
  p_application_id UUID,
  p_accept BOOLEAN
)
RETURNS TABLE (
  success BOOLEAN,
  error_message VARCHAR(500)
) AS $$
DECLARE
  v_request_id UUID;
  v_manager_id UUID;
  v_booking_id UUID;
BEGIN
  -- Get application details
  SELECT request_id, manager_id INTO v_request_id, v_manager_id
  FROM applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF v_request_id IS NULL THEN
    RETURN QUERY SELECT false, 'Application not found'::VARCHAR(500);
    RETURN;
  END IF;

  IF p_accept THEN
    -- Update application status
    UPDATE applications
    SET status = 'ACCEPTED'
    WHERE id = p_application_id;

    -- Create booking
    v_booking_id := uuid_generate_v4();
    INSERT INTO bookings (id, request_id, manager_id, final_price, payment_status)
    SELECT v_booking_id, sr.id, v_manager_id, sr.estimated_price, 'PENDING'::booking_payment_status
    FROM service_requests sr
    WHERE sr.id = v_request_id;

    -- Update request status to CONFIRMED
    UPDATE service_requests
    SET status = 'CONFIRMED'
    WHERE id = v_request_id;

    -- Reject other applications for this request
    UPDATE applications
    SET status = 'REJECTED'
    WHERE request_id = v_request_id AND id != p_application_id AND status = 'PENDING';
  ELSE
    -- Reject application
    UPDATE applications
    SET status = 'REJECTED'
    WHERE id = p_application_id;
  END IF;

  RETURN QUERY SELECT true, NULL::VARCHAR(500);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: Create payment and update booking
-- ============================================

CREATE OR REPLACE FUNCTION create_payment(
  p_booking_id UUID,
  p_amount INTEGER,
  p_payment_method VARCHAR(50),
  p_payment_key VARCHAR(255) DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  payment_id UUID,
  error_message VARCHAR(500)
) AS $$
DECLARE
  v_customer_id UUID;
  v_payment_id UUID;
BEGIN
  -- Get customer from booking
  SELECT sr.customer_id INTO v_customer_id
  FROM bookings b
  JOIN service_requests sr ON b.request_id = sr.id
  WHERE b.id = p_booking_id
  FOR UPDATE OF b;

  IF v_customer_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Booking not found'::VARCHAR(500);
    RETURN;
  END IF;

  -- Create payment record
  v_payment_id := uuid_generate_v4();
  INSERT INTO payments (id, booking_id, customer_id, amount, payment_method, payment_key, status)
  VALUES (v_payment_id, p_booking_id, v_customer_id, p_amount, p_payment_method, p_payment_key, 'PENDING'::payment_status);

  RETURN QUERY SELECT true, v_payment_id, NULL::VARCHAR(500);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function: Complete service and mark as paid
-- ============================================

CREATE OR REPLACE FUNCTION complete_booking(
  p_booking_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  error_message VARCHAR(500)
) AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- Get request from booking
  SELECT request_id INTO v_request_id
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF v_request_id IS NULL THEN
    RETURN QUERY SELECT false, 'Booking not found'::VARCHAR(500);
    RETURN;
  END IF;

  -- Update booking with end time
  UPDATE bookings
  SET actual_end_time = CURRENT_TIMESTAMP, payment_status = 'PAID'::booking_payment_status
  WHERE id = p_booking_id;

  -- Update request status to COMPLETED
  UPDATE service_requests
  SET status = 'COMPLETED'
  WHERE id = v_request_id;

  -- Update payment status to SUCCESS
  UPDATE payments
  SET status = 'SUCCESS'::payment_status, paid_at = CURRENT_TIMESTAMP
  WHERE booking_id = p_booking_id AND status = 'PENDING'::payment_status;

  RETURN QUERY SELECT true, NULL::VARCHAR(500);
END;
$$ LANGUAGE plpgsql;
