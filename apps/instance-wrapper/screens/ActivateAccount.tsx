import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { supabase } from '@/src/integrations/supabase/client';
import { sendInviteCodeUsedEmail, sendWelcomeEmail } from '../services/inviteEmails';
import { generateApiToken } from '../services/authToken';

interface Props {
  onActivate: (email: string) => void;
}

const ActivateAccount: React.FC<Props> = ({ onActivate }) => {
  const [code, setCode] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [step, setStep] = React.useState<'code' | 'signup'>('code');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const navigate = useNavigate();

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setLoading(true);
    setError('');

    try {
      // Call the Supabase function to check if code is valid
      const { data, error: codeError } = await supabase.rpc('use_invite_code', {
        p_code: code.toUpperCase()
      });

      if (codeError) throw codeError;

      if (data === true) {
        // Code is valid, move to signup step
        setStep('signup');
      } else {
        setError("That code doesn't match. Check and try again.");
      }
    } catch (err: any) {
      console.error('Code validation error:', err);
      setError(err.message || 'Invalid invite code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // IMPORTANT: Generate API token FIRST - needed for authenticated API calls
        await generateApiToken();

        // Get invite code details before marking as used
        const { data: codeDetails, error: codeDetailsError } = await supabase.rpc('get_invite_code_details', {
          p_code: code.toUpperCase()
        });

        // Mark the invite code as used by this user
        const { error: codeError } = await supabase.rpc('use_invite_code', {
          p_code: code.toUpperCase(),
          p_user_id: data.user.id
        });

        if (codeError) {
          console.error('Failed to mark invite code as used:', codeError);
          // Don't fail the signup if we can't mark the code - user is already created
        }

        // Grant 48 hours free trial to the new user
        try {
          await supabase.rpc('grant_free_trial_credit', {
            p_user_id: data.user.id
          });
        } catch (creditError) {
          console.error('Failed to grant free trial credit:', creditError);
          // Don't fail the signup if credit grant fails
        }

        // Grant 48 hours bonus to the code creator if we have code details
        if (!codeDetailsError && codeDetails && codeDetails.length > 0) {
          const codeData = codeDetails[0];
          try {
            await supabase.rpc('grant_invite_bonus_credit', {
              p_code_creator_id: codeData.creator_id,
              p_invite_code_id: codeData.code_id
            });
          } catch (bonusError) {
            console.error('Failed to grant invite bonus credit:', bonusError);
            // Don't fail the signup if bonus grant fails
          }
        }

        // Get the creator's email and send invite code used email
        try {
          const { data: creatorEmailData, error: creatorEmailError } = await supabase.rpc('get_invite_code_creator_email', {
            p_code: code.toUpperCase()
          });

          if (!creatorEmailError && creatorEmailData) {
            await sendInviteCodeUsedEmail(creatorEmailData);
          }
        } catch (emailError) {
          console.error('Failed to send invite code used email:', emailError);
          // Don't fail the signup if email fails
        }

        // Send welcome email to new user
        try {
          await sendWelcomeEmail(data.user.email || email);
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Don't fail the signup if email fails
        }

        await onActivate(data.user.email || email);
        
        // New user - always start with onboarding
        navigate('/onboarding');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'signup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] p-10 bg-[#212121] border border-white/10 rounded-[22px] shadow-2xl">
          <div className="mb-8 text-center">
            <Link to="/" className="inline-block mb-4">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center font-black text-[#0B0B0C] shadow-lg text-lg">
                G.
              </div>
            </Link>
            <h1 className="text-2xl font-bold mb-2">Create your account</h1>
            <p className="text-sm text-white/40">Set up your GIA credentials.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Email Address</label>
              <input
                autoFocus
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full h-11 bg-[#303030] border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all placeholder:text-white/10"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
                required
                minLength={8}
                className="w-full h-11 bg-[#303030] border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all placeholder:text-white/10"
              />
              <p className="text-[10px] text-white/20 mt-2 font-medium">
                Must be at least 8 characters
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-xs font-medium">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 h-11"
                onClick={() => setStep('code')}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                variant="primary"
                className="flex-1 h-11"
                disabled={loading || !email || !password}
              >
                {loading ? 'Creating...' : 'Create account'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] p-10 bg-[#212121] border border-white/10 rounded-[22px] shadow-2xl">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block mb-4">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center font-black text-[#0B0B0C] shadow-lg text-lg">
              G.
            </div>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Activate GIA</h1>
          <p className="text-sm text-white/40">Enter your alpha invite code to proceed.</p>
        </div>

        <form onSubmit={handleValidateCode} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Invitation Code</label>
            <input
              autoFocus
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. ALPHA2025"
              className="w-full h-11 bg-[#303030] border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all placeholder:text-white/10"
            />
            {error && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-xs font-medium">{error}</p>
              </div>
            )}
          </div>

          <Button variant="primary" className="w-full h-11" disabled={loading || !code}>
            {loading ? 'Validating...' : 'Continue'}
          </Button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex items-center w-full gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/20">Don't have a code?</p>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <Link to="/apply" className="w-full">
            <Button variant="secondary" className="w-full">Apply for access</Button>
          </Link>
          <p className="text-xs text-white/40 mt-2">
            Already activated? <Link to="/login" className="text-white hover:underline">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActivateAccount;
