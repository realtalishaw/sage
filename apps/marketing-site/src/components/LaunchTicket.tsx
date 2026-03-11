import type { Ref } from "react";
import "./LaunchTicket.css";

interface LaunchTicketProps {
  orderInLine: number;
  className?: string;
  interactive?: boolean;
  size?: "intro" | "page";
  appRef?: Ref<HTMLDivElement>;
  ticketRef?: Ref<HTMLElement>;
  sageName?: string;
  avatarImageSrc?: string | null;
}

function createTicketLabel(value: string) {
  return value.trim() || "sage";
}

function createTicketHandle(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  return normalized || "sage";
}

export function LaunchTicket({
  orderInLine,
  className = "",
  interactive = true,
  size = "page",
  appRef,
  ticketRef,
  sageName = "sage concierge",
  avatarImageSrc = null,
}: LaunchTicketProps) {
  const appClasses = ["launch-ticket-app", !interactive ? "pointer-events-none" : "", className]
    .filter(Boolean)
    .join(" ");
  const ticketClasses = [
    "launch-ticket",
    size === "intro" ? "launch-ticket--intro" : "launch-ticket--page",
  ].join(" ");
  const ticketLabel = createTicketLabel(sageName);
  const ticketHandle = createTicketHandle(sageName);

  return (
    <div ref={appRef} className={appClasses}>
      <section ref={ticketRef} className={ticketClasses} aria-label="launch ticket">
        <header className="launch-ticket__front">
          <div className="launch-ticket__holo" />
          <img
            className="launch-ticket__logo"
            src="/sage-icon.png"
            alt="sage"
          />
          <aside className="launch-ticket__divider" />
        </header>

        <section className="launch-ticket__back">
          <div className="launch-ticket__holo" />
          <img
            className="launch-ticket__logo"
            src="/sage-icon.png"
            alt="sage"
          />
          <div className="launch-ticket__data">
            <h3>date</h3>
            <p>mar 17</p>
            <h3>time</h3>
            <p>12:00 pm</p>
            <h3>username</h3>
            <p>{ticketLabel}</p>
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
              {avatarImageSrc ? (
                <img
                  className="launch-ticket__profile launch-ticket__profile--image"
                  src={avatarImageSrc}
                  alt={`${ticketLabel} avatar`}
                />
              ) : (
                <div
                  className="launch-ticket__profile flex items-center justify-center rounded-full bg-[#34C759] text-2xl"
                  style={{ width: 40, height: 40 }}
                >
                  🌱
                </div>
              )}
              <span>{ticketHandle}</span>
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
