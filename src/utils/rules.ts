import type {
  BackendShopCategory,
  BackendContactPreference,
  ContactMethod,
  EdgeFunctionLeadPayload,
  LocationCaptureMethod,
  ProgrammePreferenceOption,
  ReferralSourceOption,
} from '../types/seller.ts';

export const PROGRAMME_PREFERENCE_OPTIONS: readonly {
  value: ProgrammePreferenceOption;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    value: 'stores_near_you',
    label: 'Stores Near You',
    shortLabel: 'Stores Near You',
    description:
      'List eligible products from your shop and manage prices under agreed terms.',
  },
  {
    value: 'namma_fresh',
    label: 'Namma Fresh',
    shortLabel: 'Namma Fresh',
    description:
      'Supply eligible fresh products at agreed supplier payouts.',
  },
  {
    value: 'need_guidance',
    label: 'Not sure yet',
    shortLabel: 'Not sure yet',
    description:
      'Our team will help you choose the right programme during onboarding.',
  },
] as const;

export const VALID_PROGRAMME_PREFERENCES = new Set<ProgrammePreferenceOption>([
  'stores_near_you',
  'namma_fresh',
  'need_guidance',
]);

const PROGRAMME_ALIAS_MAP: Record<string, ProgrammePreferenceOption> = {
  stores_near_you: 'stores_near_you',
  'stores near you': 'stores_near_you',
  'stores-near-you': 'stores_near_you',
  namma_fresh: 'namma_fresh',
  'namma fresh': 'namma_fresh',
  'namma-fresh': 'namma_fresh',
  need_guidance: 'need_guidance',
  'need guidance': 'need_guidance',
  'not sure': 'need_guidance',
  'not sure yet': 'need_guidance',
  discuss_during_onboarding: 'need_guidance',
};

export function normalizeProgrammePreference(raw: unknown): {
  valid: boolean;
  value: ProgrammePreferenceOption | null;
  error?: string;
} {
  if (raw === undefined || raw === null || raw === '') {
    return { valid: true, value: null };
  }
  if (typeof raw !== 'string') {
    return {
      valid: false,
      value: null,
      error: 'Please select a valid programme option',
    };
  }
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned) {
    return { valid: true, value: null };
  }
  const mapped = PROGRAMME_ALIAS_MAP[cleaned];
  if (!mapped) {
    return {
      valid: false,
      value: null,
      error: 'Please select a valid programme option',
    };
  }
  return { valid: true, value: mapped };
}

export const DISPLAY_CATEGORIES = [
  'Grocery',
  'Chicken, meat and fish',
  'Fruits and vegetables',
  'Milk and dairy products',
  'Puja items and flowers',
  'Other or multiple categories',
] as const;

export type DisplayCategory = (typeof DISPLAY_CATEGORIES)[number];

export const CATEGORY_MAP: Record<DisplayCategory, BackendShopCategory> = {
  Grocery: 'grocery',
  'Chicken, meat and fish': 'meat_fish_chicken',
  'Fruits and vegetables': 'fruits_vegetables',
  'Milk and dairy products': 'milk_dairy',
  'Puja items and flowers': 'puja_flowers',
  'Other or multiple categories': 'other_multiple',
};

export const BACKEND_TO_DISPLAY_CATEGORY: Record<
  BackendShopCategory,
  DisplayCategory
> = {
  grocery: 'Grocery',
  meat_fish_chicken: 'Chicken, meat and fish',
  fruits_vegetables: 'Fruits and vegetables',
  milk_dairy: 'Milk and dairy products',
  puja_flowers: 'Puja items and flowers',
  other_multiple: 'Other or multiple categories',
};

export const VALID_BACKEND_CATEGORIES = new Set<BackendShopCategory>([
  'grocery',
  'meat_fish_chicken',
  'fruits_vegetables',
  'milk_dairy',
  'puja_flowers',
  'other_multiple',
]);

