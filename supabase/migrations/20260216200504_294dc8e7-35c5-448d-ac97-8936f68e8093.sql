
-- Add is_synthetic column to all key datasets
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;
ALTER TABLE public.funding_rounds ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;
ALTER TABLE public.financials ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;
ALTER TABLE public.distressed_assets ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;
ALTER TABLE public.global_opportunities ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;
ALTER TABLE public.cre_market_data ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;
ALTER TABLE public.cre_transactions ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;
ALTER TABLE public.funds ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;
ALTER TABLE public.activity_events ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;
ALTER TABLE public.deal_transactions ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;
ALTER TABLE public.company_enrichments ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;

-- Backfill: mark all seeded records as synthetic
UPDATE public.companies SET is_synthetic = true WHERE source_type = 'seeded' OR source_type IS NULL;
UPDATE public.funding_rounds SET is_synthetic = true WHERE source_type = 'seeded' OR source_type IS NULL;
UPDATE public.financials SET is_synthetic = true WHERE source_type = 'seeded' OR source_type IS NULL;
UPDATE public.distressed_assets SET is_synthetic = true WHERE source_type = 'seeded' OR source_type IS NULL;
UPDATE public.global_opportunities SET is_synthetic = true WHERE source_type = 'seeded' OR source_type IS NULL;
UPDATE public.cre_market_data SET is_synthetic = true WHERE source_type = 'seeded' OR source_type IS NULL;
UPDATE public.cre_transactions SET is_synthetic = true WHERE source_type = 'seeded' OR source_type IS NULL;
UPDATE public.funds SET is_synthetic = true WHERE source_type = 'seeded' OR source_type IS NULL;
UPDATE public.activity_events SET is_synthetic = true WHERE source_type = 'seeded' OR source_type IS NULL;
UPDATE public.deal_transactions SET is_synthetic = true WHERE source_type = 'seeded' OR source_type IS NULL;
