-- ============================================
-- PostgreSQL Schema for Dolbom
-- Converted from MySQL/MariaDB
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM Types
-- ============================================

CREATE TYPE user_role AS ENUM ('CUSTOMER', 'MANAGER', 'ADMIN');
CREATE TYPE service_request_status AS ENUM ('PENDING', 'MATCHING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
CREATE TYPE application_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TYPE booking_payment_status AS ENUM ('PENDING', 'PAID', 'REFUNDED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED');
CREATE TYPE settlement_status AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');
CREATE TYPE device_platform AS ENUM ('android', 'ios', 'web');

-- ============================================
-- 1. users (회원)
-- ============================================

DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  address VARCHAR(255),
  address_detail VARCHAR(255),
  role user_role NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  profile_image_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  auth_user_id UUID UNIQUE
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- 2. manager_profiles (매니저 프로필)
-- ============================================

DROP TABLE IF EXISTS manager_profiles CASCADE;
CREATE TABLE manager_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  service_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  available_services JSONB NOT NULL DEFAULT '[]'::jsonb,
  hourly_rate INTEGER CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
  rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  total_bookings INTEGER NOT NULL DEFAULT 0 CHECK (total_bookings >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_manager_profiles_is_active ON manager_profiles(is_active);
CREATE INDEX idx_manager_profiles_lat_lng ON manager_profiles(lat, lng);

-- ============================================
-- 3. service_requests (서비스 요청)
-- ============================================

DROP TABLE IF EXISTS service_requests CASCADE;
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_type VARCHAR(50) NOT NULL,
  service_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  address VARCHAR(255) NOT NULL,
  address_detail VARCHAR(255),
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  details TEXT,
  status service_request_status NOT NULL DEFAULT 'PENDING',
  estimated_price INTEGER NOT NULL CHECK (estimated_price >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_service_requests_customer ON service_requests(customer_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_date ON service_requests(service_date);
CREATE INDEX idx_service_requests_lat_lng ON service_requests(lat, lng);

-- ============================================
-- 4. applications (매니저 지원)
-- ============================================

DROP TABLE IF EXISTS applications CASCADE;
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'PENDING',
  message VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (request_id, manager_id)
);

CREATE INDEX idx_applications_request ON applications(request_id);
CREATE INDEX idx_applications_manager ON applications(manager_id);
CREATE INDEX idx_applications_status ON applications(status);

-- ============================================
-- 5. bookings (확정된 예약)
-- ============================================

DROP TABLE IF EXISTS bookings CASCADE;
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL UNIQUE REFERENCES service_requests(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actual_start_time TIMESTAMP,
  actual_end_time TIMESTAMP,
  final_price INTEGER NOT NULL CHECK (final_price >= 0),
  payment_status booking_payment_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_manager ON bookings(manager_id);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);

-- ============================================
-- 6. reviews (리뷰)
-- ============================================

DROP TABLE IF EXISTS reviews CASCADE;
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_manager ON reviews(manager_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- ============================================
-- 7. notifications (알림)
-- ============================================

DROP TABLE IF EXISTS notifications CASCADE;
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================
-- 8. billing_keys (결제 카드 정보)
-- ============================================

DROP TABLE IF EXISTS billing_keys CASCADE;
CREATE TABLE billing_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  billing_key VARCHAR(500) NOT NULL,
  card_company VARCHAR(50) NOT NULL,
  card_number_last4 VARCHAR(4) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_billing_keys_user ON billing_keys(user_id);

-- ============================================
-- 9. payments (결제 내역)
-- ============================================

DROP TABLE IF EXISTS payments CASCADE;
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  payment_method VARCHAR(50) NOT NULL,
  payment_key VARCHAR(255),
  status payment_status NOT NULL DEFAULT 'PENDING',
  failed_reason TEXT,
  refund_amount INTEGER CHECK (refund_amount IS NULL OR refund_amount >= 0),
  refund_reason TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);

-- ============================================
-- 10. settlements (매니저 정산)
-- ============================================

DROP TABLE IF EXISTS settlements CASCADE;
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  gross_amount INTEGER NOT NULL CHECK (gross_amount >= 0),
  platform_fee INTEGER NOT NULL CHECK (platform_fee >= 0),
  platform_fee_rate DECIMAL(5,4) NOT NULL,
  net_amount INTEGER NOT NULL CHECK (net_amount >= 0),
  status settlement_status NOT NULL DEFAULT 'PENDING',
  bank_name VARCHAR(50),
  account_number VARCHAR(100),
  account_holder VARCHAR(100),
  settled_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_settlements_manager ON settlements(manager_id);
CREATE INDEX idx_settlements_status ON settlements(status);
CREATE INDEX idx_settlements_created ON settlements(created_at);

-- ============================================
-- 11. admins (관리자 — 로그인 전용)
-- ============================================

DROP TABLE IF EXISTS admins CASCADE;
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  admin_id VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admins_admin_id ON admins(admin_id);

-- ============================================
-- 12. manager_device_tokens (매니저 디바이스 토큰)
-- ============================================

DROP TABLE IF EXISTS manager_device_tokens CASCADE;
CREATE TABLE manager_device_tokens (
  id SERIAL PRIMARY KEY,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_token VARCHAR(255) NOT NULL,
  platform device_platform NOT NULL DEFAULT 'android',
  app_version VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (manager_id, device_token)
);

CREATE INDEX idx_manager_device_manager ON manager_device_tokens(manager_id);
CREATE INDEX idx_manager_device_is_active ON manager_device_tokens(is_active);

-- ============================================
-- 13. user_device_tokens (사용자 디바이스 토큰 - 고객)
-- ============================================

DROP TABLE IF EXISTS user_device_tokens CASCADE;
CREATE TABLE user_device_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_token VARCHAR(255) NOT NULL,
  platform device_platform NOT NULL DEFAULT 'android',
  app_version VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, device_token)
);

CREATE INDEX idx_user_device_user ON user_device_tokens(user_id);
CREATE INDEX idx_user_device_is_active ON user_device_tokens(is_active);
