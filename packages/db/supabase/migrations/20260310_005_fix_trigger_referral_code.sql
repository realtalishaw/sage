-- =============================================================================
-- Fix update_referral_count trigger to use correct referral code
-- Created: 2026-03-10
-- Description: The trigger was using NEW.referral_code (the new user's code)
--   instead of the referrer's code. Also adds INSERT policy for referral_events.
-- =============================================================================

-- =============================================================================
-- Add INSERT policy for referral_events (allows trigger to insert)
-- =============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow trigger inserts" ON referral_events;

-- Create policy that allows inserts (will be bypassed by SECURITY DEFINER anyway)
CREATE POLICY "Allow trigger inserts"
  ON referral_events FOR INSERT
  WITH CHECK (true);

-- =============================================================================
-- Fix the trigger function
-- =============================================================================

CREATE OR REPLACE FUNCTION update_referral_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Run with owner privileges so trigger can update referrer and insert events
SET search_path = public
AS $$
DECLARE
  referrer_code TEXT;
BEGIN
  -- When someone sets referred_by, increment referrer's count
  IF TG_OP = 'INSERT' AND NEW.referred_by IS NOT NULL THEN
    -- Get the referrer's referral code
    SELECT referral_code INTO referrer_code
    FROM profiles
    WHERE id = NEW.referred_by;

    -- Update referrer's count
    UPDATE profiles
    SET referral_count = referral_count + 1
    WHERE id = NEW.referred_by;

    -- Create referral event with the REFERRER's code (not the new user's code)
    INSERT INTO referral_events (referrer_id, referred_id, referral_code)
    VALUES (NEW.referred_by, NEW.id, referrer_code);
  END IF;

  -- When referred_by changes, adjust counts
  IF TG_OP = 'UPDATE' AND OLD.referred_by IS DISTINCT FROM NEW.referred_by THEN
    -- Decrement old referrer
    IF OLD.referred_by IS NOT NULL THEN
      UPDATE profiles
      SET referral_count = referral_count - 1
      WHERE id = OLD.referred_by;
    END IF;

    -- Increment new referrer
    IF NEW.referred_by IS NOT NULL THEN
      -- Get the new referrer's referral code
      SELECT referral_code INTO referrer_code
      FROM profiles
      WHERE id = NEW.referred_by;

      UPDATE profiles
      SET referral_count = referral_count + 1
      WHERE id = NEW.referred_by;

      -- Create referral event with the REFERRER's code
      INSERT INTO referral_events (referrer_id, referred_id, referral_code)
      VALUES (NEW.referred_by, NEW.id, referrer_code);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON FUNCTION update_referral_count IS 'Updates referral counts and creates events when users are referred. Fixed to use referrer''s code instead of new user''s code.';
