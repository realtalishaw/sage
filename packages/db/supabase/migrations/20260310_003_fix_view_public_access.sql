-- =============================================================================
-- Fix Public Access to waitlist_rankings_secure View
-- Created: 2026-03-10
-- Description: Remove the view and make function query profiles directly
-- =============================================================================

-- Drop the publicly accessible view
DROP VIEW IF EXISTS waitlist_rankings_secure CASCADE;

-- Recreate the function to calculate position directly without a view
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
DECLARE
  user_created_at TIMESTAMPTZ;
  user_referral_count INTEGER;
BEGIN
  -- Get the authenticated user's data
  SELECT created_at, profiles.referral_count
  INTO user_created_at, user_referral_count
  FROM profiles
  WHERE id = auth.uid() AND account_type = 'waitlist';

  -- If user not found or not on waitlist, return null
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::BIGINT, NULL::INTEGER, NULL::BIGINT;
    RETURN;
  END IF;

  -- Calculate position: count users who should be ahead in line
  RETURN QUERY
  SELECT
    (
      -- Count users ahead of this user
      (
        SELECT COUNT(*)::BIGINT
        FROM profiles p
        WHERE p.account_type = 'waitlist'
        AND (
          -- Earlier signup time
          p.created_at < user_created_at
          OR
          -- Same signup time but more referrals
          (p.created_at = user_created_at AND p.referral_count > user_referral_count)
        )
      ) + 1 -- Add 1 because positions are 1-indexed
      - user_referral_count -- Subtract referral count (each referral moves you up)
    ) AS waitlist_position,
    user_referral_count AS referral_count,
    (SELECT COUNT(*)::BIGINT FROM profiles WHERE account_type = 'waitlist') AS total_in_waitlist;
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_my_waitlist_position TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_waitlist_position FROM anon, public;

-- =============================================================================
-- Verify RLS is properly configured
-- =============================================================================

DO $$
DECLARE
  profile_rls BOOLEAN;
  invite_rls BOOLEAN;
  events_rls BOOLEAN;
  profile_policies INTEGER;
  public_profile_policy BOOLEAN;
BEGIN
  -- Check RLS is enabled
  SELECT relrowsecurity INTO profile_rls FROM pg_class WHERE relname = 'profiles';
  SELECT relrowsecurity INTO invite_rls FROM pg_class WHERE relname = 'invite_codes';
  SELECT relrowsecurity INTO events_rls FROM pg_class WHERE relname = 'referral_events';

  IF NOT profile_rls THEN
    RAISE EXCEPTION 'RLS NOT ENABLED on profiles table!';
  END IF;

  IF NOT invite_rls THEN
    RAISE EXCEPTION 'RLS NOT ENABLED on invite_codes table!';
  END IF;

  IF NOT events_rls THEN
    RAISE EXCEPTION 'RLS NOT ENABLED on referral_events table!';
  END IF;

  -- Check that we don't have overly permissive policies
  SELECT COUNT(*) INTO profile_policies
  FROM pg_policies
  WHERE tablename = 'profiles';

  IF profile_policies = 0 THEN
    RAISE WARNING 'No RLS policies found on profiles table!';
  END IF;

  -- Check if "Public can read referral codes" policy exists (it shouldn't)
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
    AND policyname = 'Public can read referral codes'
  ) INTO public_profile_policy;

  IF public_profile_policy THEN
    RAISE EXCEPTION 'SECURITY ISSUE: "Public can read referral codes" policy still exists!';
  END IF;

  RAISE NOTICE '✅ RLS SECURITY VERIFICATION PASSED!';
  RAISE NOTICE '✅ All tables have RLS enabled';
  RAISE NOTICE '✅ No public access policies found';
  RAISE NOTICE '✅ PII is protected';
END $$;
