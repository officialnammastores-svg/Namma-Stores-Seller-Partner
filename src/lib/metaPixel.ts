/**
 * Official Meta Pixel browser integration for Namma Stores Seller Partner.
 *
 * - Reuses the existing Namma Stores Website Pixel ID: 3507843232726532
 * - Opt-in consent model: defaults to NO tracking until user explicitly clicks "Accept Analytics"
 * - Persists consent decision in localStorage ('namma_analytics_consent': 'accepted' | 'rejected')
 * - Does NOT treat the seller application form privacy checkbox as analytics consent
 * - Idempotent initialization and PageView tracking (safe under React Strict Mode & rerenders)
 * - Fires standard 'Lead' event ONLY after a confirmed NEW seller application is saved AND consent is accepted
 * - Strictly non-PII: sends only `{ lead_type: 'seller_application' }` with Lead events
 * - Never enables automatic advanced matching or Conversions API
 */

export const DEFAULT_META_PIXEL_ID = '3507843232726532';
export const META_PIXEL_SCRIPT_ID = 'namma-stores-meta-pixel-script';
export const META_PIXEL_SCRIPT_SRC =
  'https://connect.facebook.net/en_US/fbevents.js';
export const ANALYTICS_CONSENT_STORAGE_KEY = 'namma_analytics_consent';

export type AnalyticsConsentDecision = 'accepted' | 'rejected' | 'unset';

export type FbqFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  push?: unknown;
  loaded?: boolean;
  version?: string;
};

export interface MetaPixelWindow {
  fbq?: FbqFunction;
  _fbq?: FbqFunction;
  __NAMMA_META_PIXEL_INITIALIZED_IDS__?: Set<string>;
  __NAMMA_META_PIXEL_PAGEVIEWS__?: Set<string>;
  __NAMMA_META_PIXEL_TRACKED_LEADS__?: Set<string>;
  __NAMMA_ANALYTICS_CONSENT__?: boolean;
  localStorage?: Pick<Storage, 'getItem'> & Partial<Pick<Storage, 'setItem'>>;
  location?: {
    pathname?: string;
    search?: string;
  };
}

export interface MetaPixelEnv {
  VITE_META_PIXEL_ID?: string;
  VITE_ENABLE_ANALYTICS?: string;
  [key: string]: unknown;
}

export interface MetaPixelOptions {
  pixelId?: string;
  win?: MetaPixelWindow;
  doc?: Document;
  env?: MetaPixelEnv;
}

export interface SellerLeadTrackingInput {
  ok?: boolean;
  success?: boolean;
  error?: string | null;
  lead_id?: string | null;
  duplicate?: boolean;
  is_duplicate?: boolean;
  [key: string]: unknown;
}

function getBuildTimeEnv(): MetaPixelEnv {
  const result: MetaPixelEnv = {};
  try {
    // Direct property access so Vite statically replaces these at build time
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      if (typeof import.meta.env.VITE_META_PIXEL_ID === 'string') {
        result.VITE_META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;
      }
      if (typeof import.meta.env.VITE_ENABLE_ANALYTICS === 'string') {
        result.VITE_ENABLE_ANALYTICS = import.meta.env.VITE_ENABLE_ANALYTICS;
      }
    }
  } catch {
    // Ignore outside Vite bundler
  }
  return result;
}

function getDefaultWindow(): MetaPixelWindow | undefined {
  if (typeof window !== 'undefined') {
    return window as unknown as MetaPixelWindow;
  }
  return undefined;
}

function getDefaultDocument(): Document | undefined {
  if (typeof document !== 'undefined') {
    return document;
  }
  return undefined;
}

/**
 * Resolves the active Meta Pixel ID from Vite build-time configuration
 * (`import.meta.env.VITE_META_PIXEL_ID`) or falls back to the existing
 * Namma Stores Website Pixel (3507843232726532).
 * Returns null if explicitly disabled or invalid.
 */
