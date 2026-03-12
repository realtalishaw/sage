import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NameInputCard } from '../../components/onboarding/NameInputCard';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import { supabase } from '@/src/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const OnboardingStep1: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialFirstName, setInitialFirstName] = useState('');
  const [initialLastName, setInitialLastName] = useState('');

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/activate');
        return;
      }

      // Check for existing session
      const { data: session } = await supabase
        .from('onboarding_sessions')
        .select('id, user_data')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (session) {
        // Update step to 'name' if returning to this page
        await supabase
          .from('onboarding_sessions')
          .update({ 
            current_step: 'name',
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id);

        // Pre-fill name if available
        const userData = session.user_data as any;
        if (userData?.firstName) setInitialFirstName(userData.firstName);
        if (userData?.lastName) setInitialLastName(userData.lastName);
      } else {
        // Create new session
        await supabase
          .from('onboarding_sessions')
          .insert({
            user_id: user.id,
            session_id: crypto.randomUUID(),
            current_step: 'name',
            user_data: {}
          });
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (firstName: string, lastName: string) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Update profile with name
        await supabase
          .from('profiles')
          .update({ first_name: firstName, last_name: lastName })
          .eq('id', user.id);

        // Get current session data and merge
        const { data: session } = await supabase
          .from('onboarding_sessions')
          .select('id, user_data')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (session) {
          const updatedUserData = {
            ...(session.user_data as object || {}),
            firstName,
            lastName
          };

          await supabase
            .from('onboarding_sessions')
            .update({ 
              current_step: 'project',
              user_data: updatedUserData,
              updated_at: new Date().toISOString()
            })
            .eq('id', session.id);
        }
      }
      navigate('/onboarding/2');
    } catch (error) {
      console.error('Error saving name:', error);
    } finally {
      setSaving(false);
    }
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
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-4">Step 1 of 5</p>
          <h1 className="text-2xl font-bold text-white mb-2">What's your name?</h1>
          <p className="text-sm text-white/40">Let's start with the basics.</p>
        </div>
        <NameInputCard 
          onSubmit={handleSubmit} 
          disabled={saving}
          initialFirstName={initialFirstName}
          initialLastName={initialLastName}
        />
      </div>
    </div>
  );
};

export default OnboardingStep1;
