import React from 'react';
import { Store, Package, CheckCircle2, ArrowRight, MessageSquare } from 'lucide-react';
import type { ProgrammePreferenceOption } from '../types/seller.ts';

interface SellerProgrammesProps {
  onScrollToForm?: () => void;
  selectedProgramme?: ProgrammePreferenceOption | '';
  onSelectProgramme?: (programme: ProgrammePreferenceOption) => void;
}

interface ProgrammeCard {
  id: 'stores-near-you' | 'namma-fresh';
  preferenceValue: ProgrammePreferenceOption;
  title: string;
  subtitle: string;
  description: string;
  points: string[];
  ctaLabel: string;
  accentTheme: 'green' | 'orange';
}

const PROGRAMMES: ProgrammeCard[] = [
  {
    id: 'stores-near-you',
    preferenceValue: 'stores_near_you',
    title: 'Stores Near You',
    subtitle: 'Your store. Your eligible listings.',
    description:
      'List eligible products from your store under your shop name and manage item prices under the applicable Namma Stores terms.',
    points: [
      'List eligible products from your store with your store branding.',
      'Manage eligible product prices and active stock.',
      'Receive customer orders through the Namma Stores Seller App.',
      'Category commission applies according to your agreed written terms.',
    ],
    ctaLabel: 'Select Stores Near You',
    accentTheme: 'green',
  },
  {
    id: 'namma-fresh',
    preferenceValue: 'namma_fresh',
    title: 'Namma Fresh',
    subtitle: 'Supply fresh products under an agreed arrangement.',
    description:
      'Namma Fresh is a centrally managed customer-facing catalogue with agreed supplier arrangements and fixed supplier payouts.',
    points: [
      'Namma Stores manages the customer-facing catalogue and retail prices.',
      'Supply quality-checked fresh products according to agreed terms.',
      'Each product has a fixed, agreed supplier payout.',
      'Stores Near You commission rates do not automatically apply to Namma Fresh.',
    ],
    ctaLabel: 'Select Namma Fresh',
    accentTheme: 'orange',
  },
];

