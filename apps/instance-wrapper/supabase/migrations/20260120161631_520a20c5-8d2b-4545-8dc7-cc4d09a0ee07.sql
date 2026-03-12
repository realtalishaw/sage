-- Add onboarding_completed flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Create onboarding_sessions table to store progress
CREATE TABLE public.onboarding_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  current_step text NOT NULL DEFAULT 'greeting',
  user_data jsonb DEFAULT '{}'::jsonb,
  conversation_history jsonb DEFAULT '[]'::jsonb,
  enrichment_data jsonb DEFAULT '{}'::jsonb,
  document_content text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  UNIQUE(user_id, session_id)
);

-- Enable RLS
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for onboarding_sessions
CREATE POLICY "Users can view their own onboarding sessions"
ON public.onboarding_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own onboarding sessions"
ON public.onboarding_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding sessions"
ON public.onboarding_sessions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role has full access to onboarding_sessions"
ON public.onboarding_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_onboarding_sessions_updated_at
BEFORE UPDATE ON public.onboarding_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_onboarding_sessions_user_id ON public.onboarding_sessions(user_id);
CREATE INDEX idx_onboarding_sessions_user_session ON public.onboarding_sessions(user_id, session_id);