
-- 1. KPI Metrics table
CREATE TABLE public.kpi_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  value numeric NOT NULL,
  period text NOT NULL,
  period_type text NOT NULL DEFAULT 'quarterly',
  definition_source text,
  confidence_score text DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_kpi_metrics_company ON public.kpi_metrics(company_id);
CREATE INDEX idx_kpi_metrics_metric ON public.kpi_metrics(metric_name);

ALTER TABLE public.kpi_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "KPI metrics are publicly readable"
  ON public.kpi_metrics FOR SELECT USING (true);

-- 2. Cap Table Snapshots table
CREATE TABLE public.cap_table_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  shareholder_name text NOT NULL,
  share_class text NOT NULL DEFAULT 'Common',
  shares numeric NOT NULL DEFAULT 0,
  ownership_pct numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cap_table_company ON public.cap_table_snapshots(company_id);

ALTER TABLE public.cap_table_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cap table snapshots are publicly readable"
  ON public.cap_table_snapshots FOR SELECT USING (true);

-- 3. Company Documents table
CREATE TABLE public.company_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  document_type text NOT NULL DEFAULT 'other',
  extracted_metrics jsonb DEFAULT '{}',
  citations jsonb DEFAULT '[]',
  version integer NOT NULL DEFAULT 1,
  ai_summary text,
  red_flags jsonb DEFAULT '[]',
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_docs_company ON public.company_documents(company_id);

ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company documents are publicly readable"
  ON public.company_documents FOR SELECT USING (true);

CREATE POLICY "Authenticated users can upload documents"
  ON public.company_documents FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own documents"
  ON public.company_documents FOR UPDATE
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own documents"
  ON public.company_documents FOR DELETE
  USING (auth.uid() = uploaded_by);

-- 4. Extend funding_rounds with term columns
ALTER TABLE public.funding_rounds
  ADD COLUMN IF NOT EXISTS instrument_type text,
  ADD COLUMN IF NOT EXISTS liquidation_preference numeric,
  ADD COLUMN IF NOT EXISTS participation_cap numeric,
  ADD COLUMN IF NOT EXISTS anti_dilution_type text,
  ADD COLUMN IF NOT EXISTS option_pool_pct numeric,
  ADD COLUMN IF NOT EXISTS pro_rata_rights boolean DEFAULT false;