export function resolveBackendCategory(raw: unknown): BackendShopCategory {
  const val = String(raw || '').trim();
  if (VALID_BACKEND_CATEGORIES.has(val as BackendShopCategory)) {
    return val as BackendShopCategory;
  }
  if (CATEGORY_MAP[val as DisplayCategory]) {
    return CATEGORY_MAP[val as DisplayCategory];
  }
  return 'other_multiple';
}

export function formatDisplayCategory(raw: unknown): DisplayCategory {
  const code = resolveBackendCategory(raw);
  return BACKEND_TO_DISPLAY_CATEGORY[code];
}

export const REFERRAL_SOURCE_OPTIONS: readonly ReferralSourceOption[] = [
  'Instagram',
  'Facebook',
  'WhatsApp Group',
  'Google Search',
  'Friends or Family',
  'Visited by Namma Stores Team',
  'Local Community',
  'Poster or Flyer',
  'Other',
] as const;

export const VALID_REFERRAL_SOURCES = new Set<string>(REFERRAL_SOURCE_OPTIONS);

const REFERRAL_ALIAS_MAP: Record<string, ReferralSourceOption> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp_group: 'WhatsApp Group',
  'whatsapp group': 'WhatsApp Group',
  google_search: 'Google Search',
  'google search': 'Google Search',
  friends_or_family: 'Friends or Family',
  'friends or family': 'Friends or Family',
  visited_by_namma_stores_team: 'Visited by Namma Stores Team',
  'visited by namma stores team': 'Visited by Namma Stores Team',
  local_community: 'Local Community',
  'local community': 'Local Community',
  poster_or_flyer: 'Poster or Flyer',
  'poster or flyer': 'Poster or Flyer',
  other: 'Other',
};

export const CONTACT_OPTIONS = ['WhatsApp', 'Phone'] as const;

export type DisplayContact = (typeof CONTACT_OPTIONS)[number];

export const CONTACT_MAP: Record<DisplayContact, BackendContactPreference> = {
  WhatsApp: 'whatsapp',
  Phone: 'phone',
};

export const BACKEND_TO_DISPLAY_CONTACT: Record<
  BackendContactPreference,
  ContactMethod
> = {
  whatsapp: 'WhatsApp',
  phone: 'Phone Call',
};

export const VALID_BACKEND_CONTACTS = new Set<BackendContactPreference>([
  'whatsapp',
  'phone',
]);

export function resolveBackendContact(raw: unknown): BackendContactPreference {
  const val = String(raw || '').trim().toLowerCase();
  if (val === 'phone' || val === 'phone call' || val === 'phone_call') {
    return 'phone';
  }
  return 'whatsapp';
}

export function formatDisplayContactMethod(raw: unknown): ContactMethod {
  const code = resolveBackendContact(raw);
  return BACKEND_TO_DISPLAY_CONTACT[code];
}

/**
 * Normalizes Indian mobile number to 10 digits for the canonical database schema.
 */
export function normalizeIndianMobile(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, normalized: '', error: 'Mobile number is required' };
  }

  let cleaned = raw.trim().replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  if (!/^\d{10}$/.test(cleaned)) {
    return {
      valid: false,
      normalized: '',
      error: 'Please enter a valid 10-digit Indian mobile number',
    };
  }

  if (!/^[6-9]/.test(cleaned)) {
    return {
      valid: false,
      normalized: '',
      error: 'Mobile number must start with 6, 7, 8, or 9',
    };
  }

  return {
    valid: true,
    normalized: cleaned,
  };
}

/**
 * Validates email format and length prior to submission and Resend dispatch.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
    trimmed
  );
}

/**
 * Sanitizes plain text input by stripping control characters and HTML tags.
 */
export function sanitizePlainText(input: unknown, maxLength = 300): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates and normalizes the referral_source selection and optional "Other" details.
 */
