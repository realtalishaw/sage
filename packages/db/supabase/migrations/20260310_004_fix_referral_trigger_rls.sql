-- =============================================================================
-- Fix update_referral_count trigger to run with elevated privileges
-- Created: 2026-03-10
-- Description: Trigger runs as session user; RLS blocks UPDATE on referrer's
--   profile and INSERT on referral_events. Make function SECURITY DEFINER.
-- =============================================================================

CREATE OR REPLACE FUNCTION update_referral_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Run with owner privileges so trigger can update referrer and insert events
SET search_path = public
AS $$
BEGIN
  -- When someone sets referred_by, increment referrer's count
  IF TG_OP = 'INSERT' AND NEW.referred_by IS NOT NULL THEN
    UPDATE profiles
    SET referral_count = referral_count + 1
    WHERE id = NEW.referred_by;

    -- Create referral event
    INSERT INTO referral_events (referrer_id, referred_id, referral_code)
    VALUES (NEW.referred_by, NEW.id, NEW.referral_code);
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
      UPDATE profiles
      SET referral_count = referral_count + 1
      WHERE id = NEW.referred_by;

      -- Create referral event
      INSERT INTO referral_events (referrer_id, referred_id, referral_code)
      VALUES (NEW.referred_by, NEW.id, NEW.referral_code);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
