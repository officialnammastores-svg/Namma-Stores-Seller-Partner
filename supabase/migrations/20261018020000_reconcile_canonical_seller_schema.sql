-- ==============================================================================
-- NAMMA STORES SELLER PARTNER — CANONICAL SCHEMA RECONCILIATION MIGRATION
-- Reconciles any database created from earlier legacy migrations into the single
-- canonical schema used across server.ts, Supabase Edge Functions, TypeScript
-- models, and the Admin Dashboard.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Reconcile public.seller_leads columns
DO $$
BEGIN
  -- Add canonical columns if upgrading from legacy table definition
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'mobile'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN mobile TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'shop_category'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN shop_category TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'contact_preference'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN contact_preference TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'programme_preference'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN programme_preference TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'referral_source'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN referral_source TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'referral_source_other'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN referral_source_other TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'privacy_acknowledged'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN privacy_acknowledged BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'call_notes'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN call_notes TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN assigned_to UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'next_follow_up_at'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN next_follow_up_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'last_contacted_at'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN last_contacted_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'landing_page'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN landing_page TEXT DEFAULT '/';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'utm_source'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN utm_source TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'utm_medium'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN utm_medium TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'utm_campaign'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN utm_campaign TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'utm_content'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN utm_content TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'utm_term'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN utm_term TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'referrer'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN referrer TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'client_submission_id'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN client_submission_id UUID UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'submission_ip_hash'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN submission_ip_hash TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE public.seller_leads ADD COLUMN user_agent TEXT;
  END IF;
END $$;

-- 2. Backfill canonical columns from any legacy columns if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'mobile_number'
  ) THEN
    EXECUTE $sql$
      UPDATE public.seller_leads
      SET mobile = CASE
        WHEN mobile_number ~ '^[6-9][0-9]{9}$' THEN '+91' || mobile_number
        ELSE mobile_number
      END
      WHERE mobile IS NULL AND mobile_number IS NOT NULL
    $sql$;
    EXECUTE 'ALTER TABLE public.seller_leads ALTER COLUMN mobile_number DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'preferred_contact_method'
  ) THEN
    EXECUTE $sql$
      UPDATE public.seller_leads
      SET contact_preference = CASE
        WHEN lower(preferred_contact_method) LIKE '%phone%' THEN 'phone_call'
        ELSE 'whatsapp'
      END
      WHERE contact_preference IS NULL AND preferred_contact_method IS NOT NULL
    $sql$;
    EXECUTE 'ALTER TABLE public.seller_leads ALTER COLUMN preferred_contact_method DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'categories'
  ) THEN
    EXECUTE $sql$
      UPDATE public.seller_leads
      SET shop_category = CASE
        WHEN categories[1] = 'Grocery' THEN 'grocery_kirana'
        WHEN categories[1] = 'Fruits and vegetables' THEN 'fruits_vegetables'
        WHEN categories[1] = 'Chicken, meat and fish' THEN 'meat_fish_poultry'
        WHEN categories[1] = 'Bakery and fresh foods' THEN 'bakery_sweets'
        WHEN categories[1] = 'Pet supplies' THEN 'pet_supplies'
        ELSE 'other_local_retail'
      END
      WHERE shop_category IS NULL
    $sql$;
    EXECUTE 'ALTER TABLE public.seller_leads ALTER COLUMN categories DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'preferred_program'
  ) THEN
    EXECUTE 'ALTER TABLE public.seller_leads ALTER COLUMN preferred_program DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'seller_leads' AND column_name = 'programme_preference'
  ) THEN
    EXECUTE 'ALTER TABLE public.seller_leads ALTER COLUMN programme_preference DROP NOT NULL';
  END IF;
END $$;

-- 3. Ensure auxiliary tables exist with canonical structure
CREATE TABLE IF NOT EXISTS public.seller_lead_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.seller_leads(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'whatsapp')),
    provider TEXT NOT NULL DEFAULT 'resend',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    provider_message_id TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error_code TEXT,
    last_error_summary TEXT,
    attempted_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (lead_id, channel)
);

CREATE TABLE IF NOT EXISTS public.seller_lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.seller_leads(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_user_id UUID,
    event_type TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_seller_leads_created_at ON public.seller_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_leads_status ON public.seller_leads (status);
CREATE INDEX IF NOT EXISTS idx_seller_leads_mobile ON public.seller_leads (mobile);
CREATE INDEX IF NOT EXISTS idx_seller_leads_email ON public.seller_leads (lower(email));
CREATE INDEX IF NOT EXISTS idx_seller_leads_shop_category ON public.seller_leads (shop_category);
CREATE INDEX IF NOT EXISTS idx_seller_leads_referral_source ON public.seller_leads (referral_source);
CREATE INDEX IF NOT EXISTS idx_seller_lead_notifications_lead_id ON public.seller_lead_notifications (lead_id);
CREATE INDEX IF NOT EXISTS idx_seller_lead_events_lead_id ON public.seller_lead_events (lead_id, created_at DESC);