export function normalizeReferralSource(
  rawSource: unknown,
  rawOther?: unknown
): { valid: boolean; value: string | null; error?: string } {
  if (rawSource === undefined || rawSource === null || rawSource === '') {
    return { valid: true, value: null };
  }

  const cleanedSource = sanitizePlainText(rawSource, 160);
  if (!cleanedSource) {
    return { valid: true, value: null };
  }

  // Handle already-combined "Other: <details>" string
  if (/^other\s*[:\-–—]\s*(.+)$/i.test(cleanedSource)) {
    const match = cleanedSource.match(/^other\s*[:\-–—]\s*(.+)$/i);
    const customDetail = sanitizePlainText(match ? match[1] : '', 120);
    return {
      valid: true,
      value: customDetail ? `Other: ${customDetail}` : 'Other',
    };
  }

  const matchedOption = VALID_REFERRAL_SOURCES.has(cleanedSource)
    ? (cleanedSource as ReferralSourceOption)
    : REFERRAL_ALIAS_MAP[cleanedSource.toLowerCase()];

  if (!matchedOption) {
    return {
      valid: false,
      value: null,
      error: 'Please select a valid option for how you heard about Namma Stores',
    };
  }

  if (matchedOption === 'Other') {
    const otherDetail = sanitizePlainText(rawOther, 120);
    return {
      valid: true,
      value: otherDetail ? `Other: ${otherDetail}` : 'Other',
    };
  }

  return {
    valid: true,
    value: matchedOption,
  };
}

/**
 * Validates an optional Google Maps location link.
 * Accepts common Google Maps URLs, mobile share short links (maps.app.goo.gl, goo.gl/maps),
 * and standard coordinate/place links on google.com/maps or maps.google.* domains.
 */
export function validateGoogleMapsLink(raw: unknown): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (raw === undefined || raw === null || raw === '') {
    return { valid: true, normalized: '' };
  }

  if (typeof raw !== 'string') {
    return {
      valid: false,
      normalized: '',
      error: 'Please enter a valid Google Maps link',
    };
  }

  const trimmed = raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();

  if (!trimmed) {
    return { valid: true, normalized: '' };
  }

  if (trimmed.length > 500) {
    return {
      valid: false,
      normalized: '',
      error: 'Google Maps link is too long (maximum 500 characters)',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      normalized: '',
      error:
        'Please enter a valid Google Maps link starting with https:// (for example, https://maps.app.goo.gl/... or https://www.google.com/maps/...)',
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      valid: false,
      normalized: '',
      error: 'Google Maps link must start with https:// or http://',
    };
  }

  const host = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();

  const isShortMapsHost =
    host === 'maps.app.goo.gl' ||
    host === 'app.goo.gl' ||
    (host === 'goo.gl' && pathname.startsWith('/maps'));

  const isMapsSubdomain =
    host === 'maps.google.com' ||
    /^maps\.google\.[a-z.]{2,6}$/.test(host);

  const isGoogleMapsPath =
    (host === 'google.com' ||
      host === 'www.google.com' ||
      /^(?:www\.)?google\.[a-z.]{2,6}$/.test(host)) &&
    pathname.startsWith('/maps');

  if (!isShortMapsHost && !isMapsSubdomain && !isGoogleMapsPath) {
    return {
      valid: false,
      normalized: '',
      error:
        'Please paste a valid Google Maps link (for example, from Google Maps Share or https://www.google.com/maps)',
    };
  }

  return {
    valid: true,
    normalized: parsed.toString(),
  };
}

export const TARGET_LOCATION_ACCURACY_METERS = 50;
export const LOCATION_WATCH_TIMEOUT_MS = 12_000;

export interface GeolocationReading {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp?: number;
}

/**
 * Validates that a browser GeolocationCoordinates-like object contains finite
 * latitude, longitude, and positive finite accuracy in metres.
 */
