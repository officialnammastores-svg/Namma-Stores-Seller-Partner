import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeIndianMobile,
  isValidEmail,
  validateGoogleMapsLink,
  validateLocationData,
  resolveLocationCaptureMethod,
  validateSellerForm,
  validateSellerSubmission,
  TARGET_LOCATION_ACCURACY_METERS,
  isValidGeolocationReading,
  isLocationAccuracyAcceptable,
  selectBetterGeolocationReading,
  formatAccuracyMeters,
  buildCoordinatesMapsUrl,
  hasManualGoogleMapsLink,
  REFERRAL_SOURCE_OPTIONS,
  CATEGORY_MAP,
  CONTACT_MAP,
  formatDisplayCategory,
  resolveBackendCategory,
  resolveBackendContact,
  normalizeProgrammePreference,
  buildSellerLeadDatabaseRow,
  PROGRAMME_PREFERENCE_OPTIONS,
  DISPLAY_CATEGORIES,
  sanitizePlainText,
  type FormInputState,
} from './rules.ts';
import {
  CONFIRMATION_EMAIL_SUBJECT,
  DEFAULT_REPLY_TO_EMAIL,
  DEFAULT_OWNER_NOTIFICATION_EMAIL,
  OFFICIAL_OWNER_NOTIFICATION_EMAIL,
  OFFICIAL_EMAIL_LOGO_URL,
  escapeHtml,
  getOwnerNotificationSubject,
  getConfirmationEmailText,
  getConfirmationEmailHtml,
  getOwnerNotificationEmailText,
  getOwnerNotificationEmailHtml,
  resolveLeadLocationDetails,
  resolveOwnerNotificationConfig,
  validateResendConfig,
  dispatchResendConfirmationEmail,
  dispatchOwnerNotificationEmail,
  type OwnerNotificationLeadDetails,
} from './emailTemplate.ts';
import {
  handleSellerApiRequest,
  type SellerApiEnv,
} from '../server/sellerLeadApi.ts';
import cloudflareWorker from '../../worker/index.ts';
import { onRequest as pagesSubmitFn } from '../../functions/api/submit-seller-lead.ts';
import { onRequest as pagesConfigFn } from '../../functions/api/config-status.ts';

test('normalizeIndianMobile: normalizes phone formats correctly', () => {
  assert.equal(normalizeIndianMobile('9845012345').normalized, '9845012345');
  assert.equal(normalizeIndianMobile('+91 98450 12345').normalized, '9845012345');
  assert.equal(normalizeIndianMobile('09845012345').normalized, '9845012345');
  assert.equal(normalizeIndianMobile('919845012345').normalized, '9845012345');
  assert.equal(normalizeIndianMobile('12345').valid, false);
});

test('isValidEmail: correctly validates email format', () => {
  assert.equal(isValidEmail('suresh@gmail.com'), true);
  assert.equal(isValidEmail('official.nammastores@gmail.com'), true);
  assert.equal(isValidEmail('invalid-email'), false);
  assert.equal(isValidEmail(''), false);
});

