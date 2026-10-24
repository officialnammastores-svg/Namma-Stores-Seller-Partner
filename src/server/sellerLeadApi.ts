import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  validateSellerSubmission,
  sanitizePlainText,
  buildSellerLeadDatabaseRow,
} from '../utils/rules.ts';
import {
  validateResendConfig,
  dispatchResendConfirmationEmail,
  dispatchOwnerNotificationEmail,
  type OwnerNotificationLeadDetails,
  type ResendDispatchResult,
} from '../utils/emailTemplate.ts';

export interface SellerApiEnv {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  EMAIL_FROM?: string;
  RESEND_REPLY_TO_EMAIL?: string;
  OWNER_NOTIFICATION_EMAIL?: string;
  EMAIL_LOGO_URL?: string;
  IP_HASH_SALT?: string;
  ALLOWED_ORIGIN?: string;
}

export interface SellerApiDependencies {
  supabaseClient?: SupabaseClient | null;
  fetchImpl?: typeof fetch;
  rateLimitStore?: Map<string, { count: number; resetAt: number }>;
  maxRequestsPerWindow?: number;
  rateLimitWindowMs?: number;
}

const defaultRateLimits = new Map<string, { count: number; resetAt: number }>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function resolveRuntimeEnv(explicitEnv?: SellerApiEnv): SellerApiEnv {
  const procEnv =
    typeof process !== 'undefined' && process.env ? process.env : {};
  return {
    SUPABASE_URL: explicitEnv?.SUPABASE_URL ?? procEnv.SUPABASE_URL,
    VITE_SUPABASE_URL:
      explicitEnv?.VITE_SUPABASE_URL ?? procEnv.VITE_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY:
      explicitEnv?.SUPABASE_SERVICE_ROLE_KEY ??
      procEnv.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: explicitEnv?.RESEND_API_KEY ?? procEnv.RESEND_API_KEY,
    RESEND_FROM_EMAIL:
      explicitEnv?.RESEND_FROM_EMAIL ?? procEnv.RESEND_FROM_EMAIL,
    EMAIL_FROM: explicitEnv?.EMAIL_FROM ?? procEnv.EMAIL_FROM,
    RESEND_REPLY_TO_EMAIL:
      explicitEnv?.RESEND_REPLY_TO_EMAIL ?? procEnv.RESEND_REPLY_TO_EMAIL,
    OWNER_NOTIFICATION_EMAIL:
      explicitEnv?.OWNER_NOTIFICATION_EMAIL ?? procEnv.OWNER_NOTIFICATION_EMAIL,
    EMAIL_LOGO_URL: explicitEnv?.EMAIL_LOGO_URL ?? procEnv.EMAIL_LOGO_URL,
    IP_HASH_SALT: explicitEnv?.IP_HASH_SALT ?? procEnv.IP_HASH_SALT,
    ALLOWED_ORIGIN: explicitEnv?.ALLOWED_ORIGIN ?? procEnv.ALLOWED_ORIGIN,
  };
}

export function isPlaceholderSecret(val?: string | null): boolean {
  const trimmed = (val || '').trim();
  return (
    !trimmed ||
    trimmed.includes('your_supabase') ||
    trimmed.includes('your-project-id') ||
    trimmed.includes('your-namma-stores') ||
    trimmed === 'your_supabase_service_role_key' ||
    trimmed === 'your-server-side-service-role-key'
  );
}