export function isValidGeolocationReading(
  coords:
    | {
        latitude?: unknown;
        longitude?: unknown;
        accuracy?: unknown;
      }
    | null
    | undefined
): coords is GeolocationReading {
  if (!coords || typeof coords !== 'object') return false;
  const { latitude, longitude, accuracy } = coords;
  if (
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    return false;
  }
  if (
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return false;
  }
  if (
    typeof accuracy !== 'number' ||
    !Number.isFinite(accuracy) ||
    accuracy <= 0
  ) {
    return false;
  }
  return true;
}

/**
 * Checks whether a reported accuracy radius (in metres) meets the acceptance threshold (<= 50m).
 */
export function isLocationAccuracyAcceptable(
  accuracyMeters: number,
  thresholdMeters: number = TARGET_LOCATION_ACCURACY_METERS
): boolean {
  return (
    typeof accuracyMeters === 'number' &&
    Number.isFinite(accuracyMeters) &&
    accuracyMeters > 0 &&
    accuracyMeters <= thresholdMeters
  );
}

/**
 * Retains the most accurate valid reading collected during a bounded watch window.
 */
export function selectBetterGeolocationReading(
  currentBest: GeolocationReading | null | undefined,
  candidate: GeolocationReading
): GeolocationReading {
  if (!currentBest) return candidate;
  return candidate.accuracy < currentBest.accuracy ? candidate : currentBest;
}

/**
 * Rounds an accuracy reading in metres for user-facing display messages.
 */
export function formatAccuracyMeters(accuracyMeters: number): number {
  if (!Number.isFinite(accuracyMeters) || accuracyMeters <= 0) return 0;
  return Math.max(1, Math.round(accuracyMeters));
}

/**
 * Generates a Google Maps query URL using full-precision accepted coordinates.
 */
export function buildCoordinatesMapsUrl(
  latitude: number,
  longitude: number
): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

/**
 * Determines whether the seller has manually entered a Google Maps link
 * that differs from the last accepted geolocation-generated link.
 */
export function hasManualGoogleMapsLink(
  currentLink: string | undefined,
  lastAcceptedMapsUrl: string | undefined
): boolean {
  const trimmedCurrent = (currentLink || '').trim();
  if (!trimmedCurrent) return false;
  const trimmedAccepted = (lastAcceptedMapsUrl || '').trim();
  return trimmedCurrent !== trimmedAccepted;
}

export const LOCATION_CAPTURE_METHODS: readonly LocationCaptureMethod[] = [
  'device_geolocation',
  'google_maps_link',
  'manual_address',
] as const;

export const VALID_LOCATION_CAPTURE_METHODS = new Set<LocationCaptureMethod>(
  LOCATION_CAPTURE_METHODS
);

const LOCATION_CAPTURE_METHOD_ALIASES: Record<string, LocationCaptureMethod> = {
  device_geolocation: 'device_geolocation',
  browser_geolocation: 'device_geolocation',
  geolocation: 'device_geolocation',
  current_location: 'device_geolocation',
  gps: 'device_geolocation',
  google_maps_link: 'google_maps_link',
  manual_google_maps_link: 'google_maps_link',
  maps_link: 'google_maps_link',
  manual_link: 'google_maps_link',
  manual_address: 'manual_address',
  manual_address_only: 'manual_address',
  address_only: 'manual_address',
  manual: 'manual_address',
};

export function resolveLocationCaptureMethod(
  raw: unknown,
  hasCoordinates: boolean,
  hasMapsLink: boolean
): {
  valid: boolean;
  value: LocationCaptureMethod;
  error?: string;
} {
  if (raw === undefined || raw === null || raw === '') {
    if (hasCoordinates) {
      return { valid: true, value: 'device_geolocation' };
    }
    if (hasMapsLink) {
      return { valid: true, value: 'google_maps_link' };
    }
    return { valid: true, value: 'manual_address' };
  }

  if (typeof raw !== 'string') {
    return {
      valid: false,
      value: 'manual_address',
      error: 'Invalid location capture method',
    };
  }

  const normalizedKey = raw.trim().toLowerCase();
  const mapped = LOCATION_CAPTURE_METHOD_ALIASES[normalizedKey];

  if (!mapped) {
    return {
      valid: false,
      value: 'manual_address',
      error:
        'Invalid location capture method (expected device_geolocation, google_maps_link, or manual_address)',
    };
  }

  if (mapped === 'device_geolocation' && !hasCoordinates) {
    return {
      valid: false,
      value: 'device_geolocation',
      error:
        'Device geolocation capture method requires a valid latitude and longitude pair',
    };
  }

  return {
    valid: true,
    value: mapped,
  };
}

