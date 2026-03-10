import type { Ref } from "react";
import "./LaunchTicket.css";

interface LaunchTicketProps {
  orderInLine: number;
  className?: string;
  interactive?: boolean;
  size?: "intro" | "page";
  appRef?: Ref<HTMLDivElement>;
  ticketRef?: Ref<HTMLElement>;
}

export function LaunchTicket({
  orderInLine,
  className = "",
  interactive = true,
  size = "page",
  appRef,
  ticketRef,
}: LaunchTicketProps) {
  const appClasses = ["launch-ticket-app", !interactive ? "pointer-events-none" : "", className]
    .filter(Boolean)
    .join(" ");
  const ticketClasses = [
    "launch-ticket",
    size === "intro" ? "launch-ticket--intro" : "launch-ticket--page",
  ].join(" ");

  return (
    <div ref={appRef} className={appClasses}>
      <section ref={ticketRef} className={ticketClasses} aria-label="launch ticket">
        <header className="launch-ticket__front">
          <div className="launch-ticket__holo" />
          <img
            className="launch-ticket__logo"
            src="https://assets.codepen.io/13471/threads.svg"
            alt="sage"
          />
          <aside className="launch-ticket__divider" />
        </header>

        <section className="launch-ticket__back">
          <div className="launch-ticket__holo" />
          <img
            className="launch-ticket__logo"
            src="https://assets.codepen.io/13471/threads.svg"
            alt="sage"
          />
          <div className="launch-ticket__data">
            <h3>date</h3>
            <p>mar 17</p>
            <h3>time</h3>
            <p>12:00 pm</p>
            <h3>username</h3>
            <p>sage.conci</p>
            <a
              className="launch-ticket__qr"
              href="https://joinsage.com"
              target="_blank"
              rel="noreferrer"
            >
              <img src="https://assets.codepen.io/13471/simeyqr.svg" alt="qr code" />
            </a>
          </div>

          <aside className="launch-ticket__divider">
            <div className="launch-ticket__username">
              <div
                className="launch-ticket__profile flex items-center justify-center rounded-full bg-[#34C759] text-2xl"
                style={{ width: 40, height: 40 }}
              >
                🌱
              </div>
              <span>sage.concierge</span>
              <img
                className="launch-ticket__verified"
                src="https://assets.codepen.io/13471/verified.png"
                alt="verified"
              />
            </div>
            <span className="launch-ticket__usernum">{orderInLine}</span>
          </aside>
        </section>
      </section>
    </div>
  );
}
