
-- =====================================================
-- 1. Performance indexes for common query patterns
-- =====================================================

-- Companies: sector/stage/market_type combo (replaces broad scans)
CREATE INDEX IF NOT EXISTS idx_companies_sector_stage ON public.companies (sector, stage);
CREATE INDEX IF NOT EXISTS idx_companies_market_type ON public.companies (market_type);
CREATE INDEX IF NOT EXISTS idx_companies_sector_market ON public.companies (sector, market_type);

-- Financials: company lookups + period ordering
CREATE INDEX IF NOT EXISTS idx_financials_company_period ON public.financials (company_id, period DESC);

-- Funding rounds: company lookups + date ordering
CREATE INDEX IF NOT EXISTS idx_funding_company_date ON public.funding_rounds (company_id, date DESC);

-- Activity events: published_at for timeline queries
CREATE INDEX IF NOT EXISTS idx_activity_events_published ON public.activity_events (published_at DESC);

-- Deal pipeline: user scoping
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_user ON public.deal_pipeline (user_id, stage);

-- Intelligence signals: category + sentiment
CREATE INDEX IF NOT EXISTS idx_signals_category ON public.intelligence_signals (category, created_at DESC);

-- Distressed assets: status + type
CREATE INDEX IF NOT EXISTS idx_distressed_status ON public.distressed_assets (status, asset_type);