function parseOptionalNumber(raw: unknown): {
  present: boolean;
  value: number;
} {
  if (raw === undefined || raw === null || raw === '') {
    return { present: false, value: NaN };
  }
  if (typeof raw === 'number') {
    return { present: true, value: raw };
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return { present: false, value: NaN };
    return { present: true, value: Number(trimmed) };
  }
  return { present: true, value: NaN };
}

/**
 * Validates optional Google Maps link, coordinate pair (latitude/longitude),
 * reported accuracy (metres), and location capture method.
 */
export function validateLocationData(input: {
  google_maps_link?: unknown;
  shop_latitude?: unknown;
  shop_longitude?: unknown;
  location_accuracy_meters?: unknown;
  location_capture_method?: unknown;
}): {
  valid: boolean;
  errors: Record<string, string>;
  google_maps_link: string | null;
  shop_latitude: number | null;
  shop_longitude: number | null;
  location_accuracy_meters: number | null;
  location_capture_method: LocationCaptureMethod;
} {
  const errors: Record<string, string> = {};

  const mapsCheck = validateGoogleMapsLink(input.google_maps_link);
  if (!mapsCheck.valid) {
    errors.google_maps_link =
      mapsCheck.error || 'Please provide a valid Google Maps link';
  }

  const latParsed = parseOptionalNumber(input.shop_latitude);
  const lngParsed = parseOptionalNumber(input.shop_longitude);
  const accParsed = parseOptionalNumber(input.location_accuracy_meters);

  let validLat: number | null = null;
  let validLng: number | null = null;
  let validAccuracy: number | null = null;

  if (latParsed.present !== lngParsed.present) {
    const pairErr =
      'Both shop latitude and shop longitude must be provided together as a complete coordinate pair';
    errors.shop_latitude = pairErr;
    errors.shop_longitude = pairErr;
  } else if (latParsed.present && lngParsed.present) {
    if (
      !Number.isFinite(latParsed.value) ||
      latParsed.value < -90 ||
      latParsed.value > 90
    ) {
      errors.shop_latitude =
        'Shop latitude must be a valid number between -90 and 90';
    } else {
      validLat = latParsed.value;
    }

    if (
      !Number.isFinite(lngParsed.value) ||
      lngParsed.value < -180 ||
      lngParsed.value > 180
    ) {
      errors.shop_longitude =
        'Shop longitude must be a valid number between -180 and 180';
    } else {
      validLng = lngParsed.value;
    }
  }

  const hasValidCoordinates = validLat !== null && validLng !== null;

  if (accParsed.present) {
    if (!latParsed.present && !lngParsed.present) {
      errors.location_accuracy_meters =
        'Location accuracy requires a valid latitude and longitude coordinate pair';
    } else if (!Number.isFinite(accParsed.value) || accParsed.value <= 0) {
      errors.location_accuracy_meters =
        'Location accuracy must be a positive number in metres';
    } else if (accParsed.value > TARGET_LOCATION_ACCURACY_METERS) {
      errors.location_accuracy_meters = `Location accuracy must be ${TARGET_LOCATION_ACCURACY_METERS} metres or better`;
    } else {
      validAccuracy = accParsed.value;
    }
  }

  const methodCheck = resolveLocationCaptureMethod(
    input.location_capture_method,
    hasValidCoordinates,
    Boolean(mapsCheck.normalized)
  );
  if (!methodCheck.valid && !errors.shop_latitude && !errors.shop_longitude) {
    errors.location_capture_method =
      methodCheck.error || 'Invalid location capture method';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    google_maps_link: mapsCheck.normalized || null,
    shop_latitude: hasValidCoordinates ? validLat : null,
    shop_longitude: hasValidCoordinates ? validLng : null,
    location_accuracy_meters: hasValidCoordinates ? validAccuracy : null,
    location_capture_method: methodCheck.value,
  };
}

