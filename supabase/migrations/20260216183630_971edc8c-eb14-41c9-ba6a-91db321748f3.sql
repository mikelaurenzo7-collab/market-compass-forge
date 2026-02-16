
-- Distressed assets: claim stack, legal timeline, recovery range, milestones
ALTER TABLE public.distressed_assets
  ADD COLUMN IF NOT EXISTS claim_stack jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS legal_stage text DEFAULT 'pre_filing',
  ADD COLUMN IF NOT EXISTS legal_timeline jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recovery_low_pct numeric,
  ADD COLUMN IF NOT EXISTS recovery_high_pct numeric,
  ADD COLUMN IF NOT EXISTS process_milestones jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.distressed_assets.claim_stack IS 'Array of {class, amount, priority, secured, recovery_est_pct}';
COMMENT ON COLUMN public.distressed_assets.legal_stage IS 'pre_filing, chapter_11, chapter_7, receivership, plan_confirmed, emerged, liquidated';
COMMENT ON COLUMN public.distressed_assets.legal_timeline IS 'Array of {stage, date, description, court_doc_url}';
COMMENT ON COLUMN public.distressed_assets.process_milestones IS 'Array of {label, target_date, completed_date, status}';

-- Private listings: underwriting fields
ALTER TABLE public.private_listings
  ADD COLUMN IF NOT EXISTS loan_amount numeric,
  ADD COLUMN IF NOT EXISTS interest_rate numeric,
  ADD COLUMN IF NOT EXISTS loan_term_years integer,
  ADD COLUMN IF NOT EXISTS amortization_years integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS occupancy_pct numeric DEFAULT 95,
  ADD COLUMN IF NOT EXISTS opex_ratio numeric DEFAULT 0.40,
  ADD COLUMN IF NOT EXISTS rent_growth_pct numeric DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS exit_cap_rate numeric,
  ADD COLUMN IF NOT EXISTS hold_years integer DEFAULT 5;

-- Module alert types extension
ALTER TABLE public.user_alerts
  ADD COLUMN IF NOT EXISTS module text DEFAULT 'general';

COMMENT ON COLUMN public.user_alerts.module IS 'general, distressed, real_estate, fund';
