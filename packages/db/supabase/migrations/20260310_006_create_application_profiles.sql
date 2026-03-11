-- =============================================================================
-- Application Profiles
-- =============================================================================
--
-- Persist the approved Sage application output so the result does not live only
-- in browser storage. This stores:
-- - the final structured bootstrap profile/review contract
-- - the chosen avatar configuration
-- - the captured avatar portrait png
-- - the transcript snapshot used to reach approval
--
-- The row is owned by the authenticated applicant and keyed by the
-- application_id generated in the marketing-site flow.

CREATE TABLE application_profiles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile JSONB NOT NULL,
  review JSONB NOT NULL,
  avatar JSONB NOT NULL,
  avatar_portrait_png TEXT,
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  final_stage TEXT NOT NULL DEFAULT 'review',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_application_profiles_user_id
  ON application_profiles(user_id);

CREATE INDEX idx_application_profiles_completed_at
  ON application_profiles(completed_at DESC);

CREATE TRIGGER trigger_application_profiles_updated_at
  BEFORE UPDATE ON application_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE application_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own application profiles"
  ON application_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own application profiles"
  ON application_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own application profiles"
  ON application_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE application_profiles IS 'Approved Sage application payloads, including avatar config and review summaries';
COMMENT ON COLUMN application_profiles.profile IS 'Structured bootstrap profile contract captured at approval';
COMMENT ON COLUMN application_profiles.review IS 'Structured bootstrap review contract shown before approval';
COMMENT ON COLUMN application_profiles.avatar IS 'Chosen avatar configuration and colors';
COMMENT ON COLUMN application_profiles.avatar_portrait_png IS 'Captured PNG portrait used for invite card rendering';
