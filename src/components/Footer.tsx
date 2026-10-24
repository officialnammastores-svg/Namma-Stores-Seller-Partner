import React from 'react';
import { Phone, Mail, MessageSquare, ArrowUpRight } from 'lucide-react';
import {
  SOCIAL_LINKS,
  InstagramIcon,
  FacebookIcon,
} from './Navbar.tsx';

interface FooterProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenPrivacy,
  onOpenTerms,
}) => {
  return (
    <footer
      id="contact"
      className="relative bg-[#0E261A] text-white pt-12 pb-24 sm:py-16 border-t border-[#174D35] overflow-hidden"
    >
      {/* Subtle Ambient Background Orbs in Footer */}
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
      >
        <div
          className="animate-ns-orb-2 absolute -top-28 right-10 w-80 h-80 rounded-full blur-2xl sm:blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(47, 133, 90, 0.22) 0%, rgba(14, 38, 26, 0) 72%)',
          }}
        />
        <div
          className="animate-ns-orb-1 absolute -bottom-28 left-10 w-72 h-72 rounded-full blur-2xl sm:blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(255, 159, 67, 0.12) 0%, rgba(14, 38, 26, 0) 72%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Contact Block Header */}
        <div className="text-center sm:text-left space-y-2">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#FF9F43]">
            Merchant Support
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Contact Namma Stores
          </h2>
          <p className="text-xs sm:text-sm text-white/70 max-w-lg">
            Have questions about partnering with us? Reach out directly to our merchant team in Whitefield, Bengaluru.
          </p>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Phone Clickable */}
          <a
            href="tel:+919180567632"
            className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 hover:border-[#2F855A]/50 flex items-center justify-between gap-3 transition-all duration-300 text-white group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2F855A]/30 border border-[#2F855A]/40 flex items-center justify-center text-[#34D399] shrink-0 transition-transform duration-300 group-hover:scale-105">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-white/60 block uppercase font-bold tracking-wider">
                  Phone / WhatsApp
                </span>
                <span className="ns-animated-underline inline-block text-sm font-bold text-white group-hover:text-[#34D399] transition-colors">
                  +91 9180567632
                </span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-white/40 group-hover:text-white transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          {/* Email Clickable */}
          <a
            href="mailto:official.nammastores@gmail.com"
            className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 hover:border-[#FF9F43]/45 flex items-center justify-between gap-3 transition-all duration-300 text-white group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43]"
          >
            <div className="flex items-center gap-3 truncate">
              <div className="w-10 h-10 rounded-xl bg-[#FF9F43]/20 border border-[#FF9F43]/30 flex items-center justify-center text-[#FF9F43] shrink-0 transition-transform duration-300 group-hover:scale-105">
                <Mail className="w-5 h-5" />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-white/60 block uppercase font-bold tracking-wider">
                  Merchant Relations
                </span>
                <span className="ns-animated-underline inline-block text-sm font-bold text-white truncate group-hover:text-[#FF9F43] transition-colors">
                  official.nammastores@gmail.com
                </span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-white/40 group-hover:text-white transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
          </a>
        </div>

        {/* WhatsApp Direct Chat Banner */}
        <div>
          <a
            href="https://wa.me/919180567632"
            target="_blank"
            rel="noopener noreferrer"
            className="animate-ns-whatsapp-glow w-full h-12 bg-[#2F855A] hover:bg-[#24724B] text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all duration-300 flex items-center justify-center gap-2.5 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43]"
          >
            <MessageSquare className="w-4 h-4 text-white" />
            <span>Chat Directly on WhatsApp (+91 9180567632)</span>
          </a>
        </div>

        {/* Follow Namma Stores Social Section (Near Contact Information & Footer) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#FF9F43]">
              Follow Namma Stores
            </h3>
            <p className="text-xs text-white/70 mt-0.5">
              Connect with us on social media for local partner updates in Whitefield, Bengaluru.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Namma Stores on Instagram"
              className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 hover:border-[#FF9F43]/50 text-xs font-bold text-white transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43]"
            >
              <InstagramIcon className="w-4 h-4 text-[#FF9F43] transition-transform duration-300 group-hover:scale-110" />
              <span>Instagram</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-white/50 group-hover:text-white transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>

            <a
              href={SOCIAL_LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Namma Stores on Facebook"
              className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 hover:border-[#34D399]/50 text-xs font-bold text-white transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43]"
            >
              <FacebookIcon className="w-4 h-4 text-[#34D399] transition-transform duration-300 group-hover:scale-110" />
              <span>Facebook</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-white/50 group-hover:text-white transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>

        {/* Legal Links & Brand Footnote */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="ns-animated-underline hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43] rounded-xs"
            >
              Partner Privacy Notice
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={onOpenTerms}
              className="ns-animated-underline hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43] rounded-xs"
            >
              Commercial Terms
            </button>
          </div>

          <div>© 2026 Namma Stores. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
};
