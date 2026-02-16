
-- Add provenance metadata columns to tables that are missing them
-- Pattern: source_type (enum-like text), fetched_at (timestamp), verification_status (text)
-- Some tables already have partial provenance; we only add what's missing.

-- financials: has source, confidence_score. Add source_type, fetched_at, verification_status
ALTER TABLE public.financials
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';

-- funding_rounds: has confidence_score, source_url. Add source_type, fetched_at, verification_status
ALTER TABLE public.funding_rounds
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';

-- public_market_data: has updated_at. Add source_type, source_url, fetched_at, verification_status, confidence_score
ALTER TABLE public.public_market_data
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'api',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS confidence_score text DEFAULT 'high';

-- distressed_assets: has source. Add source_type, source_url, fetched_at, verification_status, confidence_score
ALTER TABLE public.distressed_assets
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS confidence_score text DEFAULT 'medium';

-- cre_market_data: minimal provenance. Add all.
ALTER TABLE public.cre_market_data
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS confidence_score text DEFAULT 'medium';

-- cre_transactions: minimal provenance. Add all.
ALTER TABLE public.cre_transactions
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS confidence_score text DEFAULT 'medium';

-- funds: no provenance. Add all.
ALTER TABLE public.funds
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS confidence_score text DEFAULT 'medium';

-- deal_transactions: no provenance. Add all.
ALTER TABLE public.deal_transactions
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS confidence_score text DEFAULT 'medium';

-- global_opportunities: has source_url. Add source_type, fetched_at, verification_status, confidence_score
ALTER TABLE public.global_opportunities
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS confidence_score text DEFAULT 'medium';

-- Add indexes on fetched_at for staleness queries
CREATE INDEX IF NOT EXISTS idx_financials_fetched_at ON public.financials(fetched_at);
CREATE INDEX IF NOT EXISTS idx_public_market_data_fetched_at ON public.public_market_data(fetched_at);
CREATE INDEX IF NOT EXISTS idx_distressed_assets_fetched_at ON public.distressed_assets(fetched_at);
CREATE INDEX IF NOT EXISTS idx_deal_transactions_fetched_at ON public.deal_transactions(fetched_at);
CREATE INDEX IF NOT EXISTS idx_global_opportunities_fetched_at ON public.global_opportunities(fetched_at);
