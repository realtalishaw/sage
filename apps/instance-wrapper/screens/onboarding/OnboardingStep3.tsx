import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { DataSourceCard } from '../../components/onboarding/DataSourceCard';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import { supabase } from '@/src/integrations/supabase/client';

const OnboardingStep3: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeStep();
  }, []);

  const initializeStep = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/activate');
        return;
      }

      const { data: session } = await supabase
        .from('onboarding_sessions')
        .select('id, user_data')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (session) {
        await supabase
          .from('onboarding_sessions')
          .update({ 
            current_step: 'connectors',
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id);
      } else {
        navigate('/onboarding');
      }
    } catch (error) {
      console.error('Error initializing step:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (sourceId: string) => {
    console.log('Connected:', sourceId);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: session } = await supabase
          .from('onboarding_sessions')
          .select('id, user_data')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (session) {
          const currentConnectors = ((session.user_data as any)?.connectors || []) as string[];
          // Avoid duplicates
          if (!currentConnectors.includes(sourceId)) {
            const updatedUserData = {
              ...(session.user_data as object || {}),
              connectors: [...currentConnectors, sourceId]
            };

            await supabase
              .from('onboarding_sessions')
              .update({ 
                user_data: updatedUserData,
                updated_at: new Date().toISOString()
              })
              .eq('id', session.id);
          }
        }
      }
    } catch (error) {
      console.error('Error saving connector:', error);
    }
  };

  const handleSkip = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('onboarding_sessions')
          .update({ 
            current_step: 'communication',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      }
      navigate('/onboarding/4');
    } catch (error) {
      console.error('Error:', error);
      navigate('/onboarding/4');
    }
  };

  const handleBack = () => {
    navigate('/onboarding/2');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0b0b]">
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 pt-20 bg-[#0b0b0b]">
      <OnboardingHeader />
      <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-4">Step 3 of 5</p>
          <h1 className="text-2xl font-bold text-white mb-2">Connect your tools</h1>
          <p className="text-sm text-white/40">Link your accounts so your agent can work across platforms.</p>
        </div>

        <DataSourceCard 
          onConnect={handleConnect} 
          onSkip={handleSkip} 
        />

        <button
          onClick={handleBack}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 text-white/40 hover:text-white/60 transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Back</span>
        </button>
      </div>
    </div>
  );
};

export default OnboardingStep3;