export function resolveMetaPixelId(
  envOverride?: MetaPixelEnv,
  explicitPixelId?: string
): string | null {
  const env = envOverride ?? getBuildTimeEnv();
  const raw =
    explicitPixelId !== undefined
      ? explicitPixelId
      : typeof env.VITE_META_PIXEL_ID === 'string'
        ? env.VITE_META_PIXEL_ID
        : '';

  const trimmed = String(raw ?? '').trim();

  if (!trimmed) {
    return DEFAULT_META_PIXEL_ID;
  }

  const lower = trimmed.toLowerCase();
  if (
    lower === 'false' ||
    lower === '0' ||
    lower === 'disabled' ||
    lower === 'none' ||
    lower === 'off'
  ) {
    return null;
  }

  // Meta Pixel IDs are numeric strings (10 to 20 digits)
  if (!/^\d{10,20}$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * Reads the persisted analytics consent decision from window or localStorage.
 * Defaults to 'unset' (no tracking) until the user explicitly chooses Accept or Reject.
 */
export function getAnalyticsConsentDecision(
  winOverride?: MetaPixelWindow
): AnalyticsConsentDecision {
  const win = winOverride ?? getDefaultWindow();
  if (!win) {
    return 'unset';
  }

  try {
    const rawStored = win.localStorage
      ?.getItem(ANALYTICS_CONSENT_STORAGE_KEY)
      ?.trim()
      .toLowerCase();

    if (
      rawStored === 'accepted' ||
      rawStored === 'granted' ||
      rawStored === 'true'
    ) {
      return 'accepted';
    }

    if (
      rawStored === 'rejected' ||
      rawStored === 'denied' ||
      rawStored === 'false' ||
      rawStored === 'opt_out'
    ) {
      return 'rejected';
    }

    const legacyCookieConsent = win.localStorage
      ?.getItem('namma_cookie_consent')
      ?.trim()
      .toLowerCase();

    if (
      legacyCookieConsent === 'accepted' ||
      legacyCookieConsent === 'granted' ||
      legacyCookieConsent === 'true'
    ) {
      return 'accepted';
    }

    if (
      legacyCookieConsent === 'rejected' ||
      legacyCookieConsent === 'denied' ||
      legacyCookieConsent === 'false'
    ) {
      return 'rejected';
    }
  } catch {
    // Ignore storage access errors in restricted webviews/iframes
  }

  if (win.__NAMMA_ANALYTICS_CONSENT__ === true) {
    return 'accepted';
  }
  if (win.__NAMMA_ANALYTICS_CONSENT__ === false) {
    return 'rejected';
  }

  return 'unset';
}

/**
 * Persists the user's explicit analytics consent choice ('accepted' or 'rejected').
 * When 'accepted', immediately initializes Meta Pixel and tracks PageView for the active page.
 */
export function setAnalyticsConsentDecision(
  decision: 'accepted' | 'rejected',
  options?: MetaPixelOptions & { pageKey?: string }
): AnalyticsConsentDecision {
  const win = options?.win ?? getDefaultWindow();

  if (win) {
    win.__NAMMA_ANALYTICS_CONSENT__ = decision === 'accepted';
    try {
      if (typeof win.localStorage?.setItem === 'function') {
        win.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, decision);
      }
    } catch {
      // Ignore storage write errors
    }
  }

  if (decision === 'accepted') {
    trackMetaPageView(options);
  }

  return decision;
}

/**
 * Checks whether analytics / Meta Pixel tracking is permitted by build-time
 * configuration AND explicit user opt-in consent ('accepted').
 * Defaults to false when consent is 'unset' or 'rejected'.
 */
export function isMetaPixelConsentGranted(options?: {
  win?: MetaPixelWindow;
  env?: MetaPixelEnv;
}): boolean {
  const env = options?.env ?? getBuildTimeEnv();
  const win = options?.win ?? getDefaultWindow();

  const rawEnable =
    typeof env.VITE_ENABLE_ANALYTICS === 'string'
      ? env.VITE_ENABLE_ANALYTICS.trim().toLowerCase()
      : '';

  if (
    rawEnable === 'false' ||
    rawEnable === '0' ||
    rawEnable === 'disabled' ||
    rawEnable === 'off'
  ) {
    return false;
  }

  return getAnalyticsConsentDecision(win) === 'accepted';
}

/**
 * Installs the official Meta Pixel base queue shim (`window.fbq`) and injects
 * `https://connect.facebook.net/en_US/fbevents.js` once into the document.
 * Calls `fbq('init', pixelId)` idempotently without automatic advanced matching or PII.
 * Requires explicit analytics consent ('accepted').
 */
export function initMetaPixel(options?: MetaPixelOptions): boolean {
  const win = options?.win ?? getDefaultWindow();
  const doc = options?.doc ?? getDefaultDocument();
  const env = options?.env ?? getBuildTimeEnv();

  if (!win || !doc) {
    return false;
  }

  if (!isMetaPixelConsentGranted({ win, env })) {
    return false;
  }

  const pixelId = resolveMetaPixelId(env, options?.pixelId);
  if (!pixelId) {
    return false;
  }

  // 1. Official Meta Pixel base queue function setup (idempotent)
  if (typeof win.fbq !== 'function') {
    const n: FbqFunction = function (...args: unknown[]) {
      if (typeof n.callMethod === 'function') {
        n.callMethod(...args);
      } else {
        n.queue?.push(args);
      }
    };
    if (!win._fbq) {
      win._fbq = n;
    }
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    win.fbq = n;
  }

  // 2. Inject fbevents.js script tag at most once
  const existingScriptById =
    typeof doc.getElementById === 'function'
      ? doc.getElementById(META_PIXEL_SCRIPT_ID)
      : null;
  const existingScriptBySrc =
    !existingScriptById && typeof doc.querySelector === 'function'
      ? doc.querySelector(`script[src="${META_PIXEL_SCRIPT_SRC}"]`)
      : null;

  if (
    !existingScriptById &&
    !existingScriptBySrc &&
    typeof doc.createElement === 'function'
  ) {
    const scriptEl = doc.createElement('script');
    scriptEl.id = META_PIXEL_SCRIPT_ID;
    scriptEl.async = true;
    scriptEl.src = META_PIXEL_SCRIPT_SRC;

    const firstScript =
      typeof doc.getElementsByTagName === 'function'
        ? doc.getElementsByTagName('script')[0]
        : null;

    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(scriptEl, firstScript);
    } else if (doc.head && typeof doc.head.appendChild === 'function') {
      doc.head.appendChild(scriptEl);
    }
  }

  // 3. Call fbq('init', pixelId) at most once per Pixel ID (never pass user data / PII)
  if (!win.__NAMMA_META_PIXEL_INITIALIZED_IDS__) {
    win.__NAMMA_META_PIXEL_INITIALIZED_IDS__ = new Set<string>();
  }

  if (!win.__NAMMA_META_PIXEL_INITIALIZED_IDS__.has(pixelId)) {
    win.fbq('init', pixelId);
    win.__NAMMA_META_PIXEL_INITIALIZED_IDS__.add(pixelId);
  }

  return true;
}

