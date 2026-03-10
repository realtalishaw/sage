import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
  type RefObject,
} from "react";
import gsap from "gsap";
import { LaunchTicket } from "./LaunchTicket";
import { useLaunchTicketMotion } from "./useLaunchTicketMotion";

interface LaunchInviteIntroProps {
  orderInLine: number;
  mainPageRef: RefObject<HTMLDivElement | null>;
  finalTicketRef: RefObject<HTMLElement | null>;
  onComplete: () => void;
  firePrimaryConfetti: () => void;
  fireSecondaryConfetti: () => void;
}

const envelopeFlapStyle: CSSProperties = {
  width: 0,
  height: 0,
  borderLeft: "calc(var(--env-width) / 2) solid transparent",
  borderRight: "calc(var(--env-width) / 2) solid transparent",
  borderTop: "calc(var(--env-height) / 2 + 10px) solid #353840",
  borderBottom: "calc(var(--env-height) / 2 - 10px) solid transparent",
  transformStyle: "preserve-3d",
  backfaceVisibility: "visible",
  pointerEvents: "none",
};

const envelopeBodyStyle: CSSProperties = {
  background: "#353840",
  boxShadow: "0 24px 52px rgba(0,0,0,0.32)",
  borderBottomLeftRadius: "12px",
  borderBottomRightRadius: "12px",
};

const envelopePocketLeftStyle: CSSProperties = {
  width: 0,
  height: 0,
  borderLeft: "calc(var(--env-width) / 2) solid #4a4d55",
  borderRight: "calc(var(--env-width) / 2) solid #4a4d55",
  borderBottom: "calc(var(--env-height) / 2) solid #3d4048",
  borderTop: "calc(var(--env-height) / 2) solid transparent",
  borderBottomLeftRadius: "12px",
  borderBottomRightRadius: "12px",
};

const INTRO_TARGET_DURATION_SECONDS = 12.8;