export interface FormInputState {
  shop_name: string;
  owner_name: string;
  mobile: string;
  email: string;
  shop_address: string;
  google_maps_link?: string;
  shop_latitude?: number | null;
  shop_longitude?: number | null;
  location_accuracy_meters?: number | null;
  location_capture_method?: LocationCaptureMethod | '';
  shop_category: DisplayCategory | '';
  programme_preference?: ProgrammePreferenceOption | '';
  referral_source: ReferralSourceOption | '';
  referral_source_other: string;
  contact_preference: DisplayContact;
  privacy_acknowledged: boolean;
  website_url?: string; // Honeypot field for bot protection
}

export function validateSellerForm(input: FormInputState): {
  isValid: boolean;
  errors: Record<string, string>;
  payload?: EdgeFunctionLeadPayload;
} {
  const errors: Record<string, string> = {};

  const shopName = sanitizePlainText(input.shop_name, 120);
  if (!shopName || shopName.length < 2) {
    errors.shop_name = 'Please enter your shop name';
  }

  const ownerName = sanitizePlainText(input.owner_name, 100);
  if (!ownerName || ownerName.length < 2) {
    errors.owner_name = "Please enter owner's full name";
  }

  const phoneCheck = normalizeIndianMobile(input.mobile);
  if (!phoneCheck.valid) {
    errors.mobile =
      phoneCheck.error || 'Please enter a valid 10-digit mobile number';
  }

  const emailTrimmed =
    typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!emailTrimmed || !isValidEmail(emailTrimmed)) {
    errors.email = 'Please enter a valid email address';
  }

  const shopAddress = sanitizePlainText(input.shop_address, 300);
  if (!shopAddress || shopAddress.length < 8) {
    errors.shop_address =
      'Please enter complete shop address with landmark (at least 8 characters)';
  }

  const locationCheck = validateLocationData({
    google_maps_link: input.google_maps_link,
    shop_latitude: input.shop_latitude,
    shop_longitude: input.shop_longitude,
    location_accuracy_meters: input.location_accuracy_meters,
    location_capture_method: input.location_capture_method,
  });
  if (!locationCheck.valid) {
    Object.assign(errors, locationCheck.errors);
  }

  if (
    !input.shop_category ||
    !CATEGORY_MAP[input.shop_category as DisplayCategory]
  ) {
    errors.shop_category = 'Please select what your shop sells';
  }

  const programmeCheck = normalizeProgrammePreference(
    input.programme_preference
  );
  if (!programmeCheck.valid && programmeCheck.error) {
    errors.programme_preference = programmeCheck.error;
  }

  const referralCheck = normalizeReferralSource(
    input.referral_source,
    input.referral_source_other
  );
  if (!referralCheck.valid && referralCheck.error) {
    errors.referral_source = referralCheck.error;
  }

  if (!input.contact_preference || !CONTACT_MAP[input.contact_preference]) {
    errors.contact_preference = 'Please select preferred contact method';
  }

  if (input.privacy_acknowledged !== true) {
    errors.privacy_acknowledged =
      'Please acknowledge the privacy notice to proceed';
  }

  if (
    Object.keys(errors).length > 0 ||
    !phoneCheck.valid ||
    !input.shop_category
  ) {
    return { isValid: false, errors };
  }

  const otherSpec =
    input.referral_source === 'Other'
      ? sanitizePlainText(input.referral_source_other, 120)
      : '';

  const payload: EdgeFunctionLeadPayload = {
    shop_name: shopName,
    owner_name: ownerName,
    mobile: phoneCheck.normalized,
    email: emailTrimmed,
    shop_address: shopAddress,
    ...(locationCheck.google_maps_link
      ? { google_maps_link: locationCheck.google_maps_link }
      : {}),
    ...(locationCheck.shop_latitude !== null &&
    locationCheck.shop_longitude !== null
      ? {
          shop_latitude: locationCheck.shop_latitude,
          shop_longitude: locationCheck.shop_longitude,
        }
      : {}),
    ...(locationCheck.location_accuracy_meters !== null
      ? { location_accuracy_meters: locationCheck.location_accuracy_meters }
      : {}),
    location_capture_method: locationCheck.location_capture_method,
    shop_category: CATEGORY_MAP[input.shop_category as DisplayCategory],
    programme_preference: programmeCheck.value,
    contact_preference: CONTACT_MAP[input.contact_preference],
    ...(referralCheck.value ? { referral_source: referralCheck.value } : {}),
    ...(otherSpec ? { referral_source_other: otherSpec } : {}),
    privacy_acknowledged: true,
  };

  return {
    isValid: true,
    errors: {},
    payload,
  };
}

