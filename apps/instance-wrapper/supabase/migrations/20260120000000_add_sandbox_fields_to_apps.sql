-- Add sandbox-related fields to apps table
ALTER TABLE public.apps
ADD COLUMN IF NOT EXISTS sandbox_id TEXT,
ADD COLUMN IF NOT EXISTS sandbox_url TEXT,
ADD COLUMN IF NOT EXISTS sandbox_port INTEGER DEFAULT 5173;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_apps_sandbox_id ON public.apps(sandbox_id) WHERE sandbox_id IS NOT NULL;

-- Comment on new columns
COMMENT ON COLUMN public.apps.sandbox_id IS 'E2B sandbox ID for this app';
COMMENT ON COLUMN public.apps.sandbox_url IS 'Public URL of the running sandbox';
COMMENT ON COLUMN public.apps.sandbox_port IS 'Port number the app runs on (default 5173 for Vite)';
