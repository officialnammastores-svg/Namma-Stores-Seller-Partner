import React, { useState } from 'react';
import { ChevronDown, HelpCircle, ShieldCheck, ArrowRight, FileText } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  badge?: string;
}

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: 'eligibility',
    question: 'Who is eligible to become a Namma Stores Seller Partner?',
    answer: `Active physical retail shops and verified food & beverage (F&B) / fresh-produce suppliers operating in Whitefield, Bengaluru, and nearby supported neighbourhoods can apply.

Eligible categories include:
- Grocery & Kirana
- Fruits & Vegetables
- Restaurants & Quick Bites
- Bakery & Sweets
- Meat, Fish & Poultry

In the application form, you can select from our six store categories: Grocery, Chicken, meat and fish, Fruits and vegetables, Milk and dairy products, Puja items and flowers, or "Other or multiple categories" (for Bakery & Sweets, Restaurants & Quick Bites, or multi-category stores, which undergo an onboarding eligibility review by our team).`,
    badge: 'Eligibility',
  },
  {
    id: 'review-approval',
    question: 'How does application review and store approval work?',
    answer:
      'After you submit the online application, our onboarding team reviews your store details, category, and location within 1–2 business days. Submitting an application does not automatically approve your seller account or grant immediate Seller App access—our team contacts you via phone or WhatsApp to verify your shop address, category eligibility, and operational readiness first.',
    badge: 'Verification',
  },
  {
    id: 'required-documents',
    question: 'What documents are required during seller onboarding?',
    answer:
      'No documents need to be uploaded when you submit your initial application on this website. Our Namma Stores team will review and verify your application first. Once your application is verified, our onboarding team will guide you through Seller App access, identity verification (including your Aadhaar document), and bank account setup for seller settlements before your store goes live.',
    badge: 'Documents',
  },
  {
    id: 'programmes-difference',
    question: 'What is the difference between "Stores Near You" and "Namma Fresh"?',
    answer:
      '"Stores Near You" gives your store a dedicated digital storefront on Namma Stores where customers browse your shop by name, while you control eligible item pricing and active stock under agreed terms. "Namma Fresh" is a direct supply model for fresh produce, meat, poultry, and daily essentials where you supply quality-checked stock against confirmed orders at agreed supplier payouts. If you are unsure, you can select "Not sure yet" and decide with our team during onboarding.',
    badge: 'Programmes',
  },
  {
    id: 'introductory-offer',
    question: 'How does the 35-day introductory ₹0 platform fee offer work?',
    answer:
      'Approved sellers receive ₹0 onboarding fee and ₹0 Namma Stores platform participation charges for their first 35 days. Importantly, the 35-day period starts only after your store is verified, approved, and activated live on the platform—not when you submit the application form. There is no lock-in commitment during or after the trial.',
    badge: '35-Day Offer',
  },
  {
    id: 'commissions-payouts',
    question: 'How do commissions, supplier payouts, and post-trial charges work?',
    answer:
      'Before your store goes live, our onboarding team shares a clear written commercial schedule tailored to your category and chosen programme ("Stores Near You" commission rates or "Namma Fresh" fixed supplier payouts, along with standard settlement cycles). After your first 35 days of ₹0 platform participation charges, the mutually agreed commercial terms apply.',
    badge: 'Commercials',
  },
  {
    id: 'delivery-collection',
    question: 'How does order collection and local delivery work?',
    answer:
      'When an order is confirmed in the Seller App, your staff packs and seals the items at your shop. A Namma Stores delivery partner visits your store to collect the package and verifies handover using a digital pickup OTP in the Seller App before delivering it to the customer. You do not need to hire your own delivery fleet.',
    badge: 'Fulfilment',
  },
  {
    id: 'seller-app-orders',
    question: 'How do I access the Seller App and start receiving orders?',
    answer:
      'Onboarding follows a structured sequence: (1) Submit your initial application without uploading documents. (2) Namma Stores reviews and verifies your application and category eligibility. (3) Once verified, our onboarding team coordinates your identity verification (including Aadhaar), bank settlement details, and Seller App credentials. (4) After verification and catalogue setup are complete, your store is activated live to receive customer orders.',
    badge: 'Seller App',
  },
];