-- =====================================================
-- 2. Hybrid search function (structured + fuzzy + ranking)
-- =====================================================
CREATE OR REPLACE FUNCTION public.hybrid_search(
  search_query text DEFAULT '',
  filter_sectors text[] DEFAULT NULL,
  filter_stages text[] DEFAULT NULL,
  filter_market_type text DEFAULT NULL,
  filter_country text DEFAULT NULL,
  min_revenue numeric DEFAULT NULL,
  max_revenue numeric DEFAULT NULL,
  min_valuation numeric DEFAULT NULL,
  max_valuation numeric DEFAULT NULL,
  sort_by text DEFAULT 'relevance',
  sort_direction text DEFAULT 'desc',
  page_num integer DEFAULT 0,
  page_size integer DEFAULT 50,
  result_limit integer DEFAULT 200
)
RETURNS TABLE(
  id uuid,
  name text,
  sector text,
  stage text,
  market_type text,
  hq_country text,
  employee_count integer,
  domain text,
  founded_year integer,
  latest_revenue numeric,
  latest_arr numeric,
  latest_ebitda numeric,
  latest_valuation numeric,
  latest_round_type text,
  relevance_score real,
  total_count bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $function$
DECLARE
  tsq tsquery;
  _offset integer;
  _total bigint;
BEGIN
  _offset := page_num * page_size;
  
  -- Build tsquery from search text (if any)
  IF search_query IS NOT NULL AND length(trim(search_query)) >= 2 THEN
    tsq := websearch_to_tsquery('english', search_query);
  ELSE
    tsq := NULL;
  END IF;

  -- Count total matches first
  SELECT count(*) INTO _total
  FROM companies c
  LEFT JOIN LATERAL (
    SELECT f.revenue, f.arr, f.ebitda
    FROM financials f WHERE f.company_id = c.id
    ORDER BY f.period DESC LIMIT 1
  ) fin ON true
  LEFT JOIN LATERAL (
    SELECT fr.valuation_post, fr.round_type
    FROM funding_rounds fr WHERE fr.company_id = c.id
    ORDER BY fr.date DESC LIMIT 1
  ) fnd ON true
  WHERE
    (tsq IS NULL OR c.search_vector @@ tsq)
    AND (filter_sectors IS NULL OR c.sector = ANY(filter_sectors))
    AND (filter_stages IS NULL OR c.stage = ANY(filter_stages))
    AND (filter_market_type IS NULL OR c.market_type = filter_market_type)
    AND (filter_country IS NULL OR c.hq_country = filter_country)
    AND (min_revenue IS NULL OR coalesce(fin.revenue, fin.arr, 0) >= min_revenue)
    AND (max_revenue IS NULL OR coalesce(fin.revenue, fin.arr, 0) <= max_revenue)
    AND (min_valuation IS NULL OR coalesce(fnd.valuation_post, 0) >= min_valuation)
    AND (max_valuation IS NULL OR coalesce(fnd.valuation_post, 0) <= max_valuation);

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.sector,
    c.stage,
    c.market_type,
    c.hq_country,
    c.employee_count,
    c.domain,
    c.founded_year,
    fin.revenue AS latest_revenue,
    fin.arr AS latest_arr,
    fin.ebitda AS latest_ebitda,
    fnd.valuation_post AS latest_valuation,
    fnd.round_type AS latest_round_type,
    CASE WHEN tsq IS NOT NULL THEN ts_rank(c.search_vector, tsq) ELSE 0.0 END AS relevance_score,
    _total AS total_count
  FROM companies c
  LEFT JOIN LATERAL (
    SELECT f.revenue, f.arr, f.ebitda
    FROM financials f WHERE f.company_id = c.id
    ORDER BY f.period DESC LIMIT 1
  ) fin ON true
  LEFT JOIN LATERAL (
    SELECT fr.valuation_post, fr.round_type
    FROM funding_rounds fr WHERE fr.company_id = c.id
    ORDER BY fr.date DESC LIMIT 1
  ) fnd ON true
  WHERE
    (tsq IS NULL OR c.search_vector @@ tsq)
    AND (filter_sectors IS NULL OR c.sector = ANY(filter_sectors))
    AND (filter_stages IS NULL OR c.stage = ANY(filter_stages))
    AND (filter_market_type IS NULL OR c.market_type = filter_market_type)
    AND (filter_country IS NULL OR c.hq_country = filter_country)
    AND (min_revenue IS NULL OR coalesce(fin.revenue, fin.arr, 0) >= min_revenue)
    AND (max_revenue IS NULL OR coalesce(fin.revenue, fin.arr, 0) <= max_revenue)
    AND (min_valuation IS NULL OR coalesce(fnd.valuation_post, 0) >= min_valuation)
    AND (max_valuation IS NULL OR coalesce(fnd.valuation_post, 0) <= max_valuation)
  ORDER BY
    CASE 
      WHEN sort_by = 'relevance' AND tsq IS NOT NULL THEN ts_rank(c.search_vector, tsq)
      ELSE 0
    END DESC,
    CASE WHEN sort_by = 'name' AND sort_direction = 'asc' THEN c.name END ASC,
    CASE WHEN sort_by = 'name' AND sort_direction = 'desc' THEN c.name END DESC,
    CASE WHEN sort_by = 'valuation' AND sort_direction = 'desc' THEN coalesce(fnd.valuation_post, 0) END DESC,
    CASE WHEN sort_by = 'valuation' AND sort_direction = 'asc' THEN coalesce(fnd.valuation_post, 0) END ASC,
    CASE WHEN sort_by = 'revenue' AND sort_direction = 'desc' THEN coalesce(fin.revenue, fin.arr, 0) END DESC,
    CASE WHEN sort_by = 'revenue' AND sort_direction = 'asc' THEN coalesce(fin.revenue, fin.arr, 0) END ASC,
    c.name ASC
  LIMIT page_size
  OFFSET _offset;
END;
$function$;

-- =====================================================
-- 3. Pre-computed company scores materialized view
-- =====================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_company_scores AS
SELECT
  c.id AS company_id,
  c.name,
  c.sector,
  c.stage,
  c.hq_country,
  c.employee_count,
  c.market_type,
  c.domain,
  c.founded_year,
  fin.revenue AS latest_revenue,
  fin.arr AS latest_arr,
  fin.ebitda AS latest_ebitda,
  fin.gross_margin,
  fin.burn_rate,
  fin.runway_months,
  fnd.valuation_post AS latest_valuation,
  fnd.round_type AS latest_round_type,
  fnd.amount AS latest_round_amount
FROM companies c
LEFT JOIN LATERAL (
  SELECT f.revenue, f.arr, f.ebitda, f.gross_margin, f.burn_rate, f.runway_months
  FROM financials f WHERE f.company_id = c.id
  ORDER BY f.period DESC LIMIT 1
) fin ON true
LEFT JOIN LATERAL (
  SELECT fr.valuation_post, fr.round_type, fr.amount
  FROM funding_rounds fr WHERE fr.company_id = c.id
  ORDER BY fr.date DESC LIMIT 1
) fnd ON true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_company_scores_id ON public.mv_company_scores (company_id);
CREATE INDEX IF NOT EXISTS idx_mv_company_scores_sector ON public.mv_company_scores (sector);

-- =====================================================
-- 4. API telemetry table
-- =====================================================
CREATE TABLE public.api_telemetry (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name text NOT NULL,
  method text NOT NULL DEFAULT 'POST',
  status_code integer NOT NULL DEFAULT 200,
  latency_ms integer NOT NULL DEFAULT 0,
  user_id uuid,
  request_size_bytes integer,
  response_size_bytes integer,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.api_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view telemetry" ON public.api_telemetry
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Partition-friendly index for time-range queries
CREATE INDEX idx_telemetry_function_time ON public.api_telemetry (function_name, created_at DESC);
CREATE INDEX idx_telemetry_status ON public.api_telemetry (status_code, created_at DESC);

-- =====================================================
-- 5. Rate limiting table  
-- =====================================================
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL, -- user_id or IP
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  UNIQUE(identifier, endpoint, window_start)
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup old rate limit windows
CREATE INDEX idx_rate_limits_cleanup ON public.rate_limits (window_start);

-- =====================================================
-- 6. Update refresh_materialized_views to include new MV
-- =====================================================
CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_sector_multiples;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_company_scores;
END;
$function$;

-- =====================================================
-- 7. SLO tracking view
-- =====================================================
CREATE OR REPLACE VIEW public.v_api_slos AS
SELECT
  function_name,
  count(*) AS total_requests,
  round(avg(latency_ms)) AS avg_latency_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_latency_ms,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99_latency_ms,
  count(*) FILTER (WHERE status_code >= 500) AS error_count,
  round(count(*) FILTER (WHERE status_code >= 500)::numeric / GREATEST(count(*), 1) * 100, 2) AS error_rate_pct,
  round(count(*) FILTER (WHERE latency_ms <= 500)::numeric / GREATEST(count(*), 1) * 100, 2) AS slo_compliance_pct,
  date_trunc('hour', created_at) AS hour
FROM public.api_telemetry
WHERE created_at > now() - interval '24 hours'
GROUP BY function_name, date_trunc('hour', created_at)
ORDER BY hour DESC, function_name;
