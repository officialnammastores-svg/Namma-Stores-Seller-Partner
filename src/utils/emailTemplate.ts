import {
  formatDisplayCategory,
  formatDisplayContactMethod,
  normalizeIndianMobile,
  validateGoogleMapsLink,
  buildCoordinatesMapsUrl,
} from './rules.ts';

export const CONFIRMATION_EMAIL_SUBJECT =
  'We’ve Received Your Namma Stores Application';

export const OFFICIAL_OWNER_NOTIFICATION_EMAIL =
  'official.nammastores@gmail.com';
export const DEFAULT_OWNER_NOTIFICATION_EMAIL =
  OFFICIAL_OWNER_NOTIFICATION_EMAIL;
export const DEFAULT_REPLY_TO_EMAIL = 'official.nammastores@gmail.com';

export const BLOCKED_INTERNAL_NOTIFICATION_RECIPIENTS = [
  'simphegowda1345@gmail.com',
  'simphegowdatv@gmail.com',
] as const;

export const OFFICIAL_SUPPORT_PHONE_DISPLAY = '+91 9180567632';
export const OFFICIAL_SUPPORT_PHONE_TEL = 'tel:+919180567632';
export const OFFICIAL_SUPPORT_WHATSAPP_URL = 'https://wa.me/919180567632';
export const OFFICIAL_SUPPORT_EMAIL = 'official.nammastores@gmail.com';

export const OFFICIAL_EMAIL_LOGO_URL =
  'https://txmrfheminuminggtwfv.supabase.co/storage/v1/object/public/brand-assets/namma-stores-logo.png';
export const OFFICIAL_EMAIL_LOGO_ALT =
  'Namma Stores — Your local stores, Now online';

/**
 * Escapes all HTML special characters safely for interpolation inside HTML email templates.
 * Never creates HTML by stripping characters.
 */
export function escapeHtml(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function resolveEmailLogoUrl(customLogoUrl?: string | null): string {
  const candidate = (
    customLogoUrl ??
    (typeof process !== 'undefined' ? process.env?.EMAIL_LOGO_URL : '') ??
    ''
  ).trim();
  if (/^https:\/\//i.test(candidate)) {
    return candidate;
  }
  return OFFICIAL_EMAIL_LOGO_URL;
}

export function formatProgrammeLabel(rawProgramme?: string | null): string {
  const cleaned = (rawProgramme || '').trim().toLowerCase();
  if (cleaned === 'stores_near_you' || cleaned === 'stores near you') {
    return 'Stores Near You';
  }
  if (cleaned === 'namma_fresh' || cleaned === 'namma fresh') {
    return 'Namma Fresh';
  }
  if (cleaned === 'need_guidance') {
    return 'Need guidance during onboarding';
  }
  return 'To be discussed during onboarding';
}

export function formatLocationCaptureMethodLabel(
  rawMethod?: string | null
): string | null {
  const cleaned = (rawMethod || '').trim().toLowerCase();
  if (!cleaned) return null;
  if (
    cleaned === 'device_geolocation' ||
    cleaned === 'browser_geolocation'
  ) {
    return 'Device Geolocation';
  }
  if (
    cleaned === 'google_maps_link' ||
    cleaned === 'manual_google_maps_link'
  ) {
    return 'Google Maps Link';
  }
  if (cleaned === 'manual_address' || cleaned === 'manual_address_only') {
    return 'Manual Address';
  }
  return rawMethod?.trim() || null;
}

export function formatReadableSubmissionTime(rawTimestamp?: string | null): string {
  const raw = (rawTimestamp || '').trim();
  if (!raw) return 'Unavailable';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }
  try {
    const formattedIst = new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }).format(parsed);
    return `${formattedIst} IST (${parsed.toISOString()})`;
  } catch {
    return parsed.toISOString();
  }
}

export function formatApplicantPhoneLinks(rawMobile?: string | null): {
  displayPhone: string;
  telHref: string | null;
  whatsappHref: string | null;
} {
  const raw = (rawMobile || '').trim();
  if (!raw) {
    return {
      displayPhone: 'Unavailable',
      telHref: null,
      whatsappHref: null,
    };
  }
  const mobileCheck = normalizeIndianMobile(raw);
  if (mobileCheck.valid && mobileCheck.normalized) {
    const tenDigit = mobileCheck.normalized;
    return {
      displayPhone: `+91 ${tenDigit}`,
      telHref: `tel:+91${tenDigit}`,
      whatsappHref: `https://wa.me/91${tenDigit}`,
    };
  }
  const digitsOnly = raw.replace(/[^\d+]/g, '');
  return {
    displayPhone: raw,
    telHref: digitsOnly.length >= 10 ? `tel:${digitsOnly}` : null,
    whatsappHref: null,
  };
}

