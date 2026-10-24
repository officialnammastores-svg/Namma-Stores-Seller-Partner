import React, { useEffect } from 'react';
import { X, ShieldCheck, FileText } from 'lucide-react';

interface LegalModalsProps {
  privacyOpen: boolean;
  termsOpen: boolean;
  onClosePrivacy: () => void;
  onCloseTerms: () => void;
}

export const LegalModals: React.FC<LegalModalsProps> = ({
  privacyOpen,
  termsOpen,
  onClosePrivacy,
  onCloseTerms,
}) => {
  const isOpen = privacyOpen || termsOpen;
  const handleClose = privacyOpen ? onClosePrivacy : onCloseTerms;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0E261A]/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-[#174D35]/20 overflow-hidden animate-in fade-in duration-200"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-[#FFF9EF]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E5F4E8] text-[#174D35] flex items-center justify-center shrink-0 border border-[#2F855A]/20">
              {privacyOpen ? (
                <ShieldCheck className="w-5 h-5 text-[#174D35]" />
              ) : (
                <FileText className="w-5 h-5 text-[#174D35]" />
              )}
            </div>
            <div>
              <h3
                id="legal-modal-title"
                className="text-sm sm:text-base font-extrabold text-[#174D35]"
              >
                {privacyOpen
                  ? 'Namma Stores Partner Privacy Notice (v1.0)'
                  : 'Namma Stores Seller Partnership Terms (v1.0)'}
              </h3>
              <p className="text-[11px] text-[#4A5950]">
                Whitefield, Bengaluru Merchant Onboarding Summary
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={handleClose}
            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#202820] leading-relaxed">
          {privacyOpen ? (
            <>
              <p className="text-[11px] font-bold text-[#4A5950] uppercase tracking-wider">
                Last Updated: October 2026 | Whitefield, Bengaluru
              </p>
              <p>
                This Partner Privacy Notice explains how Namma Stores (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects, uses, and safeguards information provided by shop owners, merchants, and retail partners applying to join the Namma Stores marketplace in Whitefield, Bengaluru.
              </p>
              <h4 className="font-extrabold text-[#174D35] text-sm pt-1">
                1. Information We Collect
              </h4>
              <p>
                During initial interest expression on this public website, we collect your shop name, owner&apos;s full name, Indian mobile number, email address, complete shop address, optional Google Maps location link or GPS coordinates (only when you explicitly tap &ldquo;Use My Current Location&rdquo;), shop category, and optional programme or referral preferences. No documents need to be uploaded when submitting your initial application, and we do NOT collect Aadhaar documents or bank details through this public website form or by email. Required identity verification (including Aadhaar) and bank settlement details are collected only after your initial application has been reviewed and verified during formal Seller App onboarding.
              </p>
              <h4 className="font-extrabold text-[#174D35] text-sm pt-1">
                2. Purpose of Processing
              </h4>
              <p>
                Your contact and store location details are used strictly to: (a) assess merchant eligibility and delivery feasibility in Whitefield, Bengaluru and nearby supported neighbourhoods, (b) deliver an automated email confirmation acknowledging receipt of your submission, (c) contact you via your preferred contact method to verify your application and coordinate Seller App onboarding, and (d) prevent duplicate submissions.
              </p>
              <h4 className="font-extrabold text-[#174D35] text-sm pt-1">
                3. Data Isolation &amp; Security
              </h4>
              <p>
                All partner lead data is stored in dedicated databases protected by Row-Level Security (RLS) and strict server-side authorization. Your commercial details are never sold to external third parties or shared with competing neighbourhood merchants.
              </p>
              <h4 className="font-extrabold text-[#174D35] text-sm pt-1">
                4. Contacting Data Protection Team
              </h4>
              <p>
                For questions regarding partner information handling, email us at{' '}
                <a
                  href="mailto:official.nammastores@gmail.com"
                  className="text-[#174D35] font-bold underline underline-offset-2"
                >
                  official.nammastores@gmail.com
                </a>
                .
              </p>
            </>
          ) : (
            <>
              <p className="text-[11px] font-bold text-[#4A5950] uppercase tracking-wider">
                Last Updated: October 2026 | Whitefield, Bengaluru
              </p>
              <p>
                These Commercial Terms summarize the relationship between Namma Stores and verified merchant partners operating in Whitefield, Bengaluru and nearby supported neighbourhoods.
              </p>
              <h4 className="font-extrabold text-[#174D35] text-sm pt-1">
                1. Expression of Interest, Seller App Access &amp; Verification
              </h4>
              <p>
                Submitting this website application expresses interest only and does not automatically approve your shop or grant immediate Seller App access. Categories listed under &ldquo;Other or multiple categories&rdquo; undergo an additional onboarding eligibility review. After our team reviews and verifies your initial application, we coordinate your identity verification (including Aadhaar), bank settlement setup, and Namma Stores Seller App access before store activation.
              </p>
              <h4 className="font-extrabold text-[#174D35] text-sm pt-1">
                2. 35-Day Introductory Trial Offer (₹0 Platform Charges)
              </h4>
              <p>
                Approved sellers receive <strong>₹0 onboarding fee</strong> and <strong>₹0 Namma Stores platform participation charges for their first 35 days</strong>. The 35-day trial period begins on the date your verified store is activated live on the Namma Stores platform (not on the date you submit the online inquiry form). There is no lock-in obligation during or after the 35-day introductory period.
              </p>
              <h4 className="font-extrabold text-[#174D35] text-sm pt-1">
                3. Programme Models, Commissions &amp; Settlements
              </h4>
              <p>
                All customer orders on Namma Stores are prepaid online to the platform. Under <strong>Stores Near You</strong>, you manage eligible store listings and retail prices, and category-specific commission rates apply as shared in writing before activation. Under <strong>Namma Fresh</strong>, you supply eligible fresh products against confirmed orders for a fixed, pre-agreed supplier payout per item. Settlements for fulfilled orders are credited to your verified bank account on the agreed settlement schedule.
              </p>
              <h4 className="font-extrabold text-[#174D35] text-sm pt-1">
                4. Order Fulfilment &amp; Delivery Partner OTP Verification
              </h4>
              <p>
                Sellers are responsible for preparing and packing genuine, fresh, and unexpired items in accordance with applicable health, food safety (FSSAI), and quality standards within the Seller App acceptance window. Order collection is handled by authorised Namma Stores delivery partners upon verification of the digital pickup OTP at your shop. Direct customer self-pickup at the store is not supported.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-[#FFF9EF] flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2.5 bg-[#174D35] hover:bg-[#2F855A] text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

