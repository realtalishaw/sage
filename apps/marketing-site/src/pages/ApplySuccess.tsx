import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Copy } from "lucide-react";
import confetti from "canvas-confetti";
import { setPageTitle } from "../lib/seo";
import { Button } from "../components/Button";
import { ShareModal } from "../components/ShareModal";
import { SageProfileCard } from "../components/SageProfileCard";
import { LaunchCountdown } from "../components/LaunchCountdown";
import { useSageProfileCardMotion } from "../components/useSageProfileCardMotion";
import { useAuth, useReferrals } from "../hooks";
import { getApplicationProfile } from "../lib/browser-db";
import { buildSageAnnualCheckoutLink } from "../lib/stripe";
import { generateReferralLink } from "@sage/db";
import type { RandomAvatarState } from "../avatar/random";

const shellClasses =
  "relative min-h-screen overflow-hidden bg-[#0B0B0C] px-5 py-8 text-[rgba(255,255,255,0.94)] md:py-10 lg:px-8 lg:py-6";
const APPROVED_APPLICATION_STORAGE_KEY_PREFIX = "sage-bootstrap-review:";

const milestones = [
  { count: 3, reward: "$50 account credit" },
  { count: 5, reward: "launch day access guaranteed" },
  { count: 10, reward: "1 month free" },
  { count: 25, reward: "50% off one year" },
  { count: 50, reward: "1 year free" },
  { count: 1000, reward: "free for life" },
];

interface ApprovedApplicationSummary {
  avatarPortraitPng: string | null;
  sageName: string;
  avatarState: RandomAvatarState | null;
}

