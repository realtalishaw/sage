-- Add referral tracking columns to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS referral_bonus_hours INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_referred_by ON public.subscriptions(referred_by);

-- Comment on new columns
COMMENT ON COLUMN public.subscriptions.referral_bonus_hours IS 'Total bonus hours earned from successful referrals';
COMMENT ON COLUMN public.subscriptions.referred_by IS 'User ID of the person who referred this subscriber';