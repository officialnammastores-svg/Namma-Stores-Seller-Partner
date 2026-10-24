import React from 'react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { type DisplayCategory } from '../utils/rules.ts';

interface EligibleCategoriesProps {
  onSelectCategory?: (category: DisplayCategory) => void;
  selectedCategory?: DisplayCategory | '';
}

interface CategoryItem {
  id: DisplayCategory;
  title: DisplayCategory;
  subtitle: string;
  includes: string;
  accentBg: string;
  accentBorder: string;
  renderIcon: () => React.ReactNode;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'Grocery',
    title: 'Grocery',
    subtitle: 'Kirana & Daily Essentials',
    includes:
      'Rice, atta, dals, cooking oils, spices, packaged snacks and household staples.',
    accentBg: 'bg-[#E5F4E8]',
    accentBorder: 'border-[#2F855A]/25',
    renderIcon: () => (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className="w-5 h-5 sm:w-6 sm:h-6"
        aria-hidden="true"
      >
        <path
          d="M11 20H37L34.5 39C34.2 40.7 32.8 42 31 42H17C15.2 42 13.8 40.7 13.5 39L11 20Z"
          fill="#E5F4E8"
          stroke="#174D35"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M17 20V15C17 11.134 20.134 8 24 8C27.866 8 31 11.134 31 15V20"
          stroke="#2F855A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <rect
          x="19"
          y="13"
          width="10"
          height="7"
          rx="1.5"
          fill="#FF9F43"
          stroke="#174D35"
          strokeWidth="2"
        />
        <path
          d="M18 27H30M19 33H29"
          stroke="#174D35"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'Chicken, meat and fish',
    title: 'Chicken, meat and fish',
    subtitle: 'Fresh Poultry, Mutton & Seafood',
    includes:
      'Fresh chicken cuts, mutton, fish fillets, prawns and marinades.',
    accentBg: 'bg-[#FFF4E3]',
    accentBorder: 'border-[#FF9F43]/35',
    renderIcon: () => (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className="w-5 h-5 sm:w-6 sm:h-6"
        aria-hidden="true"
      >
        <path
          d="M8 24C13 16 23 14 33 19C37 21 40 24 40 24C40 24 37 27 33 29C23 34 13 32 8 24Z"
          fill="#FFF4E3"
          stroke="#174D35"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M33 24L41 17V31L33 24Z"
          fill="#FF9F43"
          stroke="#174D35"
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        <circle cx="16.5" cy="22.5" r="2" fill="#174D35" />
        <path
          d="M22 19.5C20 22.5 20 25.5 22 28.5"
          stroke="#2F855A"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'Fruits and vegetables',
    title: 'Fruits and vegetables',
    subtitle: 'Farm-Fresh Produce & Greens',
    includes:
      'Seasonal fruits, leafy greens, root vegetables, herbs and sprouts.',
    accentBg: 'bg-[#E5F4E8]',
    accentBorder: 'border-[#2F855A]/25',
    renderIcon: () => (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className="w-5 h-5 sm:w-6 sm:h-6"
        aria-hidden="true"
      >
        <circle
          cx="21"
          cy="28"
          r="11"
          fill="#E5F4E8"
          stroke="#174D35"
          strokeWidth="2.5"
        />
        <path
          d="M21 17C21 13 24 10 27 10"
          stroke="#174D35"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M22 14C25 11 30 12 30 16C26 17 23 16 22 14Z"
          fill="#2F855A"
        />
        <path
          d="M30 20L38 36L25 32L30 20Z"
          fill="#FF9F43"
          stroke="#174D35"
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'Milk and dairy products',
    title: 'Milk and dairy products',
    subtitle: 'Daily Milk, Curd, Paneer & Ghee',
    includes:
      'Fresh milk, curd, paneer, butter, ghee, buttermilk and cheese.',
    accentBg: 'bg-[#FFF4E3]',
    accentBorder: 'border-[#FF9F43]/35',
    renderIcon: () => (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className="w-5 h-5 sm:w-6 sm:h-6"
        aria-hidden="true"
      >
        <path
          d="M17 10H27L29 17V37C29 39.2 27.2 41 25 41H19C16.8 41 15 39.2 15 37V17L17 10Z"
          fill="#FFF9EF"
          stroke="#174D35"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path
          d="M15 24H29V34H15V24Z"
          fill="#E5F4E8"
          stroke="#174D35"
          strokeWidth="2"
        />
        <path
          d="M16 10H28"
          stroke="#2F855A"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle
          cx="33"
          cy="33"
          r="6"
          fill="#FF9F43"
          stroke="#174D35"
          strokeWidth="2.2"
        />
      </svg>
    ),
  },
  {
    id: 'Puja items and flowers',
    title: 'Puja items and flowers',
    subtitle: 'Fresh Garlands, Flowers & Samagri',
    includes:
      'Jasmine and marigold garlands, loose flowers, agarbatti and camphor.',
    accentBg: 'bg-[#FFF4E3]',
    accentBorder: 'border-[#FF9F43]/35',
    renderIcon: () => (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className="w-5 h-5 sm:w-6 sm:h-6"
        aria-hidden="true"
      >
        <path
          d="M24 12C27 16 29 21 24 27C19 21 21 16 24 12Z"
          fill="#FF9F43"
          stroke="#174D35"
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        <path
          d="M14 19C18 19 22 22 23 27C17 27 14 23 14 19Z"
          fill="#E5F4E8"
          stroke="#174D35"
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        <path
          d="M34 19C30 19 26 22 25 27C31 27 34 23 34 19Z"
          fill="#E5F4E8"
          stroke="#174D35"
          strokeWidth="2.3"
          strokeLinejoin="round"
        />
        <path
          d="M12 29H36L32 38H16L12 29Z"
          fill="#FFF9EF"
          stroke="#174D35"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'Other or multiple categories',
    title: 'Other or multiple categories',
    subtitle: 'Bakery, Sweets, Quick Bites & Multi-Category (Eligibility Review)',
    includes:
      'Bakeries, sweet shops, quick-bite F&B outlets, supermarkets and multi-category stores (subject to onboarding eligibility review).',
    accentBg: 'bg-[#E5F4E8]',
    accentBorder: 'border-[#2F855A]/25',
    renderIcon: () => (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        className="w-5 h-5 sm:w-6 sm:h-6"
        aria-hidden="true"
      >
        <rect
          x="9"
          y="9"
          width="13"
          height="13"
          rx="3.5"
          fill="#E5F4E8"
          stroke="#174D35"
          strokeWidth="2.4"
        />
        <rect
          x="26"
          y="9"
          width="13"
          height="13"
          rx="3.5"
          fill="#FF9F43"
          stroke="#174D35"
          strokeWidth="2.4"
        />
        <rect
          x="9"
          y="26"
          width="13"
          height="13"
          rx="3.5"
          fill="#FFF4E3"
          stroke="#174D35"
          strokeWidth="2.4"
        />
        <rect
          x="26"
          y="26"
          width="13"
          height="13"
          rx="3.5"
          fill="#E5F4E8"
          stroke="#2F855A"
          strokeWidth="2.4"
        />
      </svg>
    ),
  },
];

export const EligibleCategories: React.FC<EligibleCategoriesProps> = ({
  onSelectCategory,
  selectedCategory,
}) => {
  return (
    <section
      id="categories"
      className="relative py-10 sm:py-14 bg-gradient-to-b from-[#FFF4E3]/60 via-[#FFF9EF] to-[#FFF4E3]/50 border-b border-[#174D35]/10 overflow-hidden"
    >
      <div className="relative z-10 max-w-6xl mx-auto px-3.5 sm:px-6">
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center space-y-1.5 mb-6 sm:mb-8">
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#2F855A]">
            Eligible Categories
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#174D35] tracking-tight text-balance">
            What do you sell?
          </h2>
          <p className="text-xs sm:text-sm text-[#4A5950] leading-relaxed">
            Select your primary store category below to pre-fill your seller application. Bakeries, sweet shops, quick-bite F&amp;B outlets, and multi-category stores can select &ldquo;Other or multiple categories&rdquo; for an onboarding eligibility review.
          </p>
        </div>

        {/* Compact, Lightweight Category Selector Grid (2-col on mobile/tablet, 3-col on desktop) */}
        <div className="ns-category-grid gap-2.5 sm:gap-3.5">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectCategory?.(cat.id)}
                className={`group text-left bg-white/95 hover:bg-white rounded-2xl p-3 sm:p-4 border transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#174D35] ${
                  isSelected
                    ? 'border-[#2F855A] ring-2 ring-[#2F855A]/25 bg-[#E5F4E8]/35 shadow-[0_8px_22px_-8px_rgba(23,77,53,0.16)]'
                    : 'border-[#174D35]/14 hover:border-[#2F855A]/45 shadow-[0_4px_14px_-6px_rgba(23,77,53,0.06)] hover:shadow-[0_10px_22px_-8px_rgba(23,77,53,0.12)]'
                }`}
              >
                {/* Top Row: Category Icon, Name, Short Subtitle, and Select Control */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${cat.accentBg} border ${cat.accentBorder} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105`}
                    >
                      {cat.renderIcon()}
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 min-h-[28px] rounded-lg border shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#174D35] text-white border-[#174D35]'
                          : 'text-[#174D35] bg-[#FFF9EF] group-hover:bg-[#E5F4E8] border-[#174D35]/15 group-hover:border-[#2F855A]/35'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-[#FF9F43] shrink-0" />
                          <span>Selected</span>
                        </>
                      ) : (
                        <>
                          <span>Select</span>
                          <ArrowUpRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
                        </>
                      )}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-[13px] sm:text-[15px] font-extrabold text-[#174D35] group-hover:text-[#2F855A] transition-colors leading-snug">
                      {cat.title}
                    </h3>
                    <p className="text-[11px] font-bold text-[#2F855A] leading-snug mt-0.5">
                      {cat.subtitle}
                    </p>
                  </div>
                </div>

                {/* Includes Row at the Bottom Separated by a Thin Divider */}
                <div className="mt-2.5 pt-2 border-t border-[#174D35]/10 text-[11px] leading-snug">
                  <span className="font-bold text-[#4A5950]">Includes: </span>
                  <span className="text-[#202820] font-medium">
                    {cat.includes}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
