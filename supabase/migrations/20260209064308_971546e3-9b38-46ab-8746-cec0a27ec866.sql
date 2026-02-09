
-- =============================================
-- Laurenzo's Private Intelligence — Core Schema
-- =============================================

-- Sectors
CREATE TABLE public.sectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.sectors(id),
  deal_count_trailing_12m INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sectors are publicly readable" ON public.sectors FOR SELECT USING (true);

-- Companies
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  logo_url TEXT,
  sector TEXT,
  sub_sector TEXT,
  hq_country TEXT,
  hq_city TEXT,
  founded_year INT,
  description TEXT,
  employee_count INT,
  stage TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies are publicly readable" ON public.companies FOR SELECT USING (true);

-- Investors
CREATE TABLE public.investors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  aum NUMERIC,
  hq_country TEXT,
  website TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Investors are publicly readable" ON public.investors FOR SELECT USING (true);

-- Funding rounds
CREATE TABLE public.funding_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  round_type TEXT NOT NULL,
  amount NUMERIC,
  valuation_pre NUMERIC,
  valuation_post NUMERIC,
  date DATE,
  lead_investors TEXT[],
  co_investors TEXT[],
  source_url TEXT,
  confidence_score TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.funding_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Funding rounds are publicly readable" ON public.funding_rounds FOR SELECT USING (true);

-- Financials
CREATE TABLE public.financials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  period_type TEXT DEFAULT 'annual',
  revenue NUMERIC,
  arr NUMERIC,
  mrr NUMERIC,
  gross_margin NUMERIC,
  burn_rate NUMERIC,
  runway_months NUMERIC,
  ebitda NUMERIC,
  source TEXT,
  confidence_score TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.financials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Financials are publicly readable" ON public.financials FOR SELECT USING (true);

-- Investor-company relationships
CREATE TABLE public.investor_company (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  round_id UUID REFERENCES public.funding_rounds(id) ON DELETE SET NULL,
  ownership_pct_est NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.investor_company ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Investor-company links are publicly readable" ON public.investor_company FOR SELECT USING (true);

-- Activity events
CREATE TABLE public.activity_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  headline TEXT NOT NULL,
  detail TEXT,
  source_url TEXT,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activity events are publicly readable" ON public.activity_events FOR SELECT USING (true);

-- Profiles (for user data)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User watchlists
CREATE TABLE public.user_watchlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own watchlists" ON public.user_watchlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own watchlists" ON public.user_watchlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own watchlists" ON public.user_watchlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own watchlists" ON public.user_watchlists FOR DELETE USING (auth.uid() = user_id);

-- User notes
CREATE TABLE public.user_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notes" ON public.user_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own notes" ON public.user_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.user_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.user_notes FOR DELETE USING (auth.uid() = user_id);

-- Deal pipeline
CREATE TABLE public.deal_pipeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'sourced',
  priority TEXT DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own pipeline" ON public.deal_pipeline FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create pipeline items" ON public.deal_pipeline FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pipeline" ON public.deal_pipeline FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete from pipeline" ON public.deal_pipeline FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_watchlists_updated_at BEFORE UPDATE ON public.user_watchlists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.user_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pipeline_updated_at BEFORE UPDATE ON public.deal_pipeline FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_funding_rounds_company ON public.funding_rounds(company_id);
CREATE INDEX idx_financials_company ON public.financials(company_id);
CREATE INDEX idx_investor_company_company ON public.investor_company(company_id);
CREATE INDEX idx_investor_company_investor ON public.investor_company(investor_id);
CREATE INDEX idx_activity_events_company ON public.activity_events(company_id);
CREATE INDEX idx_activity_events_published ON public.activity_events(published_at DESC);
CREATE INDEX idx_companies_sector ON public.companies(sector);
CREATE INDEX idx_companies_stage ON public.companies(stage);
CREATE INDEX idx_deal_pipeline_user ON public.deal_pipeline(user_id);
CREATE INDEX idx_user_notes_user_company ON public.user_notes(user_id, company_id);

-- Enable realtime for activity events
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;
