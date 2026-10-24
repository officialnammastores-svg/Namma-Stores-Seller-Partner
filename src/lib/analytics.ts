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

import { trackMetaPageView } from './metaPixel.ts';

export {
  DEFAULT_META_PIXEL_ID,
  META_PIXEL_SCRIPT_ID,
  META_PIXEL_SCRIPT_SRC,
  ANALYTICS_CONSENT_STORAGE_KEY,
  resolveMetaPixelId,
  getAnalyticsConsentDecision,
  setAnalyticsConsentDecision,
  isMetaPixelConsentGranted,
  initMetaPixel,
  trackMetaPageView,
  trackMetaSellerLead,
  buildSellerLeadPixelParams,
  type AnalyticsConsentDecision,
} from './metaPixel.ts';

export function trackEvent(
  name: AnalyticsEventName,
  properties: Record<string, unknown> = {}
) {
  // Log in development for auditability (never sent to external third parties)
  try {
    const isDev = Boolean(
      (import.meta as unknown as { env?: { DEV?: boolean } })?.env?.DEV
    );
    if (isDev) {
      console.debug(`[Analytics Event: ${name}]`, properties);
    }
  } catch {
    // Ignore outside Vite
  }

  if (name === 'landing_page_view') {
    trackMetaPageView();
  }
}

