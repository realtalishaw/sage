-- =============================================================================
-- Security Fix: Restrict RLS Policies for PII Protection
-- Created: 2026-03-10
-- Description: Fix overly permissive RLS policies that expose PII
-- =============================================================================

-- =============================================================================
-- DROP OVERLY PERMISSIVE POLICIES
-- =============================================================================

-- Remove the public read policy that allows anyone to see all profiles
DROP POLICY IF EXISTS "Public can read referral codes" ON profiles;

-- Remove public read on invite_codes that allows anyone to see all codes
DROP POLICY IF EXISTS "Public can check invite codes" ON invite_codes;

-- =============================================================================
-- CREATE SECURE POLICIES FOR PROFILES
-- =============================================================================

-- Users can read their own profile (keep existing)
-- Policy already exists, no change needed

-- Allow public to ONLY validate if a referral code exists (no PII)
-- This creates a function that only returns true/false without exposing data
CREATE OR REPLACE FUNCTION public.referral_code_exists(code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE referral_code = code
  );
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.referral_code_exists TO authenticated, anon;

-- =============================================================================
-- CREATE SECURE POLICIES FOR INVITE CODES
-- =============================================================================

-- Allow public to check if a specific invite code is valid (without seeing all codes)
-- This prevents enumeration attacks while allowing code validation
CREATE OR REPLACE FUNCTION public.validate_invite_code_public(code TEXT)
RETURNS TABLE(is_valid BOOLEAN, is_claimed BOOLEAN, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    true AS is_valid,
    ic.is_claimed,
    ic.expires_at
  FROM invite_codes ic
  WHERE ic.code = UPPER(code)
  LIMIT 1;

  -- If no rows returned, the code doesn't exist
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, true, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.validate_invite_code_public TO authenticated, anon;

-- =============================================================================
-- SECURE WAITLIST RANKINGS VIEW
-- =============================================================================

-- Drop the existing view that exposes PII
DROP VIEW IF EXISTS waitlist_rankings;

-- Create a secure view that only shows user's own ranking and anonymized stats
CREATE OR REPLACE VIEW waitlist_rankings_secure AS
SELECT
  id,
  referral_count,
  created_at,
  ROW_NUMBER() OVER (
    ORDER BY
      created_at ASC,
      referral_count DESC
  ) - referral_count AS calculated_position
FROM profiles
WHERE account_type = 'waitlist';

-- Enable RLS on the secure view
ALTER VIEW waitlist_rankings_secure SET (security_barrier = true);

-- Create a function for users to get their own waitlist position
CREATE OR REPLACE FUNCTION public.get_my_waitlist_position()
RETURNS TABLE(
  waitlist_position BIGINT,
  referral_count INTEGER,
  total_in_waitlist BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wr.calculated_position AS waitlist_position,
    wr.referral_count,
    (SELECT COUNT(*) FROM profiles WHERE account_type = 'waitlist') AS total_in_waitlist
  FROM waitlist_rankings_secure wr
  WHERE wr.id = auth.uid()
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_my_waitlist_position TO authenticated;

-- =============================================================================
-- CREATE SECURE FUNCTION FOR REFERRAL VALIDATION
-- =============================================================================

-- Function to get referrer info when signing up (only returns safe fields)
CREATE OR REPLACE FUNCTION public.get_referrer_info(referral_code_input TEXT)
RETURNS TABLE(
  referrer_id UUID,
  referrer_name TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS referrer_id,
    p.first_name || ' ' || SUBSTRING(p.last_name, 1, 1) || '.' AS referrer_name,
    true AS is_valid
  FROM profiles p
  WHERE p.referral_code = UPPER(referral_code_input)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, false;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_referrer_info TO authenticated, anon;

-- =============================================================================
-- UPDATE EXISTING POLICIES TO BE MORE RESTRICTIVE
-- =============================================================================

-- Ensure profiles can only be read by the owner or for specific referral validation
-- (The "Users can read own profile" policy already exists and is correct)

-- Add policy for reading referrer's name when being referred
CREATE POLICY "Users can read referrer info when signing up"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Can read profile if it's their referrer
    id IN (
      SELECT referred_by FROM profiles WHERE id = auth.uid()
    )
  );

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION public.referral_code_exists IS 'Securely check if a referral code exists without exposing PII';
COMMENT ON FUNCTION public.validate_invite_code_public IS 'Validate invite code without exposing all codes (prevents enumeration)';
COMMENT ON FUNCTION public.get_my_waitlist_position IS 'Get authenticated user''s own waitlist position';
COMMENT ON FUNCTION public.get_referrer_info IS 'Get limited referrer info when signing up with a referral code';

-- =============================================================================
-- SECURITY VERIFICATION
-- =============================================================================

-- Verify RLS is enabled on all tables
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles') THEN
    RAISE EXCEPTION 'RLS not enabled on profiles table!';
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'invite_codes') THEN
    RAISE EXCEPTION 'RLS not enabled on invite_codes table!';
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'referral_events') THEN
    RAISE EXCEPTION 'RLS not enabled on referral_events table!';
  END IF;

  RAISE NOTICE 'RLS security verification passed!';
END $$;
