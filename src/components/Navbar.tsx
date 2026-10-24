import React, { useState, useEffect } from 'react';
import { Phone, MessageSquare, Menu, X } from 'lucide-react';
import navbarLogoImg from '../assets/images/regenerated_image_1792559378435.png';

interface NavbarProps {
  onScrollToForm: () => void;
  onScrollToContact: () => void;
}

export const OFFICIAL_WHATSAPP_SELLER_COMMUNITY_URL =
  import.meta.env.VITE_WHATSAPP_SELLER_COMMUNITY_URL ||
  'https://chat.whatsapp.com/REPLACE_WITH_OFFICIAL_SELLER_COMMUNITY_INVITE';

export const OFFICIAL_INSTAGRAM_URL =
  import.meta.env.VITE_INSTAGRAM_URL ||
  'https://www.instagram.com/namma.stores/';

export const SOCIAL_LINKS = {
  instagram: OFFICIAL_INSTAGRAM_URL,
  facebook: 'https://www.facebook.com/namma.store',
  whatsappSellerCommunity: OFFICIAL_WHATSAPP_SELLER_COMMUNITY_URL,
} as const;

export const InstagramIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const FacebookIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({
  onScrollToForm,
  onScrollToContact,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const next = window.scrollY > 16;
      setIsScrolled((prev) => (prev === next ? prev : next));
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#FFF9EF]/95 backdrop-blur-xl border-b border-[#174D35]/14 shadow-[0_8px_28px_-6px_rgba(23,77,53,0.08)]'
          : 'bg-[#FFF9EF]/85 backdrop-blur-md border-b border-[#174D35]/10 shadow-[0_2px_12px_rgba(23,77,53,0.02)]'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-2 sm:gap-3 lg:gap-4">
        {/* Official Namma Stores Logo Lockup */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setMobileMenuOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2 sm:gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174D35] rounded-lg shrink-0"
        >
          <img
            src={navbarLogoImg}
            alt="Namma Stores — Your local stores, Now online"
            width={147}
            height={52}
            fetchPriority="high"
            decoding="async"
            className="h-9 sm:h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <span
            aria-hidden="true"
            className="hidden lg:inline-block h-5 w-px bg-[#174D35]/15 shrink-0"
          />
          <span className="hidden lg:inline-block text-xs font-extrabold tracking-wide uppercase text-[#174D35] whitespace-nowrap shrink-0">
            Seller Partner
          </span>
        </a>

        {/* Desktop Quick Nav Links with Animated Underline & Non-Wrapping Items */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-3.5 lg:gap-5 text-xs lg:text-sm font-bold text-[#3D4C42] shrink-0"
        >
          <button
            type="button"
            onClick={() => scrollToSection('benefits')}
            className="ns-animated-underline py-1 hover:text-[#174D35] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Benefits
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('categories')}
            className="ns-animated-underline py-1 hover:text-[#174D35] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Categories
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('programmes')}
            className="ns-animated-underline py-1 hover:text-[#174D35] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Programmes
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('how-it-works')}
            className="ns-animated-underline py-1 hover:text-[#174D35] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('faq')}
            className="ns-animated-underline py-1 hover:text-[#174D35] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            FAQ
          </button>
          <button
            type="button"
            onClick={onScrollToContact}
            className="ns-animated-underline py-1 hover:text-[#174D35] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Contact
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Official Instagram & Facebook Icon Links in Desktop Navbar */}
          <div className="hidden xl:flex items-center gap-1.5 pr-1 border-r border-[#174D35]/12">
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Namma Stores on Instagram"
              title="Namma Stores on Instagram"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#174D35]/85 hover:text-[#174D35] bg-[#FFF9EF]/60 hover:bg-[#E5F4E8] border border-[#174D35]/12 hover:border-[#2F855A]/35 transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174D35]"
            >
              <InstagramIcon className="w-4 h-4" />
            </a>
            <a
              href={SOCIAL_LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Namma Stores on Facebook"
              title="Namma Stores on Facebook"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#174D35]/85 hover:text-[#174D35] bg-[#FFF9EF]/60 hover:bg-[#E5F4E8] border border-[#174D35]/12 hover:border-[#2F855A]/35 transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174D35]"
            >
              <FacebookIcon className="w-4 h-4" />
            </a>
          </div>

          {/* Direct WhatsApp Contact Button with Subtle Breathing Glow */}
          <a
            href="https://wa.me/919180567632"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className="animate-ns-whatsapp-glow group hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#174D35] bg-[#E5F4E8]/90 hover:bg-[#E5F4E8] border border-[#2F855A]/35 hover:border-[#2F855A]/60 rounded-lg transition-all duration-200 hover:-translate-y-0.5 whitespace-nowrap shrink-0"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#2F855A] transition-transform duration-200 group-hover:scale-110 shrink-0" />
            <span>WhatsApp</span>
          </a>

          {/* Phone Contact Link with Animated Underline */}
          <a
            href="tel:+919180567632"
            className="ns-animated-underline hidden lg:inline-flex items-center gap-1.5 px-1.5 py-1 text-xs font-semibold text-[#3D4C42] hover:text-[#174D35] transition-colors whitespace-nowrap shrink-0 tabular-nums"
          >
            <Phone className="w-3.5 h-3.5 text-[#2F855A] shrink-0" />
            <span>+91 9180567632</span>
          </a>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onScrollToForm();
            }}
            className="min-h-[42px] sm:min-h-[44px] px-3.5 sm:px-4 lg:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white bg-[#174D35] hover:bg-[#2F855A] active:scale-[0.98] rounded-xl shadow-[0_4px_14px_rgba(23,77,53,0.25)] hover:shadow-[0_6px_20px_rgba(47,133,90,0.32)] transition-all duration-300 cursor-pointer whitespace-nowrap shrink-0 flex items-center justify-center"
          >
            Become a Seller
          </button>

          {/* Mobile Navigation Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-menu"
            aria-label={
              mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'
            }
            className="md:hidden w-11 h-11 rounded-xl border border-[#174D35]/15 bg-white/80 hover:bg-[#E5F4E8]/70 text-[#174D35] flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174D35] cursor-pointer shrink-0"
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer (Contains Nav Links & Official Social Links on Mobile) */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-menu"
          className="md:hidden bg-[#FFF9EF]/98 backdrop-blur-xl border-b border-[#174D35]/15 px-4 pt-3 pb-5 space-y-4 shadow-lg"
        >
          <nav
            aria-label="Mobile navigation"
            className="grid grid-cols-2 gap-2 text-xs font-bold text-[#174D35]"
          >
            <button
              type="button"
              onClick={() => scrollToSection('benefits')}
              className="text-left px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#174D35]/12 hover:border-[#2F855A]/40 transition-colors cursor-pointer"
            >
              Benefits
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('categories')}
              className="text-left px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#174D35]/12 hover:border-[#2F855A]/40 transition-colors cursor-pointer"
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('programmes')}
              className="text-left px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#174D35]/12 hover:border-[#2F855A]/40 transition-colors cursor-pointer"
            >
              Programmes
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="text-left px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#174D35]/12 hover:border-[#2F855A]/40 transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="text-left px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#174D35]/12 hover:border-[#2F855A]/40 transition-colors cursor-pointer"
            >
              Seller FAQ
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onScrollToContact();
              }}
              className="text-left px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#174D35]/12 hover:border-[#2F855A]/40 transition-colors cursor-pointer"
            >
              Contact
            </button>
          </nav>

          {/* Mobile Social & Direct Contact Row */}
          <div className="pt-3 border-t border-[#174D35]/10 flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A5950]">
              Follow Namma Stores
            </span>
            <div className="flex items-center gap-2">
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Namma Stores on Instagram"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#174D35]/15 text-xs font-bold text-[#174D35] hover:bg-[#E5F4E8] transition-colors"
              >
                <InstagramIcon className="w-3.5 h-3.5 text-[#2F855A]" />
                <span>Instagram</span>
              </a>
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Namma Stores on Facebook"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#174D35]/15 text-xs font-bold text-[#174D35] hover:bg-[#E5F4E8] transition-colors"
              >
                <FacebookIcon className="w-3.5 h-3.5 text-[#2F855A]" />
                <span>Facebook</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
