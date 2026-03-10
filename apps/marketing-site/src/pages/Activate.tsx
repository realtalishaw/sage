import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { PhoneNumberInput } from "../components/PhoneNumberInput";
import { useInviteCode } from "../hooks";
import { supabase } from "../lib/supabase";

const shellClasses =
  "relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0B0C] px-6 py-16";
const contentClasses =
  "relative z-10 w-full max-w-[420px] lowercase text-[rgba(255,255,255,0.94)]";
const inputClasses =
  "w-full h-11 rounded-xl border border-white/10 bg-[#303030] px-4 text-sm text-white placeholder:text-white/25 transition-all focus:bg-[#3a3a3a] focus:border-white/30 focus:outline-none";

export default function Activate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { validate, isValidating, isClaiming, error: inviteError } = useInviteCode();

  const [code, setCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [step, setStep] = useState<"code" | "phone">("code");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // Prefill invite code from URL params
    const refParam = searchParams.get("ref") || searchParams.get("invite");
    if (refParam) {
      setCode(refParam.toUpperCase());
    }
  }, [searchParams]);

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setError("");

    // Validate the invite code
    const valid = await validate(code);

    if (valid) {
      // Move to phone entry step
      setStep("phone");
    } else {
      setError(inviteError?.message || "invalid invite code. please check and try again.");
    }
  };

  const handleClaimInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      // Send OTP to phone number
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });

      if (otpError) {
        setError(otpError.message);
        return;
      }

      // Store code and phone for verification step
      sessionStorage.setItem('pendingInviteCode', code);
      sessionStorage.setItem('pendingPhone', phoneNumber);

      setSuccess("success! check your phone for a text from sage.");

      // Wait for auth state change, then claim code and upgrade account
      // This will be handled by the verification flow
      setTimeout(() => {
        navigate('/apply/application');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong. please try again.");
    }
  };

  if (step === "phone") {
    return (
      <div className={shellClasses}>
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-[12%] h-64 w-64 -translate-x-1/2 rounded-full bg-[#D6FF75]/8 blur-3xl" />
          <div className="absolute bottom-[10%] right-[12%] h-72 w-72 rounded-full bg-white/4 blur-3xl" />
        </div>
        <div className={contentClasses}>
          <div className="mb-8 text-center">
            <Link to="/" className="inline-block mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full">
                <img src="/favicon-96x96.png" alt="sage" className="h-10 w-10 object-contain" />
              </div>
            </Link>
            <h1 className="mb-2 text-2xl font-bold text-white">join sage</h1>
            <p className="text-sm text-white/62">
              welcome to sage. enter your phone number to receive private beta access.
            </p>
          </div>

          <form onSubmit={handleClaimInvite} className="space-y-6">
            <div>
              <label className="mb-2 block text-xs font-bold tracking-[0.18em] text-white/55">
                phone number
              </label>
              <PhoneNumberInput
                value={phoneNumber}
                onChange={setPhoneNumber}
                placeholder="555 123 4567"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-xs font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <p className="text-green-400 text-xs font-medium">{success}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="h-11 flex-1"
                onClick={() => setStep("code")}
                disabled={isClaiming}
              >
                back
              </Button>
              <Button
                variant="primary"
                className="h-11 flex-1"
                disabled={isClaiming || !phoneNumber}
              >
                {isClaiming ? "sending code..." : "continue"}
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
        <div className="absolute left-1/2 top-[12%] h-64 w-64 -translate-x-1/2 rounded-full bg-[#D6FF75]/8 blur-3xl" />
        <div className="absolute bottom-[10%] right-[12%] h-72 w-72 rounded-full bg-white/4 blur-3xl" />
      </div>
      <div className={contentClasses}>
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full">
              <img src="/favicon-96x96.png" alt="sage" className="h-10 w-10 object-contain" />
            </div>
          </Link>
          <h1 className="mb-2 text-2xl font-bold text-white">join sage</h1>
          <p className="text-sm text-white/62">
            welcome to sage! we&apos;re currently in private beta. to get started, please enter
            your invite code.
          </p>
        </div>

        <form onSubmit={handleValidateCode} className="space-y-6">
          <div>
            <label className="mb-2 block text-xs font-bold tracking-[0.18em] text-white/55">
              invite code
            </label>
            <input
              autoFocus
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. alpha2025"
              className={inputClasses}
            />
            {error && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-xs font-medium">{error}</p>
              </div>
            )}
          </div>

          <Button variant="primary" className="w-full h-11" disabled={isValidating || !code}>
            {isValidating ? "validating..." : "continue"}
          </Button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex items-center w-full gap-3">
            <div className="flex-1 h-px min-w-0 bg-white/20" />
            <p className="shrink-0 text-[11px] font-bold tracking-[0.18em] text-white/32">
              don&apos;t have a code?
            </p>
            <div className="flex-1 h-px min-w-0 bg-white/20" />
          </div>
          <Link to="/apply" className="w-full">
            <Button variant="secondary" className="w-full">
              request an invite
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