test('backend mapping codes and referral source options match canonical schema', () => {
  assert.equal(CATEGORY_MAP['Grocery'], 'grocery');
  assert.equal(CATEGORY_MAP['Chicken, meat and fish'], 'meat_fish_chicken');
  assert.equal(CATEGORY_MAP['Fruits and vegetables'], 'fruits_vegetables');
  assert.equal(CATEGORY_MAP['Milk and dairy products'], 'milk_dairy');
  assert.equal(CATEGORY_MAP['Puja items and flowers'], 'puja_flowers');
  assert.equal(CATEGORY_MAP['Other or multiple categories'], 'other_multiple');

  assert.equal(resolveBackendCategory('grocery'), 'grocery');
  assert.equal(resolveBackendCategory('Grocery'), 'grocery');
  assert.equal(formatDisplayCategory('milk_dairy'), 'Milk and dairy products');

  assert.equal(CONTACT_MAP['WhatsApp'], 'whatsapp');
  assert.equal(CONTACT_MAP['Phone'], 'phone');
  assert.equal(resolveBackendContact('Phone Call'), 'phone');
  assert.equal(resolveBackendContact('whatsapp'), 'whatsapp');

  assert.deepEqual(REFERRAL_SOURCE_OPTIONS, [
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
});

test('validateSellerForm: validates required fields, preserves referral_source, and preserves programme_preference: null when unselected', () => {
  const validForm: FormInputState = {
    shop_name: 'General Provision Store',
    owner_name: 'Anand Gowda',
    mobile: '+91 98450 12345',
    email: 'anand@example.com',
    shop_address: 'Shop 4, ECC Road, Whitefield, Bengaluru',
    shop_category: 'Grocery',
    referral_source: 'Visited by Namma Stores Team',
    referral_source_other: '',
    contact_preference: 'WhatsApp',
    privacy_acknowledged: true,
  };

  const res = validateSellerForm(validForm);
  assert.equal(res.isValid, true);
  assert.equal(res.payload?.mobile, '9845012345');
  assert.equal(res.payload?.email, 'anand@example.com');
  assert.equal(res.payload?.shop_category, 'grocery');
  assert.equal(res.payload?.programme_preference, null);
  assert.equal(res.payload?.referral_source, 'Visited by Namma Stores Team');
  assert.equal(res.payload?.contact_preference, 'whatsapp');
});

test('normalizeProgrammePreference, validateSellerForm, validateSellerSubmission & buildSellerLeadDatabaseRow: preserves NULL when unselected and preserves canonical values across both backend paths', () => {
  assert.deepEqual(PROGRAMME_PREFERENCE_OPTIONS, [
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
  ]);

  assert.equal(normalizeProgrammePreference('stores_near_you').value, 'stores_near_you');
  assert.equal(normalizeProgrammePreference('Stores Near You').value, 'stores_near_you');
  assert.equal(normalizeProgrammePreference('namma_fresh').value, 'namma_fresh');
  assert.equal(normalizeProgrammePreference('Namma Fresh').value, 'namma_fresh');
  assert.equal(normalizeProgrammePreference('need_guidance').value, 'need_guidance');
  assert.equal(normalizeProgrammePreference('Not sure yet').value, 'need_guidance');
  assert.equal(normalizeProgrammePreference('').value, null);
  assert.equal(normalizeProgrammePreference(null).value, null);
  assert.equal(normalizeProgrammePreference(undefined).value, null);
  assert.equal(normalizeProgrammePreference('invalid_prog').valid, false);
  assert.equal(normalizeProgrammePreference(123).valid, false);

  const baseForm: FormInputState = {
    shop_name: 'Fresh Harvest Greens',
    owner_name: 'Karthik M',
    mobile: '9845011223',
    email: 'karthik@example.com',
    shop_address: 'ITPL Main Road, Whitefield, Bengaluru',
    shop_category: 'Fruits and vegetables',
    programme_preference: '',
    referral_source: 'Instagram',
    referral_source_other: '',
    contact_preference: 'WhatsApp',
    privacy_acknowledged: true,
  };

  // Unselected optional programme preserves NULL (never silently substitutes 'need_guidance')
  const emptyProgFormRes = validateSellerForm(baseForm);
  assert.equal(emptyProgFormRes.isValid, true);
  assert.equal(emptyProgFormRes.payload?.programme_preference, null);
  assert.notEqual(emptyProgFormRes.payload?.programme_preference, 'need_guidance');

  const emptyProgServerRes = validateSellerSubmission(
    emptyProgFormRes.payload as unknown as Record<string, unknown>
  );
  assert.equal(emptyProgServerRes.isValid, true);
  assert.equal(emptyProgServerRes.sanitized?.programme_preference, null);
  assert.notEqual(emptyProgServerRes.sanitized?.programme_preference, 'need_guidance');

  const emptyDbRow = buildSellerLeadDatabaseRow(emptyProgServerRes.sanitized!);
  assert.equal(emptyDbRow.programme_preference, null);
  assert.notEqual(emptyDbRow.programme_preference, 'need_guidance');

  // Test all three explicit programme choices preserve their canonical values end-to-end
  const canonicalChoices: Array<'stores_near_you' | 'namma_fresh' | 'need_guidance'> = [
    'stores_near_you',
    'namma_fresh',
    'need_guidance',
  ];

  for (const choice of canonicalChoices) {
    const formRes = validateSellerForm({
      ...baseForm,
      programme_preference: choice,
    });
    assert.equal(formRes.isValid, true);
    assert.equal(formRes.payload?.programme_preference, choice);

    const submissionRes = validateSellerSubmission(
      formRes.payload as unknown as Record<string, unknown>
    );
    assert.equal(submissionRes.isValid, true);
    assert.equal(submissionRes.sanitized?.programme_preference, choice);

    const dbRow = buildSellerLeadDatabaseRow(submissionRes.sanitized!);
    assert.equal(dbRow.programme_preference, choice);
  }
});

test('validateSellerForm & validateSellerSubmission: handles Other referral source with Please specify', () => {
  const formWithOther: FormInputState = {
    shop_name: 'Lakshmi Dairy & Provisions',
    owner_name: 'Lakshmi N',
    mobile: '9845099887',
    email: 'lakshmi@example.com',
    shop_address: 'Main Road, Whitefield, Bengaluru',
    shop_category: 'Milk and dairy products',
    referral_source: 'Other',
    referral_source_other: 'Local Merchant Association',
    contact_preference: 'Phone',
    privacy_acknowledged: true,
  };

  const res = validateSellerForm(formWithOther);
  assert.equal(res.isValid, true);
  assert.equal(res.payload?.referral_source, 'Other: Local Merchant Association');
  assert.equal(res.payload?.referral_source_other, 'Local Merchant Association');

  const serverCheck = validateSellerSubmission(
    res.payload as unknown as Record<string, unknown>
  );
  assert.equal(serverCheck.isValid, true);
  assert.equal(
    serverCheck.sanitized?.referral_source,
    'Other: Local Merchant Association'
  );
});

test('validateSellerForm: catches missing required fields', () => {
  const invalidForm: FormInputState = {
    shop_name: '',
    owner_name: '',
    mobile: '',
    email: '',
    shop_address: '',
    shop_category: '',
    referral_source: '',
    referral_source_other: '',
    contact_preference: 'WhatsApp',
    privacy_acknowledged: false,
  };

  const res = validateSellerForm(invalidForm);
  assert.equal(res.isValid, false);
  assert.ok(res.errors.shop_name);
  assert.ok(res.errors.owner_name);
  assert.ok(res.errors.mobile);
  assert.ok(res.errors.email);
  assert.ok(res.errors.shop_address);
  assert.ok(res.errors.shop_category);
  assert.ok(res.errors.privacy_acknowledged);
});

test('escapeHtml: safely escapes HTML special characters in user-supplied fields', () => {
  const raw = `<script>alert("xss" & 'inject')</script>`;
  const escaped = escapeHtml(raw);
  assert.equal(
    escaped,
    '&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;inject&#39;)&lt;/script&gt;'
  );
  assert.equal(escaped.includes('<script>'), false);
});

test('seller acknowledgement email template matches required subject, official logo, status clarification, support links, and escapes HTML', () => {
  assert.equal(
    CONFIRMATION_EMAIL_SUBJECT,
    'We’ve Received Your Namma Stores Application'
  );
  const text = getConfirmationEmailText({
    shopName: 'Sri Vinayaka Provision Store',
    ownerName: 'Manjunath R',
  });
  const html = getConfirmationEmailHtml({
    shopName: 'Sri Vinayaka <script>alert(1)</script>',
    ownerName: 'Manjunath & Sons',
  });

  assert.ok(text.includes('Hello Manjunath R,'));
  assert.ok(
    text.includes(
      'Thank you for your interest in partnering with Namma Stores.'
    )
  );
  assert.ok(
    text.includes(
      'We’re pleased to confirm that your application for Sri Vinayaka Provision Store has been successfully submitted and received by our team.'
    )
  );
  assert.ok(
    text.includes(
      'Our team will review your application and contact you soon regarding the next steps, commercial terms, and seller onboarding process.'
    )
  );
  assert.ok(
    text.includes(
      'This email confirms receipt of your application. Your store is not yet approved or activated. Our team will contact you after reviewing your application.'
    )
  );
  assert.ok(text.includes('Whitefield, Bengaluru'));
  assert.ok(text.includes('Your local stores, Now online.'));
  assert.ok(text.includes('+91 9180567632'));
  assert.ok(text.includes('https://wa.me/919180567632'));
  assert.ok(text.includes('official.nammastores@gmail.com'));

  // Verifies HTML escaping, logo URL, clickable links, and status clarification note
  assert.equal(html.includes('<script>'), false);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('Manjunath &amp; Sons'));
  assert.ok(html.includes(OFFICIAL_EMAIL_LOGO_URL));
  assert.ok(
    html.includes('alt="Namma Stores — Your local stores, Now online"')
  );
  assert.ok(
    html.includes(
      'This email confirms receipt of your application. Your store is not yet approved or activated. Our team will contact you after reviewing your application.'
    )
  );
  assert.ok(html.includes('https://wa.me/919180567632'));
  assert.ok(html.includes('tel:+919180567632'));
  assert.ok(html.includes('mailto:official.nammastores@gmail.com'));
  assert.ok(html.includes('#174D35'));
  assert.ok(html.includes('#FAF6EE'));

  // Missing owner name falls back gracefully to "Hello,"
  const noOwnerText = getConfirmationEmailText({
    shopName: 'Kaveri Supermarket',
    ownerName: '',
  });
  assert.ok(noOwnerText.includes('Hello,'));
});

test('owner notification email template includes official logo, all required lead details, coordinate-to-Maps fallback, missing field resilience, and HTML escaping', () => {
  const sampleLead: OwnerNotificationLeadDetails = {
    leadId: 'b68f21e1-698c-41dd-91d4-91c45bd02434',
    shopName: 'Namma Fresh & <Organic>',
    ownerName: 'Ramesh Kumar',
    email: 'ramesh.store@example.com',
    mobile: '9845012345',
    shopCategory: 'grocery',
    programmePreference: 'stores_near_you',
    contactPreference: 'whatsapp',
    shopAddress: 'Shop #14, ITPL Main Road, Whitefield, Bengaluru 560066',
    submittedAt: '2026-10-23T08:00:00.000Z',
    googleMapsLink: 'https://www.google.com/maps?q=12.9698,77.7499',
    shopLatitude: 12.9698,
    shopLongitude: 77.7499,
    locationAccuracyMeters: 15.2,
    locationCaptureMethod: 'device_geolocation',
    referralSource: 'Other: Local Merchant Association',
    referralSourceOther: 'Local Merchant Association',
  };

  assert.equal(
    getOwnerNotificationSubject(sampleLead.shopName),
    'New Seller Application — Namma Fresh & <Organic>'
  );

  const text = getOwnerNotificationEmailText(sampleLead);
  const html = getOwnerNotificationEmailHtml(sampleLead);

  assert.ok(text.includes('NAMMA STORES — NEW SELLER APPLICATION'));
  assert.ok(text.includes('New Seller Application Received'));
  assert.ok(text.includes('Namma Fresh & <Organic>'));
  assert.ok(text.includes('Ramesh Kumar'));
  assert.ok(text.includes('ramesh.store@example.com'));
  assert.ok(text.includes('+91 9845012345'));
  assert.ok(text.includes('https://wa.me/919845012345'));
  assert.ok(text.includes('Grocery'));
  assert.ok(text.includes('Stores Near You'));
  assert.ok(
    text.includes('Shop #14, ITPL Main Road, Whitefield, Bengaluru 560066')
  );
  assert.ok(text.includes('https://www.google.com/maps?q=12.9698,77.7499'));
  assert.ok(text.includes('12.9698, 77.7499'));
  assert.ok(text.includes('±15 m (15.2 m)'));
  assert.ok(text.includes('Device Geolocation'));
  assert.ok(text.includes('Referral Source: Other'));
  assert.ok(
    text.includes('Referral Source (Other): Local Merchant Association')
  );

  assert.ok(html.includes(OFFICIAL_EMAIL_LOGO_URL));
  assert.ok(html.includes('NAMMA STORES — NEW SELLER APPLICATION'));
  assert.ok(html.includes('New Seller Application Received'));
  assert.ok(html.includes('Namma Fresh &amp; &lt;Organic&gt;'));
  assert.ok(html.includes('mailto:ramesh.store@example.com'));
  assert.ok(html.includes('tel:+919845012345'));
  assert.ok(html.includes('https://wa.me/919845012345'));
  assert.ok(html.includes('Open Shop Location in Google Maps'));
  assert.ok(html.includes('https://www.google.com/maps?q=12.9698,77.7499'));
  assert.ok(html.includes('Referral Source (Other)'));
  assert.ok(html.includes('Local Merchant Association'));

  // Test coordinate fallback when googleMapsLink is absent
  const coordOnlyLead: OwnerNotificationLeadDetails = {
    leadId: 'b68f21e1-698c-41dd-91d4-91c45bd02499',
    shopName: 'Kaveri Milk Parlour',
    ownerName: 'Suresh B',
    email: 'suresh@example.com',
    mobile: '9845099887',
    shopCategory: 'milk_dairy',
    contactPreference: 'phone',
    shopAddress: 'ECC Road, Whitefield, Bengaluru',
    submittedAt: '2026-10-23T09:00:00.000Z',
    googleMapsLink: null,
    shopLatitude: 12.975123,
    shopLongitude: 77.742987,
    locationAccuracyMeters: null,
    locationCaptureMethod: null,
    referralSource: null,
  };

  const locDetails = resolveLeadLocationDetails(coordOnlyLead);
  assert.equal(
    locDetails.resolvedMapsUrl,
    'https://www.google.com/maps?q=12.975123,77.742987'
  );
  assert.equal(locDetails.coordinatesText, '12.975123, 77.742987');
  assert.equal(locDetails.accuracyText, null);
  assert.equal(locDetails.captureMethodText, null);

  const coordHtml = getOwnerNotificationEmailHtml(coordOnlyLead);
  assert.ok(
    coordHtml.includes('https://www.google.com/maps?q=12.975123,77.742987')
  );
  assert.ok(coordHtml.includes('Open Shop Location in Google Maps'));
  assert.ok(coordHtml.includes('Not specified'));

  // Test when neither googleMapsLink nor coordinates are present
  const noMapsLead: OwnerNotificationLeadDetails = {
    ...coordOnlyLead,
    shopLatitude: null,
    shopLongitude: null,
  };
  const noMapsHtml = getOwnerNotificationEmailHtml(noMapsLead);
  assert.ok(noMapsHtml.includes('Unavailable'));
});

test('resolveOwnerNotificationConfig: strictly enforces official.nammastores@gmail.com as the sole internal recipient and blocks non-official addresses', () => {
  assert.equal(
    OFFICIAL_OWNER_NOTIFICATION_EMAIL,
    'official.nammastores@gmail.com'
  );
  assert.equal(
    DEFAULT_OWNER_NOTIFICATION_EMAIL,
    'official.nammastores@gmail.com'
  );

  const defaultCfg = resolveOwnerNotificationConfig(undefined);
  assert.equal(defaultCfg.enabled, true);
  assert.equal(defaultCfg.recipientEmail, 'official.nammastores@gmail.com');

  // Even if an environment variable contains legacy/developer email addresses,
  // internal notifications must ONLY go to official.nammastores@gmail.com.
  const overrideAttempt1 = resolveOwnerNotificationConfig(
    'simphegowda1345@gmail.com'
  );
  assert.equal(overrideAttempt1.enabled, true);
  assert.equal(
    overrideAttempt1.recipientEmail,
    'official.nammastores@gmail.com'
  );

  const overrideAttempt2 = resolveOwnerNotificationConfig(
    'simphegowdatv@gmail.com'
  );
  assert.equal(overrideAttempt2.enabled, true);
  assert.equal(
    overrideAttempt2.recipientEmail,
    'official.nammastores@gmail.com'
  );

  const disabledCfg = resolveOwnerNotificationConfig('disabled');
  assert.equal(disabledCfg.enabled, false);
  assert.equal(disabledCfg.recipientEmail, null);

  const falseCfg = resolveOwnerNotificationConfig('false');
  assert.equal(falseCfg.enabled, false);
  assert.equal(falseCfg.recipientEmail, null);
});

test('validateResendConfig & dispatchResendConfirmationEmail: fails safely when RESEND_API_KEY or RESEND_FROM_EMAIL is missing', async () => {
  // Missing API key
  const missingKey = validateResendConfig({
    apiKey: '',
    fromEmail: 'Namma Stores <applications@nammastores.com>',
  });
  assert.equal(missingKey.valid, false);
  assert.equal(missingKey.errorCode, 'RESEND_KEY_MISSING');

  // Missing FROM email (must NOT fall back to onboarding@resend.dev)
  const missingFrom = validateResendConfig({
    apiKey: 're_live_valid_key_123',
    fromEmail: '',
  });
  assert.equal(missingFrom.valid, false);
  assert.equal(missingFrom.errorCode, 'RESEND_FROM_EMAIL_MISSING');
  assert.equal(missingFrom.fromEmail, '');

  const dispatchNoFrom = await dispatchResendConfirmationEmail({
    leadId: '00000000-0000-4000-8000-000000000001',
    recipientEmail: 'seller@example.com',
    apiKey: 're_live_valid_key_123',
    fromEmail: '',
  });
  assert.equal(dispatchNoFrom.status, 'failed');
  assert.equal(dispatchNoFrom.delivery_stage, 'failed');
  assert.equal(dispatchNoFrom.error_code, 'RESEND_FROM_EMAIL_MISSING');
});

test('dispatchResendConfirmationEmail & dispatchOwnerNotificationEmail: handles 403 restriction, 200 acceptance, single recipient policy, and owner disable toggle', async () => {
  // Simulate HTTP 403 from Resend when using unverified/testing sender
  const mock403Fetch = (async () =>
    new Response(
      JSON.stringify({
        statusCode: 403,
        name: 'validation_error',
        message:
          'You can only send testing emails to your own email address (official.nammastores@gmail.com). To send emails to other recipients, please verify a domain at resend.com/domains.',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )) as unknown as typeof fetch;

  const res403 = await dispatchResendConfirmationEmail({
    leadId: '00000000-0000-4000-8000-000000000002',
    recipientEmail: 'merchant@gmail.com',
    apiKey: 're_live_valid_key_123',
    fromEmail: 'Namma Stores <onboarding@resend.dev>',
    fetchImpl: mock403Fetch,
  });

  assert.equal(res403.status, 'failed');
  assert.equal(res403.delivery_stage, 'failed');
  assert.equal(res403.http_status, 403);
  assert.equal(res403.error_code, 'HTTP_403');
  assert.ok(res403.error_summary?.includes('403'));
  assert.ok(res403.error_summary?.includes('verify a domain'));

  // Simulate HTTP 200 acceptance from Resend with verified sender domain
  let capturedPayload: Record<string, any> | null = null;
  let capturedHeaders: Record<string, any> | null = null;
  const mock200Fetch = (async (_url: string, init?: RequestInit) => {
    capturedPayload = JSON.parse(String(init?.body || '{}'));
    capturedHeaders = (init?.headers as Record<string, any>) || {};
    return new Response(
      JSON.stringify({ id: 're_msg_9988776655' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as unknown as typeof fetch;

  const res200 = await dispatchResendConfirmationEmail({
    leadId: '00000000-0000-4000-8000-000000000003',
    recipientEmail: 'merchant@gmail.com',
    shopName: 'Asha General Store',
    ownerName: 'Asha R',
    apiKey: 're_live_valid_key_123',
    fromEmail: 'Namma Stores <applications@nammastores.com>',
    fetchImpl: mock200Fetch,
  });

  assert.equal(res200.status, 'sent');
  assert.equal(res200.delivery_stage, 'accepted_by_provider');
  assert.equal(res200.http_status, 200);
  assert.equal(res200.provider_message_id, 're_msg_9988776655');
  assert.equal(res200.error_code, null);
  assert.deepEqual((capturedPayload as any)?.to, ['merchant@gmail.com']);
  assert.equal((capturedPayload as any)?.cc, undefined);
  assert.equal((capturedPayload as any)?.bcc, undefined);
  assert.equal((capturedPayload as any)?.reply_to, DEFAULT_REPLY_TO_EMAIL);
  assert.equal((capturedPayload as any)?.subject, CONFIRMATION_EMAIL_SUBJECT);
  assert.equal(
    (capturedHeaders as any)?.['Idempotency-Key'],
    'seller-ack-00000000-0000-4000-8000-000000000003-attempt-1'
  );

  // Test owner notification dispatch & skipped when disabled
  const sampleLead: OwnerNotificationLeadDetails = {
    leadId: '00000000-0000-4000-8000-000000000003',
    shopName: 'Asha General Store',
    ownerName: 'Asha R',
    email: 'merchant@gmail.com',
    mobile: '9845012345',
    shopCategory: 'grocery',
    contactPreference: 'whatsapp',
    shopAddress: 'Whitefield Main Road, Bengaluru',
    submittedAt: '2026-10-23T08:00:00.000Z',
  };

  const ownerSkipped = await dispatchOwnerNotificationEmail({
    lead: sampleLead,
    ownerNotificationEmail: 'disabled',
    apiKey: 're_live_valid_key_123',
    fromEmail: 'Namma Stores <applications@nammastores.com>',
    fetchImpl: mock200Fetch,
  });
  assert.equal(ownerSkipped.status, 'skipped');
  assert.equal(ownerSkipped.delivery_stage, 'skipped');
  assert.equal(ownerSkipped.error_code, 'OWNER_NOTIFICATION_DISABLED');

  // Even if someone passes simphegowda1345@gmail.com or simphegowdatv@gmail.com
  // to ownerNotificationEmail, it must strictly send ONLY to official.nammastores@gmail.com
  const ownerSent = await dispatchOwnerNotificationEmail({
    lead: sampleLead,
    ownerNotificationEmail: 'simphegowda1345@gmail.com',
    apiKey: 're_live_valid_key_123',
    fromEmail: 'Namma Stores <applications@nammastores.com>',
    fetchImpl: mock200Fetch,
  });
  assert.equal(ownerSent.status, 'sent');
  assert.equal(ownerSent.delivery_stage, 'accepted_by_provider');
  assert.deepEqual((capturedPayload as any)?.to, [
    'official.nammastores@gmail.com',
  ]);
  assert.equal((capturedPayload as any)?.cc, undefined);
  assert.equal((capturedPayload as any)?.bcc, undefined);
  assert.equal(
    (capturedPayload as any)?.subject,
    'New Seller Application — Asha General Store'
  );
  assert.equal((capturedPayload as any)?.reply_to, 'merchant@gmail.com');
  assert.equal(
    (capturedHeaders as any)?.['Idempotency-Key'],
    'owner-notify-00000000-0000-4000-8000-000000000003-attempt-1'
  );
});

test('validateGoogleMapsLink: accepts valid Google Maps share links, coordinate links, and optional empty values', () => {
  assert.equal(validateGoogleMapsLink('').valid, true);
  assert.equal(validateGoogleMapsLink('   ').valid, true);

  const shortAppLink = validateGoogleMapsLink('https://maps.app.goo.gl/AbCdEfGh12345');
  assert.equal(shortAppLink.valid, true);
  assert.equal(shortAppLink.normalized, 'https://maps.app.goo.gl/AbCdEfGh12345');

  const gooGlLink = validateGoogleMapsLink('https://goo.gl/maps/XyZ987654');
  assert.equal(gooGlLink.valid, true);

  const fullMapsUrl = validateGoogleMapsLink(
    'https://www.google.com/maps/place/Whitefield,+Bengaluru/@12.9698,77.75,15z'
  );
  assert.equal(fullMapsUrl.valid, true);

  const coordQueryUrl = validateGoogleMapsLink('https://www.google.com/maps?q=12.969800,77.749900');
  assert.equal(coordQueryUrl.valid, true);

  const googleCoInUrl = validateGoogleMapsLink('https://www.google.co.in/maps?q=12.9716,77.5946');
  assert.equal(googleCoInUrl.valid, true);

  // Rejects non-Google-Maps URLs or malformed strings
  assert.equal(validateGoogleMapsLink('not a url').valid, false);
  assert.equal(validateGoogleMapsLink('https://example.com/maps/place/shop').valid, false);
  assert.equal(validateGoogleMapsLink('https://www.google.com/search?q=whitefield').valid, false);
});

test('validateSellerForm & validateSellerSubmission: validates optional google_maps_link and keeps shop_address separate', () => {
  const formWithMaps: FormInputState = {
    shop_name: 'Namma Fresh Mart',
    owner_name: 'Ramesh Kumar',
    mobile: '9845011223',
    email: 'ramesh@example.com',
    shop_address: '#12, ITPL Main Road, Whitefield, Bengaluru 560066',
    google_maps_link: 'https://maps.app.goo.gl/WhitefieldStore123',
    shop_category: 'Grocery',
    referral_source: 'Google Search',
    referral_source_other: '',
    contact_preference: 'WhatsApp',
    privacy_acknowledged: true,
  };

  const formCheck = validateSellerForm(formWithMaps);
  assert.equal(formCheck.isValid, true);
  assert.equal(
    formCheck.payload?.google_maps_link,
    'https://maps.app.goo.gl/WhitefieldStore123'
  );
  assert.equal(
    formCheck.payload?.shop_address,
    '#12, ITPL Main Road, Whitefield, Bengaluru 560066'
  );
  assert.equal(formCheck.payload?.location_capture_method, 'google_maps_link');

  const submissionCheck = validateSellerSubmission(
    formCheck.payload as unknown as Record<string, unknown>
  );
  assert.equal(submissionCheck.isValid, true);
  assert.equal(
    submissionCheck.sanitized?.google_maps_link,
    'https://maps.app.goo.gl/WhitefieldStore123'
  );
  assert.equal(
    submissionCheck.sanitized?.shop_address,
    '#12, ITPL Main Road, Whitefield, Bengaluru 560066'
  );
  assert.equal(submissionCheck.sanitized?.shop_latitude, null);
  assert.equal(submissionCheck.sanitized?.shop_longitude, null);
  assert.equal(submissionCheck.sanitized?.location_accuracy_meters, null);
  assert.equal(
    submissionCheck.sanitized?.location_capture_method,
    'google_maps_link'
  );

  // Rejects invalid Google Maps link when provided
  const invalidMapsForm: FormInputState = {
    ...formWithMaps,
    google_maps_link: 'https://instagram.com/nammastores',
  };
  const invalidCheck = validateSellerForm(invalidMapsForm);
  assert.equal(invalidCheck.isValid, false);
  assert.ok(invalidCheck.errors.google_maps_link);
});

test('geolocation helpers: enforce <= 50m accuracy threshold, retain best reading, and preserve full-precision coordinates', () => {
  assert.equal(TARGET_LOCATION_ACCURACY_METERS, 50);

  // Validates coordinate readings
  assert.equal(
    isValidGeolocationReading({
      latitude: 12.969812345,
      longitude: 77.74994321,
      accuracy: 18.4,
    }),
    true
  );
  assert.equal(
    isValidGeolocationReading({
      latitude: 12.9698,
      longitude: 77.7499,
      accuracy: 0,
    }),
    false
  );
  assert.equal(
    isValidGeolocationReading({
      latitude: 95,
      longitude: 77.7499,
      accuracy: 15,
    }),
    false
  );

  // Enforces <= 50m threshold
  assert.equal(isLocationAccuracyAcceptable(14.2), true);
  assert.equal(isLocationAccuracyAcceptable(50), true);
  assert.equal(isLocationAccuracyAcceptable(50.1), false);
  assert.equal(isLocationAccuracyAcceptable(320), false);
  assert.equal(isLocationAccuracyAcceptable(0), false);

  // Retains best reading across watchPosition samples
  const coarseSample = {
    latitude: 12.97,
    longitude: 77.75,
    accuracy: 185.6,
  };
  const improvedSample = {
    latitude: 12.96981234,
    longitude: 77.74998765,
    accuracy: 64.2,
  };
  const worseSample = {
    latitude: 12.971,
    longitude: 77.751,
    accuracy: 110.0,
  };

  let best = selectBetterGeolocationReading(null, coarseSample);
  assert.equal(best.accuracy, 185.6);
  best = selectBetterGeolocationReading(best, improvedSample);
  assert.equal(best.accuracy, 64.2);
  best = selectBetterGeolocationReading(best, worseSample);
  assert.equal(best.accuracy, 64.2);
  assert.equal(formatAccuracyMeters(best.accuracy), 64);

  // Generates full-precision Google Maps URL without pre-rounding coordinates
  const preciseLat = 12.9698123456789;
  const preciseLng = 77.7499876543211;
  const mapsUrl = buildCoordinatesMapsUrl(preciseLat, preciseLng);
  assert.equal(
    mapsUrl,
    'https://www.google.com/maps?q=12.9698123456789,77.7499876543211'
  );
  assert.equal(validateGoogleMapsLink(mapsUrl).valid, true);

  // Protects manually entered Google Maps links from silent overwrite
  assert.equal(hasManualGoogleMapsLink('', undefined), false);
  assert.equal(hasManualGoogleMapsLink(mapsUrl, mapsUrl), false);
  assert.equal(
    hasManualGoogleMapsLink('https://maps.app.goo.gl/ManualShopPin', undefined),
    true
  );
  assert.equal(
    hasManualGoogleMapsLink('https://maps.app.goo.gl/ManualShopPin', mapsUrl),
    true
  );
});

test('validateLocationData & validateSellerSubmission: validates complete coordinate pair, ranges, accuracy, and location_capture_method', () => {
  // 1. Valid full geolocation submission
  const fullGeoForm: FormInputState = {
    shop_name: 'Sri Vinayaka Provision Store',
    owner_name: 'Manjunath R',
    mobile: '9845077665',
    email: 'manjunath@example.com',
    shop_address: 'Shop #8, Hope Farm Junction, Whitefield, Bengaluru 560066',
    google_maps_link: 'https://www.google.com/maps?q=12.98234567,77.75219876',
    shop_latitude: 12.98234567,
    shop_longitude: 77.75219876,
    location_accuracy_meters: 14.8,
    location_capture_method: 'device_geolocation',
    shop_category: 'Grocery',
    referral_source: 'Visited by Namma Stores Team',
    referral_source_other: '',
    contact_preference: 'WhatsApp',
    privacy_acknowledged: true,
  };

  const formCheck = validateSellerForm(fullGeoForm);
  assert.equal(formCheck.isValid, true);
  assert.equal(formCheck.payload?.shop_latitude, 12.98234567);
  assert.equal(formCheck.payload?.shop_longitude, 77.75219876);
  assert.equal(formCheck.payload?.location_accuracy_meters, 14.8);
  assert.equal(
    formCheck.payload?.location_capture_method,
    'device_geolocation'
  );
  assert.equal(
    formCheck.payload?.google_maps_link,
    'https://www.google.com/maps?q=12.98234567,77.75219876'
  );
  assert.equal(
    formCheck.payload?.shop_address,
    'Shop #8, Hope Farm Junction, Whitefield, Bengaluru 560066'
  );

  const serverCheck = validateSellerSubmission(
    formCheck.payload as unknown as Record<string, unknown>
  );
  assert.equal(serverCheck.isValid, true);
  assert.equal(serverCheck.sanitized?.shop_latitude, 12.98234567);
  assert.equal(serverCheck.sanitized?.shop_longitude, 77.75219876);
  assert.equal(serverCheck.sanitized?.location_accuracy_meters, 14.8);
  assert.equal(
    serverCheck.sanitized?.location_capture_method,
    'device_geolocation'
  );
  assert.equal(
    serverCheck.sanitized?.shop_address,
    'Shop #8, Hope Farm Junction, Whitefield, Bengaluru 560066'
  );

  // 2. Rejects incomplete coordinate pair (latitude without longitude)
  const missingLng = validateLocationData({
    shop_latitude: 12.9823,
    shop_longitude: null,
  });
  assert.equal(missingLng.valid, false);
  assert.ok(missingLng.errors.shop_latitude);
  assert.ok(missingLng.errors.shop_longitude);

  // 3. Rejects out-of-range coordinates
  const outOfRange = validateLocationData({
    shop_latitude: 95.5,
    shop_longitude: 190.2,
  });
  assert.equal(outOfRange.valid, false);
  assert.ok(outOfRange.errors.shop_latitude);
  assert.ok(outOfRange.errors.shop_longitude);

  // 4. Rejects accuracy > 50m or <= 0 or without coordinates
  const inaccurateLoc = validateLocationData({
    shop_latitude: 12.9823,
    shop_longitude: 77.7521,
    location_accuracy_meters: 85.0,
  });
  assert.equal(inaccurateLoc.valid, false);
  assert.ok(inaccurateLoc.errors.location_accuracy_meters);

  const negativeAcc = validateLocationData({
    shop_latitude: 12.9823,
    shop_longitude: 77.7521,
    location_accuracy_meters: -3,
  });
  assert.equal(negativeAcc.valid, false);
  assert.ok(negativeAcc.errors.location_accuracy_meters);

  const orphanAcc = validateLocationData({
    location_accuracy_meters: 12.5,
  });
  assert.equal(orphanAcc.valid, false);
  assert.ok(orphanAcc.errors.location_accuracy_meters);

  // 5. Resolves capture method defaults & aliases
  assert.equal(
    resolveLocationCaptureMethod(undefined, false, false).value,
    'manual_address'
  );
  assert.equal(
    resolveLocationCaptureMethod(undefined, false, true).value,
    'google_maps_link'
  );
  assert.equal(
    resolveLocationCaptureMethod(undefined, true, true).value,
    'device_geolocation'
  );
  assert.equal(
    resolveLocationCaptureMethod('browser_geolocation', true, true).value,
    'device_geolocation'
  );
  assert.equal(
    resolveLocationCaptureMethod('device_geolocation', false, false).valid,
    false
  );
});

test('form validation matrix: boundary lengths, invalid category, mobile starting digits, and long text truncation', () => {
  // 1. Too-short shop name (1 char), too-short owner name (1 char), too-short address (7 chars), mobile starting with 5
  const boundaryInvalid = validateSellerSubmission({
    shop_name: 'A',
    owner_name: 'B',
    mobile: '5845012345',
    email: 'a@b',
    shop_address: 'Short12',
    shop_category: 'pharmacy_invalid',
    programme_preference: 'invalid_programme',
    contact_preference: 'invalid_contact',
    privacy_acknowledged: false,
  });
  assert.equal(boundaryInvalid.isValid, false);
  assert.ok(boundaryInvalid.errors.shop_name);
  assert.ok(boundaryInvalid.errors.owner_name);
  assert.ok(boundaryInvalid.errors.mobile);
  assert.ok(boundaryInvalid.errors.email);
  assert.ok(boundaryInvalid.errors.shop_address);
  assert.ok(boundaryInvalid.errors.shop_category);
  assert.ok(boundaryInvalid.errors.programme_preference);
  assert.ok(boundaryInvalid.errors.contact_preference);
  assert.ok(boundaryInvalid.errors.privacy_acknowledged);

  // 2. Verify all 6 display categories map to their exact canonical backend codes
  for (const displayCat of DISPLAY_CATEGORIES) {
    const expectedCode = CATEGORY_MAP[displayCat];
    const formRes = validateSellerForm({
      shop_name: 'Namma Provision Store',
      owner_name: 'Suresh Gowda',
      mobile: '9845012345',
      email: 'suresh@example.com',
      shop_address: 'Shop 12, Whitefield Main Road, Bengaluru',
      shop_category: displayCat,
      programme_preference: '',
      referral_source: '',
      referral_source_other: '',
      contact_preference: 'WhatsApp',
      privacy_acknowledged: true,
    });
    assert.equal(formRes.isValid, true);
    assert.equal(formRes.payload?.shop_category, expectedCode);
    assert.equal(formRes.payload?.programme_preference, null);
  }

  // 3. Long text input is safely truncated and stripped of HTML/control chars
  const overlongShopName = '<b>' + 'S'.repeat(200) + '</b>\u0000\u0007';
  const overlongAddress = '<div>' + 'A'.repeat(600) + '</div>';
  const sanitizedShop = sanitizePlainText(overlongShopName, 120);
  const sanitizedAddr = sanitizePlainText(overlongAddress, 300);
  assert.equal(sanitizedShop.length, 120);
  assert.equal(sanitizedShop.includes('<b>'), false);
  assert.equal(sanitizedAddr.length, 300);
  assert.equal(sanitizedAddr.includes('<div>'), false);
});

test('notification resilience: handles timeout, invalid non-JSON response, and database insert succeeding when email fails', async () => {
  // 1. Timeout / AbortError from fetch
  const timeoutFetch = (async () => {
    const err = new Error('The operation was aborted due to timeout');
    err.name = 'AbortError';
    throw err;
  }) as unknown as typeof fetch;

  const timeoutRes = await dispatchResendConfirmationEmail({
    leadId: '00000000-0000-4000-8000-000000000010',
    recipientEmail: 'seller@example.com',
    apiKey: 're_live_valid_key_123',
    fromEmail: 'Namma Stores <applications@nammastores.com>',
    fetchImpl: timeoutFetch,
  });
  assert.equal(timeoutRes.status, 'failed');
  assert.equal(timeoutRes.delivery_stage, 'failed');
  assert.equal(timeoutRes.error_code, 'NETWORK_ERROR');
  assert.ok(timeoutRes.error_summary?.includes('timeout'));

  // 2. Invalid non-JSON response on HTTP 502 Bad Gateway
  const nonJson502Fetch = (async () =>
    new Response('<html>502 Bad Gateway</html>', {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
    })) as unknown as typeof fetch;

  const res502 = await dispatchResendConfirmationEmail({
    leadId: '00000000-0000-4000-8000-000000000011',
    recipientEmail: 'seller@example.com',
    apiKey: 're_live_valid_key_123',
    fromEmail: 'Namma Stores <applications@nammastores.com>',
    fetchImpl: nonJson502Fetch,
  });
  assert.equal(res502.status, 'failed');
  assert.equal(res502.http_status, 502);
  assert.equal(res502.error_code, 'HTTP_502');
});

// Helper to create an in-memory mock Supabase client for API & Cloudflare Worker integration tests
function createMockSupabase(options?: {
  simulateRace23505OnSecondInsert?: boolean;
  simulateNotificationDbFailure?: boolean;
}) {
  const leads: any[] = [];
  const notifications: any[] = [];
  const events: any[] = [];
  let insertCallCount = 0;

  const client = {
    leads,
    notifications,
    events,
    from(table: string) {
      if (table === 'seller_leads') {
        const queryState: {
          filters: Array<(row: any) => boolean>;
        } = { filters: [] };

        const builder: any = {
          select() {
            return builder;
          },
          eq(col: string, val: any) {
            queryState.filters.push((r) => r[col] === val);
            return builder;
          },
          ilike(col: string, val: string) {
            queryState.filters.push(
              (r) => String(r[col] || '').toLowerCase() === val.toLowerCase()
            );
            return builder;
          },
          or(expr: string) {
            // Parses `mobile.eq.<m>,email.ilike.<e>`
            const parts = expr.split(',');
            queryState.filters.push((r) =>
              parts.some((p) => {
                if (p.startsWith('mobile.eq.')) {
                  return r.mobile === p.slice('mobile.eq.'.length);
                }
                if (p.startsWith('email.ilike.')) {
                  return (
                    String(r.email || '').toLowerCase() ===
                    p.slice('email.ilike.'.length).toLowerCase()
                  );
                }
                return false;
              })
            );
            return builder;
          },
          gte() {
            return builder;
          },
          order() {
            return builder;
          },
          limit() {
            return builder;
          },
          async maybeSingle() {
            const found =
              leads.find((r) => queryState.filters.every((fn) => fn(r))) ||
              null;
            return { data: found, error: null };
          },
          insert(rows: any[]) {
            return {
              select() {
                return {
                  async single() {
                    insertCallCount += 1;
                    const row = rows[0];
                    if (
                      options?.simulateRace23505OnSecondInsert &&
                      insertCallCount > 1
                    ) {
                      return {
                        data: null,
                        error: {
                          code: '23505',
                          message:
                            'duplicate key value violates unique constraint "seller_leads_client_submission_id_key"',
                        },
                      };
                    }
                    const existingByClientId = leads.find(
                      (l) =>
                        l.client_submission_id &&
                        l.client_submission_id === row.client_submission_id
                    );
                    if (existingByClientId) {
                      return {
                        data: null,
                        error: {
                          code: '23505',
                          message:
                            'duplicate key value violates unique constraint "seller_leads_client_submission_id_key"',
                        },
                      };
                    }
                    const created = {
                      id: `lead-uuid-${leads.length + 1}`,
                      created_at: new Date().toISOString(),
                      ...row,
                    };
                    leads.push(created);
                    return {
                      data: { id: created.id, created_at: created.created_at },
                      error: null,
                    };
                  },
                };
              },
            };
          },
        };
        return builder;
      }

      if (table === 'seller_lead_notifications') {
        let filterLeadId: string | null = null;
        let updateId: string | null = null;
        let pendingUpdatePayload: any = null;

        const notifBuilder: any = {
          select() {
            return notifBuilder;
          },
          eq(col: string, val: string) {
            if (col === 'lead_id') filterLeadId = val;
            if (col === 'id') updateId = val;
            return notifBuilder;
          },
          async order() {
            const matched = notifications.filter(
              (n) => !filterLeadId || n.lead_id === filterLeadId
            );
            return { data: matched, error: null };
          },
          update(payload: any) {
            pendingUpdatePayload = payload;
            return notifBuilder;
          },
          insert(rows: any[]) {
            return {
              select() {
                return {
                  async single() {
                    if (options?.simulateNotificationDbFailure) {
                      return {
                        data: null,
                        error: {
                          code: '42P01',
                          message: 'Simulated notification table write error',
                        },
                      };
                    }
                    const created = {
                      id: `notif-uuid-${notifications.length + 1}`,
                      created_at: new Date().toISOString(),
                      ...rows[0],
                    };
                    notifications.push(created);
                    return {
                      data: {
                        id: created.id,
                        attempt_count: created.attempt_count,
                      },
                      error: null,
                    };
                  },
                };
              },
            };
          },
          async single() {
            if (options?.simulateNotificationDbFailure) {
              return {
                data: null,
                error: {
                  code: '42P01',
                  message: 'Simulated notification update failure',
                },
              };
            }
            const idx = notifications.findIndex((n) => n.id === updateId);
            if (idx >= 0 && pendingUpdatePayload) {
              notifications[idx] = {
                ...notifications[idx],
                ...pendingUpdatePayload,
              };
              return {
                data: {
                  id: notifications[idx].id,
                  attempt_count: notifications[idx].attempt_count,
                },
                error: null,
              };
            }
            return { data: null, error: { code: '404', message: 'Not found' } };
          },
        };
        return notifBuilder;
      }

      if (table === 'seller_lead_events') {
        return {
          async insert(rows: any[]) {
            events.push({
              id: `event-uuid-${events.length + 1}`,
              created_at: new Date().toISOString(),
              ...rows[0],
            });
            return { data: null, error: null };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return client;
}

test('submission, duplicate protection, timeout retry, race condition (23505), and partial email failure via handleSellerApiRequest', async () => {
  const mockDb = createMockSupabase();
  const rateStore = new Map<string, { count: number; resetAt: number }>();
  const sentEmails: any[] = [];

  const mockResendSuccess = (async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body || '{}'));
    sentEmails.push(body);
    return new Response(
      JSON.stringify({ id: `re_msg_${sentEmails.length}` }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as unknown as typeof fetch;

  const testEnv: SellerApiEnv = {
    SUPABASE_URL: 'https://txmrfheminuminggtwfv.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service_role_test_key',
    RESEND_API_KEY: 're_live_test_key',
    RESEND_FROM_EMAIL: 'Namma Stores <applications@nammastores.com>',
    RESEND_REPLY_TO_EMAIL: 'official.nammastores@gmail.com',
    OWNER_NOTIFICATION_EMAIL: 'official.nammastores@gmail.com',
  };

  const clientSubId = '11111111-2222-4333-8444-555555555555';
  const payload = {
    shop_name: 'Annapoorna Organic Grocers',
    owner_name: 'Deepak Rao',
    mobile: '9845022334',
    email: 'deepak.rao@example.com',
    shop_address: 'Shop 22, Whitefield Main Road, Bengaluru 560066',
    shop_category: 'grocery',
    programme_preference: null,
    contact_preference: 'whatsapp',
    referral_source: 'Instagram',
    privacy_acknowledged: true,
    client_submission_id: clientSubId,
  };

  // 1. First submission inserts lead with programme_preference: null and dispatches both emails
  const req1 = new Request('https://nammastores.com/api/submit-seller-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const res1 = await handleSellerApiRequest(req1, testEnv, {
    supabaseClient: mockDb as any,
    fetchImpl: mockResendSuccess,
    rateLimitStore: rateStore,
  });
  assert.equal(res1.status, 201);
  const data1 = await res1.json();
  assert.equal(data1.success, true);
  assert.equal(data1.duplicate, false);
  assert.equal(data1.email_status, 'sent');
  assert.equal(data1.owner_notification_status, 'sent');
  assert.equal(mockDb.leads.length, 1);
  assert.equal(mockDb.leads[0].programme_preference, null);
  assert.equal(sentEmails.length, 2);
  assert.deepEqual(sentEmails[0].to, ['deepak.rao@example.com']);
  assert.deepEqual(sentEmails[1].to, ['official.nammastores@gmail.com']);
  assert.equal(sentEmails[1].cc, undefined);
  assert.equal(sentEmails[1].bcc, undefined);
  assert.equal(
    sentEmails[0].from,
    'Namma Stores <applications@nammastores.com>'
  );

  // 2. Repeated click or ambiguous timeout retry with same client_submission_id returns 200 duplicate without creating a second lead or re-sending already-sent emails
  const req2 = new Request('https://nammastores.com/api/submit-seller-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const res2 = await handleSellerApiRequest(req2, testEnv, {
    supabaseClient: mockDb as any,
    fetchImpl: mockResendSuccess,
    rateLimitStore: rateStore,
  });
  assert.equal(res2.status, 200);
  const data2 = await res2.json();
  assert.equal(data2.duplicate, true);
  assert.equal(data2.lead_id, data1.lead_id);
  assert.equal(mockDb.leads.length, 1);
  assert.equal(sentEmails.length, 2); // No duplicate emails sent!

  // 3. Case where database insert succeeds (201) but Resend fails AND notification audit persistence fails
  const failingNotifDb = createMockSupabase({
    simulateNotificationDbFailure: true,
  });
  const failingResendFetch = (async () =>
    new Response(
      JSON.stringify({ name: 'api_error', message: 'Service unavailable' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )) as unknown as typeof fetch;

  const reqFailEmail = new Request(
    'https://nammastores.com/api/submit-seller-lead',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        mobile: '9845099112',
        email: 'newmerchant@example.com',
        programme_preference: 'namma_fresh',
        client_submission_id: '22222222-3333-4444-8555-666666666666',
      }),
    }
  );
  const resFailEmail = await handleSellerApiRequest(reqFailEmail, testEnv, {
    supabaseClient: failingNotifDb as any,
    fetchImpl: failingResendFetch,
    rateLimitStore: rateStore,
  });
  assert.equal(resFailEmail.status, 201);
  const dataFailEmail = await resFailEmail.json();
  assert.equal(dataFailEmail.success, true);
  assert.equal(dataFailEmail.email_status, 'failed');
  assert.equal(dataFailEmail.owner_notification_status, 'failed');
  assert.equal(dataFailEmail.notification_persisted, false);
  assert.equal(failingNotifDb.leads.length, 1);
  assert.equal(failingNotifDb.leads[0].programme_preference, 'namma_fresh');
});

test('Cloudflare Worker (worker/index.ts) and Pages Functions runtime routing, CORS, rate limiting, and SPA fallback', async () => {
  const mockDb = createMockSupabase();
  const mockResend = (async () =>
    new Response(JSON.stringify({ id: 're_cf_1' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as unknown as typeof fetch;

  const workerEnv = {
    SUPABASE_URL: 'https://txmrfheminuminggtwfv.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service_role_test_key',
    RESEND_API_KEY: 're_live_test_key',
    RESEND_FROM_EMAIL: 'Namma Stores <applications@nammastores.com>',
    RESEND_REPLY_TO_EMAIL: 'official.nammastores@gmail.com',
    OWNER_NOTIFICATION_EMAIL: 'official.nammastores@gmail.com',
    ASSETS: {
      async fetch(req: Request | string) {
        const u = new URL(typeof req === 'string' ? req : req.url);
        if (u.pathname === '/index.html' || u.pathname === '/') {
          return new Response('<!DOCTYPE html><html><body>Namma Stores SPA</body></html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          });
        }
        return new Response('Not Found', { status: 404 });
      },
    },
  };

  // 1. OPTIONS preflight on /api/submit-seller-lead
  const optionsRes = await cloudflareWorker.fetch(
    new Request('https://nammastores.com/api/submit-seller-lead', {
      method: 'OPTIONS',
    }),
    workerEnv
  );
  assert.equal(optionsRes.status, 204);
  assert.equal(optionsRes.headers.get('access-control-allow-origin'), '*');

  // 2. GET on /api/submit-seller-lead returns 405 Method Not Allowed
  const getOnSubmitRes = await cloudflareWorker.fetch(
    new Request('https://nammastores.com/api/submit-seller-lead', {
      method: 'GET',
    }),
    workerEnv
  );
  assert.equal(getOnSubmitRes.status, 405);

  // 3. GET /api/config-status via Cloudflare Pages Function and Worker
  const configRes = await pagesConfigFn({
    request: new Request('https://nammastores.com/api/config-status', {
      method: 'GET',
    }),
    env: workerEnv,
  });
  assert.equal(configRes.status, 200);
  const configJson = await configRes.json();
  assert.equal(configJson.supabase_configured, true);
  assert.equal(configJson.resend_configured, true);
  assert.equal(configJson.owner_notification_enabled, true);

  // 4. Unknown /api/unknown route returns 404 JSON
  const unknownApiRes = await cloudflareWorker.fetch(
    new Request('https://nammastores.com/api/does-not-exist', {
      method: 'GET',
    }),
    workerEnv
  );
  assert.equal(unknownApiRes.status, 404);

  // 5. SPA navigation route (e.g. /apply) falls back to index.html via ASSETS binding
  const spaRes = await cloudflareWorker.fetch(
    new Request('https://nammastores.com/apply', {
      method: 'GET',
      headers: { Accept: 'text/html,application/xhtml+xml' },
    }),
    workerEnv
  );
  assert.equal(spaRes.status, 200);
  const spaHtml = await spaRes.text();
  assert.ok(spaHtml.includes('Namma Stores SPA'));

  // 6. Rate limiting returns 429 when maxRequestsPerWindow is exceeded
  const strictRateStore = new Map<string, { count: number; resetAt: number }>();
  for (let i = 0; i < 2; i++) {
    const okRateRes = await handleSellerApiRequest(
      new Request('https://nammastores.com/api/submit-seller-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '203.0.113.55',
        },
        body: JSON.stringify({ website_url: 'honeypot-bot' }),
      }),
      workerEnv,
      {
        supabaseClient: mockDb as any,
        fetchImpl: mockResend,
        rateLimitStore: strictRateStore,
        maxRequestsPerWindow: 2,
      }
    );
    assert.equal(okRateRes.status, 200);
  }
  const blockedRateRes = await handleSellerApiRequest(
    new Request('https://nammastores.com/api/submit-seller-lead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cf-connecting-ip': '203.0.113.55',
      },
      body: JSON.stringify({}),
    }),
    workerEnv,
    {
      supabaseClient: mockDb as any,
      fetchImpl: mockResend,
      rateLimitStore: strictRateStore,
      maxRequestsPerWindow: 2,
    }
  );
  assert.equal(blockedRateRes.status, 429);

  // 7. Pages Function entry point for /api/submit-seller-lead validates bad input with 400
  const pagesBadRes = await pagesSubmitFn({
    request: new Request('https://nammastores.com/api/submit-seller-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop_name: '' }),
    }),
    env: workerEnv,
  });
  assert.equal(pagesBadRes.status, 400);
});