export function LaunchInviteIntro({
  orderInLine,
  mainPageRef,
  finalTicketRef,
  onComplete,
  firePrimaryConfetti,
  fireSecondaryConfetti,
}: LaunchInviteIntroProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const envelopeRef = useRef<HTMLDivElement | null>(null);
  const flapRef = useRef<HTMLDivElement | null>(null);
  const bottomOccluderRef = useRef<HTMLDivElement | null>(null);
  const ticketStageRef = useRef<HTMLDivElement | null>(null);
  const ticketAppRef = useRef<HTMLDivElement | null>(null);
  const introTicketRef = useRef<HTMLElement | null>(null);
  const copyRef = useRef<HTMLParagraphElement | null>(null);
  const completedRef = useRef(false);
  const [ticketMotionEnabled, setTicketMotionEnabled] = useState(false);

  const onCompleteRef = useRef(onComplete);
  const firePrimaryRef = useRef(firePrimaryConfetti);
  const fireSecondaryRef = useRef(fireSecondaryConfetti);
  onCompleteRef.current = onComplete;
  firePrimaryRef.current = firePrimaryConfetti;
  fireSecondaryRef.current = fireSecondaryConfetti;

  const handleComplete = useCallback(() => onCompleteRef.current(), []);
  const handlePrimaryConfetti = useCallback(() => firePrimaryRef.current(), []);
  const handleSecondaryConfetti = useCallback(() => fireSecondaryRef.current(), []);
  const handleEnableTicketMotion = useCallback(() => setTicketMotionEnabled(true), []);
  const handleDisableTicketMotion = useCallback(() => setTicketMotionEnabled(false), []);

  useLaunchTicketMotion({
    appRef: ticketAppRef,
    ticketRef: introTicketRef,
    enabled: ticketMotionEnabled,
    pauseOnHover: false,
  });

  useEffect(() => {
    const overlay = overlayRef.current;
    const envelope = envelopeRef.current;
    const flap = flapRef.current;
    const bottomOccluder = bottomOccluderRef.current;
    const ticketStage = ticketStageRef.current;
    const introTicket = introTicketRef.current;
    const copy = copyRef.current;
    const mainPage = mainPageRef.current;
    if (
      !overlay ||
      !envelope ||
      !flap ||
      !bottomOccluder ||
      !ticketStage ||
      !introTicket ||
      !copy ||
      !mainPage
    ) {
      return;
    }

    completedRef.current = false;
    handleDisableTicketMotion();
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const viewportHeight = window.innerHeight;
    const ticketCenterOffset = gsap.utils.clamp(
      isMobile ? 36 : 48,
      isMobile ? 74 : 98,
      viewportHeight * (isMobile ? 0.065 : 0.08)
    );
    const envelopeRect = envelope.getBoundingClientRect();
    const envelopeHalfHeight = envelopeRect.height / 2;
    const ticketPocketOffset = gsap.utils.clamp(
      ticketCenterOffset + 260,
      ticketCenterOffset + 340,
      ticketCenterOffset + viewportHeight * 0.31
    );
    const ticketSlideOffset = gsap.utils.clamp(
      ticketCenterOffset + 120,
      ticketCenterOffset + 170,
      ticketCenterOffset + viewportHeight * 0.14
    );
    const copyOffset = ticketCenterOffset + gsap.utils.clamp(
      isMobile ? 250 : 270,
      isMobile ? 320 : 340,
      viewportHeight * (isMobile ? 0.31 : 0.29)
    );

    const getTicketHandoff = () => {
      const finalTicket = finalTicketRef.current;
      if (!finalTicket) {
        return { x: 0, y: ticketCenterOffset, scale: 1 };
      }

      const finalRect = finalTicket.getBoundingClientRect();
      const currentRect = ticketStage.getBoundingClientRect();

      return {
        x:
          finalRect.left +
          finalRect.width / 2 -
          (currentRect.left + currentRect.width / 2),
        y:
          finalRect.top +
          finalRect.height / 2 -
          (currentRect.top + currentRect.height / 2) +
          ticketCenterOffset,
        scale: finalRect.width / currentRect.width,
      };
    };

    const ctx = gsap.context(() => {
      gsap.set(mainPage, { autoAlpha: 0, y: 12, pointerEvents: "none" });
      gsap.set(envelope, {
        xPercent: -50,
        yPercent: -50,
        autoAlpha: 0,
        scale: 0.94,
        y: 16,
        perspective: 1400,
      });
      gsap.set(flap, {
        rotateX: 0,
        transformOrigin: "50% 0%",
        transformPerspective: 1400,
        force3D: true,
      });
      gsap.set(bottomOccluder, {
        xPercent: -50,
        x: 0,
        y: envelopeHalfHeight - 1,
        autoAlpha: 1,
      });
      gsap.set(ticketStage, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: ticketPocketOffset,
        autoAlpha: 1,
        rotate: 0,
        scale: 0.94,
      });
      gsap.set(copy, { xPercent: -50, yPercent: -50, autoAlpha: 0, y: copyOffset + 12 });

      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => {
          completedRef.current = true;
          handleComplete();
        },
      });

      timeline.addLabel("intro", 0);
      timeline.fromTo(
        envelope,
        { autoAlpha: 0, scale: 0.94, y: 16 },
        { autoAlpha: 1, scale: 1, y: 0, duration: 0.4, ease: "power2.out" },
        "intro"
      );

      timeline.addLabel("open", 0.48);
      timeline.to(
        flap,
        { rotateX: 180, duration: 1.45, ease: "power1.inOut" },
        "open"
      );
      timeline.to(envelope, { y: 8, duration: 0.5, ease: "sine.out" }, "open+=0.16");
      timeline.set(flap, { zIndex: 5 }, "open");
      timeline.set(flap, { zIndex: 0 }, "open+=1.48");

      timeline.addLabel("slide", 1.92);
      timeline.to(
        ticketStage,
        {
          x: 0,
          y: ticketSlideOffset,
          rotate: 0,
          scale: 0.98,
          duration: 1.25,
          ease: "power3.out",
        },
        "slide"
      );

      timeline.addLabel("center", 3.18);
      timeline.to(
        ticketStage,
        {
          y: ticketCenterOffset,
          rotate: 0,
          scale: 1.03,
          duration: 1.05,
          ease: "power2.inOut",
        },
        "center"
      );
      timeline.set(ticketStage, { zIndex: 30 }, "center+=0.2");
      timeline.to(ticketStage, { scale: 1, duration: 0.36, ease: "power2.out" }, "center+=0.94");
      timeline.to(
        bottomOccluder,
        { autoAlpha: 0, duration: 0.28, ease: "power1.out" },
        "center+=0.74"
      );
      timeline.to(
        envelope,
        { autoAlpha: 0, y: 28, scale: 0.96, duration: 0.65, ease: "power2.inOut" },
        "center+=0.9"
      );
      timeline.call(() => handlePrimaryConfetti(), [], "center+=0.96");
      timeline.call(() => handleSecondaryConfetti(), [], "center+=1.18");
      timeline.call(() => handleEnableTicketMotion(), [], "center+=1.04");
      timeline.fromTo(
        copy,
        { autoAlpha: 0, y: copyOffset + 10 },
        { autoAlpha: 1, y: copyOffset, duration: 0.65, ease: "power2.out" },
        "center+=1.08"
      );

      timeline.addLabel("hold", isMobile ? 4.95 : 5.2);
      timeline.to(copy, { autoAlpha: 0, duration: 0.45, ease: "power2.out" }, "hold+=1.08");

      timeline.addLabel("handoff", isMobile ? 7.1 : 7.45);
      timeline.to(
        ticketStage,
        {
          x: () => getTicketHandoff().x,
          y: () => getTicketHandoff().y,
          scale: () => getTicketHandoff().scale,
          duration: 1.1,
          ease: "power2.inOut",
        },
        "handoff"
      );
      timeline.to(
        mainPage,
        { autoAlpha: 1, y: 0, pointerEvents: "auto", duration: 0.95, ease: "power2.out" },
        "handoff+=0.16"
      );
      timeline.to(
        overlay,
        { autoAlpha: 0, filter: "blur(10px)", duration: 0.55, ease: "power2.inOut" },
        "handoff+=0.72"
      );

      timeline.timeScale(timeline.duration() / INTRO_TARGET_DURATION_SECONDS);
    }, overlay);

    return () => {
      if (completedRef.current) {
        gsap.killTweensOf(mainPage);
        gsap.set(mainPage, { clearProps: "opacity,visibility,transform,pointerEvents" });
        return;
      }

      ctx.revert();
    };
  }, [finalTicketRef, mainPageRef, handleComplete, handlePrimaryConfetti, handleSecondaryConfetti, handleEnableTicketMotion, handleDisableTicketMotion]);

  return (
    <div ref={overlayRef} className="pointer-events-none fixed inset-0 z-40">
      <div className="relative h-full w-full">
        <div
          ref={ticketStageRef}
          className="absolute left-1/2 top-1/2 z-10"
        >
          <LaunchTicket
            appRef={ticketAppRef}
            ticketRef={introTicketRef}
            orderInLine={orderInLine}
            size="page"
            interactive={false}
          />
        </div>

        <div
          ref={bottomOccluderRef}
          className="absolute left-1/2 top-1/2 z-[15] h-screen w-[min(88vw,380px)] bg-[#0B0B0C]"
        />

        <div className="absolute left-1/2 top-1/2 z-50">
          <p
            ref={copyRef}
            className="max-w-[calc(100vw-3rem)] text-center text-[clamp(1.3rem,3vw,2rem)] font-semibold lowercase tracking-[-0.04em] text-white"
          >
            you&apos;re invited to our launch party
          </p>
        </div>

        <div
          ref={envelopeRef}
          className="absolute left-1/2 top-1/2 z-20 [--env-height:calc(var(--env-width)/1.56)] [--env-width:min(88vw,392px)]"
        >
          <div className="absolute inset-x-[14%] bottom-[-10%] h-10 rounded-full bg-black/35 blur-2xl" />

          <div className="relative h-[var(--env-height)] w-[var(--env-width)]">
            <div className="absolute inset-0" style={envelopeBodyStyle} />
            <div className="absolute left-0 top-0 z-30" style={envelopePocketLeftStyle} />
            <div
              ref={flapRef}
              className="absolute left-0 top-0 z-40 origin-top"
              style={envelopeFlapStyle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}