export function createSupabaseServiceClient(
  env: SellerApiEnv
): SupabaseClient | null {
  const supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
  const supabaseServiceKey = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (
    isPlaceholderSecret(supabaseUrl) ||
    isPlaceholderSecret(supabaseServiceKey) ||
    !supabaseUrl.startsWith('http')
  ) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function hashClientIp(
  ip: string,
  salt = 'namma-stores-whitefield-salt'
): Promise<string> {
  const data = new TextEncoder().encode(`${ip}:${salt}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

export function extractClientIpFromRequest(
  request: Request,
  fallbackIp = 'unknown'
): string {
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return fallbackIp;
}

export function checkMemoryRateLimit(
  ipHash: string,
  store: Map<string, { count: number; resetAt: number }> = defaultRateLimits,
  maxRequests = 12,
  windowMs = 10 * 60 * 1000
): boolean {
  const now = Date.now();
  const entry = store.get(ipHash);
  if (!entry || now > entry.resetAt) {
    store.set(ipHash, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > maxRequests;
}

type NotificationKind = 'seller_ack' | 'owner_alert';

function getProviderTag(kind: NotificationKind): string {
  return kind === 'seller_ack' ? 'resend:seller_ack' : 'resend:owner_alert';
}

function matchesNotificationRow(row: any, kind: NotificationKind): boolean {
  if (!row) return false;
  const ch = String(row.channel || '');
  const prov = String(row.provider || '');
  if (kind === 'seller_ack') {
    return (
      ch === 'seller_email' ||
      prov === 'resend:seller_ack' ||
      (ch === 'email' && prov === 'resend')
    );
  }
  return ch === 'owner_email' || prov === 'resend:owner_alert';
}

export interface NotificationPersistenceResult {
  persisted: boolean;
  notification_id: string | null;
  attempt_count: number;
  db_error: string | null;
}

export async function recordNotificationAttempt(
  supabaseServer: SupabaseClient | null,
  leadId: string,
  kind: NotificationKind,
  dispatchResult: ResendDispatchResult,
  existingRow?: {
    id: string;
    attempt_count?: number;
    channel?: string;
    provider?: string;
  } | null
): Promise<NotificationPersistenceResult> {
  const computedAttemptCount = (existingRow?.attempt_count || 0) + 1;
  if (!supabaseServer) {
    return {
      persisted: false,
      notification_id: null,
      attempt_count: computedAttemptCount,
      db_error: 'Database service client is not configured.',
    };
  }

  const nowIso = new Date().toISOString();
  const providerTag = getProviderTag(kind);

  const basePayload = {
    lead_id: leadId,
    channel: 'email' as const,
    provider: providerTag,
    status: dispatchResult.status,
    provider_message_id: dispatchResult.provider_message_id || null,
    attempt_count: computedAttemptCount,
    last_error_code: dispatchResult.error_code || null,
    last_error_summary: dispatchResult.error_summary || null,
    attempted_at: nowIso,
    sent_at: dispatchResult.status === 'sent' ? nowIso : null,
  };

  try {
    if (existingRow?.id) {
      const updatePayload = {
        ...basePayload,
        channel: existingRow.channel || 'email',
        provider: providerTag,
      };
      const { data: updated, error: updateErr } = await supabaseServer
        .from('seller_lead_notifications')
        .update(updatePayload)
        .eq('id', existingRow.id)
        .select('id, attempt_count')
        .single();

      if (!updateErr && updated) {
        return {
          persisted: true,
          notification_id: updated.id,
          attempt_count: updated.attempt_count ?? computedAttemptCount,
          db_error: null,
        };
      }
      console.error('[Notification Update Error]', {
        lead_id: leadId,
        kind,
        code: updateErr?.code,
        message: updateErr?.message,
      });
      return {
        persisted: false,
        notification_id: existingRow.id,
        attempt_count: computedAttemptCount,
        db_error:
          updateErr?.message || 'Failed to update notification record.',
      };
    }

    const { data: insertedRow, error: insertErr } = await supabaseServer
      .from('seller_lead_notifications')
      .insert([basePayload])
      .select('id, attempt_count')
      .single();

    if (!insertErr && insertedRow) {
      return {
        persisted: true,
        notification_id: insertedRow.id,
        attempt_count: insertedRow.attempt_count ?? computedAttemptCount,
        db_error: null,
      };
    }

    console.error('[Notification Insert Error]', {
      lead_id: leadId,
      kind,
      code: insertErr?.code,
      message: insertErr?.message,
    });
    return {
      persisted: false,
      notification_id: null,
      attempt_count: computedAttemptCount,
      db_error: insertErr?.message || 'Failed to insert notification record.',
    };
  } catch (err: any) {
    console.error('[Notification Persistence Exception]', {
      lead_id: leadId,
      kind,
      error: err?.message || String(err),
    });
    return {
      persisted: false,
      notification_id: null,
      attempt_count: computedAttemptCount,
      db_error: err?.message || 'Unexpected notification persistence error.',
    };
  }
}

export async function processLeadNotifications(params: {
  supabaseServer: SupabaseClient | null;
  leadDetails: OwnerNotificationLeadDetails;
  existingNotifs?: any[];
  env: SellerApiEnv;
  fetchImpl?: typeof fetch;
}): Promise<{
  sellerResult: ResendDispatchResult;
  sellerPersisted: NotificationPersistenceResult;
  ownerResult: ResendDispatchResult;
  ownerPersisted: NotificationPersistenceResult;
}> {
  const {
    supabaseServer,
    leadDetails,
    existingNotifs = [],
    env,
    fetchImpl,
  } = params;

  const existingSellerRow = existingNotifs.find((r) =>
    matchesNotificationRow(r, 'seller_ack')
  );
  const existingOwnerRow = existingNotifs.find((r) =>
    matchesNotificationRow(r, 'owner_alert')
  );

  const apiKey = env.RESEND_API_KEY;
  const fromEmail = env.RESEND_FROM_EMAIL || env.EMAIL_FROM;
  const replyToEmail = env.RESEND_REPLY_TO_EMAIL;
  const ownerNotificationEmail = env.OWNER_NOTIFICATION_EMAIL;

  // 1. Seller acknowledgement (independent)
  let sellerResult: ResendDispatchResult;
  let sellerPersisted: NotificationPersistenceResult;

  if (existingSellerRow?.status === 'sent') {
    sellerResult = {
      status: 'sent',
      delivery_stage: 'accepted_by_provider',
      http_status: 200,
      provider_message_id: existingSellerRow.provider_message_id || null,
      error_code: null,
      error_summary: null,
    };
    sellerPersisted = {
      persisted: true,
      notification_id: existingSellerRow.id,
      attempt_count: existingSellerRow.attempt_count || 1,
      db_error: null,
    };
  } else {
    const nextSellerAttempt = (existingSellerRow?.attempt_count || 0) + 1;
    sellerResult = await dispatchResendConfirmationEmail({
      leadId: leadDetails.leadId,
      recipientEmail: leadDetails.email,
      shopName: leadDetails.shopName,
      ownerName: leadDetails.ownerName,
      attemptNumber: nextSellerAttempt,
      apiKey,
      fromEmail,
      replyToEmail,
      fetchImpl,
    });
    sellerPersisted = await recordNotificationAttempt(
      supabaseServer,
      leadDetails.leadId,
      'seller_ack',
      sellerResult,
      existingSellerRow
    );
  }

  // 2. Owner notification (independent)
  let ownerResult: ResendDispatchResult;
  let ownerPersisted: NotificationPersistenceResult;

  if (
    existingOwnerRow?.status === 'sent' ||
    existingOwnerRow?.status === 'skipped'
  ) {
    ownerResult = {
      status: existingOwnerRow.status,
      delivery_stage:
        existingOwnerRow.status === 'sent' ? 'accepted_by_provider' : 'skipped',
      http_status: existingOwnerRow.status === 'sent' ? 200 : null,
      provider_message_id: existingOwnerRow.provider_message_id || null,
      error_code: existingOwnerRow.last_error_code || null,
      error_summary: existingOwnerRow.last_error_summary || null,
    };
    ownerPersisted = {
      persisted: true,
      notification_id: existingOwnerRow.id,
      attempt_count: existingOwnerRow.attempt_count || 1,
      db_error: null,
    };
  } else {
    const nextOwnerAttempt = (existingOwnerRow?.attempt_count || 0) + 1;
    ownerResult = await dispatchOwnerNotificationEmail({
      lead: leadDetails,
      attemptNumber: nextOwnerAttempt,
      apiKey,
      fromEmail,
      replyToEmail,
      ownerNotificationEmail,
      fetchImpl,
    });
    ownerPersisted = await recordNotificationAttempt(
      supabaseServer,
      leadDetails.leadId,
      'owner_alert',
      ownerResult,
      existingOwnerRow
    );
  }

  // 3. Log notification outcomes in public.seller_lead_events
  if (supabaseServer) {
    const eventType =
      sellerResult.status === 'failed' || ownerResult.status === 'failed'
        ? 'notification_failed'
        : 'note_added';

    const eventPayload = {
      lead_id: leadDetails.leadId,
      actor_user_id: null,
      event_type: eventType,
      old_value: null,
      new_value: {
        seller_acknowledgement: {
          status: sellerResult.status,
          delivery_stage: sellerResult.delivery_stage,
          provider_message_id: sellerResult.provider_message_id,
          attempt_count: sellerPersisted.attempt_count,
          error_code: sellerResult.error_code,
        },
        owner_notification: {
          status: ownerResult.status,
          delivery_stage: ownerResult.delivery_stage,
          provider_message_id: ownerResult.provider_message_id,
          attempt_count: ownerPersisted.attempt_count,
          error_code: ownerResult.error_code,
        },
      },
      note: `Seller acknowledgement: ${sellerResult.delivery_stage}; Owner notification: ${ownerResult.delivery_stage}`,
    };

    try {
      const { error: eventErr } = await supabaseServer
        .from('seller_lead_events')
        .insert([eventPayload]);

      if (eventErr) {
        console.error('[Notification Event Insert Error]', {
          lead_id: leadDetails.leadId,
          code: eventErr.code,
          message: eventErr.message,
        });
      }
    } catch (err: any) {
      console.error('[Notification Event Insert Exception]', {
        lead_id: leadDetails.leadId,
        error: err?.message || String(err),
      });
    }
  }

  return {
    sellerResult,
    sellerPersisted,
    ownerResult,
    ownerPersisted,
  };
}

function buildCorsHeaders(env: SellerApiEnv): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export async function handleSellerApiRequest(
  request: Request,
  rawEnv?: SellerApiEnv,
  deps?: SellerApiDependencies,
  fallbackClientIp?: string
): Promise<Response> {
  const env = resolveRuntimeEnv(rawEnv);
  const corsHeaders = buildCorsHeaders(env);
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // ---------------------------------------------------------------------------
  // GET /api/config-status — Non-sensitive operational health check
  // ---------------------------------------------------------------------------
  if (pathname === '/api/config-status') {
    if (request.method !== 'GET') {
      return jsonResponse(
        { success: false, message: 'Method not allowed.' },
        405,
        { ...corsHeaders, Allow: 'GET, OPTIONS' }
      );
    }

    const supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
    const supabaseServiceKey = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const isSupabaseConfigured =
      deps?.supabaseClient !== undefined
        ? Boolean(deps.supabaseClient)
        : Boolean(
            !isPlaceholderSecret(supabaseUrl) &&
              !isPlaceholderSecret(supabaseServiceKey) &&
              supabaseUrl.startsWith('http')
          );

    const resendConfig = validateResendConfig({
      apiKey: env.RESEND_API_KEY,
      fromEmail: env.RESEND_FROM_EMAIL || env.EMAIL_FROM,
      replyToEmail: env.RESEND_REPLY_TO_EMAIL,
      ownerNotificationEmail: env.OWNER_NOTIFICATION_EMAIL,
    });

    return jsonResponse(
      {
        supabase_configured: isSupabaseConfigured,
        resend_configured: resendConfig.valid && !resendConfig.isTestingDomain,
        resend_api_key_present: resendConfig.errorCode !== 'RESEND_KEY_MISSING',
        resend_from_email_configured:
          resendConfig.errorCode !== 'RESEND_FROM_EMAIL_MISSING' &&
          Boolean(resendConfig.fromEmail),
        resend_using_testing_domain: resendConfig.isTestingDomain,
        owner_notification_enabled: resendConfig.ownerNotificationEnabled,
        whitefield_rollout_active: true,
      },
      200,
      corsHeaders
    );
  }

  // ---------------------------------------------------------------------------
  // POST /api/submit-seller-lead — Canonical Public Seller Partner Endpoint
  // ---------------------------------------------------------------------------
  if (pathname === '/api/submit-seller-lead') {
    if (request.method !== 'POST') {
      return jsonResponse(
        { success: false, message: 'Method not allowed.' },
        405,
        { ...corsHeaders, Allow: 'POST, OPTIONS' }
      );
    }

    const contentLength = Number(request.headers.get('content-length') || '0');
    if (contentLength > 65536) {
      return jsonResponse(
        {
          success: false,
          message: 'Request payload is too large.',
        },
        413,
        corsHeaders
      );
    }

    const clientIp = extractClientIpFromRequest(request, fallbackClientIp);
    const ipHash = await hashClientIp(
      clientIp,
      env.IP_HASH_SALT || 'namma-stores-whitefield-salt'
    );

    const rateStore = deps?.rateLimitStore || defaultRateLimits;
    const maxRequests = deps?.maxRequestsPerWindow ?? 12;
    const windowMs = deps?.rateLimitWindowMs ?? 10 * 60 * 1000;

    if (checkMemoryRateLimit(ipHash, rateStore, maxRequests, windowMs)) {
      return jsonResponse(
        {
          success: false,
          message:
            'Too many requests from this network. Please wait a few minutes and try again.',
        },
        429,
        corsHeaders
      );
    }

    let rawText = '';
    try {
      rawText = await request.text();
    } catch {
      return jsonResponse(
        {
          success: false,
          message: 'Unable to read request body.',
        },
        400,
        corsHeaders
      );
    }

    if (rawText.length > 65536) {
      return jsonResponse(
        {
          success: false,
          message: 'Request payload is too large.',
        },
        413,
        corsHeaders
      );
    }

    let body: Record<string, any> | null = null;
    try {
      body = rawText ? JSON.parse(rawText) : null;
    } catch {
      body = null;
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse(
        {
          success: false,
          message: 'Invalid JSON request body.',
        },
        400,
        corsHeaders
      );
    }

    // Honeypot check for automated bot submissions
    const honeypot = String(
      body.website_url || body.company_website || ''
    ).trim();
    if (honeypot.length > 0) {
      return jsonResponse(
        {
          success: true,
          ok: true,
          lead_id: crypto.randomUUID(),
          duplicate: false,
          email_status: 'skipped',
          message:
            'Thank you! Your seller partner application has been received.',
          notification: { email: 'skipped' },
        },
        200,
        corsHeaders
      );
    }

    // 1. Validate and sanitize the seller's submitted data
    const validation = validateSellerSubmission(body);
    if (!validation.isValid || !validation.sanitized) {
      return jsonResponse(
        {
          success: false,
          message: 'Please check the highlighted form fields and try again.',
          errors: validation.errors,
        },
        400,
        corsHeaders
      );
    }

    const supabaseServer =
      deps?.supabaseClient !== undefined
        ? deps.supabaseClient
        : createSupabaseServiceClient(env);

    if (!supabaseServer) {
      return jsonResponse(
        {
          success: false,
          message:
            'Unable to save your application right now. Please try again shortly.',
        },
        503,
        corsHeaders
      );
    }

    const rawClientId =
      typeof body.client_submission_id === 'string'
        ? body.client_submission_id.trim()
        : '';
    const hasExplicitClientId = UUID_REGEX.test(rawClientId);
    const clientSubmissionId = hasExplicitClientId
      ? rawClientId
      : crypto.randomUUID();

    const clean = {
      ...validation.sanitized,
      referral_source_other:
        sanitizePlainText(body.referral_source_other, 120) || null,
      source: sanitizePlainText(body.source, 100) || 'seller_partner_website',
      landing_page: sanitizePlainText(body.landing_page, 300) || '/',
      utm_source: sanitizePlainText(body.utm_source, 120) || null,
      utm_medium: sanitizePlainText(body.utm_medium, 120) || null,
      utm_campaign: sanitizePlainText(body.utm_campaign, 120) || null,
      utm_content: sanitizePlainText(body.utm_content, 120) || null,
      utm_term: sanitizePlainText(body.utm_term, 120) || null,
      referrer: sanitizePlainText(body.referrer, 500) || null,
      client_submission_id: clientSubmissionId,
      has_explicit_client_id: hasExplicitClientId,
      privacy_acknowledged: true,
    };

    const userAgent = String(request.headers.get('user-agent') || '').slice(
      0,
      512
    );

    try {
      // Idempotency & duplicate submission check (same client_submission_id or same mobile/email within 24h)
      const twentyFourHoursAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();

      let existingLeadRow: any = null;

      if (clean.has_explicit_client_id) {
        const { data: byClientId } = await supabaseServer
          .from('seller_leads')
          .select('*')
          .eq('client_submission_id', clean.client_submission_id)
          .maybeSingle();
        if (byClientId) {
          existingLeadRow = byClientId;
        }
      }

      if (!existingLeadRow) {
        const { data: recentDuplicate } = await supabaseServer
          .from('seller_leads')
          .select('*')
          .or(`mobile.eq.${clean.mobile},email.ilike.${clean.email}`)
          .gte('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentDuplicate) {
          existingLeadRow = recentDuplicate;
        }
      }

      if (!existingLeadRow) {
        const { data: exactSellerMatch } = await supabaseServer
          .from('seller_leads')
          .select('*')
          .eq('mobile', clean.mobile)
          .ilike('email', clean.email)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (exactSellerMatch) {
          existingLeadRow = exactSellerMatch;
        }
      }

      if (existingLeadRow) {
        const { data: existingNotifs } = await supabaseServer
          .from('seller_lead_notifications')
          .select('*')
          .eq('lead_id', existingLeadRow.id)
          .order('created_at', { ascending: false });

        const leadDetailsForRetry: OwnerNotificationLeadDetails = {
          leadId: existingLeadRow.id,
          shopName: existingLeadRow.shop_name || clean.shop_name,
          ownerName: existingLeadRow.owner_name || clean.owner_name,
          email: existingLeadRow.email || clean.email,
          mobile: existingLeadRow.mobile || clean.mobile,
          shopCategory: existingLeadRow.shop_category || clean.shop_category,
          programmePreference:
            existingLeadRow.programme_preference ?? clean.programme_preference,
          contactPreference:
            existingLeadRow.contact_preference || clean.contact_preference,
          shopAddress: existingLeadRow.shop_address || clean.shop_address,
          submittedAt: existingLeadRow.created_at || new Date().toISOString(),
          googleMapsLink:
            existingLeadRow.google_maps_link ?? clean.google_maps_link,
          shopLatitude: existingLeadRow.shop_latitude ?? clean.shop_latitude,
          shopLongitude: existingLeadRow.shop_longitude ?? clean.shop_longitude,
          locationAccuracyMeters:
            existingLeadRow.location_accuracy_meters ??
            clean.location_accuracy_meters,
          locationCaptureMethod:
            existingLeadRow.location_capture_method ??
            clean.location_capture_method,
          referralSource:
            existingLeadRow.referral_source ?? clean.referral_source,
          referralSourceOther:
            existingLeadRow.referral_source_other ?? clean.referral_source_other,
        };

        const notifOutcome = await processLeadNotifications({
          supabaseServer,
          leadDetails: leadDetailsForRetry,
          existingNotifs: existingNotifs || [],
          env,
          fetchImpl: deps?.fetchImpl,
        });

        return jsonResponse(
          {
            success: true,
            ok: true,
            lead_id: existingLeadRow.id,
            duplicate: true,
            is_duplicate: true,
            email_status: notifOutcome.sellerResult.status,
            owner_notification_status: notifOutcome.ownerResult.status,
            notification_persisted:
              notifOutcome.sellerPersisted.persisted &&
              notifOutcome.ownerPersisted.persisted,
            message:
              'We have already received your application. Our team will reach out shortly.',
            notification: {
              email: notifOutcome.sellerResult.status,
            },
            notifications: [
              {
                channel: 'seller_email',
                status: notifOutcome.sellerResult.status,
                delivery_stage: notifOutcome.sellerResult.delivery_stage,
              },
              {
                channel: 'owner_email',
                status: notifOutcome.ownerResult.status,
                delivery_stage: notifOutcome.ownerResult.delivery_stage,
              },
            ],
          },
          200,
          corsHeaders
        );
      }

      // 2. Insert the application into public.seller_leads (preserving NULL when programme_preference is unselected)
      const insertRow = buildSellerLeadDatabaseRow(validation.sanitized, {
        referral_source_other: clean.referral_source_other,
        source: clean.source,
        landing_page: clean.landing_page,
        utm_source: clean.utm_source,
        utm_medium: clean.utm_medium,
        utm_campaign: clean.utm_campaign,
        utm_content: clean.utm_content,
        utm_term: clean.utm_term,
        referrer: clean.referrer,
        client_submission_id: clean.client_submission_id,
        submission_ip_hash: ipHash,
        user_agent: userAgent,
      });

      const { data: insertedLead, error: insertError } = await supabaseServer
        .from('seller_leads')
        .insert([insertRow])
        .select('id, created_at')
        .single();

      // Handle concurrent duplicate client_submission_id race condition gracefully
      if (insertError && insertError.code === '23505') {
        const { data: racedExisting } = await supabaseServer
          .from('seller_leads')
          .select('id')
          .eq('client_submission_id', clean.client_submission_id)
          .maybeSingle();

        if (racedExisting) {
          return jsonResponse(
            {
              success: true,
              ok: true,
              lead_id: racedExisting.id,
              duplicate: true,
              is_duplicate: true,
              email_status: 'skipped',
              notification_persisted: true,
              message:
                'We have already received your application. Our team will reach out shortly.',
              notification: {
                email: 'skipped',
              },
            },
            200,
            corsHeaders
          );
        }
      }

      // Handle database check constraint errors as 400 validation errors
      if (insertError && insertError.code === '23514') {
        const constraintMsg = String(insertError.message || '');
        const fieldErrors: Record<string, string> = {};
        if (constraintMsg.includes('shop_address')) {
          fieldErrors.shop_address =
            'Please enter complete shop address with landmark (at least 8 characters)';
        } else if (constraintMsg.includes('shop_name')) {
          fieldErrors.shop_name =
            'Please enter a valid shop name (at least 2 characters)';
        } else if (constraintMsg.includes('owner_name')) {
          fieldErrors.owner_name =
            "Please enter owner's full name (at least 2 characters)";
        } else if (constraintMsg.includes('mobile')) {
          fieldErrors.mobile =
            'Please enter a valid 10-digit Indian mobile number';
        } else if (
          constraintMsg.includes('google_maps_link') ||
          constraintMsg.includes('shop_latitude') ||
          constraintMsg.includes('shop_longitude') ||
          constraintMsg.includes('location_accuracy') ||
          constraintMsg.includes('location_capture_method')
        ) {
          fieldErrors.google_maps_link =
            'Please provide a valid store location or Google Maps link';
        }
        return jsonResponse(
          {
            success: false,
            message: 'Please check the highlighted form fields and try again.',
            errors: fieldErrors,
          },
          400,
          corsHeaders
        );
      }

      // 3. Confirm that the database insert succeeded and return genuine lead ID
      if (insertError || !insertedLead) {
        console.error('[Lead Insert Failure]', {
          code: insertError?.code,
          message: insertError?.message,
        });
        return jsonResponse(
          {
            success: false,
            message:
              'Unable to save your application right now. Please try again or contact us on WhatsApp.',
          },
          500,
          corsHeaders
        );
      }

      // 4. Record lead_created event in public.seller_lead_events
      try {
        const { error: eventInsertError } = await supabaseServer
          .from('seller_lead_events')
          .insert([
            {
              lead_id: insertedLead.id,
              actor_user_id: null,
              event_type: 'lead_created',
              old_value: null,
              new_value: {
                source: clean.source,
                status: 'new',
                shop_category: clean.shop_category,
                programme_preference: clean.programme_preference,
                referral_source: clean.referral_source || null,
                google_maps_link: clean.google_maps_link || null,
                shop_latitude: clean.shop_latitude,
                shop_longitude: clean.shop_longitude,
                location_accuracy_meters: clean.location_accuracy_meters,
                location_capture_method: clean.location_capture_method,
              },
              note: `Seller lead submitted via website (${clean.shop_category})`,
            },
          ]);

        if (eventInsertError) {
          console.error('[Event Insert Error]', {
            lead_id: insertedLead.id,
            code: eventInsertError.code,
            message: eventInsertError.message,
          });
        }
      } catch (eventErr: any) {
        console.error('[Event Insert Exception]', {
          lead_id: insertedLead.id,
          error: eventErr?.message || String(eventErr),
        });
      }

      // 5. Attempt owner notification and seller acknowledgement independently & record both in seller_lead_notifications
      const leadDetails: OwnerNotificationLeadDetails = {
        leadId: insertedLead.id,
        shopName: clean.shop_name,
        ownerName: clean.owner_name,
        email: clean.email,
        mobile: clean.mobile,
        shopCategory: clean.shop_category,
        programmePreference: clean.programme_preference,
        contactPreference: clean.contact_preference,
        shopAddress: clean.shop_address,
        submittedAt: insertedLead.created_at || new Date().toISOString(),
        googleMapsLink: clean.google_maps_link,
        shopLatitude: clean.shop_latitude,
        shopLongitude: clean.shop_longitude,
        locationAccuracyMeters: clean.location_accuracy_meters,
        locationCaptureMethod: clean.location_capture_method,
        referralSource: clean.referral_source,
        referralSourceOther: clean.referral_source_other,
      };

      const notifOutcome = await processLeadNotifications({
        supabaseServer,
        leadDetails,
        existingNotifs: [],
        env,
        fetchImpl: deps?.fetchImpl,
      });

      return jsonResponse(
        {
          success: true,
          ok: true,
          lead_id: insertedLead.id,
          duplicate: false,
          is_duplicate: false,
          email_status: notifOutcome.sellerResult.status,
          owner_notification_status: notifOutcome.ownerResult.status,
          notification_persisted:
            notifOutcome.sellerPersisted.persisted &&
            notifOutcome.ownerPersisted.persisted,
          message:
            'Thank you! Your seller partner application has been submitted.',
          notification: {
            email: notifOutcome.sellerResult.status,
            persisted: notifOutcome.sellerPersisted.persisted,
            attempt_count: notifOutcome.sellerPersisted.attempt_count,
          },
          notifications: [
            {
              channel: 'seller_email',
              status: notifOutcome.sellerResult.status,
              delivery_stage: notifOutcome.sellerResult.delivery_stage,
            },
            {
              channel: 'owner_email',
              status: notifOutcome.ownerResult.status,
              delivery_stage: notifOutcome.ownerResult.delivery_stage,
            },
          ],
        },
        201,
        corsHeaders
      );
    } catch (err: any) {
      console.error('[Submit Seller Lead Fatal Error]', err?.message || err);
      return jsonResponse(
        {
          success: false,
          message:
            'An unexpected server error occurred. Please try again shortly.',
        },
        500,
        corsHeaders
      );
    }
  }

  return jsonResponse(
    {
      success: false,
      message: 'API endpoint not found.',
    },
    404,
    corsHeaders
  );
}
