-- ==============================================================================
-- NAMMA STORES SELLER PARTNER — FORWARD-ONLY PRODUCTION SCHEMA & NOTIFICATION MIGRATION
-- Safe, non-destructive migration for the live Supabase PostgreSQL database.
--
-- What this migration does:
-- 1. Adds `referral_source` and `referral_source_other` to `public.seller_leads`
--    if they do not already exist.
-- 2. Drops the legacy NOT NULL requirement on `programme_preference` so the
--    current seller form can insert rows without a dummy programme value.
-- 3. Backfills `referral_source` from existing `call_notes` entries formatted as
--    `[Referral: ...]` so historical submissions retain structured referral data.
-- 4. Deduplicates any multiple rows per `(lead_id, channel)` in
--    `public.seller_lead_notifications` and adds a unique index on `(lead_id, channel)`.
-- 5. Ensures Row Level Security (RLS) remains enabled on all seller tables.
-- ==============================================================================

-- 1. Add missing canonical columns on public.seller_leads (non-destructive)
ALTER TABLE IF EXISTS public.seller_leads
  ADD COLUMN IF NOT EXISTS referral_source TEXT,
  ADD COLUMN IF NOT EXISTS referral_source_other TEXT;

-- 2. Make legacy programme_preference nullable
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

-- 3. Add length constraint and index for referral_source
ALTER TABLE IF EXISTS public.seller_leads
  DROP CONSTRAINT IF EXISTS seller_leads_referral_source_length_check;

ALTER TABLE IF EXISTS public.seller_leads
  ADD CONSTRAINT seller_leads_referral_source_length_check
  CHECK (referral_source IS NULL OR char_length(btrim(referral_source)) <= 200);

CREATE INDEX IF NOT EXISTS idx_seller_leads_referral_source
  ON public.seller_leads (referral_source)
  WHERE referral_source IS NOT NULL;

-- 4. Backfill referral_source from call_notes for leads saved via compatibility fallback (if call_notes column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seller_leads'
      AND column_name = 'call_notes'
  ) THEN
    UPDATE public.seller_leads
    SET referral_source = substring(call_notes FROM '\[Referral(?:\s+Source)?:\s*([^\]]+)\]')
    WHERE referral_source IS NULL
      AND call_notes IS NOT NULL
      AND call_notes ~ '\[Referral(?:\s+Source)?:\s*[^\]]+\]';
  END IF;
END $$;

-- 5. Deduplicate seller_lead_notifications per (lead_id, channel, provider)
DELETE FROM public.seller_lead_notifications a
USING public.seller_lead_notifications b
WHERE a.lead_id = b.lead_id
  AND a.channel = b.channel
  AND a.provider = b.provider
  AND (
    a.created_at < b.created_at
    OR (a.created_at = b.created_at AND a.id < b.id)
  );

-- 6. Ensure Row Level Security remains enabled on all tables
ALTER TABLE IF EXISTS public.seller_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seller_lead_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seller_lead_events ENABLE ROW LEVEL SECURITY;
