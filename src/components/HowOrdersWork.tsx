import React from 'react';
import {
  Bell,
  Clock,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

interface OrderStep {
  number: string;
  title: string;
  body: string;
  isUrgentWindow?: boolean;
  delaySeconds: number;
  icon: React.ReactNode;
}

const ORDER_STEPS: OrderStep[] = [
  {
    number: '01',
    title: 'Receive Order',
    body: 'Get notified when a customer places an order.',
    delaySeconds: 0,
    icon: <Bell className="w-4 h-4" aria-hidden="true" />,
  },
  {
    number: '02',
    title: 'Accept Within 120 Seconds',
    body: 'Accept or decline the order within 120 seconds.',
    isUrgentWindow: true,
    delaySeconds: 1.5,
    icon: <Clock className="w-4 h-4" aria-hidden="true" />,
  },
  {
    number: '03',
    title: 'Prepare & Pack',
    body: 'Prepare the items and pack the order carefully.',
    delaySeconds: 3.0,
    icon: <PackageCheck className="w-4 h-4" aria-hidden="true" />,
  },
  {
    number: '04',
    title: 'Update Order Status',
    body: 'Update the order status correctly as instructed by Namma Stores.',
    delaySeconds: 4.5,
    icon: <RefreshCw className="w-4 h-4" aria-hidden="true" />,
  },
  {
    number: '05',
    title: 'Handover With OTP',
    body: 'When our delivery partner arrives at your shop, verify the digital pickup OTP in the Seller App to complete handover.',
    delaySeconds: 6.0,
    icon: <ShieldCheck className="w-4 h-4" aria-hidden="true" />,
  },
];

export const HowOrdersWork: React.FC = () => {
  return (
    <section
      id="how-orders-work"
      className="relative py-10 sm:py-14 bg-gradient-to-b from-[#FFF4E3]/45 via-[#FFF9EF] to-[#FFF4E3]/45 border-b border-[#174D35]/10 overflow-hidden"
    >
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center space-y-1.5 mb-7 sm:mb-9">
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#2F855A]">
            Store Order Flow
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#174D35] tracking-tight text-balance">
            How Orders Work
          </h2>
          <p className="text-xs sm:text-sm text-[#4A5950] leading-relaxed">
            Five simple steps inside the Seller App—from instant order notification to OTP-verified delivery partner pickup at your shop.
          </p>
        </div>

        {/* 5-Step Process Container with Subtle Running Flow Animation */}
        <div className="relative">
          {/* Desktop Horizontal Connecting Track & Running Flow Indicator (Step 1 -> Step 5) */}
          <div
            aria-hidden="true"
            className="hidden lg:block absolute top-8 left-[8%] right-[8%] h-0.5 bg-[#174D35]/14 rounded-full overflow-hidden pointer-events-none z-0"
          >
            <span className="animate-ns-order-flow-h absolute top-0 h-full w-14 rounded-full bg-gradient-to-r from-transparent via-[#2F855A] to-[#FF9F43]" />
          </div>

          {/* Mobile Vertical Connecting Track & Running Flow Indicator (Top -> Bottom) */}
          <div
            aria-hidden="true"
            className="lg:hidden absolute top-6 bottom-6 left-6 w-0.5 bg-[#174D35]/14 rounded-full overflow-hidden pointer-events-none z-0"
          >
            <span className="animate-ns-order-flow-v absolute left-0 w-full h-12 rounded-full bg-gradient-to-b from-transparent via-[#2F855A] to-[#FF9F43]" />
          </div>

          {/* 5 Step Cards */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-3.5">
            {ORDER_STEPS.map((step) => {
              const isHighlighted = Boolean(step.isUrgentWindow);
              return (
                <div
                  key={step.number}
                  style={{ animationDelay: `${step.delaySeconds}s` }}
                  className={`rounded-2xl p-3.5 sm:p-4 border transition-colors ${
                    isHighlighted
                      ? 'animate-ns-order-card-urgent bg-gradient-to-b from-[#FFF4E3]/95 to-white border-[#FF9F43]/55'
                      : 'animate-ns-order-card bg-white/95 border-[#174D35]/12'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Top Row: Step Number & Simple Icon */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-extrabold tracking-wider tabular-nums ${
                          isHighlighted
                            ? 'bg-[#FF9F43] text-[#174D35]'
                            : 'bg-[#174D35] text-white'
                        }`}
                      >
                        STEP {step.number}
                      </span>

                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          isHighlighted
                            ? 'bg-[#FFF4E3] text-[#D96B00] border-[#FF9F43]/45'
                            : 'bg-[#E5F4E8]/85 text-[#174D35] border-[#2F855A]/25'
                        }`}
                      >
                        {step.icon}
                      </div>
                    </div>

                    {/* Short Heading */}
                    <h3
                      className={`text-sm font-extrabold leading-snug ${
                        isHighlighted ? 'text-[#174D35]' : 'text-[#174D35]'
                      }`}
                    >
                      {step.title}
                    </h3>

                    {/* One Concise Description */}
                    <p className="text-xs text-[#202820] leading-relaxed">
                      {isHighlighted ? (
                        <>
                          Accept or decline the order within{' '}
                          <span className="font-bold text-[#B85400] bg-[#FFF4E3] px-1.5 py-0.5 rounded border border-[#FF9F43]/45">
                            120 seconds
                          </span>
                          .
                        </>
                      ) : (
                        step.body
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
