import React from 'react';
import { ShieldCheck, X } from 'lucide-react';
import type { AnalyticsConsentDecision } from '../lib/metaPixel.ts';

interface AnalyticsConsentBannerProps {
  decision: AnalyticsConsentDecision;
  isOpen: boolean;
  onAccept: () => void;
  onReject: () => void;
  onClose?: () => void;
  onOpenPrivacy: () => void;
}

export const AnalyticsConsentBanner: React.FC<AnalyticsConsentBannerProps> = ({
  decision,
  isOpen,
  onAccept,
  onReject,
  onClose,
  onOpenPrivacy,
}) => {
  if (!isOpen) return null;

  const hasSavedDecision = decision === 'accepted' || decision === 'rejected';

  return (
    <aside
      role="region"
      aria-label="Analytics consent preferences"
      className="fixed bottom-4 left-3 right-16 sm:left-5 sm:right-auto sm:max-w-md z-40"
    >
      <div className="relative rounded-2xl bg-[#0E261A]/95 text-white border border-[#2F855A]/50 shadow-[0_14px_38px_rgba(14,38,26,0.45)] backdrop-blur-sm p-3.5 sm:p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#2F855A]/25 border border-[#2F855A]/45 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#34D399]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-[#FFF9EF] leading-tight">
                Analytics Preferences
              </h3>
              {hasSavedDecision && (
                <p className="text-[11px] text-[#FF9F43] font-bold">
                  Current choice:{' '}
                  {decision === 'accepted'
                    ? 'Analytics Accepted'
                    : 'Analytics Rejected'}
                </p>
              )}
            </div>
          </div>

          {hasSavedDecision && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close analytics preferences"
              className="w-7 h-7 rounded-lg text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-[11px] sm:text-xs text-white/85 leading-relaxed">
          We use optional Meta Pixel analytics to measure seller website visits
          and completed applications. No personal or shop details are shared,
          and tracking stays off unless you accept.{' '}
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="text-[#FF9F43] hover:text-[#FFF9EF] font-bold underline underline-offset-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43] rounded-xs"
          >
            Partner Privacy Notice
          </button>
        </p>

        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 min-h-[38px] px-3 py-2 rounded-xl bg-[#2F855A] hover:bg-[#24724B] text-white font-extrabold text-xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43]"
          >
            Accept Analytics
          </button>
          <button
            type="button"
            onClick={onReject}
            className="flex-1 min-h-[38px] px-3 py-2 rounded-xl bg-white/10 hover:bg-white/18 border border-white/20 text-white font-bold text-xs transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43]"
          >
            Reject Analytics
          </button>
        </div>
      </div>
    </aside>
  );
};
