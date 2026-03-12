import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '@/src/integrations/supabase/client';

const CheckoutSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const verifySubscription = async () => {
      try {
        // Check subscription status via edge function
        const { data, error: fnError } = await supabase.functions.invoke('check-subscription');
        
        if (fnError) {
          console.warn('Error checking subscription:', fnError);
          // Still proceed - webhook may not have processed yet
        } else if (data?.subscribed) {
          console.log('Subscription verified:', data);
        }

        // Get session_id from URL (Stripe passes this)
        const sessionId = searchParams.get('session_id');
        if (sessionId) {
          console.log('Checkout session completed:', sessionId);
        }

        // Check if user used an invite code (stored during signup)
        const inviteCode = localStorage.getItem('used_invite_code');
        if (inviteCode) {
          // Apply referral bonus to the code creator
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            try {
              await supabase.functions.invoke('apply-referral-bonus', {
                body: {
                  referred_user_id: user.id,
                  invite_code: inviteCode,
                },
              });
              console.log('Referral bonus applied');
              // Clear the stored code
              localStorage.removeItem('used_invite_code');
            } catch (refErr) {
              console.error('Error applying referral bonus:', refErr);
            }
          }
        }
      } catch (err: any) {
        console.error('Error in checkout success:', err);
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
        // Redirect to onboarding after a short delay
        setTimeout(() => {
          navigate('/onboarding', { replace: true });
        }, 2500);
      }
    };

    verifySubscription();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[520px] p-10 bg-[#212121] border border-white/10 rounded-[22px] shadow-2xl text-center">
        <div className="mb-8">
          <Link to="/" className="inline-block mb-4">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center font-black text-[#0B0B0C] shadow-lg text-lg">
              G.
            </div>
          </Link>
          <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to GIA!</h1>
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-white/40" />
              <p className="text-sm text-white/40">
                Activating your trial...
              </p>
            </div>
          ) : error ? (
            <p className="text-sm text-red-400">
              {error}
            </p>
          ) : (
            <div>
              <p className="text-sm text-white/40 mb-2">
                Your 48-hour free trial has started!
              </p>
              <p className="text-xs text-white/30">
                Redirecting you to onboarding...
              </p>
            </div>
          )}
        </div>

        <Link
          to="/onboarding"
          className="text-sm text-white/60 hover:text-white/80 transition-colors underline"
        >
          Continue to onboarding →
        </Link>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
