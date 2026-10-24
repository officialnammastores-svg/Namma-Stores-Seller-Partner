-- ==============================================================================
-- NAMMA STORES SELLER PARTNER — REMOVE UNUSED SELLER ADMIN INFRASTRUCTURE
-- Migration Version: 20261023163113 (remove_unused_seller_admin_infrastructure)
-- Target Project: txmrfheminuminggtwfv
--
-- Reconciled with remote migration history:
-- Idempotently ensures all legacy admin RLS policies, `private.is_seller_lead_admin()`,
-- `private.seller_lead_admins`, and the four unused CRM columns (`assigned_to`,
-- `next_follow_up_at`, `last_contacted_at`, `call_notes`) are removed while keeping
-- Row Level Security (RLS) enabled on all three public seller tables.
-- ==============================================================================

BEGIN;

-- 1. Ensure the four admin-only RLS policies are removed
DROP POLICY IF EXISTS "Admins can view seller leads" ON public.seller_leads;
DROP POLICY IF EXISTS "Admins can update seller leads" ON public.seller_leads;
DROP POLICY IF EXISTS "Admins can view lead events" ON public.seller_lead_events;
DROP POLICY IF EXISTS "Admins can view lead notifications" ON public.seller_lead_notifications;

-- 2. Ensure the unused private admin helper function and table are removed
DROP FUNCTION IF EXISTS private.is_seller_lead_admin();
DROP TABLE IF EXISTS private.seller_lead_admins;

-- 3. Ensure the four obsolete admin CRM columns are removed from public.seller_leads
ALTER TABLE IF EXISTS public.seller_leads
  DROP COLUMN IF EXISTS assigned_to,
  DROP COLUMN IF EXISTS next_follow_up_at,
  DROP COLUMN IF EXISTS last_contacted_at,
  DROP COLUMN IF EXISTS call_notes;

-- 4. Ensure Row Level Security remains enabled on all seller tables
ALTER TABLE IF EXISTS public.seller_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seller_lead_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.seller_lead_events ENABLE ROW LEVEL SECURITY;

COMMIT;
