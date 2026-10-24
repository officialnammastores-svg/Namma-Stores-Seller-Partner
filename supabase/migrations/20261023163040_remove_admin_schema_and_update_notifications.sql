-- ==============================================================================
-- NAMMA STORES SELLER PARTNER — REMOVE ADMIN SCHEMA & UPDATE NOTIFICATIONS
-- Migration Version: 20261023163040 (remove_admin_schema_and_update_notifications)
-- Target Project: txmrfheminuminggtwfv
--
-- Reconciled with remote migration history:
-- - Ensures store-location columns exist for fresh environments (`ADD COLUMN IF NOT EXISTS`).
-- - Idempotently backfills `referral_source` and archives any non-empty `call_notes`
--   into `public.seller_lead_events` (using `NOT EXISTS` on `lead_id`, marker `note`,
--   and `archived_call_notes`) before `call_notes` is dropped.
-- - Ensures `programme_preference` is nullable (`DROP NOT NULL`, `SET DEFAULT NULL`).
-- - Removes legacy `(lead_id, channel)` unique constraints/indexes from fresh-environment
--   initial migrations so both seller acknowledgement (`resend:seller_ack`) and owner
--   notification (`resend:owner_alert`) rows can be stored under `channel = 'email'`.
-- - Drops the four legacy admin RLS policies, `private.is_seller_lead_admin()`,
--   `private.seller_lead_admins`, and the four obsolete CRM columns (`assigned_to`,
--   `next_follow_up_at`, `last_contacted_at`, `call_notes`).
-- - Preserves Row Level Security (RLS) on all public seller tables.
-- ==============================================================================

BEGIN;

-- 1. Ensure canonical referral and store-location columns exist (for fresh environments)
ALTER TABLE IF EXISTS public.seller_leads
  ADD COLUMN IF NOT EXISTS referral_source TEXT,
  ADD COLUMN IF NOT EXISTS referral_source_other TEXT,
  ADD COLUMN IF NOT EXISTS google_maps_link TEXT,
  ADD COLUMN IF NOT EXISTS shop_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS shop_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_accuracy_meters DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_capture_method TEXT;

-- 2. Idempotently preserve any populated call_notes data before dropping call_notes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seller_leads'
      AND column_name = 'call_notes'
  ) THEN
    -- 2a. Backfill referral_source from `[Referral: ...]` in call_notes only where referral_source is null
    UPDATE public.seller_leads
    SET referral_source = substring(call_notes FROM '\[Referral(?:\s+Source)?:\s*([^\]]+)\]')
    WHERE referral_source IS NULL
      AND call_notes IS NOT NULL
      AND call_notes ~ '\[Referral(?:\s+Source)?:\s*[^\]]+\]';

    -- 2b. Idempotently archive any non-empty call_notes into public.seller_lead_events
    INSERT INTO public.seller_lead_events (
      lead_id,
      actor_user_id,
      event_type,
      old_value,
      new_value,
      note
    )
    SELECT
      sl.id,
      NULL,
      'note_added',
      NULL,
      jsonb_build_object(
        'archived_call_notes', sl.call_notes,
        'referral_source', sl.referral_source
      ),
      'Archived legacy call_notes prior to dropping admin CRM columns'
    FROM public.seller_leads sl
    WHERE sl.call_notes IS NOT NULL
      AND btrim(sl.call_notes) <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM public.seller_lead_events sle
        WHERE sle.lead_id = sl.id
          AND sle.note = 'Archived legacy call_notes prior to dropping admin CRM columns'
          AND sle.new_value ->> 'archived_call_notes' = sl.call_notes
      );
  END IF;
END $$;

-- 3. Make programme_preference nullable (seller form and server intentionally allow it to be optional)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seller_leads'
      AND column_name = 'programme_preference'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.seller_leads
      ALTER COLUMN programme_preference DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.seller_leads
  ALTER COLUMN programme_preference SET DEFAULT NULL;

-- 4. Drop legacy (lead_id, channel) uniqueness from earlier local bootstrap migrations if present
--    so both seller_ack and owner_alert rows can coexist with channel = 'email'.
ALTER TABLE IF EXISTS public.seller_lead_notifications
  DROP CONSTRAINT IF EXISTS seller_lead_notifications_lead_id_channel_key;

DROP INDEX IF EXISTS public.idx_seller_lead_notifications_lead_channel_unique;

-- 5. Drop the four admin-only RLS policies (which depend on private.is_seller_lead_admin())
DROP POLICY IF EXISTS "Admins can view seller leads" ON public.seller_leads;
DROP POLICY IF EXISTS "Admins can update seller leads" ON public.seller_leads;
DROP POLICY IF EXISTS "Admins can view lead events" ON public.seller_lead_events;
DROP POLICY IF EXISTS "Admins can view lead notifications" ON public.seller_lead_notifications;

-- 6. Drop the unused private admin function and table in dependency order
DROP FUNCTION IF EXISTS private.is_seller_lead_admin();
DROP TABLE IF EXISTS private.seller_lead_admins;

-- 7. Drop the four obsolete admin CRM columns from public.seller_leads
ALTER TABLE IF EXISTS public.seller_leads
  DROP COLUMN IF EXISTS assigned_to,
  DROP COLUMN IF EXISTS next_follow_up_at,
  DROP COLUMN IF EXISTS last_contacted_at,
  DROP COLUMN IF EXISTS call_notes;

-- 8. Ensure Row Level Security remains enabled on all exposed seller tables
ALTER TABLE IF EXISTS public.seller_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seller_lead_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seller_lead_events ENABLE ROW LEVEL SECURITY;

COMMIT;
