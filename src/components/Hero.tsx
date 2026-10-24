import React from 'react';
import { ArrowRight, CheckCircle2, Sparkles, Compass } from 'lucide-react';
import { trackEvent } from '../lib/analytics.ts';
import heroCardLogoImg from '../assets/images/regenerated_image_1792559376214.png';
import sellerAppIconImg from '../assets/images/regenerated_image_1792559380757.png';

interface HeroProps {
  onApplyClick: () => void;
  onExploreBenefitsClick?: () => void;
  onContactClick?: () => void;
}

const BRAND_HIGHLIGHTS = [
  {
    title: '35-day introductory trial — ₹0 platform charges.',
    detail:
      'Starts once your verified store goes live on Namma Stores, with no lock-in.',
  },
  {
    title: 'Free seller onboarding — ₹0 setup fee.',
    detail: 'Guided verification, account setup, and store preparation with our team.',
  },
  {
    title: 'Delivery coordinated by Namma Stores.',
    detail:
      'Authorised delivery partners collect packed orders from your shop with OTP verification.',
  },
  {
    title: 'Neighbourhood visibility in Whitefield.',
    detail: 'Help local customers discover and order from your store online.',
  },
];

export const Hero: React.FC<HeroProps> = ({
  onApplyClick,
  onExploreBenefitsClick,
}) => {
  const handleApply = () => {
    trackEvent('cta_click', { placement: 'hero_primary_button' });
    onApplyClick();
  };

  const handleExploreBenefits = () => {
    trackEvent('cta_click', { placement: 'hero_explore_benefits_button' });
    if (onExploreBenefitsClick) {
      onExploreBenefitsClick();
      return;
    }
    const el = document.getElementById('benefits');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden pt-5 pb-12 sm:pt-14 sm:pb-24 bg-gradient-to-b from-[#FFF4E3]/65 via-[#FFF9EF] to-[#FFF9EF] border-b border-[#174D35]/10">
      {/* ====================================================================
          LAYERED AMBIENT HERO BACKGROUND (Behind all foreground content)
          ==================================================================== */}
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
      >
        <div className="absolute inset-0 bg-ns-subtle-grid opacity-65" />

        <div
          className="animate-ns-orb-1 absolute -top-24 -left-20 sm:left-4 w-[26rem] sm:w-[36rem] h-[26rem] sm:h-[36rem] rounded-full blur-2xl sm:blur-3xl"
          style={{
            background:
              'radial-gradient(circle at 45% 45%, rgba(47, 133, 90, 0.22) 0%, rgba(229, 244, 232, 0.65) 45%, rgba(255, 249, 239, 0) 72%)',
          }}
        />

        <div
          className="animate-ns-orb-2 absolute -top-16 right-[-10%] sm:right-[6%] w-[24rem] sm:w-[34rem] h-[24rem] sm:h-[34rem] rounded-full blur-2xl sm:blur-3xl"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(255, 159, 67, 0.21) 0%, rgba(255, 244, 227, 0.6) 48%, rgba(255, 249, 239, 0) 74%)',
          }}
        />

        <div
          className="animate-ns-orb-3 absolute -bottom-28 left-1/4 sm:left-1/3 w-[25rem] sm:w-[38rem] h-[25rem] sm:h-[38rem] rounded-full blur-2xl sm:blur-3xl"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(23, 77, 53, 0.15) 0%, rgba(229, 244, 232, 0.55) 50%, rgba(255, 249, 239, 0) 75%)',
          }}
        />

        <div
          className="animate-ns-light-wash absolute -inset-x-1/4 -inset-y-1/4 pointer-events-none"
          style={{
            background:
              'linear-gradient(115deg, rgba(255, 249, 239, 0) 18%, rgba(229, 244, 232, 0.55) 40%, rgba(255, 255, 255, 0.72) 50%, rgba(255, 159, 67, 0.12) 60%, rgba(255, 249, 239, 0) 82%)',
          }}
        />

        <svg
          viewBox="0 0 1440 640"
          fill="none"
          preserveAspectRatio="none"
          className="animate-ns-organic-1 absolute -top-10 left-0 w-full h-[115%] opacity-55"
        >
          <defs>
            <linearGradient id="nsHeroRibbonGreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#174D35" stopOpacity="0.03" />
              <stop offset="45%" stopColor="#2F855A" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#FF9F43" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="nsHeroOrganicFill" x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="#E5F4E8" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#FFF9EF" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#FF9F43" stopOpacity="0.07" />
            </linearGradient>
          </defs>
          <path
            d="M-120 480 C 240 290, 520 560, 880 340 C 1140 180, 1320 260, 1560 140 L 1560 660 L -120 660 Z"
            fill="url(#nsHeroOrganicFill)"
          />
          <path
            d="M-100 420 C 260 230, 560 510, 910 290 C 1160 135, 1340 220, 1540 110"
            stroke="url(#nsHeroRibbonGreen)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        <svg
          viewBox="0 0 1440 640"
          fill="none"
          preserveAspectRatio="none"
          className="animate-ns-organic-2 absolute top-6 left-0 w-full h-full opacity-45"
        >
          <defs>
            <linearGradient id="nsHeroRibbonAccent" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF9F43" stopOpacity="0.14" />
              <stop offset="50%" stopColor="#2F855A" stopOpacity="0.11" />
              <stop offset="100%" stopColor="#174D35" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path
            d="M-80 170 C 310 340, 690 60, 1060 250 C 1260 350, 1410 270, 1540 310"
            stroke="url(#nsHeroRibbonAccent)"
            strokeWidth="1.75"
            strokeDasharray="8 10"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* ====================================================================
          FOREGROUND CONTENT (Rendered immediately without initial JS opacity hide)
          ==================================================================== */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
          {/* Left Column: Offer Badge, Headline, Description, 4 Benefit Cards & CTAs */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-center lg:text-left">
            {/* Prominent 35-Day Free Trial Offer Badge — Warm Orange Tint + Dark Forest-Green Text */}
            <div className="inline-flex flex-nowrap items-center justify-center lg:justify-start gap-2 sm:gap-2.5 max-w-full px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFE2B8] via-[#FFF0D6] to-[#FFE2B8] text-[#174D35] border-2 border-[#FF9F43] shadow-[0_6px_18px_rgba(255,159,67,0.22)]">
              <span className="w-5 h-5 rounded-lg bg-[#FF9F43]/35 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-[#174D35] shrink-0" />
              </span>
              <span className="text-[11px] sm:text-sm font-extrabold tracking-wide text-[#174D35] tabular-nums whitespace-nowrap">
                35 DAYS FREE — ₹0 PLATFORM CHARGES
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-[3.35rem] font-extrabold text-[#174D35] tracking-tight leading-[1.12] text-balance">
              Grow Your Local Store with{' '}
              <span className="relative inline-block text-[#2F855A]">
                Namma Stores
                <svg
                  aria-hidden="true"
                  viewBox="0 0 220 10"
                  fill="none"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1.5 left-0 w-full h-2"
                >
                  <path
                    d="M3 7C62 2.5 148 2.5 217 6.5"
                    stroke="#FF9F43"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Description explaining what Namma Stores does */}
            <p className="text-sm sm:text-lg text-[#202820] max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
              Namma Stores is your local online marketplace in Whitefield, Bengaluru—helping neighbourhood retailers receive online orders while our delivery partners collect from your store and deliver to customers.
            </p>

            {/* Four Hero Benefit Cards — Card 1 is Primary Free-Trial Highlight */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 max-w-xl mx-auto lg:mx-0 pt-0.5 text-left">
              {/* Card 1: Primary Highlight */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-[#FFF0D8] via-[#FFF9EF] to-[#E5F4E8] border border-[#FF9F43]/45 shadow-[0_6px_16px_rgba(23,77,53,0.10)] flex flex-col justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FF9F43]/35 text-[#174D35] text-[10px] font-extrabold uppercase tracking-wider mb-1">
                    <Sparkles className="w-2.5 h-2.5 text-[#174D35] shrink-0" />
                    <span>INTRO OFFER</span>
                  </span>
                  <div className="text-xs sm:text-sm font-extrabold text-[#174D35] tabular-nums leading-snug">
                    35 Days at ₹0
                  </div>
                </div>
                <p className="text-[11px] sm:text-xs font-medium text-[#202820] mt-1 leading-snug">
                  ₹0 platform charges for 35 days from store activation.
                </p>
              </div>

              {/* Card 2: Free Onboarding */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/95 border border-[#174D35]/15 shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#2F855A] mb-1">
                    ₹0 Setup Fee
                  </span>
                  <div className="text-xs sm:text-sm font-extrabold text-[#174D35] leading-snug">
                    Free Onboarding
                  </div>
                </div>
                <p className="text-[11px] sm:text-xs text-[#4A5950] mt-1 leading-snug">
                  Guided store verification &amp; catalogue setup.
                </p>
              </div>

              {/* Card 3: Managed Delivery */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/95 border border-[#174D35]/15 shadow-2xs flex flex-col justify-between">
                <div className="text-xs sm:text-sm font-extrabold text-[#174D35] leading-snug">
                  Managed Delivery
                </div>
                <p className="text-[11px] sm:text-xs text-[#4A5950] mt-1 leading-snug">
                  Store pickup &amp; local delivery handled by our fleet.
                </p>
              </div>

              {/* Card 4: Local Visibility */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-white/95 border border-[#174D35]/15 shadow-2xs flex flex-col justify-between">
                <div className="text-xs sm:text-sm font-extrabold text-[#174D35] leading-snug">
                  Local Visibility
                </div>
                <p className="text-[11px] sm:text-xs text-[#4A5950] mt-1 leading-snug">
                  Reach nearby households across Whitefield.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-2.5 sm:gap-3.5">
              <button
                type="button"
                onClick={handleApply}
                className="group relative overflow-hidden min-h-[48px] px-7 py-3.5 bg-[#174D35] hover:bg-[#2F855A] active:scale-[0.98] text-white font-bold text-sm sm:text-base rounded-xl shadow-[0_6px_20px_rgba(23,77,53,0.26)] hover:shadow-[0_10px_28px_rgba(47,133,90,0.34)] transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap"
              >
                <span className="relative z-10">Apply as a Seller</span>
                <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={handleExploreBenefits}
                className="min-h-[46px] px-6 py-3 bg-white/95 backdrop-blur-xs hover:bg-[#E5F4E8]/70 border border-[#174D35]/20 hover:border-[#2F855A]/50 text-[#174D35] font-bold text-sm sm:text-base rounded-xl transition-all duration-200 shadow-xs hover:shadow-soft-card flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Compass className="w-4 h-4 text-[#2F855A]" />
                <span>Explore Benefits</span>
              </button>
            </div>
          </div>

          {/* Right Column: Brand & Seller App Presentation */}
          <div className="lg:col-span-5 relative">
            {/* Breathing Ambient Halo Behind the Seller Information Card */}
            <div
              aria-hidden="true"
              className="animate-ns-halo absolute -inset-3 sm:-inset-5 rounded-[2rem] blur-2xl pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 35% 30%, rgba(47, 133, 90, 0.24) 0%, rgba(229, 244, 232, 0.65) 45%, rgba(255, 159, 67, 0.18) 80%, transparent 100%)',
              }}
            />

            <div className="relative mx-auto max-w-md bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-7 border border-[#174D35]/14 shadow-elevated transition-all duration-300 overflow-hidden">
              {/* Top Brand Accent Bar */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#174D35] via-[#2F855A] to-[#FF9F43]" />

              {/* Subtle inner corner radial glow */}
              <div
                aria-hidden="true"
                className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[#E5F4E8]/70 blur-2xl pointer-events-none"
              />

              {/* Genuine Namma Stores Logo Presentation */}
              <div className="relative pb-3.5 sm:pb-5 border-b border-[#174D35]/10 flex flex-col items-start gap-2">
                <img
                  src={heroCardLogoImg}
                  alt="Namma Stores — Your local stores, Now online"
                  width={160}
                  height={56}
                  decoding="async"
                  className="h-9 sm:h-13 w-auto object-contain"
                />
                <p className="text-sm sm:text-lg font-extrabold text-[#174D35] tracking-tight leading-snug">
                  Built for Neighbourhood Stores in Whitefield
                </p>
              </div>

              {/* Four Concise Benefits — Displayed across all screen sizes */}
              <ul className="relative py-4 sm:py-5 space-y-3 sm:space-y-3.5">
                {BRAND_HIGHLIGHTS.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#E5F4E8] text-[#174D35] flex items-center justify-center shrink-0 mt-0.5 border border-[#2F855A]/25">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#174D35]" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-[#174D35] block leading-snug">
                        {item.title}
                      </span>
                      <span className="text-[11px] sm:text-xs text-[#4A5950] block mt-0.5 leading-relaxed">
                        {item.detail}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Authentic Seller Partner App Identity Row */}
              <div className="relative pt-3.5 sm:pt-4 border-t border-[#174D35]/10 flex items-center gap-3.5 bg-gradient-to-r from-[#FFF9EF] via-[#FFF9EF] to-[#E5F4E8]/45 -mx-4 -mb-4 sm:-mx-7 sm:-mb-7 px-4 py-3.5 sm:px-7 sm:py-4">
                <img
                  src={sellerAppIconImg}
                  alt="Namma Stores Seller Partner App"
                  width={44}
                  height={44}
                  loading="lazy"
                  decoding="async"
                  className="w-11 h-11 object-contain shrink-0 drop-shadow-xs"
                />
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-[#174D35] leading-tight">
                    Namma Stores Seller App
                  </div>
                  <p className="text-[11px] text-[#4A5950] mt-0.5 leading-snug">
                    Dedicated partner app provided after verification and onboarding.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