function hashSeed(input: string) {
  return Array.from(input).reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function loadApprovedApplicationSummary(
  applicationId?: string,
): ApprovedApplicationSummary | null {
  if (!applicationId) {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(
      `${APPROVED_APPLICATION_STORAGE_KEY_PREFIX}${applicationId}`,
    );

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as {
      avatarPortraitPng?: string | null;
      profile?: { agentName?: string };
      avatar?: RandomAvatarState;
    };
    const sageName = parsed.profile?.agentName?.trim() || "sage concierge";

    return {
      avatarPortraitPng: parsed.avatarPortraitPng ?? null,
      sageName,
      avatarState: parsed.avatar ?? null,
    };
  } catch {
    return null;
  }
}

function createLaunchConfetti(canvas: HTMLCanvasElement) {
  const confettiInstance = confetti.create(canvas, {
    resize: true,
    useWorker: true,
  });
  const colors = ["#ffffff", "#e5e5e5", "#cfcfcf", "#b4b4b4", "#8d8d8d", "#5e5e5e"];

  return {
    firePrimary() {
      confettiInstance({
        particleCount: 180,
        angle: 90,
        spread: 140,
        startVelocity: 42,
        decay: 0.92,
        scalar: 1.08,
        ticks: 260,
        gravity: 0.9,
        drift: 0,
        origin: { x: 0.5, y: 0.5 },
        colors,
        disableForReducedMotion: true,
      });
    },
    fireSecondary() {
      confettiInstance({
        particleCount: 70,
        angle: 60,
        spread: 90,
        startVelocity: 34,
        decay: 0.92,
        scalar: 1.04,
        ticks: 240,
        gravity: 0.92,
        drift: -0.1,
        origin: { x: 0.5, y: 0.5 },
        colors,
        disableForReducedMotion: true,
      });
      confettiInstance({
        particleCount: 70,
        angle: 120,
        spread: 90,
        startVelocity: 34,
        decay: 0.92,
        scalar: 1.04,
        ticks: 240,
        gravity: 0.92,
        drift: 0.1,
        origin: { x: 0.5, y: 0.5 },
        colors,
        disableForReducedMotion: true,
      });
    },
    reset() {
      confettiInstance.reset();
    },
  };
}

export default function ApplySuccess() {
  const { application_id: applicationId } = useParams();
  const { user } = useAuth();
  const { referralCode, totalReferrals } = useReferrals(user?.id || null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiControllerRef = useRef<ReturnType<typeof createLaunchConfetti> | null>(null);
  const mainPageRef = useRef<HTMLDivElement | null>(null);
  const ticketAppRef = useRef<HTMLDivElement | null>(null);
  const ticketRef = useRef<HTMLDivElement | null>(null);
  const seed = hashSeed(applicationId || "sage");
  const approvedApplicationSummary = useMemo(
    () => loadApprovedApplicationSummary(applicationId),
    [applicationId],
  );
  const [dbApprovedSummary, setDbApprovedSummary] = useState<ApprovedApplicationSummary | null>(null);
  const annualCheckoutUrl = useMemo(
    () =>
      buildSageAnnualCheckoutLink({
        applicationId,
        userEmail: user?.email ?? null,
        userId: user?.id ?? null,
      }),
    [applicationId, user?.email, user?.id],
  );

  useEffect(() => {
    setPageTitle("You're In");
  }, []);

  useEffect(() => {
    if (!applicationId) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      const { data } = await getApplicationProfile(applicationId);
      if (isCancelled || !data) {
        return;
      }

      const nextName =
        typeof data.profile === "object" &&
        data.profile &&
        "agentName" in data.profile &&
        typeof data.profile.agentName === "string"
          ? data.profile.agentName
          : "sage concierge";

      setDbApprovedSummary({
        avatarPortraitPng: typeof data.avatar_portrait_png === "string" ? data.avatar_portrait_png : null,
        sageName: nextName,
        avatarState:
          data.avatar && typeof data.avatar === "object"
            ? (data.avatar as unknown as RandomAvatarState)
            : null,
      });
    })();

    return () => {
      isCancelled = true;
    };
  }, [applicationId]);

  // Use real referral data instead of mock data
  const orderInLine = useMemo(() => 600 + (seed % 2400), [seed]); // TODO: Replace with real waitlist position
  const referralCount = useMemo(() => totalReferrals, [totalReferrals]);
  const referralLink = useMemo(
    () => referralCode ? generateReferralLink(referralCode) : `${window.location.origin}/apply?ref=${applicationId || "sage"}`,
    [referralCode, applicationId]
  );
  const nextMilestone = useMemo(
    () => milestones.find((milestone) => referralCount < milestone.count) ?? null,
    [referralCount]
  );
  const invitesUntilNextReward = useMemo(
    () => (nextMilestone ? nextMilestone.count - referralCount : 0),
    [nextMilestone, referralCount]
  );
  const progressCopy = useMemo(() => {
    if (!nextMilestone) {
      return "you've unlocked every referral reward. now it's just about how far you want to move up.";
    }

    const inviteWord = invitesUntilNextReward === 1 ? "invite" : "invites";

    // Different motivational copy based on proximity to goal
    if (invitesUntilNextReward === 1) {
      return `just 1 more invite until ${nextMilestone.reward}!`;
    }

    if (invitesUntilNextReward <= 3) {
      return `you're only ${invitesUntilNextReward} ${inviteWord} away from ${nextMilestone.reward}!`;
    }

    // Show progress fraction for larger gaps
    return `${referralCount}/${nextMilestone.count} ${inviteWord} — only ${invitesUntilNextReward} more until ${nextMilestone.reward}!`;
  }, [referralCount, invitesUntilNextReward, nextMilestone]);

  useEffect(() => {
    const canvas = confettiCanvasRef.current;

    if (!canvas) {
      confettiControllerRef.current = null;
      return;
    }

    const controller = createLaunchConfetti(canvas);
    confettiControllerRef.current = controller;

    // Fire confetti on mount
    setTimeout(() => {
      controller.firePrimary();
    }, 500);

    return () => {
      controller.reset();
      confettiControllerRef.current = null;
    };
  }, []);

  useSageProfileCardMotion({
    appRef: ticketAppRef,
    cardRef: ticketRef,
    enabled: true,
  });

  useEffect(() => {
    if (!copied) return;
    const timeoutId = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
    } catch {
      setError("couldn't copy your link. please try again.");
    }
  };

  const handleAnnualCheckout = async () => {
    setLoading(true);
    setError("");

    try {
      window.open(annualCheckoutUrl, "_blank", "noopener,noreferrer");
    } catch {
      setError("something went wrong. please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={shellClasses}>
      <div className="absolute inset-0">
        <div className="absolute left-[12%] top-[12%] h-64 w-64 rounded-full bg-white/[0.035] blur-3xl" />
        <div className="absolute right-[10%] top-[18%] h-80 w-80 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <canvas
        ref={confettiCanvasRef}
        className="pointer-events-none absolute inset-0 z-[60] h-full w-full"
      />

      <div
        ref={mainPageRef}
        className="relative z-30 mx-auto max-w-7xl"
      >
        <div className="grid gap-10 lg:h-[calc(100vh-3rem)] lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] lg:items-center lg:gap-10">
          <section className="order-2 max-w-[520px] lowercase lg:order-1 lg:self-center">
            <div className="space-y-7">
              <div className="space-y-3">
                <h1 className="max-w-[11ch] text-3xl font-semibold leading-[0.96] tracking-[-0.06em] text-white md:text-[46px]">
                  invite friends and get free stuff
                </h1>
                <p className="max-w-lg text-sm leading-6 text-white/78">{progressCopy}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="truncate text-[15px] leading-6 text-white/84">
                    {referralLink}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="h-11 shrink-0 border-white/10 bg-white/5 px-6 text-white/80"
                  onClick={handleCopyLink}
                >
                  <span className="inline-flex items-center gap-2">
                    <Copy className="h-4 w-4" strokeWidth={1.8} />
                    {copied ? "copied" : "copy link"}
                  </span>
                </Button>
                <ShareModal
                  link={referralLink}
                  onCopyError={() => setError("couldn't copy your link. please try again.")}
                />
              </div>

              <div className="grid gap-2 border-t border-white/10 pt-4">
                {milestones.map((milestone) => {
                  const unlocked = referralCount >= milestone.count;
                  const isNext = nextMilestone?.count === milestone.count;

                  return (
                    <div
                      key={milestone.count}
                      className={`flex items-center gap-3 border-b py-2 ${
                        unlocked || isNext ? "border-white/16" : "border-white/8"
                      }`}
                    >
                      <div
                        className={`flex min-w-[42px] items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold ${
                          unlocked
                            ? "border-white bg-white text-[#0B0B0C]"
                            : isNext
                              ? "border-white/50 text-white"
                              : "border-white/12 text-white/58"
                        }`}
                      >
                        {milestone.count}
                      </div>

                      <p
                        className={`min-w-0 flex-1 text-sm font-medium leading-6 ${
                          unlocked || isNext ? "text-white" : "text-white/62"
                        }`}
                      >
                        {milestone.reward}
                      </p>

                      {(unlocked || isNext) && (
                        <span
                          className={`shrink-0 text-[10px] tracking-[0.22em] ${
                            unlocked ? "text-white/50" : "text-white/76"
                          }`}
                        >
                          {unlocked ? "unlocked" : "next"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-6 pt-6">
                <Button
                  variant="primary"
                  className="h-11 w-full px-6"
                  onClick={handleAnnualCheckout}
                  disabled={loading}
                >
                  {loading
                    ? "processing..."
                    : "buy sage annual for $997 and skip the waitlist"}
                </Button>

                <LaunchCountdown />
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs font-medium text-white/72">{error}</p>
              </div>
            )}
          </section>

          <section className="order-1 flex flex-col items-center gap-4 lg:order-2 lg:items-end lg:justify-center">
            <div className="flex w-full justify-center lg:justify-end">
              <SageProfileCard
                appRef={ticketAppRef}
                cardRef={ticketRef}
                orderInLine={orderInLine}
                sageName={dbApprovedSummary?.sageName ?? approvedApplicationSummary?.sageName}
                avatarImageSrc={
                  dbApprovedSummary?.avatarPortraitPng ?? approvedApplicationSummary?.avatarPortraitPng
                }
              />
            </div>

          </section>
        </div>
      </div>

    </div>
  );
}
