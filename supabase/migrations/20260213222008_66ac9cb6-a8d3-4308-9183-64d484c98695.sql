
CREATE TABLE public.global_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL,
  region text NOT NULL,
  sector text,
  opportunity_type text NOT NULL DEFAULT 'pe_vc',
  description text,
  deal_value_usd numeric,
  local_currency text DEFAULT 'USD',
  deal_value_local numeric,
  stage text DEFAULT 'active',
  risk_rating text DEFAULT 'medium',
  sovereign_fund_interest text[] DEFAULT '{}',
  key_metrics jsonb DEFAULT '{}',
  source_url text,
  listed_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.global_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Global opportunities are publicly readable"
  ON public.global_opportunities
  FOR SELECT
  USING (true);