export function buildSellerLeadDatabaseRow(
  sanitized: NonNullable<ReturnType<typeof validateSellerSubmission>['sanitized']>,
  meta?: {
    referral_source_other?: string | null;
    source?: string;
    landing_page?: string | null;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
    referrer?: string | null;
    client_submission_id?: string;
    submission_ip_hash?: string;
    user_agent?: string | null;
  }
) {
  return {
    shop_name: sanitized.shop_name,
    owner_name: sanitized.owner_name,
    mobile: sanitized.mobile,
    email: sanitized.email,
    shop_address: sanitized.shop_address,
    shop_category: sanitized.shop_category,
    programme_preference: sanitized.programme_preference,
    contact_preference: sanitized.contact_preference,
    referral_source: sanitized.referral_source,
    referral_source_other: meta?.referral_source_other ?? null,
    google_maps_link: sanitized.google_maps_link,
    shop_latitude: sanitized.shop_latitude,
    shop_longitude: sanitized.shop_longitude,
    location_accuracy_meters: sanitized.location_accuracy_meters,
    location_capture_method: sanitized.location_capture_method,
    privacy_acknowledged: true,
    status: 'new' as const,
    source: meta?.source || 'seller_partner_website',
    landing_page: meta?.landing_page ?? null,
    utm_source: meta?.utm_source ?? null,
    utm_medium: meta?.utm_medium ?? null,
    utm_campaign: meta?.utm_campaign ?? null,
    utm_content: meta?.utm_content ?? null,
    utm_term: meta?.utm_term ?? null,
    referrer: meta?.referrer ?? null,
    client_submission_id: meta?.client_submission_id,
    submission_ip_hash: meta?.submission_ip_hash,
    user_agent: meta?.user_agent ?? null,
  };
}

