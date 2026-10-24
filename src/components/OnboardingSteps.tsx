import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ClipboardList, PhoneCall, Smartphone, ArrowRight } from 'lucide-react';
import stepSellerAppIconImg from '../assets/images/regenerated_image_1792560062398.png';

const STEPS = [
  {
    step: '1',
    numberBadgeColor: 'bg-[#174D35]',
    title: 'Submit your shop details.',
    description:
      'Fill in the short form below with your shop name, contact number, category, and address. No documents need to be uploaded at this stage.',
    icon: ClipboardList,
    highlight: 'Quick online form',
  },
  {
    step: '2',
    numberBadgeColor: 'bg-[#2F855A]',
    title: 'Application review & verification.',
    description:
      'Our team reviews your application, contacts you to verify your shop details, and walks you through the programme and commercial terms.',
    icon: PhoneCall,
    highlight: 'Personal verification',
  },
  {
    step: '3',
    numberBadgeColor: 'bg-[#174D35]',
    title: 'Receive Seller App access.',
    description:
      'Once your application is verified, complete identity (Aadhaar) and bank settlement verification with our onboarding team and receive your Seller App access.',
    icon: Smartphone,
    highlight: 'Seller App onboarding',
    showAppIcon: true,
  },
];

export const OnboardingSteps: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="how-it-works"
      className="relative py-16 sm:py-22 bg-[#E5F4E8]/45 border-b border-[#2F855A]/15 overflow-hidden"
    >
      {/* Ambient Animated Orbs Behind Steps */}
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
      >
        <div
          className="animate-ns-orb-1 absolute -top-20 left-1/4 w-[24rem] sm:w-[32rem] h-[24rem] sm:h-[32rem] rounded-full blur-2xl sm:blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(255, 249, 239, 0.85) 0%, rgba(47, 133, 90, 0.14) 52%, rgba(229, 244, 232, 0) 75%)',
          }}
        />
        <div
          className="animate-ns-orb-2 absolute -bottom-24 right-1/4 w-[22rem] sm:w-[30rem] h-[22rem] sm:h-[30rem] rounded-full blur-2xl sm:blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(255, 159, 67, 0.15) 0%, rgba(229, 244, 232, 0.5) 50%, rgba(229, 244, 232, 0) 75%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-xl mx-auto mb-10 sm:mb-14"
        >
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#174D35]">
            Onboarding Workflow
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#174D35] mt-2 tracking-tight text-balance">
            Getting started is simple
          </h2>
          <p className="text-xs sm:text-sm text-[#3D4C42] mt-2.5 leading-relaxed">
            From initial expression of interest to store verification and receiving your Seller App credentials.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 relative">
          {/* Desktop connecting line with animated light pulse beam */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-[#174D35]/12 overflow-hidden rounded-full pointer-events-none"
          >
            <div className="animate-ns-step-beam w-1/2 h-full bg-gradient-to-r from-transparent via-[#FF9F43] to-[#2F855A]" />
          </div>

          {STEPS.map((s, index) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.step}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.45,
                  delay: shouldReduceMotion ? 0 : index * 0.09,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="group relative p-6 sm:p-7 bg-white/95 backdrop-blur-xs rounded-2xl border border-[#174D35]/12 hover:border-[#2F855A]/45 shadow-soft-card hover:shadow-elevated transition-all duration-200 flex flex-col justify-between hover:-translate-y-0.5 overflow-hidden"
              >
                <div>
                  {/* Top Bar with Step Number and Icon */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-8 h-8 rounded-full ${s.numberBadgeColor} text-white font-extrabold text-xs tabular-nums flex items-center justify-center shadow-xs`}
                      >
                        0{s.step}
                      </span>
                      <span className="text-xs font-bold text-[#4A5950] tabular-nums">
                        Step 0{s.step}
                      </span>
                    </div>

                    {s.showAppIcon ? (
                      <img
                        src={stepSellerAppIconImg}
                        alt="Namma Stores Seller App"
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                        className="w-10 h-10 object-contain shrink-0 transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#FFF9EF] border border-[#174D35]/12 flex items-center justify-center text-[#174D35] transition-transform duration-200 group-hover:scale-105">
                        <Icon className="w-5 h-5 text-[#2F855A]" />
                      </div>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-extrabold text-[#174D35] leading-snug">
                    {s.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4A5950] mt-2 leading-relaxed">
                    {s.description}
                  </p>
                </div>

                {/* Bottom Highlight */}
                <div className="mt-5 pt-3.5 border-t border-[#174D35]/10 flex items-center justify-between text-xs font-bold text-[#2F855A]">
                  <span>{s.highlight}</span>

                  {index < 2 && (
                    <span className="text-xs text-[#4A5950] hidden md:inline-flex items-center gap-1 font-medium group-hover:text-[#174D35] transition-colors">
                      Next{' '}
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
