import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, MessageSquare, Loader2 } from 'lucide-react';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import { supabase } from '@/src/integrations/supabase/client';
import { Button } from '../../components/Button';
import { checkUserHasAccess } from '../../services/access';

// TODO: Implement generation of agent ID, email, and phone number
// These should be generated when the user starts onboarding and stored in assistant_identity table

const OnboardingStep6: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [firstName, setFirstName] = useState('');
  
  // Agent identity data from database
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentEmail, setAgentEmail] = useState<string | null>(null);
  const [agentPhone, setAgentPhone] = useState<string | null>(null);

  useEffect(() => {
    loadAgentInfo();
  }, []);

  const loadAgentInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/activate');
        return;
      }

      // Check for session
      const { data: session } = await supabase
        .from('onboarding_sessions')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!session) {
        navigate('/onboarding');
        return;
      }

      // Update current step
      await supabase
        .from('onboarding_sessions')
        .update({ 
          current_step: 'complete',
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id);

      // Fetch agent identity from database
      const { data: identity } = await supabase
        .from('assistant_identity')
        .select('id, email, phone_number')
        .eq('user_id', user.id)
        .maybeSingle();

      if (identity) {
        // TODO: The ID format should be generated server-side (e.g., GIA-XXXXXXXX)
        setAgentId(identity.id ? `GIA-${identity.id.slice(0, 8).toUpperCase()}` : null);
        setAgentEmail(identity.email);
        setAgentPhone(identity.phone_number);
      } else {
        // TODO: Create assistant_identity record with generated values
        // For now, use dummy data since values will be null
        const shortId = user.id.slice(0, 8).toUpperCase();
        setAgentId(`GIA-${shortId}`);
        setAgentEmail('gia-agent@gia.agency'); // Dummy data
        setAgentPhone('+1 (555) 123-4567'); // Dummy data
      }

      // Get first name
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single();

      if (profile?.first_name) {
        setFirstName(profile.first_name);
      }
    } catch (error) {
      console.error('Error loading agent info:', error);
      // Fallback to dummy data on error
      setAgentId('GIA-00000000');
      setAgentEmail('gia-agent@gia.agency');
      setAgentPhone('+1 (555) 123-4567');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadVCard = () => {
    const name = 'GIA Core Assistant';
    const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL:${agentPhone || ''}
EMAIL:${agentEmail || ''}
END:VCARD`;
    const blob = new Blob([vCard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GIA_Core_Assistant.vcf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTextMe = () => {
    // TODO: Implement text message functionality
    // This should trigger a welcome text message to the user's phone
    console.log('TODO: Send welcome text message to user');
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Mark onboarding session as complete
        await supabase
          .from('onboarding_sessions')
          .update({ 
            current_step: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        // Update profile to mark onboarding complete
        await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);

        // Update local storage
        const saved = localStorage.getItem('gia_user');
        if (saved) {
          const userData = JSON.parse(saved);
          userData.onboarded = true;
          localStorage.setItem('gia_user', JSON.stringify(userData));
        }
      }

      // Check access and redirect
      const hasAccess = await checkUserHasAccess();
      if (hasAccess) {
        window.location.href = '/app/home';
      } else {
        window.location.href = '/checkout';
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Fallback redirect
      window.location.href = '/checkout';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0b0b0b]">
        <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
        <p className="text-sm text-white/40 mt-4">Setting up your agent...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 pt-20 bg-[#0b0b0b]">
      <OnboardingHeader />
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-4">Step 5 of 5</p>
          <h1 className="text-2xl font-bold text-white mb-2">
            {firstName ? `Welcome, ${firstName}!` : "You're all set!"}
          </h1>
          <p className="text-sm text-white/40">Your personal AI agent is ready.</p>
        </div>

        {/* Agent Identity Card */}
        <div className="relative bg-[#212121] border border-white/5 rounded-[20px] overflow-hidden mb-6">
          {/* Background Watermark G */}
          <div className="absolute inset-0 flex items-start justify-end p-4 select-none pointer-events-none">
            <span className="text-[120px] font-black leading-none text-white opacity-[0.06]">G</span>
          </div>

          <div className="relative z-10 p-5 space-y-4">
            {/* Header Label */}
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Agent Identity</p>

            {/* Agent Info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-[16px] bg-white flex items-center justify-center text-[#0B0B0C] text-xl font-black shadow-lg flex-shrink-0">
                G.
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-white/90 leading-tight">GIA Core Assistant</p>
                <p className="text-[11px] font-mono text-white/40 tracking-wide mt-0.5">
                  ID: {agentId || 'Not available'}
                </p>
              </div>
            </div>

            {/* Contact Fields */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 h-12 px-4 bg-[#0B0B0C]/60 border border-white/5 rounded-[14px]">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex-shrink-0">Agency Email</span>
                <span className="text-sm font-medium text-white/90 truncate">
                  {agentEmail || 'Not available'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 h-12 px-4 bg-[#0B0B0C]/60 border border-white/5 rounded-[14px]">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex-shrink-0">Direct Line</span>
                <span className="text-sm font-medium text-white/90">
                  {agentPhone || 'Not available'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-1">
              <Button 
                variant="secondary" 
                className="flex-1 h-12 rounded-[14px] !bg-white/5 !border-white/10 hover:!bg-white/10 text-sm font-semibold"
                onClick={handleDownloadVCard}
              >
                <Download size={16} className="mr-2" />
                Download Contact
              </Button>
              <button 
                onClick={handleTextMe}
                className="h-12 px-4 flex items-center justify-center gap-2 rounded-[14px] bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
              >
                <MessageSquare size={16} />
                Text Me
              </button>
            </div>
          </div>
        </div>

        {/* Complete Button */}
        <div className="space-y-4">
          <Button
            variant="primary"
            size="lg"
            className="w-full h-14"
            onClick={handleComplete}
            disabled={completing}
          >
            {completing ? (
              <span className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finishing setup...
              </span>
            ) : (
              'Start using GIA →'
            )}
          </Button>
          <p className="text-xs text-white/20 text-center">
            Your agent will start working in the background.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingStep6;