export function toggleFaqItem(
  currentOpenId: string | null,
  targetId: string
): string | null {
  return currentOpenId === targetId ? null : targetId;
}

interface SellerFaqProps {
  onOpenCommercialTerms?: () => void;
  openId?: string | null;
  onOpenIdChange?: (nextOpenId: string | null) => void;
}

export function SellerFaq({
  onOpenCommercialTerms,
  openId: controlledOpenId,
  onOpenIdChange,
}: SellerFaqProps) {
  const [uncontrolledOpenId, setUncontrolledOpenId] = useState<string | null>(
    null
  );
  const openId =
    controlledOpenId !== undefined ? controlledOpenId : uncontrolledOpenId;

  const toggleItem = (id: string) => {
    const next = toggleFaqItem(openId, id);
    if (controlledOpenId === undefined) {
      setUncontrolledOpenId(next);
    }
    onOpenIdChange?.(next);
  };

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="py-16 md:py-20 bg-[#FFF9EF] border-t border-[#E6DFD3]"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#EAF4EE] text-[#174D35] text-xs font-bold uppercase tracking-wider mb-3 border border-[#C6E2D2]">
            <HelpCircle className="w-3.5 h-3.5 text-[#2F855A]" />
            Seller Partner FAQ
          </div>
          <h2
            id="faq-heading"
            className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1E2A22] tracking-tight font-display"
          >
            Common Questions Before You Apply
          </h2>
          <p className="mt-3 text-base text-[#4A5950] leading-relaxed">
            Clear, upfront answers on eligibility in Whitefield, Bengaluru, Seller App document verification, the 35-day introductory trial, and daily store operations.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openId === item.id;
            const panelId = `faq-panel-${item.id}`;
            const buttonId = `faq-button-${item.id}`;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-all duration-200 ${
                  isOpen
                    ? 'bg-white border-[#2F855A] shadow-md shadow-[#174D35]/5'
                    : 'bg-white/90 border-[#E6DFD3] hover:border-[#C6E2D2]'
                }`}
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleItem(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleItem(item.id);
                      }
                    }}
                    className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 sm:px-6 sm:py-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F855A] focus-visible:ring-offset-2 rounded-2xl cursor-pointer"
                  >
                    <div className="flex flex-wrap items-center gap-2.5 pr-2">
                      {item.badge && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#EAF4EE] text-[#174D35] border border-[#C6E2D2]">
                          {item.badge}
                        </span>
                      )}
                      <span className="text-base sm:text-lg font-bold text-[#1E2A22] font-display">
                        {item.question}
                      </span>
                    </div>
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${
                        isOpen
                          ? 'bg-[#174D35] text-white rotate-180'
                          : 'bg-[#F5EFE4] text-[#174D35]'
                      }`}
                      aria-hidden="true"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>
                </h3>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                  className={isOpen ? 'px-5 pb-5 sm:px-6 sm:pb-6 pt-0' : 'hidden'}
                >
                  <div className="pt-2 border-t border-[#F0EAE1] text-sm sm:text-base text-[#3D4C42] leading-relaxed whitespace-pre-line">
                    {item.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-white rounded-2xl border border-[#E6DFD3] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EAF4EE] text-[#174D35] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5 text-[#2F855A]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1E2A22] font-display">
                Want to review full commercial terms or speak with our team?
              </h3>
              <p className="text-sm text-[#4A5950] mt-0.5">
                Read our transparent onboarding summary or reach out directly on WhatsApp at{' '}
                <a
                  href="tel:+919180567632"
                  className="font-semibold text-[#174D35] underline underline-offset-2 hover:text-[#2F855A]"
                >
                  +91 9180567632
                </a>
                .
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0">
            {onOpenCommercialTerms && (
              <button
                type="button"
                onClick={onOpenCommercialTerms}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#D5CEC2] bg-[#FFF9EF] hover:bg-[#F5EFE4] text-[#1E2A22] text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#174D35]" />
                Commercial Terms
              </button>
            )}
            <a
              href="#apply-form"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#174D35] hover:bg-[#123c29] text-white text-xs sm:text-sm font-bold transition-colors shadow-sm"
            >
              Apply Now
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
