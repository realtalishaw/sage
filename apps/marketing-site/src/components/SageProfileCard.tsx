import type { Ref } from "react";
import "./SageProfileCard.css";

interface SageProfileCardProps {
  orderInLine: number;
  className?: string;
  interactive?: boolean;
  appRef?: Ref<HTMLDivElement>;
  cardRef?: Ref<HTMLDivElement>;
  sageName?: string;
  avatarImageSrc?: string | null;
}

function createCardHandle(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\\.+|\\.+$/g, "");

  return normalized || "sage";
}

function createCardLabel(value: string) {
  return value.trim() || "sage concierge";
}

export function SageProfileCard({
  orderInLine,
  className = "",
  interactive = true,
  appRef,
  cardRef,
  sageName = "sage concierge",
  avatarImageSrc = null,
}: SageProfileCardProps) {
  const containerClasses = [
    "sage-profile-card-container",
    !interactive ? "pointer-events-none" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const cardLabel = createCardLabel(sageName);
  const cardHandle = createCardHandle(sageName);

  return (
    <div ref={appRef} className={containerClasses}>
      <div ref={cardRef} className="sage-profile-card">
        <div className="sage-profile-card__inner">
          {/* Shine layer */}
          <div className="sage-profile-card__shine" />

          {/* Glare layer */}
          <div className="sage-profile-card__glare" />

          {/* Avatar content */}
          <div className="sage-profile-card__content">
            <div className="sage-profile-card__avatar-container">
              {avatarImageSrc ? (
                <img
                  className="sage-profile-card__avatar"
                  src={avatarImageSrc}
                  alt={`${cardLabel} avatar`}
                />
              ) : (
                <img
                  className="sage-profile-card__avatar"
                  src="/sage-icon.png"
                  alt={`${cardLabel} avatar`}
                />
              )}
            </div>
          </div>

          {/* Details content */}
          <div className="sage-profile-card__details">
            <div className="sage-profile-card__details-inner">
              <h3 className="sage-profile-card__name">{cardLabel}</h3>
              <p className="sage-profile-card__handle">@{cardHandle}</p>
            </div>
          </div>

          {/* Footer */}
          <footer className="sage-profile-card__footer">
            <div className="sage-profile-card__footer-left">
              <div className="sage-profile-card__mini-avatar">
                <img
                  src={avatarImageSrc || "/sage-icon.png"}
                  alt={`${cardLabel} mini`}
                />
              </div>
              <div className="sage-profile-card__footer-info">
                <div className="sage-profile-card__member-badge">
                  member #{orderInLine}
                </div>
                <div className="sage-profile-card__launch-date">
                  mar 17, 2026
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
