// =============================================================================
// NAMMA STORES SELLER PARTNER — SUPABASE EDGE FUNCTION: submit-seller-lead
// Runtime: Supabase Edge Runtime (Deno)
// Features:
//  - Validates seller application fields including referral_source & location
//  - Rate limiting & IP hashing
//  - Idempotency & duplicate submission protection with independent email retry
//  - Saves lead to public.seller_leads FIRST (without admin/call_notes columns)
//  - Attempts Seller Acknowledgement & Owner Notification independently via Resend
//  - Escapes all dynamic HTML values safely
//  - Records notification attempts in public.seller_lead_notifications and events in public.seller_lead_events
// =============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const VALID_CATEGORIES = new Set([
  'grocery',
  'meat_fish_chicken',
  'fruits_vegetables',
  'milk_dairy',
  'puja_flowers',
  'other_multiple',
]);

const DISPLAY_CATEGORY_LABELS: Record<string, string> = {
  grocery: 'Grocery',
  meat_fish_chicken: 'Chicken, meat and fish',
  fruits_vegetables: 'Fruits and vegetables',
  milk_dairy: 'Milk and dairy products',
  puja_flowers: 'Puja items and flowers',
  other_multiple: 'Other or multiple categories',
};

const VALID_CONTACTS = new Set(['whatsapp', 'phone']);

const VALID_REFERRAL_SOURCES = new Set([
  'Instagram',
  'Facebook',
  'WhatsApp Group',
  'Google Search',
  'Friends or Family',
  'Visited by Namma Stores Team',
  'Local Community',
  'Poster or Flyer',
  'Other',
]);

