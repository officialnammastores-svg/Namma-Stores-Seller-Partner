import React, { useEffect, useRef } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import type { AnalyticsConsentDecision } from '../lib/metaPixel.ts';

interface AnalyticsConsentBannerProps {
  decision: AnalyticsConsentDecision;
  isOpen: boolean;
  isExplicitlyOpened?: boolean;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
  onOpenPrivacy: () => void;
}

export function formatAnalyticsDecisionLabel(
  decision: AnalyticsConsentDecision
): string {
  if (decision === 'accepted') {
    return 'Analytics Accepted';
  }
  if (decision === 'rejected') {
    return 'Analytics Rejected';
  }
  return 'Not set (Analytics Off)';
}

export const AnalyticsConsentBanner: React.FC<AnalyticsConsentBannerProps> = ({
  decision,
  isOpen,
  isExplicitlyOpened = false,
  onAccept,
  onReject,
  onClose,
  onOpenPrivacy,
}) => {
  const barRef = useRef<HTMLDivElement | null>(null);
  const acceptBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Only move focus automatically when the visitor explicitly clicks "Analytics Preferences" in the footer,
    // never on initial page load.
    let focusTimer: ReturnType<typeof setTimeout> | null = null;
    if (isExplicitlyOpened) {
      focusTimer = setTimeout(() => {
        acceptBtnRef.current?.focus();
      }, 0);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (focusTimer) clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isExplicitlyOpened, onClose]);

  if (!isOpen) return null;

  const statusLabel = formatAnalyticsDecisionLabel(decision);

  return (
    <aside
      id="analytics-preferences-dialog"
      data-testid="analytics-consent-bar"
      ref={barRef}
      role="region"
      aria-label="Analytics Preferences"
      aria-describedby="analytics-preferences-desc"
      className="fixed inset-x-0 bottom-0 z-50 p-2.5 sm:p-3.5 pointer-events-none flex justify-center"
    >
      <div className="pointer-events-auto w-full max-w-4xl rounded-2xl bg-[#0E261A] text-white border border-[#2F855A]/60 shadow-[0_12px_32px_rgba(14,38,26,0.45)] px-3.5 py-2.5 sm:px-5 sm:py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 sm:gap-4">
          {/* Left: Title, Status, and Concise Explanation */}
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-lg bg-[#2F855A]/25 border border-[#2F855A]/45 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h3
                  id="analytics-preferences-title"
                  className="text-xs sm:text-sm font-extrabold text-[#FFF9EF] leading-tight"
                >
                  Analytics Preferences
                </h3>
                <span
                  data-testid="analytics-current-decision"
                  className="text-[11px] text-[#FF9F43] font-bold"
                >
                  Current status: {statusLabel}
                </span>
              </div>

              <p
                id="analytics-preferences-desc"
                className="text-[11px] sm:text-xs text-white/85 leading-snug mt-0.5"
              >
                Optional Meta analytics measures website visits and completed
                seller applications without sharing personal or shop details.{' '}
                <button
                  type="button"
                  onClick={onOpenPrivacy}
                  className="text-[#FF9F43] hover:text-[#FFF9EF] font-bold underline underline-offset-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43] rounded-xs"
                >
                  Partner Privacy Notice
                </button>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close analytics preferences"
              className="md:hidden w-7 h-7 rounded-lg text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center shrink-0 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right: Equal Accept / Reject Actions + Desktop Close */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full md:w-auto">
              <button
                id="analytics-accept-button"
                data-testid="analytics-accept-button"
                ref={acceptBtnRef}
                type="button"
                onClick={onAccept}
                aria-pressed={decision === 'accepted'}
                className="min-h-[36px] sm:min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#2F855A] hover:bg-[#24724B] border border-[#34D399]/40 text-white font-bold text-xs whitespace-nowrap transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43]"
              >
                Accept Analytics
              </button>
              <button
                id="analytics-reject-button"
                data-testid="analytics-reject-button"
                type="button"
                onClick={onReject}
                aria-pressed={decision === 'rejected'}
                className="min-h-[36px] sm:min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white/12 hover:bg-white/20 border border-white/30 text-white font-bold text-xs whitespace-nowrap transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43]"
              >
                Reject Analytics
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close analytics preferences"
              className="hidden md:flex w-7 h-7 rounded-lg text-white/70 hover:text-white hover:bg-white/10 items-center justify-center shrink-0 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

