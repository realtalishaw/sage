import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { supabase } from '@/src/integrations/supabase/client';

const COUNTRY_CODE_OPTIONS = [
  { value: '+1', label: '🇺🇸 +1' },
  { value: '+44', label: '🇬🇧 +44' },
  { value: '+91', label: '🇮🇳 +91' },
  { value: '+86', label: '🇨🇳 +86' },
  { value: '+55', label: '🇧🇷 +55' },
  { value: '+52', label: '🇲🇽 +52' },
  { value: '+49', label: '🇩🇪 +49' },
  { value: '+33', label: '🇫🇷 +33' },
  { value: '+39', label: '🇮🇹 +39' },
  { value: '+34', label: '🇪🇸 +34' },
  { value: '+81', label: '🇯🇵 +81' },
  { value: '+82', label: '🇰🇷 +82' },
  { value: '+61', label: '🇦🇺 +61' },
  { value: '+65', label: '🇸🇬 +65' },
  { value: '+971', label: '🇦🇪 +971' },
  { value: 'custom', label: 'other' },
];

const getLoginErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unable to sign in.';

  if (message.toLowerCase().includes('unsupported phone provider')) {
    return 'Phone login is not enabled in Supabase yet. Turn on phone auth and add an SMS provider first.';
  }

  return message;
};