const REFERRAL_ALIAS_MAP: Record<string, string> = {
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

const CONFIRMATION_EMAIL_SUBJECT =
  'We’ve Received Your Namma Stores Application';
const OFFICIAL_OWNER_NOTIFICATION_EMAIL = 'official.nammastores@gmail.com';
const DEFAULT_OWNER_NOTIFICATION_EMAIL = OFFICIAL_OWNER_NOTIFICATION_EMAIL;
const OFFICIAL_SUPPORT_PHONE_DISPLAY = '+91 9180567632';
const OFFICIAL_SUPPORT_PHONE_TEL = 'tel:+919180567632';
const OFFICIAL_SUPPORT_WHATSAPP_URL = 'https://wa.me/919180567632';
const OFFICIAL_SUPPORT_EMAIL = 'official.nammastores@gmail.com';
const OFFICIAL_EMAIL_LOGO_URL =
  'https://txmrfheminuminggtwfv.supabase.co/storage/v1/object/public/brand-assets/namma-stores-logo.png';
const OFFICIAL_EMAIL_LOGO_ALT =
  'Namma Stores — Your local stores, Now online';

function escapeHtml(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveEmailLogoUrl(): string {
  const custom = (Deno.env.get('EMAIL_LOGO_URL') || '').trim();
  return /^https:\/\//i.test(custom) ? custom : OFFICIAL_EMAIL_LOGO_URL;
}

function formatProgrammeLabel(rawProgramme?: string | null): string {
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

function formatLocationCaptureMethodLabel(
  rawMethod?: string | null
): string | null {
  const cleaned = (rawMethod || '').trim().toLowerCase();
  if (!cleaned) return null;
  if (cleaned === 'device_geolocation' || cleaned === 'browser_geolocation') {
    return 'Device Geolocation';
  }
  if (cleaned === 'google_maps_link' || cleaned === 'manual_google_maps_link') {
    return 'Google Maps Link';
  }
  if (cleaned === 'manual_address' || cleaned === 'manual_address_only') {
    return 'Manual Address';
  }
  return rawMethod?.trim() || null;
}

function formatReadableSubmissionTime(rawTimestamp?: string | null): string {
  const raw = (rawTimestamp || '').trim();
  if (!raw) return 'Unavailable';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
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

function getOwnerNotificationSubject(shopName: string): string {
  const safeSubjectShop = String(shopName || 'Local Store')
    .replace(/[\r\n]+/g, ' ')
    .trim();
  return `New Seller Application — ${safeSubjectShop || 'Local Store'}`;
}

function getConfirmationEmailText(shopName?: string, ownerName?: string): string {
  const greeting = ownerName?.trim() ? `Hello ${ownerName.trim()},` : 'Hello,';
  const confirmationParagraph = shopName?.trim()
    ? `We’re pleased to confirm that your application for ${shopName.trim()} has been successfully submitted and received by our team.`
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

function getConfirmationEmailHtml(shopName?: string, ownerName?: string): string {
  const safeOwnerName = ownerName?.trim() ? escapeHtml(ownerName.trim()) : '';
  const safeShopName = shopName?.trim() ? escapeHtml(shopName.trim()) : '';
  const logoSrc = escapeHtml(resolveEmailLogoUrl());

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
          <tr>
            <td style="height: 4px; background-color: #174D35; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
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
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 26px 0; background-color: #FAF6EE; border: 1px solid #E8E2D5; border-left: 3px solid #D9822B; border-radius: 8px;">
                <tr>
                  <td style="padding: 14px 16px; font-size: 13px; line-height: 1.6; color: #4A554E;">
                    This email confirms receipt of your application. Your store is not yet approved or activated. Our team will contact you after reviewing your application.
                  </td>
                </tr>
              </table>
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

interface OwnerEmailLeadData {
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

function getOwnerNotificationEmailText(lead: OwnerEmailLeadData): string {
  const displayCategory =
    DISPLAY_CATEGORY_LABELS[lead.shopCategory] || lead.shopCategory || 'Unavailable';
  const displayProgramme = formatProgrammeLabel(lead.programmePreference);
  const displayContact =
    lead.contactPreference === 'phone' ? 'Phone Call' : 'WhatsApp';
  const tenDigit = normalizeMobile(lead.mobile);
  const formattedPhone = tenDigit ? `+91 ${tenDigit}` : lead.mobile || 'Unavailable';
  const whatsappUrl = tenDigit ? `https://wa.me/91${tenDigit}` : null;

  const hasValidCoords =
    typeof lead.shopLatitude === 'number' &&
    typeof lead.shopLongitude === 'number' &&
    Number.isFinite(lead.shopLatitude) &&
    Number.isFinite(lead.shopLongitude);
  const resolvedMapsUrl =
    lead.googleMapsLink && /^https?:\/\//i.test(lead.googleMapsLink.trim())
      ? lead.googleMapsLink.trim()
      : hasValidCoords
        ? `https://www.google.com/maps?q=${lead.shopLatitude},${lead.shopLongitude}`
        : null;
  const coordsText = hasValidCoords
    ? `${lead.shopLatitude}, ${lead.shopLongitude}`
    : 'Unavailable';
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
  const referralInfo = extractReferralFields(
    lead.referralSource,
    lead.referralSourceOther
  );
  const readableTime = formatReadableSubmissionTime(lead.submittedAt);

  return [
    'NAMMA STORES — NEW SELLER APPLICATION',
    'New Seller Application Received',
    'A new seller partner application has been submitted. Review the application details below and follow up with the applicant.',
    '============================================================',
    `Shop Name: ${lead.shopName || 'Unavailable'}`,
    `Owner Name: ${lead.ownerName || 'Unavailable'}`,
    `Phone Number: ${formattedPhone}${whatsappUrl ? ` (WhatsApp: ${whatsappUrl})` : ''}`,
    `Seller Email: ${lead.email || 'Unavailable'}`,
    `Preferred Contact: ${displayContact}`,
    `Shop Category: ${displayCategory}`,
    `Selected Programme: ${displayProgramme}`,
    `Shop Address: ${lead.shopAddress || 'Unavailable'}`,
    `Google Maps Link: ${resolvedMapsUrl || 'Unavailable'}`,
    `Shop Coordinates: ${coordsText}`,
    ...(accuracyText ? [`Location Accuracy: ${accuracyText}`] : []),
    ...(captureMethodText
      ? [`Location Capture Method: ${captureMethodText}`]
      : []),
    `Referral Source: ${referralInfo.primarySource}`,
    ...(referralInfo.otherDetails
      ? [`Referral Source (Other): ${referralInfo.otherDetails}`]
      : []),
    `Submission Time: ${readableTime}`,
    `Lead ID: ${lead.leadId || 'Unavailable'}`,
  ].join('\n');
}

function getOwnerNotificationEmailHtml(lead: OwnerEmailLeadData): string {
  const subject = getOwnerNotificationSubject(lead.shopName);
  const logoSrc = escapeHtml(resolveEmailLogoUrl());
  const displayCategory =
    DISPLAY_CATEGORY_LABELS[lead.shopCategory] || lead.shopCategory || 'Unavailable';
  const displayProgramme = formatProgrammeLabel(lead.programmePreference);
  const displayContact =
    lead.contactPreference === 'phone' ? 'Phone Call' : 'WhatsApp';
  const tenDigit = normalizeMobile(lead.mobile);
  const formattedPhone = tenDigit ? `+91 ${tenDigit}` : lead.mobile || 'Unavailable';
  const telHref = tenDigit ? `tel:+91${tenDigit}` : null;
  const whatsappHref = tenDigit ? `https://wa.me/91${tenDigit}` : null;

  const hasValidCoords =
    typeof lead.shopLatitude === 'number' &&
    typeof lead.shopLongitude === 'number' &&
    Number.isFinite(lead.shopLatitude) &&
    Number.isFinite(lead.shopLongitude);
  const resolvedMapsUrl =
    lead.googleMapsLink && /^https?:\/\//i.test(lead.googleMapsLink.trim())
      ? lead.googleMapsLink.trim()
      : hasValidCoords
        ? `https://www.google.com/maps?q=${lead.shopLatitude},${lead.shopLongitude}`
        : null;
  const coordsText = hasValidCoords
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
          <tr>
            <td style="height: 4px; background-color: #174D35; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
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
                          telHref
                            ? `<td style="padding-right: 8px; padding-bottom: 4px;">
                                <a href="${escapeHtml(telHref)}" style="display: inline-block; padding: 7px 12px; font-size: 12px; font-weight: 700; color: #FFFFFF; background-color: #174D35; border-radius: 6px; text-decoration: none;">
                                  Call ${escapeHtml(formattedPhone)}
                                </a>
                              </td>`
                            : ''
                        }
                        ${
                          whatsappHref
                            ? `<td style="padding-right: 8px; padding-bottom: 4px;">
                                <a href="${escapeHtml(whatsappHref)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 7px 12px; font-size: 12px; font-weight: 700; color: #174D35; background-color: #E7F3EC; border: 1px solid #B8D8C5; border-radius: 6px; text-decoration: none;">
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
                      telHref
                        ? `<a href="${escapeHtml(telHref)}" style="color: #174D35; text-decoration: none; font-weight: 700;">${escapeHtml(formattedPhone)}</a>`
                        : escapeHtml(formattedPhone)
                    }
                    ${
                      whatsappHref
                        ? ` &middot; <a href="${escapeHtml(whatsappHref)}" target="_blank" rel="noopener noreferrer" style="color: #2F855A; font-size: 13px; font-weight: 700; text-decoration: underline;">Chat on WhatsApp</a>`
                        : ''
                    }
                    <div style="font-size: 12px; color: #5C6B61; font-weight: 500; margin-top: 2px;">Preferred contact: ${escapeHtml(displayContact)}</div>
                  </td>
                </tr>
                <tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; font-weight: 600; vertical-align: top;">Seller Email</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #1E2621; vertical-align: top; word-break: break-all;">
                    <a href="mailto:${safeEmail}" style="color: #2F855A; text-decoration: underline; font-weight: 600;">${safeEmail}</a>
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
                      resolvedMapsUrl
                        ? `<a href="${escapeHtml(resolvedMapsUrl)}" target="_blank" rel="noopener noreferrer" style="color: #2F855A; font-weight: 700; text-decoration: underline;">Open Shop Location in Google Maps</a>`
                        : '<span style="color: #5C6B61;">Unavailable</span>'
                    }
                  </td>
                </tr>
                <tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; font-weight: 600; vertical-align: top;">Shop Coordinates</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #1E2621; vertical-align: top; font-family: monospace; font-size: 13px;">
                    ${
                      coordsText
                        ? escapeHtml(coordsText)
                        : '<span style="font-family: inherit; font-size: 14px; color: #5C6B61;">Unavailable</span>'
                    }
                  </td>
                </tr>
                ${
                  accuracyText
                    ? `<tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; font-weight: 600; vertical-align: top;">Location Accuracy</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #1E2621; vertical-align: top;">${escapeHtml(accuracyText)}</td>
                </tr>`
                    : ''
                }
                ${
                  captureMethodText
                    ? `<tr>
                  <td class="ns-detail-label" style="padding: 10px 12px 10px 0; border-bottom: 1px solid #EDF2EE; color: #5C6B61; font-weight: 600; vertical-align: top;">Location Capture Method</td>
                  <td class="ns-detail-value" style="padding: 10px 0; border-bottom: 1px solid #EDF2EE; color: #1E2621; vertical-align: top;">${escapeHtml(captureMethodText)}</td>
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

function sanitizeText(val: unknown, maxLen = 300): string {
  if (typeof val !== 'string') return '';
  return val
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, maxLen);
}

function normalizeReferral(
  rawSource: unknown,
  rawOther?: unknown
): { valid: boolean; value: string | null } {
  if (rawSource === undefined || rawSource === null || rawSource === '') {
    return { valid: true, value: null };
  }
  const cleaned = sanitizeText(rawSource, 160);
  if (!cleaned) return { valid: true, value: null };

  if (/^other\s*[:\-–—]\s*(.+)$/i.test(cleaned)) {
    const match = cleaned.match(/^other\s*[:\-–—]\s*(.+)$/i);
    const customDetail = sanitizeText(match ? match[1] : '', 120);
    return {
      valid: true,
      value: customDetail ? `Other: ${customDetail}` : 'Other',
    };
  }

  const matched = VALID_REFERRAL_SOURCES.has(cleaned)
    ? cleaned
    : REFERRAL_ALIAS_MAP[cleaned.toLowerCase()];

  if (!matched) {
    return { valid: false, value: null };
  }

  if (matched === 'Other') {
    const otherDetail = sanitizeText(rawOther, 120);
    return {
      valid: true,
      value: otherDetail ? `Other: ${otherDetail}` : 'Other',
    };
  }

  return { valid: true, value: matched };
}

function normalizeMobile(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let cleaned = raw.trim().replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+91')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('91') && cleaned.length === 12)
    cleaned = cleaned.slice(2);
  else if (cleaned.startsWith('0') && cleaned.length === 11)
    cleaned = cleaned.slice(1);
  if (!/^[6-9]\d{9}$/.test(cleaned)) return null;
  return cleaned;
}

function isValidEmail(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  const trimmed = raw.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
    trimmed
  );
}

function isValidUuid(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    val.trim()
  );
}

function validateGoogleMapsUrl(raw: unknown): {
  valid: boolean;
  normalized: string;
} {
  if (raw === undefined || raw === null || raw === '') {
    return { valid: true, normalized: '' };
  }
  if (typeof raw !== 'string') return { valid: false, normalized: '' };
  const trimmed = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!trimmed) return { valid: true, normalized: '' };
  if (trimmed.length > 500) return { valid: false, normalized: '' };
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, normalized: '' };
    }
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    const isShort =
      host === 'maps.app.goo.gl' ||
      host === 'app.goo.gl' ||
      (host === 'goo.gl' && pathname.startsWith('/maps'));
    const isSubdomain =
      host === 'maps.google.com' || /^maps\.google\.[a-z.]{2,6}$/.test(host);
    const isGoogleMapsPath =
      (host === 'google.com' ||
        host === 'www.google.com' ||
        /^(?:www\.)?google\.[a-z.]{2,6}$/.test(host)) &&
      pathname.startsWith('/maps');
    if (!isShort && !isSubdomain && !isGoogleMapsPath) {
      return { valid: false, normalized: '' };
    }
    return { valid: true, normalized: parsed.toString() };
  } catch {
    return { valid: false, normalized: '' };
  }
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

interface EdgeEmailDispatchOutcome {
  status: 'sent' | 'failed' | 'skipped';
  deliveryStage: 'accepted_by_provider' | 'failed' | 'skipped';
  providerMessageId: string | null;
  errorCode: string | null;
  errorSummary: string | null;
  attemptedAt: string;
  sentAt: string | null;
}

async function sendResendEmail(params: {
  leadId: string;
  idempotencyKey: string;
  recipientEmail: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}): Promise<EdgeEmailDispatchOutcome> {
  const resendApiKey = (Deno.env.get('RESEND_API_KEY') || '').trim();
  const resendFrom = (
    Deno.env.get('RESEND_FROM_EMAIL') ||
    Deno.env.get('EMAIL_FROM') ||
    ''
  ).trim();
  const resendReplyTo = (
    params.replyTo ||
    Deno.env.get('RESEND_REPLY_TO_EMAIL') ||
    'official.nammastores@gmail.com'
  ).trim();

  const attemptedAt = new Date().toISOString();

  if (
    !resendApiKey ||
    resendApiKey === 'your_resend_api_key' ||
    resendApiKey.includes('your_')
  ) {
    const summary = 'RESEND_API_KEY not configured in Edge Function secrets.';
    return {
      status: 'failed',
      deliveryStage: 'failed',
      providerMessageId: null,
      errorCode: 'RESEND_KEY_MISSING',
      errorSummary: summary,
      attemptedAt,
      sentAt: null,
    };
  }

  if (
    !resendFrom ||
    resendFrom.includes('your-verified-domain') ||
    resendFrom.includes('your_')
  ) {
    const summary =
      'RESEND_FROM_EMAIL not configured with a verified Resend sender domain.';
    return {
      status: 'failed',
      deliveryStage: 'failed',
      providerMessageId: null,
      errorCode: 'RESEND_FROM_EMAIL_MISSING',
      errorSummary: summary,
      attemptedAt,
      sentAt: null,
    };
  }

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': params.idempotencyKey,
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [params.recipientEmail],
        reply_to: resendReplyTo,
        subject: params.subject,
        text: params.text,
        html: params.html,
      }),
    });

    const resendData = await resendRes.json().catch(() => ({}));
    if (resendRes.ok) {
      return {
        status: 'sent',
        deliveryStage: 'accepted_by_provider',
        providerMessageId: resendData.id || null,
        errorCode: null,
        errorSummary: null,
        attemptedAt,
        sentAt: new Date().toISOString(),
      };
    } else {
      const errorCode = `HTTP_${resendRes.status}`;
      const errorSummary = `HTTP ${resendRes.status} (${
        resendData.name || 'resend_error'
      }): ${resendData.message || 'Resend API returned an error'}`.slice(
        0,
        300
      );
      return {
        status: 'failed',
        deliveryStage: 'failed',
        providerMessageId: null,
        errorCode,
        errorSummary,
        attemptedAt,
        sentAt: null,
      };
    }
  } catch (err) {
    const errorSummary =
      err instanceof Error ? err.message : 'Resend network issue';
    return {
      status: 'failed',
      deliveryStage: 'failed',
      providerMessageId: null,
      errorCode: 'RESEND_NETWORK_ERROR',
      errorSummary,
      attemptedAt,
      sentAt: null,
    };
  }
}

