-- =============================================================================
-- Fix Waitlist Positions - Store in Database Instead of Calculating On-the-Fly
-- Created: 2026-03-11
-- Description: Populate waitlist_position column and create triggers to maintain it
-- =============================================================================

-- =============================================================================
-- FUNCTION: Recalculate all waitlist positions
-- =============================================================================
CREATE OR REPLACE FUNCTION recalculate_waitlist_positions()
RETURNS void AS $$
BEGIN
  -- Update waitlist_position for all waitlist users based on the same logic
  -- as the waitlist_rankings view: earlier created_at and more referrals = better position
  WITH ranked_waitlist AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        ORDER BY
          created_at ASC,        -- Earlier signups first
          referral_count DESC    -- More referrals = higher priority (tie-breaker)
      ) AS position
    FROM profiles
    WHERE account_type = 'waitlist'
  )
  UPDATE profiles
  SET waitlist_position = ranked_waitlist.position
  FROM ranked_waitlist
  WHERE profiles.id = ranked_waitlist.id;

  -- Set waitlist_position to NULL for non-waitlist users
  UPDATE profiles
  SET waitlist_position = NULL
  WHERE account_type != 'waitlist';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGER: Update positions when waitlist changes
-- =============================================================================
CREATE OR REPLACE FUNCTION trigger_recalculate_waitlist_positions()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate all positions whenever:
  -- 1. New waitlist user is added
  -- 2. User's account_type changes (joins or leaves waitlist)
  -- 3. User's referral_count changes (affects their position)

  -- Always recalculate all positions to ensure consistency
  PERFORM recalculate_waitlist_positions();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_recalc_positions_on_insert ON profiles;
DROP TRIGGER IF EXISTS trigger_recalc_positions_on_update ON profiles;

-- Trigger on INSERT: When a new user joins the waitlist
CREATE TRIGGER trigger_recalc_positions_on_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.account_type = 'waitlist')
  EXECUTE FUNCTION trigger_recalculate_waitlist_positions();

-- Trigger on UPDATE: When account_type or referral_count changes
CREATE TRIGGER trigger_recalc_positions_on_update
  AFTER UPDATE OF account_type, referral_count ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_waitlist_positions();

-- =============================================================================
-- INITIAL POPULATION: Calculate positions for all existing users
-- =============================================================================
SELECT recalculate_waitlist_positions();

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON FUNCTION recalculate_waitlist_positions() IS 'Recalculates and updates waitlist_position for all waitlist users based on created_at and referral_count';
COMMENT ON FUNCTION trigger_recalculate_waitlist_positions() IS 'Trigger function to automatically update waitlist positions when relevant changes occur';
