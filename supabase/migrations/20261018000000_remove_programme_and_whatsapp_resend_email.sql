-- ==============================================================================
-- NAMMA STORES SELLER PARTNER — SCHEMA UPDATE MIGRATION
-- Safely removes legacy programme requirements if present and ensures
-- email notification and deduplication indexes exist on canonical tables.
-- ==============================================================================

DO $$
BEGIN
  -- Drop NOT NULL on legacy programme_preference if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seller_leads'
      AND column_name = 'programme_preference'
  ) THEN
    ALTER TABLE public.seller_leads ALTER COLUMN programme_preference DROP NOT NULL;
  END IF;

  -- Drop NOT NULL on legacy preferred_program if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'seller_leads'
      AND column_name = 'preferred_program'
  ) THEN
    ALTER TABLE public.seller_leads ALTER COLUMN preferred_program DROP NOT NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.seller_leads
  DROP CONSTRAINT IF EXISTS seller_leads_programme_preference_check;

ALTER TABLE IF EXISTS public.seller_leads
  DROP CONSTRAINT IF EXISTS seller_leads_preferred_program_check;

ALTER TABLE IF EXISTS public.seller_leads
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE IF EXISTS public.seller_leads
  ADD COLUMN IF NOT EXISTS mobile TEXT;

ALTER TABLE IF EXISTS public.seller_leads
  ADD COLUMN IF NOT EXISTS client_submission_id UUID;

CREATE TABLE IF NOT EXISTS public.seller_lead_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.seller_leads(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email')),
    provider TEXT NOT NULL DEFAULT 'resend',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    provider_message_id TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count >= 0),
    last_error_code TEXT,
    last_error_summary TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_seller_leads_client_submission_id
  ON public.seller_leads (client_submission_id);

CREATE INDEX IF NOT EXISTS idx_seller_leads_email_mobile_created
  ON public.seller_leads (mobile, email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seller_lead_notifications_email_retry
  ON public.seller_lead_notifications (channel, status, attempted_at)
  WHERE channel = 'email' AND status = 'failed';
