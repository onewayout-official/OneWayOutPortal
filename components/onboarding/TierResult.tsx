"use client";

import { MembershipTier } from "@/types";
import { getMembershipTierContent } from "@/lib/membershipTierContent";

interface TierResultProps {
  tier: MembershipTier;
  onNext: () => void;
}

export default function TierResult({ tier, onNext }: TierResultProps) {
  const content = getMembershipTierContent(tier);
  const hasHighlight =
    content.statHighlight.length > 0 &&
    content.statBody.includes(content.statHighlight);
  const [statBefore, statAfter] = hasHighlight
    ? content.statBody.split(content.statHighlight)
    : ["", ""];

  return (
    <div className="onboarding-card tier-result-card">
      <div className="tier-badge-row">
        <span className="tier-badge">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {content.badgeLabel}
        </span>
        {content.percentBadge ? (
          <span className="tier-percent-badge">{content.percentBadge}</span>
        ) : null}
      </div>

      <div className="tier-icon-wrap" aria-hidden="true">
        {content.emoji}
      </div>

      <h1 className="tier-title">{tier}</h1>
      <p className="tier-headline">{content.headline}</p>

      <div className="tier-divider" />

      <p className="tier-body">{content.body}</p>

      <div className="tier-stat-box">
        <div className="tier-stat-label">{content.statLabel}</div>
        <p className="tier-stat-body">
          {hasHighlight ? (
            <>
              {statBefore}
              <strong className="tier-stat-highlight">{content.statHighlight}</strong>
              {statAfter}
            </>
          ) : (
            content.statBody
          )}
        </p>
      </div>

      <div className="tier-milestone">
        <div className="tier-milestone-header">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {content.tierNumber === 4 ? (
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            ) : (
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            )}
          </svg>
          {content.nextMilestoneTitle}
        </div>
        <p className="tier-milestone-body">{content.nextMilestoneBody}</p>
      </div>

      <button
        id="btn-tier-next"
        type="button"
        className="btn-continue tier-cta"
        onClick={onNext}
      >
        {content.cta}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
