
-- Add market_type to companies
ALTER TABLE public.companies ADD COLUMN market_type text NOT NULL DEFAULT 'private';

-- Set existing public companies
UPDATE public.companies SET market_type = 'public' WHERE stage = 'Public';

-- Create public market data table
CREATE TABLE public.public_market_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  exchange text,
  market_cap numeric,
  pe_ratio numeric,
  eps numeric,
  dividend_yield numeric,
  price numeric,
  price_change_pct numeric,
  fifty_two_week_high numeric,
  fifty_two_week_low numeric,
  volume_avg numeric,
  beta numeric,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id)
);

-- RLS: publicly readable
ALTER TABLE public.public_market_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public market data is publicly readable"
  ON public.public_market_data FOR SELECT USING (true);

-- Add new sectors for public market coverage
INSERT INTO public.sectors (name, deal_count_trailing_12m) VALUES
  ('Energy', 45),
  ('Real Estate', 28),
  ('Industrials', 52),
  ('Telecommunications', 18),
  ('Pharmaceuticals', 38),
  ('Consumer Staples', 22),
  ('Materials', 15),
  ('Utilities', 12),
  ('Transportation', 20),
  ('Media & Entertainment', 35),
  ('Semiconductors', 42),
  ('Automotive', 25),
  ('Aerospace & Defense', 16),
  ('Insurance', 14),
  ('Retail', 30)
ON CONFLICT DO NOTHING;
