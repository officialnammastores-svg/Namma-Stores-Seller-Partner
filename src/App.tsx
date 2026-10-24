import React, { useState, useEffect, Suspense, lazy } from 'react';
import { MessageSquare } from 'lucide-react';
import { Navbar } from './components/Navbar.tsx';
import { Hero } from './components/Hero.tsx';
import { Benefits } from './components/Benefits.tsx';
import { EligibleCategories } from './components/EligibleCategories.tsx';
import { SellerProgrammes } from './components/SellerProgrammes.tsx';
import { HowOrdersWork } from './components/HowOrdersWork.tsx';
import { OnboardingSteps } from './components/OnboardingSteps.tsx';
import { SellerApplicationForm } from './components/SellerApplicationForm.tsx';
import { SellerFaq } from './components/SellerFaq.tsx';
import { Footer } from './components/Footer.tsx';
import { AnalyticsConsentBanner } from './components/AnalyticsConsentBanner.tsx';
import {
  getAnalyticsConsentDecision,
  setAnalyticsConsentDecision,
  trackMetaPageView,
  type AnalyticsConsentDecision,
} from './lib/metaPixel.ts';
import type { DisplayCategory } from './utils/rules.ts';
import type { ProgrammePreferenceOption } from './types/seller.ts';

const LegalModals = lazy(() =>
  import('./components/LegalModals.tsx').then((m) => ({
    default: m.LegalModals,
  }))
);

export default function App() {
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [preselectedCategory, setPreselectedCategory] = useState<
    DisplayCategory | ''
  >('');
  const [preselectedProgramme, setPreselectedProgramme] = useState<
    ProgrammePreferenceOption | ''
  >('');
  const [analyticsDecision, setAnalyticsDecision] =
    useState<AnalyticsConsentDecision>(() => getAnalyticsConsentDecision());
  const [analyticsPreferencesOpen, setAnalyticsPreferencesOpen] =
    useState(false);

  useEffect(() => {
    trackMetaPageView();
  }, []);

  const handleAcceptAnalytics = () => {
    const next = setAnalyticsConsentDecision('accepted');
    setAnalyticsDecision(next);
    setAnalyticsPreferencesOpen(false);
  };

  const handleRejectAnalytics = () => {
    const next = setAnalyticsConsentDecision('rejected');
    setAnalyticsDecision(next);
    setAnalyticsPreferencesOpen(false);
  };

  const scrollToForm = () => {
    const el = document.getElementById('apply-form');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToBenefits = () => {
    const el = document.getElementById('benefits');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToContact = () => {
    const el = document.getElementById('contact');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const showAnalyticsBanner =
    !privacyModalOpen &&
    !termsModalOpen &&
    (analyticsDecision === 'unset' || analyticsPreferencesOpen);

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9EF] text-[#202820] selection:bg-[#2F855A] selection:text-white overflow-x-clip">
      {/* Keyboard Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-[#174D35] focus:text-white focus:font-bold focus:text-xs focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* 1. Header with Official Brand Logo */}
      <Navbar
        onScrollToForm={scrollToForm}
        onScrollToContact={scrollToContact}
      />

      <main id="main-content" className="flex-1">
        {/* 2. Hero Section */}
        <Hero
          onApplyClick={scrollToForm}
          onExploreBenefitsClick={scrollToBenefits}
          onContactClick={scrollToContact}
        />

        {/* 3. Four Partner Benefits */}
        <Benefits onOpenCommercialTerms={() => setTermsModalOpen(true)} />

        {/* 4. Supported Retailers ("What do you sell?") */}
        <EligibleCategories
          selectedCategory={preselectedCategory}
          onSelectCategory={(category) => {
            setPreselectedCategory(category);
            scrollToForm();
          }}
        />

        {/* 5. Choose the Programme That Fits Your Business */}
        <SellerProgrammes
          onScrollToForm={scrollToForm}
          selectedProgramme={preselectedProgramme}
          onSelectProgramme={(programme) => {
            setPreselectedProgramme(programme);
            scrollToForm();
          }}
        />

        {/* 6. How Orders Work */}
        <HowOrdersWork />

        {/* 7. Onboarding Overview ("Getting started is simple") */}
        <OnboardingSteps />

        {/* 8. Seller Application Form */}
        <SellerApplicationForm
          onOpenPrivacyNotice={() => setPrivacyModalOpen(true)}
          onOpenCommercialTerms={() => setTermsModalOpen(true)}
          preselectedCategory={preselectedCategory}
          preselectedProgramme={preselectedProgramme}
        />

        {/* 9. Compact Seller FAQ Section */}
        <SellerFaq onOpenCommercialTerms={() => setTermsModalOpen(true)} />
      </main>

      {/* 10. Contact Information & Footer */}
      <Footer
        onOpenPrivacy={() => setPrivacyModalOpen(true)}
        onOpenTerms={() => setTermsModalOpen(true)}
        onOpenAnalyticsPreferences={() => setAnalyticsPreferencesOpen(true)}
      />

      {/* Legal Modals (Lazy-loaded on demand) */}
      {(privacyModalOpen || termsModalOpen) && (
        <Suspense fallback={null}>
          <LegalModals
            privacyOpen={privacyModalOpen}
            termsOpen={termsModalOpen}
            onClosePrivacy={() => setPrivacyModalOpen(false)}
            onCloseTerms={() => setTermsModalOpen(false)}
          />
        </Suspense>
      )}

      {/* Opt-In Analytics Consent Banner */}
      <AnalyticsConsentBanner
        decision={analyticsDecision}
        isOpen={showAnalyticsBanner}
        onAccept={handleAcceptAnalytics}
        onReject={handleRejectAnalytics}
        onClose={() => setAnalyticsPreferencesOpen(false)}
        onOpenPrivacy={() => setPrivacyModalOpen(true)}
      />

      {/* Floating WhatsApp Quick Contact Button with Expanding Wave Effect */}
      {!privacyModalOpen && !termsModalOpen && (
        <aside
          aria-label="Support chat"
          className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40"
        >
          <div className="relative inline-flex items-center justify-center">
            {/* Dual staggered expanding wave rings behind the button (desktop/tablet) */}
            <span
              aria-hidden="true"
              className="hidden sm:block animate-ns-chat-wave absolute inset-0 rounded-full bg-[#25D366]/45 pointer-events-none"
            />
            <span
              aria-hidden="true"
              className="hidden sm:block animate-ns-chat-wave-delayed absolute inset-0 rounded-full border-2 border-[#25D366]/55 pointer-events-none"
            />

            <a
              href="https://wa.me/919180567632"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat with Namma Stores on WhatsApp"
              className="relative z-10 group flex items-center justify-center gap-2.5 w-11 h-11 sm:w-auto sm:h-11 sm:px-4 sm:py-2.5 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full shadow-[0_6px_22px_rgba(37,211,102,0.45)] hover:shadow-[0_8px_28px_rgba(37,211,102,0.6)] transition-all duration-300 hover:scale-105"
            >
              <MessageSquare className="w-5 h-5 fill-white text-[#25D366] transition-transform duration-300 group-hover:rotate-[-6deg]" />
              <span className="hidden sm:inline text-xs font-bold tracking-wide">
                Chat with Us
              </span>
            </a>
          </div>
        </aside>
      )}
    </div>
  );
}
