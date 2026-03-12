import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { User } from '../types';
import { supabase } from '@/src/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface Props {
  user?: User;
}

const STEP_ROUTES: Record<string, string> = {
  'name': '/onboarding/1',
  'project': '/onboarding/2',
  'connectors': '/onboarding/3',
  'communication': '/onboarding/4',
  'bio': '/onboarding/5',
  'complete': '/onboarding/6',
  'completed': '/app/home',
};

const Onboarding: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const searchParams = window.location.search;
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setChecking(false);
        return;
      }

      // Check for existing onboarding session
      const { data: session } = await supabase
        .from('onboarding_sessions')
        .select('current_step, completed_at')
        .eq('user_id', authUser.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (session) {
        // If completed, go to home
        if (session.completed_at) {
          navigate('/app/home', { replace: true });
          return;
        }

        // Resume from saved step
        const route = STEP_ROUTES[session.current_step];
        if (route && route !== '/onboarding/1') {
          navigate(`${route}${searchParams}`, { replace: true });
          return;
        }
      }

      setChecking(false);
    } catch (error) {
      console.error('Error checking session:', error);
      setChecking(false);
    }
  };

  const handleContinue = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // Create initial onboarding session
        const { data: existingSession } = await supabase
          .from('onboarding_sessions')
          .select('id')
          .eq('user_id', authUser.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!existingSession) {
          await supabase
            .from('onboarding_sessions')
            .insert({
              user_id: authUser.id,
              session_id: crypto.randomUUID(),
              current_step: 'name',
              user_data: {}
            });
        }
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
    
    navigate(`/onboarding/1${searchParams}`);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0b0b]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
          <p className="text-sm text-white/40">Checking your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-center p-6 bg-[#0b0b0b]">
      <div className="max-w-[600px] animate-in fade-in zoom-in duration-700">
        <h1 className="text-[40px] font-[650] mb-4 text-white">Welcome to the General <br/>Intelligence Agency.</h1>
        <p className="text-xl text-white/40 mb-12">The first AI agent that doesn't wait for you.</p>
        <div className="flex flex-col items-center gap-4">
          <Button variant="primary" size="lg" className="px-12 h-14" onClick={handleContinue}>Begin →</Button>
          <p className="text-xs text-white/20 mt-8">This will take about 5 minutes.</p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
