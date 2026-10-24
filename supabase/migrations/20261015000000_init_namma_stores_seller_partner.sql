-- ==============================================================================
-- NAMMA STORES SELLER PARTNER — CANONICAL INITIAL SCHEMA MIGRATION
-- Database: namma-stores-seller-partner (Supabase PostgreSQL)
-- Target Launch: Whitefield, Bengaluru
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABLE: public.seller_leads (Canonical Schema)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.seller_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Core Seller & Store Details
    shop_name TEXT NOT NULL CHECK (char_length(trim(shop_name)) >= 2),
    owner_name TEXT NOT NULL CHECK (char_length(trim(owner_name)) >= 2),
    mobile TEXT NOT NULL CHECK (mobile ~ '^[6-9][0-9]{9}$'),
    email TEXT NOT NULL CHECK (char_length(trim(email)) >= 5),
    shop_address TEXT NOT NULL CHECK (char_length(trim(shop_address)) >= 5),

    -- Canonical Store Category & Contact Preference
    shop_category TEXT NOT NULL CHECK (
        shop_category IN (
            'grocery',
            'meat_fish_chicken',
            'fruits_vegetables',
            'milk_dairy',
            'puja_flowers',
            'other_multiple'
        )
    ),
    programme_preference TEXT DEFAULT NULL CHECK (
        programme_preference IS NULL OR programme_preference IN (
            'stores_near_you',
            'namma_fresh',
            'need_guidance'
        )
    ),
    contact_preference TEXT NOT NULL CHECK (
        contact_preference IN ('whatsapp', 'phone')
    ),

    -- Referral Source Tracking
    referral_source TEXT,
    referral_source_other TEXT,

    -- Consent & Operational CRM Pipeline
    privacy_acknowledged BOOLEAN NOT NULL DEFAULT true CHECK (privacy_acknowledged = true),
    status TEXT NOT NULL DEFAULT 'new' CHECK (
        status IN (
            'new',
            'contacted',
            'interested',
            'onboarding',
            'approved',
            'activated',
            'not_proceeding'
        )
    ),
    assigned_to UUID,
    next_follow_up_at TIMESTAMPTZ,
    last_contacted_at TIMESTAMPTZ,
    call_notes TEXT,

    -- Attribution & Deduplication Metadata
    source TEXT NOT NULL DEFAULT 'seller_partner_website',
    landing_page TEXT DEFAULT '/',
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    referrer TEXT,
    client_submission_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    submission_ip_hash TEXT,
    user_agent TEXT
);

-- Indexes for fast CRM filtering, deduplication, and search
CREATE INDEX IF NOT EXISTS idx_seller_leads_created_at ON public.seller_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_leads_status ON public.seller_leads (status);
CREATE INDEX IF NOT EXISTS idx_seller_leads_mobile ON public.seller_leads (mobile);
CREATE INDEX IF NOT EXISTS idx_seller_leads_email ON public.seller_leads (lower(email));
CREATE INDEX IF NOT EXISTS idx_seller_leads_shop_category ON public.seller_leads (shop_category);
CREATE INDEX IF NOT EXISTS idx_seller_leads_referral_source ON public.seller_leads (referral_source);

-- Automatically maintain updated_at on row modification
CREATE OR REPLACE FUNCTION public.handle_seller_leads_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seller_leads_updated_at ON public.seller_leads;

CREATE TRIGGER trg_seller_leads_updated_at
BEFORE UPDATE ON public.seller_leads
FOR EACH ROW
EXECUTE FUNCTION public.handle_seller_leads_updated_at();

-- ==============================================================================
-- 2. TABLE: public.seller_lead_notifications
-- Tracks transactional confirmation email delivery via Resend
-- ==============================================================================
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

CREATE INDEX IF NOT EXISTS idx_seller_lead_notifications_lead_id
    ON public.seller_lead_notifications (lead_id);
CREATE INDEX IF NOT EXISTS idx_seller_lead_notifications_status
    ON public.seller_lead_notifications (status);

-- ==============================================================================
-- 3. TABLE: public.seller_lead_events
-- Audit log for lead creation, status updates, and CRM actions
-- ==============================================================================
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

CREATE INDEX IF NOT EXISTS idx_seller_lead_events_lead_id
    ON public.seller_lead_events (lead_id, created_at DESC);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- Server-side Service Role performs all writes & admin queries.
-- ==============================================================================
ALTER TABLE public.seller_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_lead_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_lead_events ENABLE ROW LEVEL SECURITY;
