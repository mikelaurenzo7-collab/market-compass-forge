
-- Create key_personnel table
CREATE TABLE public.key_personnel (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  background TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create precedent_transactions table
CREATE TABLE public.precedent_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_company_name TEXT NOT NULL,
  acquirer_company_name TEXT NOT NULL,
  deal_date DATE,
  deal_value NUMERIC,
  target_revenue NUMERIC,
  target_ebitda NUMERIC,
  ev_revenue NUMERIC,
  ev_ebitda NUMERIC,
  sector TEXT,
  deal_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.key_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precedent_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for key_personnel (publicly readable)
CREATE POLICY "Key personnel are publicly readable"
  ON public.key_personnel FOR SELECT USING (true);

-- RLS policies for precedent_transactions (publicly readable)
CREATE POLICY "Precedent transactions are publicly readable"
  ON public.precedent_transactions FOR SELECT USING (true);
