import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setPageTitle } from "../lib/seo";
import { Button } from "../components/Button";
import { PhoneNumberInput } from "../components/PhoneNumberInput";
import { supabase } from "../lib/supabase";
import { createProfile, parseReferralCodeFromUrl } from "@sage/db";
import { generateAiCofounderName } from "../lib/groq-name-generator";
import { createOrUpdateWaitlistProfile } from "../lib/browser-db";
import { createRandomAvatarState } from "../avatar/random";

const shellClasses =
  "relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0B0C] px-6 py-16";
const contentClasses =
  "relative z-10 w-full max-w-[480px] lowercase text-[rgba(255,255,255,0.94)]";
const inputClasses =
  "w-full h-11 rounded-xl border border-white/10 bg-[#303030] px-4 text-sm text-white placeholder:text-white/25 transition-all focus:bg-[#3a3a3a] focus:border-white/30 focus:outline-none";
const otpInputClasses =
  "flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#303030] text-center text-base text-white transition-all focus:border-white/30 focus:bg-[#3a3a3a] focus:outline-none";
const APPLICATION_PROFILE_SEED_STORAGE_KEY = "sage:application-profile-seed";

export default function Apply() {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState<string[]>(() => Array(6).fill(""));
  const [step, setStep] = useState<"form" | "verify">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const verificationRefs = useRef<Array<HTMLInputElement | null>>([]);

  const persistApplicationProfileSeed = (firstName: string, lastName: string) => {
    /*
      The application route starts with a more personalized bootstrap opener. A
      lightweight session seed lets that next page greet the applicant by name
      without waiting for another round-trip or extra query.
    */
    sessionStorage.setItem(
      APPLICATION_PROFILE_SEED_STORAGE_KEY,
      JSON.stringify({
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
      }),
    );
  };

  useEffect(() => {
    setPageTitle(step === "verify" ? "Verify" : "Request Invite");

    // If user is already authenticated, redirect to their referrals page
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && step === "form") {
        navigate(`/apply/id/${user.id}`);
      }
    };

    void checkAuth();

    // Check for referral code in URL
    const refFromUrl = parseReferralCodeFromUrl();
    if (refFromUrl) {
      setReferralCode(refFromUrl);
      // Save to localStorage so it persists through verification
      localStorage.setItem('sage_referral_code', refFromUrl);
    } else {
      // Try to load from localStorage if not in URL
      const savedRef = localStorage.getItem('sage_referral_code');
      if (savedRef) {
        setReferralCode(savedRef);
      }
    }
  }, [step, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Send OTP to phone number
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });

      if (otpError) {
        setError(otpError.message);
        setLoading(false);
        return;
      }

      // Store form data for after verification
      sessionStorage.setItem('pendingWaitlistSignup', JSON.stringify({
        phoneNumber,
        referralCode,
      }));

      setStep("verify");
    } catch {
      setError("something went wrong. please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.some((digit) => !digit)) return;

    setLoading(true);
    setError("");

    try {
      const code = verificationCode.join("");

      // Verify OTP
      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: code,
        type: 'sms',
      });

      if (verifyError) {
        setError(verifyError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("verification failed. please try again.");
        setLoading(false);
        return;
      }

      // Generate AI cofounder name using GROQ
      let agentFirstName = "";
      let agentLastName = "";

      try {
        const generatedName = await generateAiCofounderName();
        agentFirstName = generatedName.firstName;
        agentLastName = generatedName.lastName;
      } catch (nameError) {
        console.error("Failed to generate name with GROQ:", nameError);
        // Fallback to backend generation if GROQ fails
      }

      // Create profile in waitlist (with GROQ-generated name or backend fallback)
      const { data: profileData, error: profileError } = await createProfile({
        userId: authData.user.id,
        firstName: agentFirstName || undefined,
        lastName: agentLastName || undefined,
        phoneNumber,
        referredByCode: referralCode || undefined,
      });

      if (profileError) {
        // Check if profile already exists (duplicate key error)
        const isDuplicate =
          profileError.code === '23505' ||
          profileError.message?.toLowerCase().includes('duplicate') ||
          profileError.message?.toLowerCase().includes('already exists');

        if (isDuplicate) {
          // Profile already exists, redirect to referrals page
          sessionStorage.removeItem('pendingWaitlistSignup');
          localStorage.removeItem('sage_referral_code');
          navigate(`/apply/id/${authData.user.id}`);
          return;
        }

        // Show other errors
        setError(profileError.message || "an error occurred while creating your profile. please try again.");
        setLoading(false);
        return;
      }

      // Create application_profile with random avatar
      const agentName = profileData
        ? `${profileData.first_name} ${profileData.last_name}`.trim()
        : "Sage";

      console.log('[Apply] Creating avatar and application profile for:', authData.user.id);

      const randomAvatar = createRandomAvatarState();

      console.log('[Apply] Generated avatar:', randomAvatar);

      const { error: appProfileError } = await createOrUpdateWaitlistProfile({
        userId: authData.user.id,
        agentName,
        avatarState: randomAvatar,
      });

      if (appProfileError) {
        console.error('[Apply] Failed to create application profile:', appProfileError);
      }

      // Clear session storage and referral code
      sessionStorage.removeItem('pendingWaitlistSignup');
      localStorage.removeItem('sage_referral_code');

      // Store profile data for referrals page
      if (profileData) {
        persistApplicationProfileSeed(profileData.first_name, profileData.last_name);
      }

      // Navigate to referrals page
      navigate(`/apply/id/${authData.user.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong. please try again.");
      setLoading(false);
    }
  };

  const handleVerificationDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextCode = [...verificationCode];
    nextCode[index] = digit;
    setVerificationCode(nextCode);

    if (digit && index < 5) {
      verificationRefs.current[index + 1]?.focus();
    }
  };

  const handleVerificationKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      if (verificationCode[index]) {
        const nextCode = [...verificationCode];
        nextCode[index] = "";
        setVerificationCode(nextCode);
        return;
      }

      if (index > 0) {
        const nextCode = [...verificationCode];
        nextCode[index - 1] = "";
        setVerificationCode(nextCode);
        verificationRefs.current[index - 1]?.focus();
      }
    }

    if (e.key === "ArrowLeft" && index > 0) {
      verificationRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < 5) {
      verificationRefs.current[index + 1]?.focus();
    }
  };

  const handleVerificationPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedDigits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedDigits) return;

    const nextCode = Array(6).fill("");
    pastedDigits.split("").forEach((digit, index) => {
      nextCode[index] = digit;
    });
    setVerificationCode(nextCode);
    verificationRefs.current[Math.min(pastedDigits.length, 6) - 1]?.focus();
  };

  if (step === "verify") {
    return (
      <div className={shellClasses}>
        <div className="absolute inset-0">
          <div className="absolute left-[18%] top-[14%] h-72 w-72 rounded-full bg-[#D6FF75]/7 blur-3xl" />
          <div className="absolute bottom-[8%] right-[10%] h-80 w-80 rounded-full bg-white/4 blur-3xl" />
        </div>
        <div className={contentClasses}>
          <div className="mb-8 text-center">
            <Link to="/" className="inline-block mb-4">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full [&_img]:border-0 [&_img]:outline-none [&_img]:ring-0 [&_img]:shadow-none">
                <img src="/favicon-96x96.png" alt="sage" className="h-10 w-10 object-contain" />
              </div>
            </Link>
            <h1 className="mb-2 text-2xl font-bold text-white">verify your number</h1>
            <p className="text-sm text-white/62">
              we&apos;ve texted a 6 digit code to {phoneNumber}. enter it below to finish your
              request.
            </p>
          </div>

          <form onSubmit={handleVerifySubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-xs font-bold tracking-[0.18em] text-white/55">
                6 digit code
              </label>
              <div className="flex items-center justify-center gap-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      verificationRefs.current[index] = el;
                    }}
                    autoFocus={index === 0}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={verificationCode[index]}
                    onChange={(e) => handleVerificationDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleVerificationKeyDown(index, e)}
                    onPaste={handleVerificationPaste}
                    className={otpInputClasses}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-xs font-medium">{error}</p>
              </div>
            )}

            <div>
              <Button
                variant="primary"
                className="h-11 w-full"
                disabled={verificationCode.some((digit) => !digit)}
              >
                verify code
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClasses}>
      <div className="absolute inset-0">
        <div className="absolute left-[18%] top-[14%] h-72 w-72 rounded-full bg-[#D6FF75]/7 blur-3xl" />
        <div className="absolute bottom-[8%] right-[10%] h-80 w-80 rounded-full bg-white/4 blur-3xl" />
      </div>
      <div className={contentClasses}>
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block mb-4">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full [&_img]:border-0 [&_img]:outline-none [&_img]:ring-0 [&_img]:shadow-none">
              <img src="/favicon-96x96.png" alt="sage" className="h-10 w-10 object-contain" />
            </div>
          </Link>
          <h1 className="mb-2 text-2xl font-bold text-white">request an invite to sage</h1>
          <p className="text-sm text-white/62">
            sage will text you when you&apos;re off the list
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-xs font-bold tracking-[0.18em] text-white/55">
              phone number
            </label>
            <PhoneNumberInput
              value={phoneNumber}
              onChange={setPhoneNumber}
              placeholder="555 123 4567"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-xs font-medium">{error}</p>
            </div>
          )}

          <Button variant="primary" className="w-full h-11" disabled={loading}>
            {loading ? "submitting..." : "submit request"}
          </Button>
        </form>

        <div className="mt-8 pt-4 text-center">
          <p className="text-xs text-white/55">
            already have a code?{" "}
            <Link to="/activate" className="text-white hover:underline">
              activate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
