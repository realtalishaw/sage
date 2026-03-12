import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { CommunicationCard } from '../../components/onboarding/CommunicationCard';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import { supabase } from '@/src/integrations/supabase/client';

const OnboardingStep4: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [initialMethods, setInitialMethods] = useState<string[] | undefined>();
  const [initialDetails, setInitialDetails] = useState<Record<string, string> | undefined>();

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
            current_step: 'communication',
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id);

        // Load saved communication preferences from user_data
        const userData = session.user_data as any;
        if (userData?.communicationMethods) {
          setInitialMethods(userData.communicationMethods);
          setInitialDetails(userData.communicationDetails);
        }
      } else {
        navigate('/onboarding');
      }
    } catch (error) {
      console.error('Error initializing step:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferencesToDatabase = async (
    userId: string, 
    sessionId: string | undefined,
    methods: string[], 
    details?: Record<string, string>
  ) => {
    try {
      // Save each communication method as a preference
      const preferences = methods.map(method => ({
        user_id: userId,
        preference_key: 'communication_channel',
        preference_value: method,
        source: 'onboarding',
        session_id: sessionId || null,
        metadata: details?.[method] ? { detail: details[method] } : null
      }));

      // Delete existing communication preferences for this user
      await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', userId)
        .eq('preference_key', 'communication_channel');

      // Insert new preferences
      if (preferences.length > 0) {
        const { error } = await supabase
          .from('user_preferences')
          .insert(preferences);
        
        if (error) {
          console.error('Error saving preferences:', error);
        } else {
          console.log('Communication preferences saved to user_preferences table');
        }
      }
    } catch (error) {
      console.error('Error saving preferences to database:', error);
    }
  };

  const handleSelect = async (methods: string[], details?: Record<string, string>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: session } = await supabase
          .from('onboarding_sessions')
          .select('id, user_data, session_id')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (session) {
          const updatedUserData = {
            ...(session.user_data as object || {}),
            communicationMethods: methods,
            communicationDetails: details || {}
          };

          // Update onboarding session
          await supabase
            .from('onboarding_sessions')
            .update({ 
              current_step: 'complete',
              user_data: updatedUserData,
              updated_at: new Date().toISOString()
            })
            .eq('id', session.id);

          // Save to user_preferences table
          await savePreferencesToDatabase(user.id, session.session_id, methods, details);
        }
      }
      navigate('/onboarding/5');
    } catch (error) {
      console.error('Error saving communication preference:', error);
      navigate('/onboarding/5');
    }
  };

  const handleBack = () => {
    navigate('/onboarding/3');
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
      <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-4">Step 4 of 5</p>
          <h1 className="text-2xl font-bold text-white mb-2">How should we reach you?</h1>
          <p className="text-sm text-white/40">Choose how your agent communicates with you.</p>
        </div>

        <CommunicationCard 
          onSelect={handleSelect} 
          initialMethods={initialMethods}
          initialDetails={initialDetails}
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

export default OnboardingStep4;
