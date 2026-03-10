-- =============================================================================
-- Invite and Referral System Migration
-- Created: 2026-03-10
-- Description: Complete invite and referral system with waitlist management
-- =============================================================================

-- =============================================================================
-- HELPER FUNCTIONS (must be created before tables that use them)
-- =============================================================================

-- Function: Generate unique referral code (5 chars, SMS-optimized)
-- Used as default value for profiles.referral_code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed ambiguous chars (0, O, 1, I)
  code_length INTEGER := 5; -- Short code for SMS
BEGIN
  LOOP
    -- Generate 5-character random code
    code := '';
    FOR i IN 1..code_length LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    -- Check uniqueness
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = code);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate unique invite code (6 chars)
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No ambiguous chars
  code_length INTEGER := 6; -- 6 characters for invite codes
BEGIN
  LOOP
    code := '';
    FOR i IN 1..code_length LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    EXIT WHEN NOT EXISTS (SELECT 1 FROM invite_codes WHERE code = code);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABLE: profiles
-- Core user profile table, connected to auth.users
-- =============================================================================

CREATE TABLE profiles (
  -- Primary Key
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- User Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT, -- E.164 format recommended

  -- Account Status
  account_type TEXT NOT NULL DEFAULT 'waitlist' CHECK (account_type IN ('waitlist', 'trial', 'paid')),
  waitlist_position INTEGER, -- Their position in line (calculated, only for waitlist users)

  -- Referral System
  referral_code TEXT UNIQUE NOT NULL DEFAULT generate_referral_code(),
  referred_by UUID REFERENCES profiles(id), -- Who referred this user (nullable)
  referral_count INTEGER NOT NULL DEFAULT 0, -- How many people they've referred

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for profiles
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX idx_profiles_referred_by ON profiles(referred_by);
CREATE INDEX idx_profiles_account_type ON profiles(account_type);
CREATE INDEX idx_profiles_waitlist_users ON profiles(account_type) WHERE account_type = 'waitlist';
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

-- =============================================================================
-- TABLE: invite_codes
-- Manages single-use invite codes for trial/paid users
-- =============================================================================

CREATE TABLE invite_codes (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Code Details
  code TEXT UNIQUE NOT NULL, -- The actual invite code (e.g., "ABC123")
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Usage Tracking
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_by UUID REFERENCES profiles(id), -- Who used this code
  claimed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional: codes can expire

  -- Constraints
  CONSTRAINT claimed_by_requires_claimed CHECK (
    (is_claimed = true AND claimed_by IS NOT NULL AND claimed_at IS NOT NULL) OR
    (is_claimed = false AND claimed_by IS NULL AND claimed_at IS NULL)
  )
);

-- Indexes for invite_codes
CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_invite_codes_owner ON invite_codes(owner_id);
CREATE INDEX idx_invite_codes_claimed_by ON invite_codes(claimed_by);
CREATE INDEX idx_invite_codes_unclaimed ON invite_codes(is_claimed) WHERE is_claimed = false;

-- =============================================================================
-- TABLE: referral_events
-- Track every time a referral code is used for analytics and audit trail
-- =============================================================================

CREATE TABLE referral_events (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referral Details
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Who owns the referral code
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Who used the code
  referral_code TEXT NOT NULL, -- Snapshot of code used

  -- Attribution
  ip_address INET, -- Track for fraud detection
  user_agent TEXT, -- Browser/device info

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for referral_events
CREATE INDEX idx_referral_events_referrer ON referral_events(referrer_id);
CREATE INDEX idx_referral_events_referred ON referral_events(referred_id);
CREATE INDEX idx_referral_events_created_at ON referral_events(created_at);

-- =============================================================================
-- TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Trigger: Update referral_count when referred_by changes
CREATE OR REPLACE FUNCTION update_referral_count()
RETURNS TRIGGER AS $$
BEGIN
  -- When someone sets referred_by, increment referrer's count
  IF TG_OP = 'INSERT' AND NEW.referred_by IS NOT NULL THEN
    UPDATE profiles
    SET referral_count = referral_count + 1
    WHERE id = NEW.referred_by;

    -- Create referral event
    INSERT INTO referral_events (referrer_id, referred_id, referral_code)
    SELECT NEW.referred_by, NEW.id, referral_code
    FROM profiles
    WHERE id = NEW.referred_by;
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
      SELECT NEW.referred_by, NEW.id, referral_code
      FROM profiles
      WHERE id = NEW.referred_by;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_referral_count
  AFTER INSERT OR UPDATE OF referred_by ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_count();

-- Trigger: Auto-generate invite codes when user leaves waitlist
CREATE OR REPLACE FUNCTION auto_generate_invite_codes()
RETURNS TRIGGER AS $$
BEGIN
  -- When account_type changes from 'waitlist' to 'trial', generate 3 invite codes
  -- Only generate once (check if they already have codes)
  IF OLD.account_type = 'waitlist' AND NEW.account_type IN ('trial', 'paid') THEN
    -- Check if user already has invite codes (prevent duplicates)
    IF NOT EXISTS (SELECT 1 FROM invite_codes WHERE owner_id = NEW.id) THEN
      INSERT INTO invite_codes (code, owner_id)
      VALUES
        (generate_invite_code(), NEW.id),
        (generate_invite_code(), NEW.id),
        (generate_invite_code(), NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_invite_codes
  AFTER UPDATE OF account_type ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_invite_codes();

-- Trigger: Update updated_at timestamp on profiles
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_events ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Profiles Table Policies
-- -----------------------------------------------------------------------------

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Public can read basic profile info (for referral validation)
-- This allows checking if a referral code exists without being logged in
CREATE POLICY "Public can read referral codes"
  ON profiles FOR SELECT
  USING (true);

-- -----------------------------------------------------------------------------
-- Invite Codes Table Policies
-- -----------------------------------------------------------------------------

-- Users can read their own invite codes
CREATE POLICY "Users can read own invite codes"
  ON invite_codes FOR SELECT
  USING (owner_id = auth.uid());

-- Anyone can validate an invite code (read-only check)
CREATE POLICY "Public can check invite codes"
  ON invite_codes FOR SELECT
  USING (true);

-- Users can update invite codes they own (for claiming)
CREATE POLICY "Users can update invite codes"
  ON invite_codes FOR UPDATE
  USING (owner_id = auth.uid() OR claimed_by = auth.uid());

-- Service role can insert invite codes (via trigger or admin)
-- No insert policy for regular users - handled by trigger

-- -----------------------------------------------------------------------------
-- Referral Events Table Policies
-- -----------------------------------------------------------------------------

-- Users can read their own referral events (who they referred)
CREATE POLICY "Users can read own referrals"
  ON referral_events FOR SELECT
  USING (referrer_id = auth.uid());

-- Users can read events where they were referred
CREATE POLICY "Users can read events where referred"
  ON referral_events FOR SELECT
  USING (referred_id = auth.uid());

-- Service role handles inserts via trigger
-- No insert/update policies for regular users

-- =============================================================================
-- HELPER VIEWS (Optional - for easier queries)
-- =============================================================================

-- View: Waitlist rankings (calculated position based on created_at and referral bonuses)
CREATE OR REPLACE VIEW waitlist_rankings AS
SELECT
  id,
  first_name,
  last_name,
  referral_code,
  referral_count,
  created_at,
  -- Calculate position: earlier created_at = lower position (better)
  -- Subtract referral_count to move up in line (each referral = move up 1 spot)
  ROW_NUMBER() OVER (
    ORDER BY
      created_at ASC, -- Earlier signups first
      referral_count DESC -- More referrals = higher priority
  ) - referral_count AS calculated_position
FROM profiles
WHERE account_type = 'waitlist'
ORDER BY calculated_position;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE profiles IS 'Core user profile table with waitlist and referral tracking';
COMMENT ON TABLE invite_codes IS 'Single-use invite codes for trial/paid users (3 per user)';
COMMENT ON TABLE referral_events IS 'Audit trail of all referral code usage for analytics';

COMMENT ON COLUMN profiles.referral_code IS 'User''s personal referral code (5 chars, SMS-optimized)';
COMMENT ON COLUMN profiles.referred_by IS 'ID of user who referred this person';
COMMENT ON COLUMN profiles.referral_count IS 'Denormalized count of successful referrals';
COMMENT ON COLUMN profiles.waitlist_position IS 'Calculated position in waitlist queue';

COMMENT ON COLUMN invite_codes.code IS 'Single-use invite code (6 chars)';
COMMENT ON COLUMN invite_codes.is_claimed IS 'Whether this code has been used';
COMMENT ON COLUMN invite_codes.claimed_by IS 'User who claimed this code';