export const SellerProgrammes: React.FC<SellerProgrammesProps> = ({
  onScrollToForm,
  selectedProgramme,
  onSelectProgramme,
}) => {
  const scrollToFormElement = () => {
    if (onScrollToForm) {
      onScrollToForm();
      return;
    }
    const formEl = document.getElementById('apply-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectProgramme = (programme: ProgrammePreferenceOption) => {
    if (onSelectProgramme) {
      onSelectProgramme(programme);
    }
    scrollToFormElement();
  };

  return (
    <section
      id="programmes"
      className="relative py-10 sm:py-14 bg-[#FFF9EF] border-b border-[#174D35]/10 overflow-hidden"
    >
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Heading & Introductory Copy */}
        <div className="max-w-2xl mx-auto text-center space-y-1.5 mb-7 sm:mb-9">
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#2F855A]">
            Participation Models
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#174D35] tracking-tight text-balance">
            Choose the Programme That Fits Your Business
          </h2>
          <p className="text-xs sm:text-sm text-[#4A5950] leading-relaxed">
            Namma Stores offers two ways for local stores to participate. Select your preferred programme below to pre-fill your application, or discuss both options with our team during onboarding.
          </p>
        </div>

        {/* Two-Card Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {PROGRAMMES.map((programme) => {
            const isGreen = programme.accentTheme === 'green';
            const isSelected = selectedProgramme === programme.preferenceValue;

            return (
              <div
                key={programme.id}
                className={`relative bg-white/95 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                  isSelected
                    ? isGreen
                      ? 'border-[#2F855A] ring-2 ring-[#2F855A]/25 shadow-[0_12px_28px_-8px_rgba(23,77,53,0.16)]'
                      : 'border-[#FF9F43] ring-2 ring-[#FF9F43]/30 shadow-[0_12px_28px_-8px_rgba(255,159,67,0.22)]'
                    : isGreen
                      ? 'border-[#2F855A]/25 shadow-[0_8px_24px_-8px_rgba(23,77,53,0.08)]'
                      : 'border-[#FF9F43]/35 shadow-[0_8px_24px_-8px_rgba(255,159,67,0.10)]'
                }`}
              >
                {/* Top Accent Strip */}
                <div
                  aria-hidden="true"
                  className={`absolute top-0 inset-x-0 h-1.5 ${
                    isGreen
                      ? 'bg-gradient-to-r from-[#174D35] to-[#2F855A]'
                      : 'bg-gradient-to-r from-[#FF9F43] to-[#FF6A00]'
                  }`}
                />

                <div className="space-y-3.5 pt-1">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                          isGreen
                            ? 'bg-[#E5F4E8] border-[#2F855A]/30 text-[#174D35]'
                            : 'bg-[#FFF4E3] border-[#FF9F43]/45 text-[#174D35]'
                        }`}
                      >
                        {isGreen ? (
                          <Store
                            className="w-5 h-5 text-[#174D35]"
                            aria-hidden="true"
                          />
                        ) : (
                          <Package
                            className="w-5 h-5 text-[#FF6A00]"
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-extrabold text-[#174D35] tracking-tight leading-snug">
                          {programme.title}
                        </h3>
                        <p
                          className={`text-xs sm:text-sm font-bold mt-0.5 leading-snug ${
                            isGreen ? 'text-[#2F855A]' : 'text-[#B85400]'
                          }`}
                        >
                          {programme.subtitle}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#174D35] text-white text-[11px] font-bold shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-[#FF9F43]" />
                        Selected
                      </span>
                    )}
                  </div>

                  {/* Programme Description */}
                  <p className="text-xs sm:text-sm text-[#202820] leading-relaxed bg-[#FFF9EF]/80 p-3 rounded-xl border border-[#174D35]/10">
                    {programme.description}
                  </p>

                  {/* Key Programme Points */}
                  <ul className="space-y-2 pt-0.5">
                    {programme.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-[#202820] leading-relaxed"
                      >
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            isGreen ? 'text-[#2F855A]' : 'text-[#FF9F43]'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="font-medium">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Programme Selection Button */}
                <div className="mt-5 pt-4 border-t border-[#174D35]/10">
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      handleSelectProgramme(programme.preferenceValue)
                    }
                    className={`w-full min-h-[42px] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174D35] ${
                      isSelected
                        ? 'bg-[#174D35] text-white shadow-xs'
                        : isGreen
                          ? 'bg-[#E5F4E8]/85 hover:bg-[#174D35] text-[#174D35] hover:text-white border border-[#2F855A]/35'
                          : 'bg-[#FFF4E3] hover:bg-[#174D35] text-[#174D35] hover:text-white border border-[#FF9F43]/55'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#FF9F43] shrink-0" />
                        <span>Selected for Application</span>
                      </>
                    ) : (
                      <>
                        <span>{programme.ctaLabel}</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Call-To-Action Strip */}
        <div className="mt-5 sm:mt-6 rounded-2xl bg-gradient-to-r from-[#E5F4E8]/80 via-[#FFF9EF] to-[#FFF4E3]/80 border border-[#174D35]/15 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-[0_4px_16px_-6px_rgba(23,77,53,0.06)]">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-[#174D35]/15 text-[#174D35] flex items-center justify-center shrink-0">
              <MessageSquare
                className="w-4 h-4 sm:w-5 sm:h-5 text-[#2F855A]"
                aria-hidden="true"
              />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-[#174D35] leading-snug">
                Not sure which programme fits your shop?
              </h3>
              <p className="text-xs sm:text-sm text-[#4A5950] leading-relaxed">
                Select &ldquo;Not sure yet&rdquo; and our Whitefield onboarding team will help you choose the right programme during onboarding.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSelectProgramme('need_guidance')}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-[#174D35] hover:bg-[#2F855A] active:scale-[0.99] text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all duration-200 shadow-xs shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174D35] focus-visible:ring-offset-2"
          >
            <span>
              {selectedProgramme === 'need_guidance'
                ? 'Selected: Not sure yet'
                : 'Not sure yet — Help me choose'}
            </span>
            <ArrowRight
              className="w-4 h-4 text-[#FF9F43] shrink-0"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </section>
  );
};

