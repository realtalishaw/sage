import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setPageTitle } from "../lib/seo";
import { Button } from "../components/Button";
import { PhoneNumberInput } from "../components/PhoneNumberInput";
import { supabase } from "../lib/supabase";
import { createProfile, parseReferralCodeFromUrl } from "@sage/db";

const shellClasses =
  "relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0B0C] px-6 py-16";
const contentClasses =
  "relative z-10 w-full max-w-[480px] lowercase text-[rgba(255,255,255,0.94)]";
const inputClasses =
  "w-full h-11 rounded-xl border border-white/10 bg-[#303030] px-4 text-sm text-white placeholder:text-white/25 transition-all focus:bg-[#3a3a3a] focus:border-white/30 focus:outline-none";
const otpInputClasses =
  "flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#303030] text-center text-base text-white transition-all focus:border-white/30 focus:bg-[#3a3a3a] focus:outline-none";

export default function Apply() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState<string[]>(() => Array(6).fill(""));
  const [step, setStep] = useState<"form" | "verify">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const verificationRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    setPageTitle(step === "verify" ? "Verify" : "Request Invite");

    // Check for referral code in URL
    const ref = parseReferralCodeFromUrl();
    if (ref) {
      setReferralCode(ref);
    }
  }, [step]);

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
        firstName,
        lastName,
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

      // Create profile in waitlist
      const { error: profileError } = await createProfile({
        userId: authData.user.id,
        firstName,
        lastName,
        phoneNumber,
        referredByCode: referralCode || undefined,
      });

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      // Clear session storage
      sessionStorage.removeItem('pendingWaitlistSignup');

      // Navigate to success page with user ID
      navigate(`/apply/success/${authData.user.id}`);
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
            we&apos;ll send you an invite code shortly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-2 block text-xs font-bold tracking-[0.18em] text-white/55">
                first name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="jane"
                className={inputClasses}
                required
              />
            </div>
            <div className="flex-1">
              <label className="mb-2 block text-xs font-bold tracking-[0.18em] text-white/55">
                last name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="doe"
                className={inputClasses}
                required
              />
            </div>
          </div>

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
