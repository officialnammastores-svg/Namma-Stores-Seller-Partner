-- ==============================================================================
-- NAMMA STORES SELLER PARTNER — ADD REFERRAL SOURCE MIGRATION
-- Adds referral_source column to public.seller_leads to store responses from
-- the "How did you hear about Namma Stores?" dropdown (including optional
-- "Other" details when specified).
-- ==============================================================================

ALTER TABLE IF EXISTS public.seller_leads
  ADD COLUMN IF NOT EXISTS referral_source TEXT;

ALTER TABLE IF EXISTS public.seller_leads
  DROP CONSTRAINT IF EXISTS seller_leads_referral_source_length_check;

ALTER TABLE IF EXISTS public.seller_leads
  ADD CONSTRAINT seller_leads_referral_source_length_check
  CHECK (referral_source IS NULL OR char_length(btrim(referral_source)) <= 200);

CREATE INDEX IF NOT EXISTS idx_seller_leads_referral_source
  ON public.seller_leads (referral_source)
  WHERE referral_source IS NOT NULL;