export function resolveLeadLocationDetails(lead: {
  googleMapsLink?: string | null;
  shopLatitude?: number | null;
  shopLongitude?: number | null;
  locationAccuracyMeters?: number | null;
  locationCaptureMethod?: string | null;
}): {
  resolvedMapsUrl: string | null;
  hasValidCoordinates: boolean;
  coordinatesText: string | null;
  accuracyText: string | null;
  captureMethodText: string | null;
} {
  const hasValidCoordinates =
    typeof lead.shopLatitude === 'number' &&
    typeof lead.shopLongitude === 'number' &&
    Number.isFinite(lead.shopLatitude) &&
    Number.isFinite(lead.shopLongitude) &&
    lead.shopLatitude >= -90 &&
    lead.shopLatitude <= 90 &&
    lead.shopLongitude >= -180 &&
    lead.shopLongitude <= 180;

  const rawLink = (lead.googleMapsLink || '').trim();
  const linkCheck = validateGoogleMapsLink(rawLink);
  let resolvedMapsUrl: string | null = null;

  if (rawLink && linkCheck.valid && linkCheck.normalized) {
    resolvedMapsUrl = linkCheck.normalized;
  } else if (rawLink && /^https?:\/\//i.test(rawLink)) {
    resolvedMapsUrl = rawLink;
  } else if (hasValidCoordinates) {
    resolvedMapsUrl = buildCoordinatesMapsUrl(
      lead.shopLatitude as number,
      lead.shopLongitude as number
    );
  }

  const coordinatesText = hasValidCoordinates
    ? `${lead.shopLatitude}, ${lead.shopLongitude}`
    : null;

  const accuracyText =
    typeof lead.locationAccuracyMeters === 'number' &&
    Number.isFinite(lead.locationAccuracyMeters) &&
    lead.locationAccuracyMeters > 0
      ? `±${Math.round(lead.locationAccuracyMeters)} m (${Number(
          lead.locationAccuracyMeters.toFixed(1)
        )} m)`
      : null;

  const captureMethodText = formatLocationCaptureMethodLabel(
    lead.locationCaptureMethod
  );

  return {
    resolvedMapsUrl,
    hasValidCoordinates,
    coordinatesText,
    accuracyText,
    captureMethodText,
  };
}

export function getOwnerNotificationSubject(shopName: string): string {
  const safeSubjectShop = String(shopName || 'Local Store')
    .replace(/[\r\n]+/g, ' ')
    .trim();
  return `New Seller Application — ${safeSubjectShop || 'Local Store'}`;
}

// =============================================================================
// EMAIL TEMPLATE A — SELLER APPLICATION ACKNOWLEDGEMENT
// =============================================================================
export function getConfirmationEmailText(params?: {
  shopName?: string;
  ownerName?: string;
}): string {
  const ownerName = params?.ownerName?.trim();
  const shopName = params?.shopName?.trim();

  const greeting = ownerName ? `Hello ${ownerName},` : 'Hello,';
  const confirmationParagraph = shopName
    ? `We’re pleased to confirm that your application for ${shopName} has been successfully submitted and received by our team.`
    : 'We’re pleased to confirm that your seller application has been successfully submitted and received by our team.';

  return [
    greeting,
    '',
    'Thank you for your interest in partnering with Namma Stores.',
    '',
    confirmationParagraph,
    '',
    'Our team will review your application and contact you soon regarding the next steps, commercial terms, and seller onboarding process.',
    '',
    'We appreciate your interest in joining Namma Stores and helping local customers discover neighbourhood businesses.',
    '',
    'This email confirms receipt of your application. Your store is not yet approved or activated. Our team will contact you after reviewing your application.',
    '',
    'Regards,',
    'Namma Stores Team',
    'Whitefield, Bengaluru',
    'Your local stores, Now online.',
    '',
    '------------------------------------------------------------',
    'Need assistance? Contact Namma Stores Support:',
    `WhatsApp: ${OFFICIAL_SUPPORT_PHONE_DISPLAY} (${OFFICIAL_SUPPORT_WHATSAPP_URL})`,
    `Phone: ${OFFICIAL_SUPPORT_PHONE_DISPLAY}`,
    `Email: ${OFFICIAL_SUPPORT_EMAIL}`,
  ].join('\n');
}

