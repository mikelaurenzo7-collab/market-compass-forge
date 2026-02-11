
-- 1. Funds table
CREATE TABLE public.funds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  gp_name TEXT NOT NULL,
  vintage_year INTEGER NOT NULL,
  strategy TEXT NOT NULL,
  fund_size NUMERIC,
  net_irr NUMERIC,
  tvpi NUMERIC,
  dpi NUMERIC,
  quartile INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Funds are publicly readable" ON public.funds FOR SELECT USING (true);

-- 2. LP Entities table
CREATE TABLE public.lp_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  aum NUMERIC,
  strategies TEXT[],
  hq_city TEXT,
  hq_country TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.lp_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "LP entities are publicly readable" ON public.lp_entities FOR SELECT USING (true);

-- 3. Fund Commitments table
CREATE TABLE public.fund_commitments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lp_id UUID NOT NULL REFERENCES public.lp_entities(id),
  fund_id UUID NOT NULL REFERENCES public.funds(id),
  amount NUMERIC,
  commitment_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.fund_commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fund commitments are publicly readable" ON public.fund_commitments FOR SELECT USING (true);

-- 4. CRE Transactions table
CREATE TABLE public.cre_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_name TEXT NOT NULL,
  property_type TEXT NOT NULL,
  submarket TEXT,
  size_sf INTEGER,
  sale_price NUMERIC,
  price_per_sf NUMERIC,
  cap_rate NUMERIC,
  buyer TEXT,
  seller TEXT,
  transaction_date DATE,
  city TEXT NOT NULL DEFAULT 'Chicago',
  state TEXT NOT NULL DEFAULT 'IL',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.cre_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRE transactions are publicly readable" ON public.cre_transactions FOR SELECT USING (true);

-- 5. CRE Market Data table
CREATE TABLE public.cre_market_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_type TEXT NOT NULL,
  submarket TEXT NOT NULL,
  vacancy_rate NUMERIC,
  asking_rent NUMERIC,
  cap_rate NUMERIC,
  period TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Chicago',
  state TEXT NOT NULL DEFAULT 'IL',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.cre_market_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRE market data is publicly readable" ON public.cre_market_data FOR SELECT USING (true);

-- 6. Deal Transactions table (public deal log, distinct from user's deal_pipeline)
CREATE TABLE public.deal_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_company TEXT NOT NULL,
  target_industry TEXT,
  deal_type TEXT NOT NULL,
  deal_value NUMERIC,
  acquirer_investor TEXT,
  ev_ebitda NUMERIC,
  ev_revenue NUMERIC,
  status TEXT NOT NULL DEFAULT 'closed',
  announced_date DATE,
  closed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deal transactions are publicly readable" ON public.deal_transactions FOR SELECT USING (true);
