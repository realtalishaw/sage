import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import { supabase } from '@/src/integrations/supabase/client';

const OnboardingStep2: React.FC = () => {
  const navigate = useNavigate();
  const [projectDescription, setProjectDescription] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessionData();
  }, []);

  const loadSessionData = async () => {
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
        // Update current step
        await supabase
          .from('onboarding_sessions')
          .update({ 
            current_step: 'project',
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id);

        // Pre-fill data if available
        const userData = session.user_data as any;
        if (userData?.projectDescription) setProjectDescription(userData.projectDescription);
        if (userData?.projectUrl) setProjectUrl(userData.projectUrl);
      } else {
        // No session, go back to start
        navigate('/onboarding');
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    setSaving(true);
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
          const updatedUserData = {
            ...(session.user_data as object || {}),
            projectDescription,
            projectUrl
          };

          await supabase
            .from('onboarding_sessions')
            .update({ 
              current_step: 'connectors',
              user_data: updatedUserData,
              updated_at: new Date().toISOString()
            })
            .eq('id', session.id);
        }
      }
      navigate('/onboarding/3');
    } catch (error) {
      console.error('Error saving project info:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/onboarding/1');
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
          <p className="text-xs text-white/40 uppercase tracking-wider mb-4">Step 2 of 5</p>
          <h1 className="text-2xl font-bold text-white mb-2">Tell us about your project</h1>
          <p className="text-sm text-white/40">What are you working on? Share a link or describe it.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="projectUrl" className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
              Project URL (optional)
            </label>
            <input
              id="projectUrl"
              type="url"
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              placeholder="https://your-project.com"
              disabled={saving}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/90 placeholder-white/30 focus:outline-none focus:border-white/20 disabled:opacity-50 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="projectDescription" className="block text-xs text-white/40 mb-2 uppercase tracking-wider">
              Description
            </label>
            <textarea
              id="projectDescription"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Describe what you're building or working on..."
              rows={4}
              disabled={saving}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/90 placeholder-white/30 focus:outline-none focus:border-white/20 disabled:opacity-50 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleBack}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-white/60 font-medium rounded-xl hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={handleContinue}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#0B0B0C] font-medium rounded-xl hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              Continue
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingStep2;