export function validateSellerSubmission(input: Record<string, unknown>): {
  isValid: boolean;
  errors: Record<string, string>;
  normalizedMobile?: string;
  normalizedEmail?: string;
  sanitized?: {
    shop_name: string;
    owner_name: string;
    mobile: string;
    email: string;
    shop_address: string;
    google_maps_link: string | null;
    shop_latitude: number | null;
    shop_longitude: number | null;
    location_accuracy_meters: number | null;
    location_capture_method: LocationCaptureMethod;
    shop_category: BackendShopCategory;
    programme_preference: ProgrammePreferenceOption | null;
    contact_preference: BackendContactPreference;
    referral_source: string | null;
  };
} {
  const errors: Record<string, string> = {};

  const shopName = sanitizePlainText(input.shop_name, 120);
  if (!shopName || shopName.length < 2) {
    errors.shop_name = 'Shop name is required (minimum 2 characters)';
  }

  const ownerName = sanitizePlainText(input.owner_name, 100);
  if (!ownerName || ownerName.length < 2) {
    errors.owner_name = "Owner's full name is required (minimum 2 characters)";
  }

  const phone = normalizeIndianMobile(
    String(input.mobile || input.mobile_number || '')
  );
  if (!phone.valid) {
    errors.mobile =
      phone.error || 'Valid 10-digit Indian mobile number is required';
  }

  const rawEmail =
    typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!rawEmail || !isValidEmail(rawEmail)) {
    errors.email = 'Valid email address is required';
  }

  const shopAddress = sanitizePlainText(input.shop_address, 500);
  if (!shopAddress || shopAddress.length < 8) {
    errors.shop_address =
      'Complete shop address is required (minimum 8 characters)';
  }

  const locationCheck = validateLocationData({
    google_maps_link: input.google_maps_link,
    shop_latitude: input.shop_latitude,
    shop_longitude: input.shop_longitude,
    location_accuracy_meters: input.location_accuracy_meters,
    location_capture_method: input.location_capture_method,
  });
  if (!locationCheck.valid) {
    Object.assign(errors, locationCheck.errors);
  }

  const rawCategory = String(input.shop_category || '');
  let mappedCategory: BackendShopCategory | undefined;
  if (VALID_BACKEND_CATEGORIES.has(rawCategory as BackendShopCategory)) {
    mappedCategory = rawCategory as BackendShopCategory;
  } else if (CATEGORY_MAP[rawCategory as DisplayCategory]) {
    mappedCategory = CATEGORY_MAP[rawCategory as DisplayCategory];
  } else {
    errors.shop_category = 'Valid shop category is required';
  }

  const programmeCheck = normalizeProgrammePreference(
    input.programme_preference
  );
  if (!programmeCheck.valid) {
    errors.programme_preference =
      programmeCheck.error || 'Invalid programme selection';
  }

  const referralCheck = normalizeReferralSource(
    input.referral_source,
    input.referral_source_other || input.referral_source_details
  );
  if (!referralCheck.valid) {
    errors.referral_source =
      referralCheck.error || 'Invalid referral source selection';
  }

  const rawContact = String(
    input.contact_preference || input.preferred_contact_method || ''
  );
  let mappedContact: BackendContactPreference | undefined;
  if (VALID_BACKEND_CONTACTS.has(rawContact as BackendContactPreference)) {
    mappedContact = rawContact as BackendContactPreference;
  } else if (rawContact === 'WhatsApp') {
    mappedContact = 'whatsapp';
  } else if (rawContact === 'Phone' || rawContact === 'Phone Call') {
    mappedContact = 'phone';
  } else {
    errors.contact_preference = 'Preferred contact method is required';
  }

  if (input.privacy_acknowledged !== true) {
    errors.privacy_acknowledged = 'Privacy notice acknowledgement is required';
  }

  if (
    Object.keys(errors).length > 0 ||
    !phone.valid ||
    !mappedCategory ||
    !mappedContact
  ) {
    return {
      isValid: false,
      errors,
    };
  }

  return {
    isValid: true,
    errors: {},
    normalizedMobile: phone.normalized,
    normalizedEmail: rawEmail,
    sanitized: {
      shop_name: shopName,
      owner_name: ownerName,
      mobile: phone.normalized,
      email: rawEmail,
      shop_address: shopAddress,
      google_maps_link: locationCheck.google_maps_link,
      shop_latitude: locationCheck.shop_latitude,
      shop_longitude: locationCheck.shop_longitude,
      location_accuracy_meters: locationCheck.location_accuracy_meters,
      location_capture_method: locationCheck.location_capture_method,
      shop_category: mappedCategory,
      programme_preference: programmeCheck.value,
      contact_preference: mappedContact,
      referral_source: referralCheck.value,
    },
  };
}
