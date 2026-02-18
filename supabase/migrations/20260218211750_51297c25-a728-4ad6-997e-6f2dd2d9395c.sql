
-- Table for saved valuation scenarios (Bull/Base/Bear)
CREATE TABLE public.valuation_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID REFERENCES public.deal_pipeline(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  scenario_type TEXT NOT NULL CHECK (scenario_type IN ('bull', 'base', 'bear')),
  wacc NUMERIC NOT NULL,
  exit_multiple NUMERIC NOT NULL,
  revenue_growth NUMERIC NOT NULL,
  implied_valuation NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id, user_id, scenario_type)
);

ALTER TABLE public.valuation_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scenarios"
  ON public.valuation_scenarios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scenarios"
  ON public.valuation_scenarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenarios"
  ON public.valuation_scenarios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenarios"
  ON public.valuation_scenarios FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_valuation_scenarios_updated_at
  BEFORE UPDATE ON public.valuation_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