/**
 * Tracks a Meta Pixel `PageView` event idempotently for the current page key,
 * preventing duplicate events from React 19 Strict Mode double-effects or rerenders.
 * Only fires after analytics consent has been explicitly accepted.
 */
export function trackMetaPageView(
  options?: MetaPixelOptions & { pageKey?: string }
): boolean {
  const win = options?.win ?? getDefaultWindow();
  const doc = options?.doc ?? getDefaultDocument();
  const env = options?.env ?? getBuildTimeEnv();

  if (!win || !doc) {
    return false;
  }

  const initialized = initMetaPixel({
    pixelId: options?.pixelId,
    win,
    doc,
    env,
  });

  if (!initialized || typeof win.fbq !== 'function') {
    return false;
  }

  const resolvedKey =
    options?.pageKey ??
    `${win.location?.pathname || '/'}${win.location?.search || ''}`;

  if (!win.__NAMMA_META_PIXEL_PAGEVIEWS__) {
    win.__NAMMA_META_PIXEL_PAGEVIEWS__ = new Set<string>();
  }

  if (win.__NAMMA_META_PIXEL_PAGEVIEWS__.has(resolvedKey)) {
    return false;
  }

  win.__NAMMA_META_PIXEL_PAGEVIEWS__.add(resolvedKey);
  win.fbq('track', 'PageView');
  return true;
}

/**
 * Returns strictly non-PII parameters for the seller application Lead event.
 * Never forwards seller names, phone numbers, emails, addresses, or form values.
 */
export function buildSellerLeadPixelParams(
  _ignoredInput?: unknown
): Readonly<{ lead_type: 'seller_application' }> {
  return Object.freeze({
    lead_type: 'seller_application',
  });
}

/**
 * Fires the standard Meta Pixel `Lead` event ONLY when:
 * 1. Explicit analytics consent has been accepted by the visitor
 * 2. A seller application receives a confirmed NEW submission response from `/api/submit-seller-lead`
 *
 * Never fires on validation errors, failed HTTP responses, duplicate submissions, or without analytics consent.
 */
export function trackMetaSellerLead(
  submissionResult: SellerLeadTrackingInput | null | undefined,
  options?: MetaPixelOptions
): boolean {
  if (!submissionResult || typeof submissionResult !== 'object') {
    return false;
  }

  // Reject failed responses or explicit errors
  if (
    submissionResult.ok === false ||
    submissionResult.success === false ||
    Boolean(submissionResult.error)
  ) {
    return false;
  }

  // Reject duplicate submissions (must only track confirmed NEW seller leads)
  if (
    submissionResult.duplicate === true ||
    submissionResult.is_duplicate === true
  ) {
    return false;
  }

  // Require a confirmed backend lead_id
  const leadId =
    typeof submissionResult.lead_id === 'string'
      ? submissionResult.lead_id.trim()
      : '';
  if (!leadId) {
    return false;
  }

  const win = options?.win ?? getDefaultWindow();
  const doc = options?.doc ?? getDefaultDocument();
  const env = options?.env ?? getBuildTimeEnv();

  if (!win || !doc) {
    return false;
  }

  if (!isMetaPixelConsentGranted({ win, env })) {
    return false;
  }

  if (!win.__NAMMA_META_PIXEL_TRACKED_LEADS__) {
    win.__NAMMA_META_PIXEL_TRACKED_LEADS__ = new Set<string>();
  }

  // Prevent duplicate Lead events for the same confirmed lead_id
  if (win.__NAMMA_META_PIXEL_TRACKED_LEADS__.has(leadId)) {
    return false;
  }

  const initialized = initMetaPixel({
    pixelId: options?.pixelId,
    win,
    doc,
    env,
  });

  if (!initialized || typeof win.fbq !== 'function') {
    return false;
  }

  const safeParams = buildSellerLeadPixelParams();
  win.__NAMMA_META_PIXEL_TRACKED_LEADS__.add(leadId);
  win.fbq('track', 'Lead', safeParams);
  return true;
}