Deno.serve(async (req: Request) => {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON request body.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Honeypot check
    if (
      typeof body.website_url === 'string' &&
      body.website_url.trim().length > 0
    ) {
      return new Response(JSON.stringify({ ok: true, success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const shopName = sanitizeText(body.shop_name, 120);
    const ownerName = sanitizeText(body.owner_name, 100);
    const mobile = normalizeMobile(body.mobile);
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const shopAddress = sanitizeText(body.shop_address, 500);
    const mapsCheck = validateGoogleMapsUrl(body.google_maps_link);
    const hasLat =
      body.shop_latitude !== undefined &&
      body.shop_latitude !== null &&
      body.shop_latitude !== '';
    const hasLng =
      body.shop_longitude !== undefined &&
      body.shop_longitude !== null &&
      body.shop_longitude !== '';
    const parsedLat = hasLat ? Number(body.shop_latitude) : null;
    const parsedLng = hasLng ? Number(body.shop_longitude) : null;
    const hasAcc =
      body.location_accuracy_meters !== undefined &&
      body.location_accuracy_meters !== null &&
      body.location_accuracy_meters !== '';
    const parsedAcc = hasAcc ? Number(body.location_accuracy_meters) : null;
    const validCoordPair =
      hasLat === hasLng &&
      (!hasLat ||
        (parsedLat !== null &&
          Number.isFinite(parsedLat) &&
          parsedLat >= -90 &&
          parsedLat <= 90 &&
          parsedLng !== null &&
          Number.isFinite(parsedLng) &&
          parsedLng >= -180 &&
          parsedLng <= 180));
    const validAccuracy =
      !hasAcc ||
      (hasLat &&
        hasLng &&
        parsedAcc !== null &&
        Number.isFinite(parsedAcc) &&
        parsedAcc > 0 &&
        parsedAcc <= 50);
    const rawCaptureMethod =
      typeof body.location_capture_method === 'string'
        ? body.location_capture_method.trim().toLowerCase()
        : '';
    const captureMethod =
      rawCaptureMethod === 'device_geolocation' ||
      rawCaptureMethod === 'browser_geolocation'
        ? 'device_geolocation'
        : rawCaptureMethod === 'google_maps_link' ||
            rawCaptureMethod === 'manual_google_maps_link'
          ? 'google_maps_link'
          : rawCaptureMethod === 'manual_address' ||
              rawCaptureMethod === 'manual_address_only'
            ? 'manual_address'
            : hasLat && hasLng
              ? 'device_geolocation'
              : mapsCheck.normalized
                ? 'google_maps_link'
                : 'manual_address';
    const shopCategory = String(body.shop_category || '').trim();
    const rawProgrammeInput = body.programme_preference;
    let programmePreferenceValid = true;
    let programmePreference: 'stores_near_you' | 'namma_fresh' | 'need_guidance' | null =
      null;

    if (
      rawProgrammeInput === undefined ||
      rawProgrammeInput === null ||
      rawProgrammeInput === ''
    ) {
      programmePreference = null;
    } else if (typeof rawProgrammeInput !== 'string') {
      programmePreferenceValid = false;
    } else {
      const cleanedProgramme = rawProgrammeInput.trim().toLowerCase();
      if (!cleanedProgramme) {
        programmePreference = null;
      } else if (
        cleanedProgramme === 'stores_near_you' ||
        cleanedProgramme === 'stores near you' ||
        cleanedProgramme === 'stores-near-you'
      ) {
        programmePreference = 'stores_near_you';
      } else if (
        cleanedProgramme === 'namma_fresh' ||
        cleanedProgramme === 'namma fresh' ||
        cleanedProgramme === 'namma-fresh'
      ) {
        programmePreference = 'namma_fresh';
      } else if (
        cleanedProgramme === 'need_guidance' ||
        cleanedProgramme === 'need guidance' ||
        cleanedProgramme === 'not sure' ||
        cleanedProgramme === 'not sure yet' ||
        cleanedProgramme === 'discuss_during_onboarding'
      ) {
        programmePreference = 'need_guidance';
      } else {
        programmePreferenceValid = false;
      }
    }

    const contactPreference = String(body.contact_preference || '').trim();
    const referralCheck = normalizeReferral(
      body.referral_source,
      body.referral_source_other || body.referral_source_details
    );
    const privacyAcknowledged = body.privacy_acknowledged === true;

    if (
      shopName.length < 2 ||
      ownerName.length < 2 ||
      !mobile ||
      !isValidEmail(email) ||
      shopAddress.length < 8 ||
      !mapsCheck.valid ||
      !validCoordPair ||
      !validAccuracy ||
      !VALID_CATEGORIES.has(shopCategory) ||
      !programmePreferenceValid ||
      !VALID_CONTACTS.has(contactPreference) ||
      !referralCheck.valid ||
      !privacyAcknowledged
    ) {
      return new Response(
        JSON.stringify({
          error: 'Please complete all required fields with valid details.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const rawIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipHash = await sha256Hex(`${rawIp}:namma-stores-edge-salt`);

    // Rate limit check via recent submissions from same IP hash (max 10 per 10 minutes)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentIpCount } = await supabase
      .from('seller_leads')
      .select('id', { count: 'exact', head: true })
      .eq('submission_ip_hash', ipHash)
      .gte('created_at', tenMinAgo);

    if (recentIpCount && recentIpCount >= 10) {
      return new Response(
        JSON.stringify({
          error:
            'Too many submissions from this connection. Please try again in a few minutes.',
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const hasExplicitClientId = isValidUuid(body.client_submission_id);
    const clientSubmissionId = hasExplicitClientId
      ? body.client_submission_id.trim()
      : crypto.randomUUID();

    // Idempotency & duplicate submission safeguard (prevents duplicate rows on timeout retry)
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();
    let existingLeadRow: Record<string, any> | null = null;

    if (hasExplicitClientId) {
      const { data: byClientId } = await supabase
        .from('seller_leads')
        .select('*')
        .eq('client_submission_id', clientSubmissionId)
        .maybeSingle();
      if (byClientId) {
        existingLeadRow = byClientId;
      }
    }

    if (!existingLeadRow) {
      const { data: recentDuplicate } = await supabase
        .from('seller_leads')
        .select('*')
        .or(`mobile.eq.${mobile},email.ilike.${email}`)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recentDuplicate) {
        existingLeadRow = recentDuplicate;
      }
    }

    if (!existingLeadRow) {
      const { data: exactSellerMatch } = await supabase
        .from('seller_leads')
        .select('*')
        .eq('mobile', mobile)
        .ilike('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (exactSellerMatch) {
        existingLeadRow = exactSellerMatch;
      }
    }

    if (existingLeadRow) {
      return new Response(
        JSON.stringify({
          ok: true,
          success: true,
          lead_id: existingLeadRow.id,
          duplicate: true,
          is_duplicate: true,
          email_status: 'skipped',
          owner_notification_status: 'skipped',
          message:
            'We have already received your application. Our team will reach out shortly.',
          notifications: [
            {
              channel: 'seller_email',
              status: 'skipped',
              delivery_stage: 'skipped',
            },
            {
              channel: 'owner_email',
              status: 'skipped',
              delivery_stage: 'skipped',
            },
          ],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Save Lead First (preserving NULL when programme_preference is unselected)
    const corePayload: Record<string, unknown> = {
      shop_name: shopName,
      owner_name: ownerName,
      mobile,
      email,
      shop_address: shopAddress,
      shop_category: shopCategory,
      programme_preference: programmePreference,
      contact_preference: contactPreference,
      privacy_acknowledged: true,
      status: 'new',
      source: 'seller_partner_website',
      landing_page: sanitizeText(body.landing_page, 500) || null,
      referrer: sanitizeText(body.referrer, 500) || null,
      utm_source: sanitizeText(body.utm_source, 120) || null,
      utm_medium: sanitizeText(body.utm_medium, 120) || null,
      utm_campaign: sanitizeText(body.utm_campaign, 120) || null,
      utm_content: sanitizeText(body.utm_content, 120) || null,
      utm_term: sanitizeText(body.utm_term, 120) || null,
      client_submission_id: clientSubmissionId,
      submission_ip_hash: ipHash,
      user_agent: sanitizeText(req.headers.get('user-agent'), 250) || null,
      ...(referralCheck.value ? { referral_source: referralCheck.value } : {}),
      referral_source_other:
        sanitizeText(
          body.referral_source_other || body.referral_source_details,
          120
        ) || null,
      google_maps_link: mapsCheck.normalized || null,
      shop_latitude: parsedLat,
      shop_longitude: parsedLng,
      location_accuracy_meters: parsedAcc,
      location_capture_method: captureMethod,
    };

    const { data: insertedLead, error: firstTryError } = await supabase
      .from('seller_leads')
      .insert([corePayload])
      .select('id, created_at')
      .single();

    if (firstTryError && firstTryError.code === '23505') {
      const { data: racedExisting } = await supabase
        .from('seller_leads')
        .select('id')
        .eq('client_submission_id', clientSubmissionId)
        .maybeSingle();

      if (racedExisting) {
        return new Response(
          JSON.stringify({
            ok: true,
            success: true,
            lead_id: racedExisting.id,
            duplicate: true,
            is_duplicate: true,
            email_status: 'skipped',
            owner_notification_status: 'skipped',
            message:
              'We have already received your application. Our team will reach out shortly.',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    if (firstTryError || !insertedLead) {
      console.error('[Edge Function Insert Error]:', firstTryError);
      return new Response(
        JSON.stringify({
          error:
            'Unable to save your application right now. Please try again shortly.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const leadId = insertedLead.id;
    const submittedAt = insertedLead.created_at || new Date().toISOString();

    // Log Lead Created Event
    await supabase.from('seller_lead_events').insert([
      {
        lead_id: leadId,
        event_type: 'lead_created',
        new_value: {
          source: 'seller_partner_website',
          status: 'new',
          shop_category: shopCategory,
          programme_preference: programmePreference,
          contact_preference: contactPreference,
          referral_source: referralCheck.value,
          google_maps_link: mapsCheck.normalized || null,
          shop_latitude: parsedLat,
          shop_longitude: parsedLng,
          location_accuracy_meters: parsedAcc,
          location_capture_method: captureMethod,
        },
        note: referralCheck.value
          ? `Application received from seller partner website (Referral: ${referralCheck.value})`
          : 'Application received from seller partner website',
      },
    ]);

    // 1. Seller acknowledgement email
    const sellerEmailResult = await sendResendEmail({
      leadId,
      idempotencyKey: `seller-ack-${leadId}-attempt-1`,
      recipientEmail: email,
      subject: CONFIRMATION_EMAIL_SUBJECT,
      text: getConfirmationEmailText(shopName, ownerName),
      html: getConfirmationEmailHtml(shopName, ownerName),
    });

    await supabase.from('seller_lead_notifications').insert([
      {
        lead_id: leadId,
        channel: 'email',
        provider: 'resend:seller_ack',
        status: sellerEmailResult.status,
        provider_message_id: sellerEmailResult.providerMessageId,
        attempt_count: 1,
        last_error_code: sellerEmailResult.errorCode,
        last_error_summary: sellerEmailResult.errorSummary,
        attempted_at: sellerEmailResult.attemptedAt,
        sent_at: sellerEmailResult.sentAt,
      },
    ]);

    // 2. Owner notification email
    // Strict recipient policy: internal notifications are sent exclusively to
    // official.nammastores@gmail.com unless explicitly disabled.
    const rawOwnerEmail = Deno.env.get('OWNER_NOTIFICATION_EMAIL');
    const ownerDisabled =
      rawOwnerEmail &&
      ['disabled', 'false', 'none', 'off', '0'].includes(
        rawOwnerEmail.trim().toLowerCase()
      );
    const ownerRecipient = ownerDisabled
      ? null
      : OFFICIAL_OWNER_NOTIFICATION_EMAIL;

    const ownerLeadData: OwnerEmailLeadData = {
      leadId,
      shopName,
      ownerName,
      email,
      mobile,
      shopCategory,
      programmePreference,
      contactPreference,
      shopAddress,
      submittedAt,
      googleMapsLink: mapsCheck.normalized || null,
      shopLatitude: parsedLat,
      shopLongitude: parsedLng,
      locationAccuracyMeters: parsedAcc,
      locationCaptureMethod: captureMethod,
      referralSource: referralCheck.value,
      referralSourceOther:
        sanitizeText(
          body.referral_source_other || body.referral_source_details,
          200
        ) || null,
    };

    const ownerEmailResult: EdgeEmailDispatchOutcome = ownerRecipient
      ? await sendResendEmail({
          leadId,
          idempotencyKey: `owner-notify-${leadId}-attempt-1`,
          recipientEmail: ownerRecipient,
          subject: getOwnerNotificationSubject(shopName),
          text: getOwnerNotificationEmailText(ownerLeadData),
          html: getOwnerNotificationEmailHtml(ownerLeadData),
          replyTo: email,
        })
      : {
          status: 'skipped',
          deliveryStage: 'skipped',
          providerMessageId: null,
          errorCode: 'OWNER_NOTIFICATION_DISABLED',
          errorSummary:
            'Owner email notification is disabled via OWNER_NOTIFICATION_EMAIL.',
          attemptedAt: new Date().toISOString(),
          sentAt: null,
        };

    await supabase.from('seller_lead_notifications').insert([
      {
        lead_id: leadId,
        channel: 'email',
        provider: 'resend:owner_alert',
        status: ownerEmailResult.status,
        provider_message_id: ownerEmailResult.providerMessageId,
        attempt_count: 1,
        last_error_code: ownerEmailResult.errorCode,
        last_error_summary: ownerEmailResult.errorSummary,
        attempted_at: ownerEmailResult.attemptedAt,
        sent_at: ownerEmailResult.sentAt,
      },
    ]);

    const eventPayload = {
      lead_id: leadId,
      event_type:
        sellerEmailResult.status === 'failed' ||
        ownerEmailResult.status === 'failed'
          ? 'notification_failed'
          : 'note_added',
      new_value: {
        seller_acknowledgement: {
          status: sellerEmailResult.status,
          delivery_stage: sellerEmailResult.deliveryStage,
          provider_message_id: sellerEmailResult.providerMessageId,
          error_code: sellerEmailResult.errorCode,
        },
        owner_notification: {
          status: ownerEmailResult.status,
          delivery_stage: ownerEmailResult.deliveryStage,
          provider_message_id: ownerEmailResult.providerMessageId,
          error_code: ownerEmailResult.errorCode,
        },
      },
      note: `Seller acknowledgement: ${sellerEmailResult.deliveryStage}; Owner notification: ${ownerEmailResult.deliveryStage}`,
    };

    await supabase.from('seller_lead_events').insert([eventPayload]);

    return new Response(
      JSON.stringify({
        ok: true,
        success: true,
        lead_id: leadId,
        email_status: sellerEmailResult.status,
        owner_notification_status: ownerEmailResult.status,
        notifications: [
          {
            channel: 'seller_email',
            status: sellerEmailResult.status,
            delivery_stage: sellerEmailResult.deliveryStage,
          },
          {
            channel: 'owner_email',
            status: ownerEmailResult.status,
            delivery_stage: ownerEmailResult.deliveryStage,
          },
        ],
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('[Unexpected Edge Function Error]:', err);
    return new Response(
      JSON.stringify({
        error: 'Unable to process your submission right now. Please try again.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