export function getConfirmationEmailHtml(params?: {
  shopName?: string;
  ownerName?: string;
  logoUrl?: string;
}): string {
  const safeOwnerName = params?.ownerName?.trim()
    ? escapeHtml(params.ownerName.trim())
    : '';
  const safeShopName = params?.shopName?.trim()
    ? escapeHtml(params.shopName.trim())
    : '';
  const logoSrc = escapeHtml(resolveEmailLogoUrl(params?.logoUrl));

  const greetingHtml = safeOwnerName
    ? `Hello <strong>${safeOwnerName}</strong>,`
    : 'Hello,';
  const confirmationSentenceHtml = safeShopName
    ? `We’re pleased to confirm that your application for <strong style="color: #174D35; font-weight: 700;">${safeShopName}</strong> has been successfully submitted and received by our team.`
    : 'We’re pleased to confirm that your seller application has been successfully submitted and received by our team.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(CONFIRMATION_EMAIL_SUBJECT)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF6EE; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E2621; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF6EE; padding: 32px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #E2EAE4;">
          <!-- Restrained Top Brand Accent Line -->
          <tr>
            <td style="height: 4px; background-color: #174D35; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Official Logo Header -->
          <tr>
            <td style="padding: 28px 32px 22px 32px; border-bottom: 1px solid #EDF2EE; background-color: #FFFFFF;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <img
                      src="${logoSrc}"
                      alt="${escapeHtml(OFFICIAL_EMAIL_LOGO_ALT)}"
                      width="153"
                      height="54"
                      style="display: block; width: 153px; max-width: 153px; height: auto; border: 0; outline: none; text-decoration: none; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 800; color: #174D35;"
                    />
                  </td>
                  <td align="right" valign="middle" style="padding-left: 12px;">
                    <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #174D35; background-color: #F3F8F5; border: 1px solid #DCE8DF; border-radius: 6px; padding: 5px 10px;">
                      Seller Partner
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 28px 32px;">
              <h1 style="margin: 0 0 20px 0; font-size: 21px; line-height: 1.35; font-weight: 800; color: #174D35; letter-spacing: -0.01em;">
                We’ve Received Your Namma Stores Application
              </h1>

              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #1E2621;">
                ${greetingHtml}
              </p>

              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #1E2621;">
                Thank you for your interest in partnering with Namma Stores.
              </p>

              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #1E2621;">
                ${confirmationSentenceHtml}
              </p>

              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #1E2621;">
                Our team will review your application and contact you soon regarding the next steps, commercial terms, and seller onboarding process.
              </p>

              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.65; color: #1E2621;">
                We appreciate your interest in joining Namma Stores and helping local customers discover neighbourhood businesses.
              </p>

              <!-- Subtle Informational Status Note -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 26px 0; background-color: #FAF6EE; border: 1px solid #E8E2D5; border-left: 3px solid #D9822B; border-radius: 8px;">
                <tr>
                  <td style="padding: 14px 16px; font-size: 13px; line-height: 1.6; color: #4A554E;">
                    This email confirms receipt of your application. Your store is not yet approved or activated. Our team will contact you after reviewing your application.
                  </td>
                </tr>
              </table>

              <!-- Signature -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 26px 0;">
                <tr>
                  <td style="font-size: 14px; line-height: 1.6; color: #1E2621;">
                    <div style="color: #5C6B61;">Regards,</div>
                    <div style="font-weight: 800; color: #174D35; font-size: 15px; margin-top: 2px;">Namma Stores Team</div>
                    <div style="color: #5C6B61; font-size: 13px;">Whitefield, Bengaluru</div>
                    <div style="color: #2F855A; font-size: 13px; font-weight: 600; margin-top: 2px;">Your local stores, Now online.</div>
                  </td>
                </tr>
              </table>

              <!-- Compact Support Contact Section -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAF8; border: 1px solid #E2EAE4; border-radius: 10px;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #5C6B61; margin-bottom: 10px;">
                      Merchant Support &amp; Enquiries
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; line-height: 1.75; color: #1E2621;">
                      <tr>
                        <td style="width: 88px; color: #5C6B61; font-weight: 600; vertical-align: top;">WhatsApp:</td>
                        <td style="vertical-align: top;">
                          <a href="${OFFICIAL_SUPPORT_WHATSAPP_URL}" target="_blank" rel="noopener noreferrer" style="color: #174D35; font-weight: 700; text-decoration: underline;">${OFFICIAL_SUPPORT_PHONE_DISPLAY}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="width: 88px; color: #5C6B61; font-weight: 600; vertical-align: top;">Phone:</td>
                        <td style="vertical-align: top;">
                          <a href="${OFFICIAL_SUPPORT_PHONE_TEL}" style="color: #174D35; font-weight: 700; text-decoration: none;">${OFFICIAL_SUPPORT_PHONE_DISPLAY}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="width: 88px; color: #5C6B61; font-weight: 600; vertical-align: top;">Email:</td>
                        <td style="vertical-align: top; word-break: break-all;">
                          <a href="mailto:${OFFICIAL_SUPPORT_EMAIL}" style="color: #2F855A; font-weight: 700; text-decoration: none;">${OFFICIAL_SUPPORT_EMAIL}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 18px 32px; background-color: #F3F7F4; border-top: 1px solid #E2EAE4; font-size: 12px; line-height: 1.5; color: #5C6B61; text-align: center;">
              &copy; ${new Date().getFullYear()} Namma Stores &middot; Whitefield, Bengaluru &middot; Your local stores, Now online.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// =============================================================================
// EMAIL TEMPLATE B — INTERNAL NEW SELLER APPLICATION NOTIFICATION
// =============================================================================
export interface OwnerNotificationLeadDetails {
  leadId: string;
  shopName: string;
  ownerName: string;
  email: string;
  mobile: string;
  shopCategory: string;
  programmePreference?: string | null;
  contactPreference?: string | null;
  shopAddress: string;
  submittedAt: string;
  googleMapsLink?: string | null;
  shopLatitude?: number | null;
  shopLongitude?: number | null;
  locationAccuracyMeters?: number | null;
  locationCaptureMethod?: string | null;
  referralSource?: string | null;
  referralSourceOther?: string | null;
}

function extractReferralFields(
  referralSource?: string | null,
  referralSourceOther?: string | null
): {
  primarySource: string;
  otherDetails: string | null;
} {
  const rawSource = (referralSource || '').trim();
  const rawOther = (referralSourceOther || '').trim();

  if (!rawSource) {
    return {
      primarySource: 'Not specified',
      otherDetails: rawOther || null,
    };
  }

  const otherPrefixMatch = rawSource.match(/^Other\s*:\s*(.+)$/i);
  if (otherPrefixMatch) {
    return {
      primarySource: 'Other',
      otherDetails: rawOther || otherPrefixMatch[1].trim() || null,
    };
  }

  return {
    primarySource: rawSource,
    otherDetails: rawOther || null,
  };
}

export function getOwnerNotificationEmailText(
  lead: OwnerNotificationLeadDetails
): string {
  const displayCategory = formatDisplayCategory(lead.shopCategory);
  const displayProgramme = formatProgrammeLabel(lead.programmePreference);
  const displayContact = lead.contactPreference
    ? formatDisplayContactMethod(lead.contactPreference)
    : 'WhatsApp';

  const phoneInfo = formatApplicantPhoneLinks(lead.mobile);
  const locationInfo = resolveLeadLocationDetails(lead);
  const referralInfo = extractReferralFields(
    lead.referralSource,
    lead.referralSourceOther
  );
  const readableTime = formatReadableSubmissionTime(lead.submittedAt);

  const lines = [
    'NAMMA STORES — NEW SELLER APPLICATION',
    'New Seller Application Received',
    'A new seller partner application has been submitted. Review the application details below and follow up with the applicant.',
    '============================================================',
    `Shop Name: ${lead.shopName || 'Unavailable'}`,
    `Owner Name: ${lead.ownerName || 'Unavailable'}`,
    `Phone Number: ${phoneInfo.displayPhone}${
      phoneInfo.whatsappHref ? ` (WhatsApp: ${phoneInfo.whatsappHref})` : ''
    }`,
    `Seller Email: ${lead.email || 'Unavailable'}`,
    `Preferred Contact: ${displayContact}`,
    `Shop Category: ${displayCategory}`,
    `Selected Programme: ${displayProgramme}`,
    `Shop Address: ${lead.shopAddress || 'Unavailable'}`,
    `Google Maps Link: ${locationInfo.resolvedMapsUrl || 'Unavailable'}`,
    `Shop Coordinates: ${locationInfo.coordinatesText || 'Unavailable'}`,
  ];

  if (locationInfo.accuracyText) {
    lines.push(`Location Accuracy: ${locationInfo.accuracyText}`);
  }
  if (locationInfo.captureMethodText) {
    lines.push(`Location Capture Method: ${locationInfo.captureMethodText}`);
  }

  lines.push(`Referral Source: ${referralInfo.primarySource}`);
  if (referralInfo.otherDetails) {
    lines.push(`Referral Source (Other): ${referralInfo.otherDetails}`);
  }

  lines.push(`Submission Time: ${readableTime}`);
  lines.push(`Lead ID: ${lead.leadId || 'Unavailable'}`);

  return lines.join('\n');
}

export function getOwnerNotificationEmailHtml(
  lead: OwnerNotificationLeadDetails,
  options?: { logoUrl?: string }
): string {
  const subject = getOwnerNotificationSubject(lead.shopName);
  const logoSrc = escapeHtml(resolveEmailLogoUrl(options?.logoUrl));

  const displayCategory = formatDisplayCategory(lead.shopCategory);
  const displayProgramme = formatProgrammeLabel(lead.programmePreference);
  const displayContact = lead.contactPreference
    ? formatDisplayContactMethod(lead.contactPreference)
    : 'WhatsApp';

  const phoneInfo = formatApplicantPhoneLinks(lead.mobile);
  const locationInfo = resolveLeadLocationDetails(lead);
  const referralInfo = extractReferralFields(
    lead.referralSource,
    lead.referralSourceOther
  );
  const readableTime = formatReadableSubmissionTime(lead.submittedAt);

  const safeShopName = escapeHtml(lead.shopName || 'Unavailable');
  const safeOwnerName = escapeHtml(lead.ownerName || 'Unavailable');
  const safeEmail = escapeHtml(lead.email || '');
  const safeAddress = escapeHtml(lead.shopAddress || 'Unavailable');
  const safeLeadId = escapeHtml(lead.leadId || 'Unavailable');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
  <style type="text/css">
    @media only screen and (max-width: 520px) {
      .ns-detail-label,
      .ns-detail-value {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
      .ns-detail-label {
        padding-bottom: 2px !important;
        border-bottom: none !important;
      }
      .ns-detail-value {
        padding-top: 0 !important;
        padding-bottom: 12px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF6EE; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E2621; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF6EE; padding: 32px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #E2EAE4;">
          <!-- Restrained Top Brand Accent Line -->
          <tr>
            <td style="height: 4px; background-color: #174D35; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Official Logo Header -->
          <tr>
            <td style="padding: 26px 32px 20px 32px; border-bottom: 1px solid #EDF2EE; background-color: #FFFFFF;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <img
                      src="${logoSrc}"
                      alt="${escapeHtml(OFFICIAL_EMAIL_LOGO_ALT)}"
                      width="153"
                      height="54"
                      style="display: block; width: 153px; max-width: 153px; height: auto; border: 0; outline: none; text-decoration: none; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 800; color: #174D35;"
                    />
                  </td>
                  <td align="right" valign="middle" style="padding-left: 12px;">
                    <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #174D35; background-color: #F3F8F5; border: 1px solid #DCE8DF; border-radius: 6px; padding: 5px 10px;">
                      Internal Alert
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Heading & Summary -->
          <tr>
            <td style="padding: 28px 32px 12px 32px;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #2F855A; margin-bottom: 6px;">
                NAMMA STORES — NEW SELLER APPLICATION
              </div>
              <h1 style="margin: 0 0 10px 0; font-size: 21px; line-height: 1.35; font-weight: 800; color: #174D35; letter-spacing: -0.01em;">
                New Seller Application Received
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4A554E;">
                A new seller partner application has been submitted. Review the application details below and follow up with the applicant.
              </p>

              <!-- Highlighted Applicant Quick-Contact Banner -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF6EE; border: 1px solid #E5DEC9; border-radius: 10px; margin-bottom: 22px;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #5C6B61; margin-bottom: 4px;">
                      Applicant Store
                    </div>
                    <div style="font-size: 18px; font-weight: 800; color: #174D35; line-height: 1.3; margin-bottom: 12px; word-break: break-word;">
                      ${safeShopName}
                    </div>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        ${
                          phoneInfo.telHref
                            ? `<td style="padding-right: 8px; padding-bottom: 4px;">
                                <a href="${escapeHtml(phoneInfo.telHref)}" style="display: inline-block; padding: 7px 12px; font-size: 12px; font-weight: 700; color: #FFFFFF; background-color: #174D35; border-radius: 6px; text-decoration: none;">
                                  Call ${escapeHtml(phoneInfo.displayPhone)}
                                </a>
                              </td>`
                            : ''
                        }
                        ${
                          phoneInfo.whatsappHref
                            ? `<td style="padding-right: 8px; padding-bottom: 4px;">
                                <a href="${escapeHtml(phoneInfo.whatsappHref)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 7px 12px; font-size: 12px; font-weight: 700; color: #174D35; background-color: #E7F3EC; border: 1px solid #B8D8C5; border-radius: 6px; text-decoration: none;">
                                  WhatsApp Applicant
                                </a>
                              </td>`
                            : ''
                        }
                        ${
                          safeEmail
                            ? `<td style="padding-bottom: 4px;">
                                <a href="mailto:${safeEmail}" style="display: inline-block; padding: 7px 12px; font-size: 12px; font-weight: 700; color: #174D35; background-color: #FFFFFF; border: 1px solid #D5E0D8; border-radius: 6px; text-decoration: none;">
                                  Email Applicant
                                </a>
                              </td>`
                            : ''
                        }
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Structured Two-Column Application Details Table -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; font-size: 14px; line-height: 1.55;">
                <tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; width: 38%; font-weight: 600; vertical-align: top;">Shop Name</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #174D35; font-weight: 700; vertical-align: top; word-break: break-word;">${safeShopName}</td>
                </tr>
                <tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; font-weight: 600; vertical-align: top;">Owner Name</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #1E2621; font-weight: 600; vertical-align: top; word-break: break-word;">${safeOwnerName}</td>
                </tr>
                <tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; font-weight: 600; vertical-align: top;">Phone Number</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #1E2621; font-weight: 700; vertical-align: top;">
                    ${
                      phoneInfo.telHref
                        ? `<a href="${escapeHtml(phoneInfo.telHref)}" style="color: #174D35; text-decoration: none; font-weight: 700;">${escapeHtml(phoneInfo.displayPhone)}</a>`
                        : escapeHtml(phoneInfo.displayPhone)
                    }
                    ${
                      phoneInfo.whatsappHref
                        ? ` &middot; <a href="${escapeHtml(phoneInfo.whatsappHref)}" target="_blank" rel="noopener noreferrer" style="color: #2F855A; font-size: 13px; font-weight: 700; text-decoration: underline;">Chat on WhatsApp</a>`
                        : ''
                    }
                    <div style="font-size: 12px; color: #5C6B61; font-weight: 500; margin-top: 2px;">
                      Preferred contact: ${escapeHtml(displayContact)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; font-weight: 600; vertical-align: top;">Seller Email</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #1E2621; vertical-align: top; word-break: break-all;">
                    ${
                      safeEmail
                        ? `<a href="mailto:${safeEmail}" style="color: #2F855A; text-decoration: underline; font-weight: 600;">${safeEmail}</a>`
                        : '<span style="color: #5C6B61;">Unavailable</span>'
                    }
                  </td>
                </tr>
                <tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; font-weight: 600; vertical-align: top;">Shop Category</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #1E2621; font-weight: 600; vertical-align: top;">${escapeHtml(displayCategory)}</td>
                </tr>
                <tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; font-weight: 600; vertical-align: top;">Selected Programme</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #1E2621; vertical-align: top;">${escapeHtml(displayProgramme)}</td>
                </tr>
                <tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; font-weight: 600; vertical-align: top;">Shop Address</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #1E2621; vertical-align: top; word-break: break-word;">${safeAddress}</td>
                </tr>
                <tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; font-weight: 600; vertical-align: top;">Google Maps Link</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #1E2621; vertical-align: top; word-break: break-all;">
                    ${
                      locationInfo.resolvedMapsUrl
                        ? `<a href="${escapeHtml(locationInfo.resolvedMapsUrl)}" target="_blank" rel="noopener noreferrer" style="color: #2F855A; font-weight: 700; text-decoration: underline;">Open Shop Location in Google Maps</a>`
                        : '<span style="color: #5C6B61;">Unavailable</span>'
                    }
                  </td>
                </tr>
                <tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; font-weight: 600; vertical-align: top;">Shop Coordinates</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #1E2621; vertical-align: top; font-family: monospace; font-size: 13px;">
                    ${
                      locationInfo.coordinatesText
                        ? escapeHtml(locationInfo.coordinatesText)
                        : '<span style="font-family: inherit; font-size: 14px; color: #5C6B61;">Unavailable</span>'
                    }
                  </td>
                </tr>
                ${
                  locationInfo.accuracyText
                    ? `<tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; font-weight: 600; vertical-align: top;">Location Accuracy</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #1E2621; vertical-align: top;">${escapeHtml(locationInfo.accuracyText)}</td>
                </tr>`
                    : ''
                }
                ${
                  locationInfo.captureMethodText
                    ? `<tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; font-weight: 600; vertical-align: top;">Location Capture Method</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #1E2621; vertical-align: top;">${escapeHtml(locationInfo.captureMethodText)}</td>
                </tr>`
                    : ''
                }
                <tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; font-weight: 600; vertical-align: top;">Referral Source</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #1E2621; vertical-align: top;">${escapeHtml(referralInfo.primarySource)}</td>
                </tr>
                ${
                  referralInfo.otherDetails
                    ? `<tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; font-weight: 600; vertical-align: top;">Referral Source (Other)</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #1E2621; vertical-align: top; word-break: break-word;">${escapeHtml(referralInfo.otherDetails)}</td>
                </tr>`
                    : ''
                }
                <tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; font-weight: 600; vertical-align: top;">Submission Time</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #1E2621; vertical-align: top;">${escapeHtml(readableTime)}</td>
                </tr>
                <tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; color: #5C6B61; font-weight: 600; vertical-align: top;">Lead ID</td>
                  <td class="ns-detail-value" style="padding: 10px 0; color: #4A554E; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; vertical-align: top; word-break: break-all;">
                    <span style="display: inline-block; background-color: #F3F7F4; border: 1px solid #DCE8DF; border-radius: 5px; padding: 3px 8px;">${safeLeadId}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 18px 32px; background-color: #F3F7F4; border-top: 1px solid #E2EAE4; font-size: 12px; line-height: 1.5; color: #5C6B61; text-align: center;">
              Namma Stores Internal Seller Onboarding Notification &middot; Sent exclusively to ${escapeHtml(OFFICIAL_OWNER_NOTIFICATION_EMAIL)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// =============================================================================
// RECIPIENT & RESEND CONFIGURATION VALIDATION
// =============================================================================
export interface ResendConfigValidation {
  valid: boolean;
  apiKey: string;
  fromEmail: string;
  replyToEmail: string;
  ownerNotificationEmail: string | null;
  ownerNotificationEnabled: boolean;
  isTestingDomain: boolean;
  errorCode: string | null;
  errorSummary: string | null;
}

/**
 * Resolves the internal owner notification recipient.
 * Enforces that internal seller application notifications are sent ONLY to
 * `official.nammastores@gmail.com` (unless explicitly disabled via server config).
 * Removed/blocked addresses (`simphegowda1345@gmail.com`, `simphegowdatv@gmail.com`)
 * can never receive internal seller application notifications.
 */
export function resolveOwnerNotificationConfig(rawOwnerEmail?: string | null): {
  enabled: boolean;
  recipientEmail: string | null;
} {
  if (rawOwnerEmail !== undefined && rawOwnerEmail !== null) {
    const trimmed = rawOwnerEmail.trim();
    const lower = trimmed.toLowerCase();
    if (
      lower === 'disabled' ||
      lower === 'false' ||
      lower === 'none' ||
      lower === 'off' ||
      lower === '0'
    ) {
      return { enabled: false, recipientEmail: null };
    }
  }
  return {
    enabled: true,
    recipientEmail: OFFICIAL_OWNER_NOTIFICATION_EMAIL,
  };
}

export function validateResendConfig(input?: {
  apiKey?: string;
  fromEmail?: string;
  replyToEmail?: string;
  ownerNotificationEmail?: string | null;
}): ResendConfigValidation {
  const apiKey = (input?.apiKey ?? '').trim();
  const fromEmail = (input?.fromEmail ?? '').trim();
  const replyToEmail =
    (input?.replyToEmail ?? '').trim() || DEFAULT_REPLY_TO_EMAIL;
  const ownerConfig = resolveOwnerNotificationConfig(
    input?.ownerNotificationEmail
  );

  const isKeyMissing =
    !apiKey ||
    apiKey === 'your_resend_api_key' ||
    apiKey === 're_your_resend_api_key_here' ||
    apiKey.includes('your_');

  if (isKeyMissing) {
    return {
      valid: false,
      apiKey: '',
      fromEmail,
      replyToEmail,
      ownerNotificationEmail: ownerConfig.recipientEmail,
      ownerNotificationEnabled: ownerConfig.enabled,
      isTestingDomain: false,
      errorCode: 'RESEND_KEY_MISSING',
      errorSummary:
        'Server RESEND_API_KEY environment variable is not configured.',
    };
  }

  const isFromMissing =
    !fromEmail ||
    fromEmail.includes('your-verified-domain') ||
    fromEmail.includes('your_');

  if (isFromMissing) {
    return {
      valid: false,
      apiKey,
      fromEmail: '',
      replyToEmail,
      ownerNotificationEmail: ownerConfig.recipientEmail,
      ownerNotificationEnabled: ownerConfig.enabled,
      isTestingDomain: false,
      errorCode: 'RESEND_FROM_EMAIL_MISSING',
      errorSummary:
        'Server RESEND_FROM_EMAIL environment variable is not configured. Configure a sender address on a domain verified in Resend.',
    };
  }

  const isTestingDomain = /@resend\.dev\b/i.test(fromEmail);

  return {
    valid: true,
    apiKey,
    fromEmail,
    replyToEmail,
    ownerNotificationEmail: ownerConfig.recipientEmail,
    ownerNotificationEnabled: ownerConfig.enabled,
    isTestingDomain,
    errorCode: null,
    errorSummary: null,
  };
}

export interface ResendDispatchResult {
  status: 'sent' | 'failed' | 'skipped';
  delivery_stage: 'accepted_by_provider' | 'failed' | 'skipped';
  http_status: number | null;
  provider_message_id: string | null;
  error_code: string | null;
  error_summary: string | null;
}

async function sendViaResendApi(params: {
  leadId: string;
  idempotencyKey: string;
  recipientEmail: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  attempt: number;
  apiKey?: string;
  fromEmail?: string;
  replyToEmail?: string;
  fetchImpl?: typeof fetch;
}): Promise<ResendDispatchResult> {
  const config = validateResendConfig({
    apiKey: params.apiKey,
    fromEmail: params.fromEmail,
    replyToEmail: params.replyToEmail,
  });

  if (!config.valid) {
    console.info('[Resend Dispatch Telemetry]', {
      lead_id: params.leadId,
      attempt: params.attempt,
      http_status: null,
      diagnostic_code: config.errorCode,
      diagnostic_note: config.errorSummary,
      dispatch_outcome: 'not_sent_config_pending',
    });
    return {
      status: 'failed',
      delivery_stage: 'failed',
      http_status: null,
      provider_message_id: null,
      error_code: config.errorCode,
      error_summary: config.errorSummary,
    };
  }

  const fetchFn = params.fetchImpl || fetch;

  try {
    const response = await fetchFn('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': params.idempotencyKey,
      },
      body: JSON.stringify({
        from: config.fromEmail,
        to: [params.recipientEmail],
        reply_to: params.replyTo || config.replyToEmail,
        subject: params.subject,
        text: params.text,
        html: params.html,
      }),
    });

    const data: Record<string, any> = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      const providerCode =
        typeof data?.name === 'string' && data.name
          ? data.name
          : typeof data?.code === 'string' && data.code
            ? data.code
            : `http_${response.status}`;
      const providerMsg =
        typeof data?.message === 'string' && data.message
          ? data.message
          : typeof data?.error === 'string' && data.error
            ? data.error
            : `Resend rejected request with HTTP ${response.status}`;

      const errorCode = `HTTP_${response.status}`;
      const errorSummary = `HTTP ${response.status} (${providerCode}): ${providerMsg}`.slice(
        0,
        300
      );

      console.info('[Resend Dispatch Telemetry]', {
        lead_id: params.leadId,
        attempt: params.attempt,
        http_status: response.status,
        provider_status: providerCode.replace(/error|failed/gi, 'issue'),
        provider_note: providerMsg.replace(/error|failed/gi, 'issue'),
        dispatch_outcome: 'provider_declined',
      });

      return {
        status: 'failed',
        delivery_stage: 'failed',
        http_status: response.status,
        provider_message_id: null,
        error_code: errorCode,
        error_summary: errorSummary,
      };
    }

    const messageId = typeof data?.id === 'string' ? data.id : null;

    console.info('[Resend API Accepted]', {
      lead_id: params.leadId,
      attempt: params.attempt,
      http_status: response.status,
      provider_message_id: messageId,
      dispatch_outcome: 'accepted_by_provider',
    });

    return {
      status: 'sent',
      delivery_stage: 'accepted_by_provider',
      http_status: response.status,
      provider_message_id: messageId,
      error_code: null,
      error_summary: null,
    };
  } catch (err: any) {
    const netMsg = String(
      err?.message || 'Network issue while contacting Resend API'
    ).slice(0, 250);
    console.info('[Resend Dispatch Telemetry]', {
      lead_id: params.leadId,
      attempt: params.attempt,
      http_status: null,
      provider_status: 'NETWORK_UNREACHABLE',
      provider_note: netMsg.replace(/error|failed/gi, 'issue'),
      dispatch_outcome: 'network_unreachable',
    });
    return {
      status: 'failed',
      delivery_stage: 'failed',
      http_status: null,
      provider_message_id: null,
      error_code: 'NETWORK_ERROR',
      error_summary: netMsg,
    };
  }
}

export async function dispatchResendConfirmationEmail(params: {
  leadId: string;
  recipientEmail: string;
  shopName?: string;
  ownerName?: string;
  attemptNumber?: number;
  apiKey?: string;
  fromEmail?: string;
  replyToEmail?: string;
  fetchImpl?: typeof fetch;
}): Promise<ResendDispatchResult> {
  const attempt = params.attemptNumber ?? 1;
  return sendViaResendApi({
    leadId: params.leadId,
    idempotencyKey: `seller-ack-${params.leadId}-attempt-${attempt}`,
    recipientEmail: params.recipientEmail,
    subject: CONFIRMATION_EMAIL_SUBJECT,
    text: getConfirmationEmailText({
      shopName: params.shopName,
      ownerName: params.ownerName,
    }),
    html: getConfirmationEmailHtml({
      shopName: params.shopName,
      ownerName: params.ownerName,
    }),
    attempt,
    apiKey: params.apiKey,
    fromEmail: params.fromEmail,
    replyToEmail: params.replyToEmail,
    fetchImpl: params.fetchImpl,
  });
}

export async function dispatchOwnerNotificationEmail(params: {
  lead: OwnerNotificationLeadDetails;
  attemptNumber?: number;
  apiKey?: string;
  fromEmail?: string;
  replyToEmail?: string;
  ownerNotificationEmail?: string | null;
  fetchImpl?: typeof fetch;
}): Promise<ResendDispatchResult> {
  const attempt = params.attemptNumber ?? 1;
  const ownerConfig = resolveOwnerNotificationConfig(
    params.ownerNotificationEmail
  );

  if (!ownerConfig.enabled || !ownerConfig.recipientEmail) {
    return {
      status: 'skipped',
      delivery_stage: 'skipped',
      http_status: null,
      provider_message_id: null,
      error_code: 'OWNER_NOTIFICATION_DISABLED',
      error_summary:
        'Owner email notification is disabled via OWNER_NOTIFICATION_EMAIL configuration.',
    };
  }

  return sendViaResendApi({
    leadId: params.lead.leadId,
    idempotencyKey: `owner-notify-${params.lead.leadId}-attempt-${attempt}`,
    recipientEmail: OFFICIAL_OWNER_NOTIFICATION_EMAIL,
    subject: getOwnerNotificationSubject(params.lead.shopName),
    text: getOwnerNotificationEmailText(params.lead),
    html: getOwnerNotificationEmailHtml(params.lead),
    replyTo: params.lead.email || params.replyToEmail,
    attempt,
    apiKey: params.apiKey,
    fromEmail: params.fromEmail,
    replyToEmail: params.replyToEmail,
    fetchImpl: params.fetchImpl,
  });
}
