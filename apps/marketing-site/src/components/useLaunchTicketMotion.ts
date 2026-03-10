import { useEffect, type RefObject } from "react";
import gsap from "gsap";

interface UseLaunchTicketMotionOptions {
  appRef: RefObject<HTMLDivElement | null>;
  ticketRef: RefObject<HTMLElement | null>;
  enabled?: boolean;
  pauseOnHover?: boolean;
}

export function useLaunchTicketMotion({
  appRef,
  ticketRef,
  enabled = true,
  pauseOnHover = true,
}: UseLaunchTicketMotionOptions) {
  useEffect(() => {
    const ticketApp = appRef.current;
    const ticket = ticketRef.current;

    if (!enabled || !ticketApp || !ticket) return;

    const speed = 7;
    const rotateTimeline = gsap.timeline({ repeat: -1 });
    const opacityTimeline = gsap.timeline({ repeat: -1 });
    const hueTimeline = gsap.timeline({ repeat: -1 });

    rotateTimeline.to(ticketApp, {
      "--ticket-r": "180deg",
      "--ticket-p": "0%",
      duration: speed,
      ease: "sine.in",
    });
    rotateTimeline.to(ticketApp, {
      "--ticket-r": "360deg",
      "--ticket-p": "100%",
      duration: speed,
      ease: "sine.out",
    });

    opacityTimeline.to(ticketApp, {
      "--ticket-o": 1,
      duration: speed / 2,
      ease: "power1.in",
    });
    opacityTimeline.to(ticketApp, {
      "--ticket-o": 0,
      duration: speed / 2,
      ease: "power1.out",
    });

    hueTimeline.to(ticketApp, {
      "--ticket-h": "100%",
      duration: speed / 2,
      ease: "sine.in",
    });
    hueTimeline.to(ticketApp, {
      "--ticket-h": "50%",
      duration: speed / 2,
      ease: "sine.out",
    });
    hueTimeline.to(ticketApp, {
      "--ticket-h": "0%",
      duration: speed / 2,
      ease: "sine.in",
    });
    hueTimeline.to(ticketApp, {
      "--ticket-h": "50%",
      duration: speed / 2,
      ease: "sine.out",
    });

    if (!pauseOnHover) {
      return () => {
        rotateTimeline.kill();
        opacityTimeline.kill();
        hueTimeline.kill();
      };
    }

    const pause = () => {
      rotateTimeline.pause();
      opacityTimeline.pause();
      hueTimeline.pause();
    };

    const play = () => {
      rotateTimeline.play();
      opacityTimeline.play();
      hueTimeline.play();
    };

    ticket.addEventListener("mouseenter", pause);
    ticket.addEventListener("mouseleave", play);

    return () => {
      ticket.removeEventListener("mouseenter", pause);
      ticket.removeEventListener("mouseleave", play);
      rotateTimeline.kill();
      opacityTimeline.kill();
      hueTimeline.kill();
    };
  }, [appRef, enabled, pauseOnHover, ticketRef]);
}
