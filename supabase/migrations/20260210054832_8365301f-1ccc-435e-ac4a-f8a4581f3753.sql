
-- Portfolios table
CREATE TABLE public.portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Portfolio',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portfolios" ON public.portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own portfolios" ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolios" ON public.portfolios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolios" ON public.portfolios FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON public.portfolios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Portfolio positions table
CREATE TABLE public.portfolio_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  shares NUMERIC NOT NULL DEFAULT 0,
  entry_price NUMERIC NOT NULL DEFAULT 0,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own positions" ON public.portfolio_positions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.portfolios WHERE id = portfolio_positions.portfolio_id AND user_id = auth.uid()));
CREATE POLICY "Users can create own positions" ON public.portfolio_positions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.portfolios WHERE id = portfolio_positions.portfolio_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own positions" ON public.portfolio_positions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.portfolios WHERE id = portfolio_positions.portfolio_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own positions" ON public.portfolio_positions FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.portfolios WHERE id = portfolio_positions.portfolio_id AND user_id = auth.uid()));

CREATE TRIGGER update_portfolio_positions_updated_at BEFORE UPDATE ON public.portfolio_positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
