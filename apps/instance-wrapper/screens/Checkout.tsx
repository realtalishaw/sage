import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/src/integrations/supabase/client';
import { checkUserHasAccess } from '../services/access';

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [checkingAccess, setCheckingAccess] = React.useState(true);

  // Check if user already has access and redirect them
  React.useEffect(() => {
    const checkAccess = async () => {
      try {
        const hasAccess = await checkUserHasAccess();
        if (hasAccess) {
          navigate('/app/home', { replace: true });
        }
      } catch (error) {
        console.error('Error checking access:', error);
      } finally {
        setCheckingAccess(false);
      }
    };
    checkAccess();
  }, [navigate]);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Get the authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        throw new Error('Please log in to continue.');
      }

      // Call the create-checkout edge function
      const { data, error } = await supabase.functions.invoke('create-checkout');

      if (error) {
        throw new Error(error.message || 'Failed to create checkout session');
      }

      if (!data?.url) {
        throw new Error('No checkout URL returned');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(error.message || 'Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  if (checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[520px] p-10 bg-[#212121] border border-white/10 rounded-[22px] shadow-2xl">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block mb-4">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center font-black text-[#0B0B0C] shadow-lg text-lg">
              G.
            </div>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Subscribe to GIA</h1>
          <p className="text-sm text-white/40">Start your 48-hour free trial today.</p>
        </div>

        {/* Pricing Card */}
        <div className="mb-8 p-6 bg-[#2a2a2a] border border-white/10 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">Alpha Pro Plan</h3>
              <p className="text-sm text-white/40 mt-1">Full agency access with early feature rollout.</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">$200</div>
              <div className="text-xs uppercase font-bold text-white/20 tracking-widest">Per Month</div>
            </div>
          </div>

          {/* Usage Limits Note */}
          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="text-xs text-white/50 mb-2">
              Usage limits apply. 
              <a 
                href="https://docs.generalintelligence.agency/usage-limits" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-white/70 hover:text-white underline ml-1"
              >
                View limits <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>

        <Button 
          variant="primary" 
          className="w-full h-12 mb-4" 
          onClick={handleCheckout}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            'Start Free Trial'
          )}
        </Button>

        <div className="text-center">
          <Link 
            to="/login" 
            className="text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
