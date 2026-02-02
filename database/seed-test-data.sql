-- ============================================
-- Test Data for Dolbom Application
-- Creates test users for development
-- ============================================

-- Note: Passwords should be hashed using bcrypt in production
-- For testing, we'll use plain text (NOT for production!)

-- Test Customer User (password: customer123)
INSERT INTO users (
  email, password_hash, name, phone, role, is_verified, is_active
) VALUES (
  '01012345678',
  '$2b$10$0TPLwOxkIudlzSUaf5Zvp.gKOLxxI73LMRj9f3W59wTTkH8Yi.iAC',
  '테스트 고객',
  '01012345678',
  'CUSTOMER',
  true,
  true
) ON CONFLICT (email) DO NOTHING;

-- Test Manager User (password: manager123)
INSERT INTO users (
  email, password_hash, name, phone, role, is_verified, is_active
) VALUES (
  '01087654321',
  '$2b$10$TMzoGk3O3OHzmcZt7bx00enDY73JPP7FnN/YHHS47ujv8pIUIGBMu',
  '테스트 매니저',
  '01087654321',
  'MANAGER',
  true,
  true
) ON CONFLICT (email) DO NOTHING;

-- Test Admin User (password: admin123)
INSERT INTO users (
  email, password_hash, name, phone, role, is_verified, is_active
) VALUES (
  'admin@test.local',
  '$2b$10$ogQHBKqpqtvOKkkGDTI6febyIEqyDVbfsCvefOKmfMb8K5.L9qImW',
  '테스트 관리자',
  '01099999999',
  'ADMIN',
  true,
  true
) ON CONFLICT (email) DO NOTHING;

-- Create manager profile for test manager
INSERT INTO manager_profiles (user_id, is_active, rating, review_count, total_bookings)
SELECT id, true, 4.50, 0, 0
FROM users
WHERE email = '01087654321'
ON CONFLICT (user_id) DO NOTHING;

-- Verify data
SELECT email, name, phone, role, is_active FROM users WHERE email LIKE '%test%' ORDER BY role;
