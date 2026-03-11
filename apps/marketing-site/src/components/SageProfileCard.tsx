import type { Ref } from "react";
import { RandomAvatarHead } from "../avatar/RandomAvatarHead";
import type { RandomAvatarState } from "../avatar/random";
import "./SageProfileCard.css";

interface SageProfileCardProps {
  orderInLine: number;
  className?: string;
  interactive?: boolean;
  appRef?: Ref<HTMLDivElement>;
  cardRef?: Ref<HTMLDivElement>;
  sageName?: string;
  avatarImageSrc?: string | null;
  avatarState?: RandomAvatarState | null;
}

function createCardLabel(value: string) {
  return value.trim() || "sage concierge";
}

function formatMemberNumber(position: number): string {
  return position.toString().padStart(6, "0");
}

export function SageProfileCard({
  orderInLine,
  className = "",
  interactive = true,
  appRef,
  cardRef,
  sageName = "sage concierge",
  avatarImageSrc = null,
  avatarState = null,
}: SageProfileCardProps) {
  console.log('[SageProfileCard] Props:', {
    sageName,
    avatarImageSrc,
    avatarState,
    orderInLine,
  });

  const containerClasses = [
    "sage-profile-card-container",
    !interactive ? "pointer-events-none" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const cardLabel = createCardLabel(sageName);
  const memberNumber = formatMemberNumber(orderInLine);

  console.log('[SageProfileCard] Rendering with:', {
    cardLabel,
    memberNumber,
    hasAvatarState: !!avatarState,
  });

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
              ) : avatarState ? (
                <div className="sage-profile-card__avatar" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: 'auto',
                  aspectRatio: '1/1'
                }}>
                  <RandomAvatarHead avatarState={avatarState} />
                </div>
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
              <p className="sage-profile-card__handle">ai cofounder</p>
            </div>
          </div>

          {/* Footer */}
          <footer className="sage-profile-card__footer">
            <div className="sage-profile-card__footer-left">
              <div className="sage-profile-card__mini-avatar">
                {avatarImageSrc ? (
                  <img src={avatarImageSrc} alt={`${cardLabel} mini`} />
                ) : avatarState ? (
                  <RandomAvatarHead avatarState={avatarState} />
                ) : (
                  <img src="/sage-icon.png" alt={`${cardLabel} mini`} />
                )}
              </div>
              <div className="sage-profile-card__footer-info">
                <div className="sage-profile-card__member-badge">
                  member #{memberNumber}
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
