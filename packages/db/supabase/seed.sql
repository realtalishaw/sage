-- =============================================================================
-- Seed Data for Invite and Referral System
-- Created: 2026-03-10
-- Description: Test data for development and testing
-- =============================================================================

-- Note: This seed file assumes you're using local Supabase with test auth users
-- For production, DO NOT run this seed file

-- =============================================================================
-- TEST USERS (via auth.users)
-- =============================================================================

-- In local development, you'll need to create test auth users first
-- This can be done via Supabase Dashboard or programmatically

-- For this seed, we'll assume these test users exist in auth.users:
-- User 1: test-waitlist-1@example.com (UUID: '00000000-0000-0000-0000-000000000001')
-- User 2: test-waitlist-2@example.com (UUID: '00000000-0000-0000-0000-000000000002')
-- User 3: test-trial-1@example.com (UUID: '00000000-0000-0000-0000-000000000003')
-- User 4: test-paid-1@example.com (UUID: '00000000-0000-0000-0000-000000000004')

-- =============================================================================
-- PROFILES
-- =============================================================================

-- Waitlist User 1 (no referrer)
INSERT INTO profiles (id, first_name, last_name, phone_number, account_type, referral_code)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Alice',
  'Waitlist',
  '+1234567890',
  'waitlist',
  'ABC12'
) ON CONFLICT (id) DO NOTHING;

-- Waitlist User 2 (referred by User 1)
INSERT INTO profiles (id, first_name, last_name, phone_number, account_type, referral_code, referred_by)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Bob',
  'Referred',
  '+1234567891',
  'waitlist',
  'XYZ78',
  '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Trial User (has invite codes)
INSERT INTO profiles (id, first_name, last_name, phone_number, account_type, referral_code)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'Charlie',
  'Trial',
  '+1234567892',
  'trial',
  'TRI99'
) ON CONFLICT (id) DO NOTHING;

-- Paid User (has invite codes)
INSERT INTO profiles (id, first_name, last_name, phone_number, account_type, referral_code)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'Diana',
  'Paid',
  '+1234567893',
  'paid',
  'PAI88'
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INVITE CODES (for trial and paid users)
-- =============================================================================

-- Invite codes for Trial User (Charlie)
INSERT INTO invite_codes (code, owner_id, is_claimed)
VALUES
  ('INV001', '00000000-0000-0000-0000-000000000003', false),
  ('INV002', '00000000-0000-0000-0000-000000000003', false),
  ('INV003', '00000000-0000-0000-0000-000000000003', true)
ON CONFLICT (code) DO NOTHING;

-- Invite codes for Paid User (Diana)
INSERT INTO invite_codes (code, owner_id, is_claimed)
VALUES
  ('PAY001', '00000000-0000-0000-0000-000000000004', false),
  ('PAY002', '00000000-0000-0000-0000-000000000004', false),
  ('PAY003', '00000000-0000-0000-0000-000000000004', false)
ON CONFLICT (code) DO NOTHING;

-- Mark one invite code as claimed by User 2
UPDATE invite_codes
SET
  is_claimed = true,
  claimed_by = '00000000-0000-0000-0000-000000000002',
  claimed_at = NOW()
WHERE code = 'INV003';

-- =============================================================================
-- ADDITIONAL WAITLIST USERS (for testing rankings)
-- =============================================================================

-- Create more waitlist users to test ranking system
INSERT INTO profiles (id, first_name, last_name, phone_number, account_type, referral_code, referred_by, created_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000005',
    'Eve',
    'Early',
    '+1234567894',
    'waitlist',
    'EVE11',
    NULL,
    NOW() - INTERVAL '10 days'
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'Frank',
    'Later',
    '+1234567895',
    'waitlist',
    'FRA22',
    '00000000-0000-0000-0000-000000000005', -- Referred by Eve
    NOW() - INTERVAL '5 days'
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    'Grace',
    'Latest',
    '+1234567896',
    'waitlist',
    'GRA33',
    '00000000-0000-0000-0000-000000000005', -- Referred by Eve
    NOW() - INTERVAL '2 days'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- REFERRAL EVENTS
-- =============================================================================

-- Note: These should be created automatically by the trigger,
-- but we can add them manually for testing if needed

INSERT INTO referral_events (referrer_id, referred_id, referral_code, ip_address, user_agent)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'ABC12',
    '192.168.1.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000006',
    'EVE11',
    '192.168.1.2',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000007',
    'EVE11',
    '192.168.1.3',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- UPDATE REFERRAL COUNTS (in case triggers didn't run)
-- =============================================================================

-- Update referral counts to match actual referrals
UPDATE profiles
SET referral_count = (
  SELECT COUNT(*)
  FROM profiles AS referred
  WHERE referred.referred_by = profiles.id
);

-- =============================================================================
-- VERIFICATION QUERIES (for testing)
-- =============================================================================

-- You can run these queries to verify the seed data:

-- View all profiles with referral info
-- SELECT id, first_name, last_name, account_type, referral_code, referral_count, referred_by FROM profiles ORDER BY created_at;

-- View all invite codes
-- SELECT code, owner_id, is_claimed, claimed_by FROM invite_codes ORDER BY owner_id, created_at;

-- View referral events
-- SELECT * FROM referral_events ORDER BY created_at;

-- View waitlist rankings
-- SELECT * FROM waitlist_rankings;

-- =============================================================================
-- NOTES
-- =============================================================================

-- To use this seed data:
-- 1. First create the auth users in Supabase Dashboard or via API:
--    - Go to Authentication > Users > Add User
--    - Create users with the emails and UUIDs mentioned above
-- 2. Run this seed file: pnpm db:reset (includes seed.sql)
-- 3. Verify data in Supabase Studio

-- Test scenarios enabled by this seed:
-- ✅ Waitlist user with no referrals (Alice)
-- ✅ Waitlist user referred by another (Bob)
-- ✅ Trial user with invite codes (Charlie)
-- ✅ Paid user with invite codes (Diana)
-- ✅ Claimed invite code (INV003)
-- ✅ Unclaimed invite codes
-- ✅ Multiple referrals from same user (Eve referred Frank and Grace)
-- ✅ Referral events with attribution data
-- ✅ Waitlist ranking calculations
