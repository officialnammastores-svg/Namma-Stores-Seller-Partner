import React, { useEffect, useRef } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import type { AnalyticsConsentDecision } from '../lib/metaPixel.ts';

interface AnalyticsConsentBannerProps {
  decision: AnalyticsConsentDecision;
  isOpen: boolean;
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
  onAccept,
  onReject,
  onClose,
  onOpenPrivacy,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const acceptBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (typeof document !== 'undefined') {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    }

    const focusTimer = setTimeout(() => {
      acceptBtnRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === 'function'
      ) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const statusLabel = formatAnalyticsDecisionLabel(decision);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0E261A]/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="analytics-preferences-title"
        aria-describedby="analytics-preferences-desc"
        className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-[#0E261A] text-white border border-[#2F855A]/55 shadow-[0_20px_50px_rgba(14,38,26,0.55)] p-4 sm:p-5 space-y-3.5 animate-in fade-in duration-150"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2F855A]/25 border border-[#2F855A]/45 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#34D399]" />
            </div>
            <div>
              <h3
                id="analytics-preferences-title"
                className="text-sm sm:text-base font-extrabold text-[#FFF9EF] leading-tight"
              >
                Analytics Preferences
              </h3>
              <p
                data-testid="analytics-current-decision"
                className="text-[11px] text-[#FF9F43] font-bold mt-0.5"
              >
                Current status: {statusLabel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close analytics preferences"
            className="w-8 h-8 rounded-xl text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p
          id="analytics-preferences-desc"
          className="text-xs sm:text-sm text-white/85 leading-relaxed"
        >
          Meta Pixel analytics is optional and disabled by default. When
          accepted, it helps us measure seller page views and completed
          applications without sharing your name, phone number, email, shop
          address, or form values.{' '}
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="text-[#FF9F43] hover:text-[#FFF9EF] font-bold underline underline-offset-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43] rounded-xs"
          >
            Partner Privacy Notice
          </button>
        </p>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            ref={acceptBtnRef}
            type="button"
            onClick={onAccept}
            aria-pressed={decision === 'accepted'}
            className="min-h-[42px] px-3.5 py-2.5 rounded-xl bg-[#2F855A] hover:bg-[#24724B] text-white font-extrabold text-xs sm:text-sm transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43]"
          >
            Accept Analytics
          </button>
          <button
            type="button"
            onClick={onReject}
            aria-pressed={decision === 'rejected'}
            className="min-h-[42px] px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/18 border border-white/20 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43]"
          >
            Reject Analytics
          </button>
        </div>
      </div>
    </div>
  );
};
