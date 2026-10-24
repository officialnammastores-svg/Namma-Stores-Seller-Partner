import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Sparkles, UserCheck, Truck, Store, FileText, CheckCircle2 } from 'lucide-react';

interface BenefitsProps {
  onOpenCommercialTerms?: () => void;
}

const BENEFITS = [
  {
    number: '01',
    icon: Sparkles,
    kicker: '35-Day Introductory Offer',
    title: 'Start with 35 Days at ₹0 Platform Charges',
    description:
      'Approved sellers enjoy ₹0 Namma Stores platform participation charges for their first 35 days—starting from the date your verified store goes live on the platform (not from application submission). Category commission or agreed supplier payout terms are shared in writing before store activation, with no lock-in commitment.',
    featured: true,
  },
  {
    number: '02',
    icon: UserCheck,
    kicker: 'No Onboarding Fee',
    title: 'Free Seller Onboarding',
    description:
      'Get guided onboarding support from our Whitefield team for store verification, catalogue preparation, and Seller App training at ₹0 setup cost.',
    featured: false,
  },
  {
    number: '03',
    icon: Truck,
    kicker: 'Coordinated Logistics',
    title: 'We Coordinate Store Pickup & Delivery',
    description:
      'Your staff prepares and packs confirmed orders at your shop. Authorised Namma Stores delivery partners collect packages using a digital pickup OTP and deliver them to local customers.',
    featured: false,
  },
  {
    number: '04',
    icon: Store,
    kicker: 'Online Presence',
    title: 'Get Discovered by Local Customers',
    description:
      'Build your neighbourhood online presence across Whitefield and benefit from platform-level visibility that helps nearby households order from your store.',
    featured: false,
  },
];

export const Benefits: React.FC<BenefitsProps> = ({ onOpenCommercialTerms }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="benefits"
      className="relative py-12 sm:py-22 bg-[#E5F4E8]/55 border-b border-[#2F855A]/15 overflow-hidden"
    >
      {/* Ambient Animated Background Accents */}
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
      >
        <div
          className="animate-ns-orb-2 absolute -top-24 -left-16 w-[24rem] sm:w-[32rem] h-[24rem] sm:h-[32rem] rounded-full blur-2xl sm:blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(255, 249, 239, 0.85) 0%, rgba(47, 133, 90, 0.14) 50%, rgba(229, 244, 232, 0) 75%)',
          }}
        />
        <div
          className="animate-ns-orb-1 absolute -bottom-24 right-[-5%] w-[22rem] sm:w-[30rem] h-[22rem] sm:h-[30rem] rounded-full blur-2xl sm:blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(255, 159, 67, 0.15) 0%, rgba(255, 249, 239, 0.6) 50%, rgba(229, 244, 232, 0) 75%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-2xl mx-auto mb-8 sm:mb-14"
        >
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#174D35]">
            Partner Advantages
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#174D35] mt-2 tracking-tight text-balance">
            Why Local Retailers Partner with Namma Stores
          </h2>
          <p className="text-xs sm:text-sm text-[#3D4C42] mt-2.5 leading-relaxed">
            Clear introductory trial terms, free guided onboarding, coordinated delivery partner collection, and neighbourhood online visibility.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-6">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            const isFeatured = b.featured;

            return (
              <motion.div
                key={b.number}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.45,
                  delay: shouldReduceMotion ? 0 : i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={
                  isFeatured
                    ? 'md:col-span-2 lg:col-span-12 group relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#174D35] via-[#174D35] to-[#2F855A] text-white border border-[#2F855A]/50 shadow-[0_12px_36px_rgba(23,77,53,0.22)] transition-all duration-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 overflow-hidden'
                    : 'md:col-span-1 lg:col-span-4 group relative p-6 sm:p-7 rounded-2xl bg-white/95 backdrop-blur-xs border border-[#174D35]/12 hover:border-[#2F855A]/45 shadow-soft-card hover:shadow-elevated transition-all duration-200 flex flex-col justify-between hover:-translate-y-0.5 overflow-hidden'
                }
              >
                {isFeatured ? (
                  <>
                    {/* Top accent bar on featured card */}
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#FF9F43] via-[#E5F4E8] to-[#FF9F43]" />

                    <div className="relative flex flex-col sm:flex-row sm:items-start gap-5 max-w-3xl">
                      <div className="w-14 h-14 rounded-2xl bg-[#FFF9EF] text-[#174D35] flex items-center justify-center shrink-0 border-2 border-[#FF9F43] shadow-sm">
                        <Icon className="w-7 h-7 text-[#174D35]" />
                      </div>
                      <div>
                        <div className="inline-flex flex-wrap items-center gap-2 text-xs font-extrabold tracking-wide text-[#FF9F43] tabular-nums mb-1.5">
                          <span>{b.number} · {b.kicker}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#E5F4E8]">₹0 PLATFORM CHARGES</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                          {b.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#FFF9EF]/95 mt-2 leading-relaxed">
                          {b.description}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#E5F4E8]">
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#FF9F43] shrink-0" />
                            Starts upon store activation
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#FF9F43] shrink-0" />
                            ₹0 onboarding &amp; setup fee
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#FF9F43] shrink-0" />
                            Written commercial terms before go-live
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="relative shrink-0 flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between lg:justify-center gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/15">
                      <div className="px-4 py-3 rounded-2xl bg-[#FFF9EF] text-[#174D35] border border-[#FF9F43]/40 shadow-xs">
                        <div className="text-[11px] font-bold text-[#2F855A] uppercase tracking-wider">
                          Introductory Seller Offer
                        </div>
                        <div className="text-lg sm:text-xl font-extrabold text-[#174D35] tabular-nums mt-0.5">
                          First 35 Days at ₹0
                        </div>
                        <div className="text-[11px] font-semibold text-[#4A5950] mt-0.5">
                          From verified store activation
                        </div>
                      </div>

                      {onOpenCommercialTerms && (
                        <button
                          type="button"
                          onClick={onOpenCommercialTerms}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/12 hover:bg-white/20 border border-white/25 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#FF9F43]" />
                          <span>View Commercial Terms</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Subtle corner glow on hover */}
                    <div
                      aria-hidden="true"
                      className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-[#E5F4E8]/0 group-hover:bg-[#E5F4E8]/70 blur-xl transition-colors duration-200 pointer-events-none"
                    />

                    <div className="relative">
                      <div className="flex items-center justify-between mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E5F4E8] to-[#FFF9EF] text-[#174D35] flex items-center justify-center shrink-0 border border-[#2F855A]/25 group-hover:scale-105 transition-transform duration-200">
                          <Icon className="w-5 h-5 text-[#174D35]" />
                        </div>
                        <span className="text-xs font-bold text-[#2F855A] tabular-nums">
                          {b.number} · {b.kicker}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-extrabold text-[#174D35] group-hover:text-[#2F855A] transition-colors">
                        {b.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#4A5950] mt-2 leading-relaxed">
                        {b.description}
                      </p>
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