const Login: React.FC = () => {
  const [countryCode, setCountryCode] = React.useState('+1');
  const [customCountryCode, setCustomCountryCode] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [verificationCode, setVerificationCode] = React.useState(['', '', '', '', '', '']);
  const [step, setStep] = React.useState<'phone' | 'verify'>('phone');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [isShaking, setIsShaking] = React.useState(false);
  const [resendNotice, setResendNotice] = React.useState('');
  const navigate = useNavigate();
  const codeInputRefs = React.useRef<Array<HTMLInputElement | null>>([]);
  const resendTimeoutRef = React.useRef<number | null>(null);
  const isCustomCountryCode = countryCode === 'custom';
  const resolvedCountryCode = isCustomCountryCode ? customCountryCode : countryCode;
  const isVerificationCodeComplete = verificationCode.every((digit) => digit.length === 1);

  const normalizedPhone = React.useMemo(() => {
    const digits = phoneNumber.replace(/\D/g, '');
    const code = resolvedCountryCode.replace(/[^\d+]/g, '');
    return `${code}${digits}`.trim();
  }, [phoneNumber, resolvedCountryCode]);

  const phoneDisplay = `${resolvedCountryCode.trim()} ${phoneNumber}`.trim();

  React.useEffect(() => {
    return () => {
      if (resendTimeoutRef.current !== null) {
        window.clearTimeout(resendTimeoutRef.current);
      }
    };
  }, []);

  const sendOtp = React.useCallback(async () => {
    if (!normalizedPhone || !normalizedPhone.startsWith('+')) {
      setError('Please enter your phone number.');
      return false;
    }

    const eligibilityResponse = await fetch('/api/login/eligibility', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        phone: normalizedPhone,
      }),
    });

    if (!eligibilityResponse.ok) {
      const payload = (await eligibilityResponse.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || 'This phone number is not authorized for this Sage computer.');
    }

    const { error: signInError } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
    });

    if (signInError) {
      throw signInError;
    }

    return true;
  }, [normalizedPhone]);

  const completeSignIn = React.useCallback(async () => {
    if (!normalizedPhone || !normalizedPhone.startsWith('+')) {
      setError('Please enter your phone number.');
      setStep('phone');
      return;
    }

    const enteredCode = verificationCode.join('');
    if (enteredCode.length !== 6) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token: enteredCode,
        type: 'sms',
      });

      if (verifyError) {
        throw verifyError;
      }

      navigate('/app/home');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(getLoginErrorMessage(err) || 'Incorrect code. Try again.');
      setIsShaking(true);
      window.setTimeout(() => {
        setIsShaking(false);
      }, 420);
      window.setTimeout(() => {
        setVerificationCode(['', '', '', '', '', '']);
        codeInputRefs.current[0]?.focus();
      }, 420);
    } finally {
      setLoading(false);
    }
  }, [navigate, normalizedPhone, verificationCode]);

  React.useEffect(() => {
    if (step === 'verify' && isVerificationCodeComplete && !loading) {
      void completeSignIn();
    }
  }, [completeSignIn, isVerificationCodeComplete, loading, step]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendNotice('');

    if (step !== 'phone') {
      return;
    }

    setLoading(true);

    try {
      const sent = await sendOtp();
      if (!sent) {
        return;
      }

      setStep('verify');
      window.setTimeout(() => {
        codeInputRefs.current[0]?.focus();
      }, 0);
    } catch (err: any) {
      console.error('Phone sign-in error:', err);
      setError(getLoginErrorMessage(err) || 'Unable to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const updateVerificationCode = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, '').slice(-1);

    setVerificationCode((current) =>
      current.map((digit, digitIndex) => (digitIndex === index ? nextValue : digit)),
    );

    if (nextValue && index < verificationCode.length - 1) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const resendCode = async () => {
    setError('');
    setLoading(true);

    try {
      const sent = await sendOtp();
      if (!sent) {
        return;
      }

      setResendNotice(`Code resent to ${phoneDisplay || 'your phone'}.`);
      setVerificationCode(['', '', '', '', '', '']);
      if (resendTimeoutRef.current !== null) {
        window.clearTimeout(resendTimeoutRef.current);
      }
      resendTimeoutRef.current = window.setTimeout(() => {
        setResendNotice('');
        resendTimeoutRef.current = null;
      }, 3000);
      window.setTimeout(() => {
        codeInputRefs.current[0]?.focus();
      }, 0);
    } catch (err: any) {
      console.error('Resend code error:', err);
      setError(getLoginErrorMessage(err) || 'Unable to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] p-10 bg-[#212121] border border-white/10 rounded-[22px] shadow-2xl">
        <div className="mb-8 text-center">
          <div className="inline-block mb-4">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center font-black text-[#0B0B0C] shadow-lg text-lg">
              S.
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-sm text-white/40">Sign in to your sage.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {step === 'phone' ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Phone Number</label>
              <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="h-11 w-full bg-[#303030] border border-white/10 rounded-xl px-3 text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all"
                >
                  {COUNTRY_CODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className={`grid min-w-0 gap-2 ${isCustomCountryCode ? 'grid-cols-[92px_minmax(0,1fr)]' : 'grid-cols-1'}`}>
                  {isCustomCountryCode ? (
                    <input
                      type="text"
                      inputMode="tel"
                      value={customCountryCode}
                      onChange={(e) => setCustomCountryCode(e.target.value)}
                      className="h-11 w-full bg-[#303030] border border-white/10 rounded-xl px-3 text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all"
                      placeholder="+000"
                    />
                  ) : null}
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="min-w-0 h-11 w-full bg-[#303030] border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
                Please enter your verification code
              </label>
              <div className={`grid grid-cols-6 gap-2 ${isShaking ? 'animate-[shake_0.42s_ease-in-out]' : ''}`}>
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      codeInputRefs.current[index] = element;
                    }}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => updateVerificationCode(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
                        codeInputRefs.current[index - 1]?.focus();
                      }
                    }}
                    disabled={loading}
                    className="h-11 w-full bg-[#303030] border border-white/10 rounded-xl text-center text-sm focus:outline-none focus:border-white/30 focus:bg-[#3a3a3a] transition-all"
                    aria-label={`Verification digit ${index + 1}`}
                  />
                ))}
              </div>
              <div className="mt-3 min-h-[20px] text-xs">
                {resendNotice ? (
                  <p className="text-green-400">{resendNotice}</p>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-white/30">didn't get a code?</span>
                    <button
                      type="button"
                      onClick={() => {
                        void resendCode();
                      }}
                      className="text-white/50 hover:text-white transition-colors"
                    >
                      resend code
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {error ? (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-xs font-medium">{error}</p>
            </div>
          ) : null}

          {step === 'phone' ? (
            <Button variant="primary" className="w-full h-11 mt-2" disabled={loading}>
              {loading ? 'Sending code...' : 'Sign in'}
            </Button>
          ) : loading ? (
            <Button variant="primary" className="w-full h-11 mt-2" disabled={true}>
              Verifying...
            </Button>
          ) : null}
        </form>
      </div>
    </div>
  );
};

export default Login;
