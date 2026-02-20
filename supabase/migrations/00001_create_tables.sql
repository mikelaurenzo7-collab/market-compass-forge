-- Laurenzo OS: Core Database Schema
-- Supabase Migration 00001

-- ============================================================
-- DEALS TABLE
-- ============================================================
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Teaser'
    CHECK (status IN ('Teaser', 'Diligence', 'LOI', 'Closed')),
  target_company TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sponsor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_deals_sponsor ON public.deals(sponsor_id);
CREATE INDEX idx_deals_status ON public.deals(status);

-- ============================================================
-- FINANCIAL DATA (OpCo)
-- ============================================================
CREATE TABLE public.financial_data_opco (
  deal_id UUID PRIMARY KEY REFERENCES public.deals(id) ON DELETE CASCADE,
  ttm_revenue NUMERIC NOT NULL DEFAULT 0,
  adjusted_ebitda NUMERIC NOT NULL DEFAULT 0,
  ebitda_addbacks JSONB NOT NULL DEFAULT '[]'::jsonb,
  debt_profile JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- ============================================================
-- PHYSICAL ASSETS (PropCo)
-- ============================================================
CREATE TABLE public.physical_asset_propco (
  deal_id UUID PRIMARY KEY REFERENCES public.deals(id) ON DELETE CASCADE,
  property_addresses TEXT[] NOT NULL DEFAULT '{}',
  lease_structure JSONB NOT NULL DEFAULT '[]'::jsonb,
  deferred_maintenance_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  environmental_risks JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- ============================================================
-- EXTRACTION LOGS
-- ============================================================
CREATE TABLE public.extraction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL
    CHECK (document_type IN ('CIM', 'rent_roll', 'ESA', 'unknown')),
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'uploading', 'extracting_financials', 'extracting_assets', 'verifying', 'complete', 'error')),
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_extraction_logs_deal ON public.extraction_logs(deal_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_data_opco ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_asset_propco ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extraction_logs ENABLE ROW LEVEL SECURITY;

-- Deals: users can only access their own deals
CREATE POLICY "deals_select_own" ON public.deals
  FOR SELECT USING (sponsor_id = auth.uid());

CREATE POLICY "deals_insert_own" ON public.deals
  FOR INSERT WITH CHECK (sponsor_id = auth.uid());

CREATE POLICY "deals_update_own" ON public.deals
  FOR UPDATE USING (sponsor_id = auth.uid());

CREATE POLICY "deals_delete_own" ON public.deals
  FOR DELETE USING (sponsor_id = auth.uid());

-- OpCo: access through deal ownership
CREATE POLICY "opco_select_own" ON public.financial_data_opco
  FOR SELECT USING (deal_id IN (SELECT id FROM public.deals WHERE sponsor_id = auth.uid()));

CREATE POLICY "opco_insert_own" ON public.financial_data_opco
  FOR INSERT WITH CHECK (deal_id IN (SELECT id FROM public.deals WHERE sponsor_id = auth.uid()));

CREATE POLICY "opco_update_own" ON public.financial_data_opco
  FOR UPDATE USING (deal_id IN (SELECT id FROM public.deals WHERE sponsor_id = auth.uid()));

-- PropCo: access through deal ownership
CREATE POLICY "propco_select_own" ON public.physical_asset_propco
  FOR SELECT USING (deal_id IN (SELECT id FROM public.deals WHERE sponsor_id = auth.uid()));

CREATE POLICY "propco_insert_own" ON public.physical_asset_propco
  FOR INSERT WITH CHECK (deal_id IN (SELECT id FROM public.deals WHERE sponsor_id = auth.uid()));

CREATE POLICY "propco_update_own" ON public.physical_asset_propco
  FOR UPDATE USING (deal_id IN (SELECT id FROM public.deals WHERE sponsor_id = auth.uid()));

-- Extraction logs: access through deal ownership
CREATE POLICY "extraction_select_own" ON public.extraction_logs
  FOR SELECT USING (deal_id IN (SELECT id FROM public.deals WHERE sponsor_id = auth.uid()));

CREATE POLICY "extraction_insert_own" ON public.extraction_logs
  FOR INSERT WITH CHECK (deal_id IN (SELECT id FROM public.deals WHERE sponsor_id = auth.uid()));

CREATE POLICY "extraction_update_own" ON public.extraction_logs
  FOR UPDATE USING (deal_id IN (SELECT id FROM public.deals WHERE sponsor_id = auth.uid()));
