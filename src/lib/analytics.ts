/**
 * Analytics and Meta Ads readiness helper.
 * Tracks user acquisition journey without sending PII.
 * Operates gracefully with tracking disabled until production IDs and consent are configured.
 */

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export function extractUTMParams(): UTMParams {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const utm: UTMParams = {};

  const keys: (keyof UTMParams)[] = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
  ];

  for (const key of keys) {
    const val = params.get(key);
    if (val) {
      utm[key] = val;
    }
  }

  // Also check sessionStorage to preserve UTM across navigation
  try {
    const stored = sessionStorage.getItem('namma_seller_utm');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...parsed, ...utm };
    } else if (Object.keys(utm).length > 0) {
      sessionStorage.setItem('namma_seller_utm', JSON.stringify(utm));
    }
  } catch {
    // Ignore storage errors
  }

  return utm;
}

export type AnalyticsEventName =
  | 'landing_page_view'
  | 'cta_click'
  | 'form_start'
  | 'form_submit_attempt'
  | 'application_submitted_success'
  | 'program_toggle'
  | 'calculator_interact'
  | 'admin_status_change';

export function trackEvent(name: AnalyticsEventName, properties: Record<string, unknown> = {}) {
  // Respect user consent and configuration
  const enableAnalytics = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
  const metaPixelId = import.meta.env.VITE_META_PIXEL_ID;

  // Log in development for auditability
  if (import.meta.env.DEV) {
    console.debug(`[Analytics Event: ${name}]`, properties);
  }

  if (!enableAnalytics || !metaPixelId) {
    return;
  }

  // Meta Pixel standard and custom events (if fbq is loaded on the page)
  const win = window as unknown as { fbq?: (...args: unknown[]) => void };
  if (typeof win.fbq === 'function') {
    switch (name) {
      case 'landing_page_view':
        win.fbq('track', 'PageView');
        break;
      case 'application_submitted_success':
        win.fbq('track', 'Lead', {
          program: properties.program,
          category_count: properties.category_count,
        });
        break;
      case 'cta_click':
        win.fbq('trackCustom', 'SellerCtaClick', properties);
        break;
      case 'form_start':
        win.fbq('trackCustom', 'SellerFormStart', properties);
        break;
      default:
        win.fbq('trackCustom', name, properties);
        break;
    }
  }
}
