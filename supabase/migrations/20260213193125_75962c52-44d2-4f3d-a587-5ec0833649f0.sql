
-- Add CIK number to companies table for SEC cross-referencing
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS cik_number text;
CREATE INDEX IF NOT EXISTS idx_companies_cik ON public.companies (cik_number) WHERE cik_number IS NOT NULL;

-- SEC Filings cache table
CREATE TABLE public.sec_filings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cik_number text NOT NULL,
  accession_number text NOT NULL,
  filing_type text NOT NULL,
  filing_date date NOT NULL,
  description text,
  primary_document_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cik_number, accession_number)
);

CREATE INDEX idx_sec_filings_company ON public.sec_filings (company_id);
CREATE INDEX idx_sec_filings_type_date ON public.sec_filings (filing_type, filing_date DESC);

ALTER TABLE public.sec_filings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SEC filings are publicly readable"
  ON public.sec_filings FOR SELECT USING (true);

-- SEC Financial Facts (XBRL data)
CREATE TABLE public.sec_financial_facts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cik_number text NOT NULL,
  taxonomy text NOT NULL DEFAULT 'us-gaap',
  concept text NOT NULL,
  period_start date,
  period_end date NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL DEFAULT 'USD',
  form_type text,
  filed_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cik_number, concept, period_end, unit, form_type)
);

CREATE INDEX idx_sec_facts_company ON public.sec_financial_facts (company_id);
CREATE INDEX idx_sec_facts_concept ON public.sec_financial_facts (concept, period_end DESC);
CREATE INDEX idx_sec_facts_cik_concept ON public.sec_financial_facts (cik_number, concept);

ALTER TABLE public.sec_financial_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SEC financial facts are publicly readable"
  ON public.sec_financial_facts FOR SELECT USING (true);
