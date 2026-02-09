
-- Table to store enriched company data from web scraping
CREATE TABLE public.company_enrichments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_name TEXT NOT NULL DEFAULT 'website',
  data_type TEXT NOT NULL DEFAULT 'general',
  title TEXT,
  summary TEXT,
  raw_content TEXT,
  confidence_score TEXT NOT NULL DEFAULT 'medium',
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_enrichments ENABLE ROW LEVEL SECURITY;

-- Enrichments are readable by all authenticated users
CREATE POLICY "Enrichments are publicly readable"
  ON public.company_enrichments
  FOR SELECT
  USING (true);

-- Index for fast lookups
CREATE INDEX idx_enrichments_company_id ON public.company_enrichments(company_id);
CREATE INDEX idx_enrichments_scraped_at ON public.company_enrichments(scraped_at DESC);
