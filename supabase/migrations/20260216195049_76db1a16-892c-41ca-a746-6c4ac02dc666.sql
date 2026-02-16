
-- Add missing provenance columns to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'seeded',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS confidence_score text DEFAULT 'medium';

-- Add missing provenance columns to activity_events
ALTER TABLE public.activity_events
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'seeded',
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS confidence_score text DEFAULT 'medium';

-- Add missing source_url to financials
ALTER TABLE public.financials
  ADD COLUMN IF NOT EXISTS source_url text;

-- Backfill existing records with source_type='seeded' and verification_status='unverified' where currently NULL
UPDATE public.companies SET source_type = 'seeded', verification_status = 'unverified' WHERE source_type IS NULL;
UPDATE public.activity_events SET source_type = 'seeded', verification_status = 'unverified' WHERE source_type IS NULL;
UPDATE public.financials SET source_type = COALESCE(source_type, 'seeded'), verification_status = COALESCE(verification_status, 'unverified');
UPDATE public.funding_rounds SET source_type = COALESCE(source_type, 'seeded'), verification_status = COALESCE(verification_status, 'unverified');
UPDATE public.distressed_assets SET source_type = COALESCE(source_type, 'seeded'), verification_status = COALESCE(verification_status, 'unverified');
UPDATE public.global_opportunities SET source_type = COALESCE(source_type, 'seeded'), verification_status = COALESCE(verification_status, 'unverified');
UPDATE public.cre_market_data SET source_type = COALESCE(source_type, 'seeded'), verification_status = COALESCE(verification_status, 'unverified');
UPDATE public.cre_transactions SET source_type = COALESCE(source_type, 'seeded'), verification_status = COALESCE(verification_status, 'unverified');
UPDATE public.funds SET source_type = COALESCE(source_type, 'seeded'), verification_status = COALESCE(verification_status, 'unverified');
UPDATE public.deal_transactions SET source_type = COALESCE(source_type, 'seeded'), verification_status = COALESCE(verification_status, 'unverified');
