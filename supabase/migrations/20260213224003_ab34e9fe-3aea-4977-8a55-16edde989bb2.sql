
-- Add computed columns to public_market_data
ALTER TABLE public.public_market_data
  ADD COLUMN IF NOT EXISTS enterprise_value numeric,
  ADD COLUMN IF NOT EXISTS revenue numeric,
  ADD COLUMN IF NOT EXISTS ebitda numeric,
  ADD COLUMN IF NOT EXISTS ev_revenue numeric,
  ADD COLUMN IF NOT EXISTS ev_ebitda numeric;

-- Add staleness tracking to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS last_sec_fetch timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_market_fetch timestamp with time zone;

-- Rewrite the materialized view to compute from real data
DROP MATERIALIZED VIEW IF EXISTS mv_sector_multiples;

CREATE MATERIALIZED VIEW mv_sector_multiples AS
WITH company_fundamentals AS (
  SELECT
    c.sector,
    pmd.market_cap,
    COALESCE(pmd.enterprise_value, pmd.market_cap, 0) AS ev_proxy,
    COALESCE(pmd.revenue, rev.value) AS revenue,
    COALESCE(pmd.ebitda, ebitda_val.value) AS ebitda
  FROM companies c
  JOIN public_market_data pmd ON pmd.company_id = c.id
  LEFT JOIN LATERAL (
    SELECT value FROM sec_financial_facts
    WHERE company_id = c.id AND concept IN ('Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax')
    AND form_type = '10-K' ORDER BY period_end DESC LIMIT 1
  ) rev ON true
  LEFT JOIN LATERAL (
    SELECT value FROM sec_financial_facts
    WHERE company_id = c.id AND concept = 'OperatingIncomeLoss'
    AND form_type = '10-K' ORDER BY period_end DESC LIMIT 1
  ) ebitda_val ON true
  WHERE c.market_type = 'public' AND COALESCE(pmd.enterprise_value, pmd.market_cap, 0) > 0
),
sector_stats AS (
  SELECT
    sector,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ev_proxy / NULLIF(revenue, 0)) AS ev_rev_p25,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ev_proxy / NULLIF(revenue, 0)) AS ev_rev_median,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ev_proxy / NULLIF(revenue, 0)) AS ev_rev_p75,
    AVG(ev_proxy / NULLIF(revenue, 0)) AS ev_rev_mean,
    COUNT(*) FILTER (WHERE revenue > 0) AS ev_rev_count,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ev_proxy / NULLIF(ebitda, 0)) AS ev_ebitda_p25,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ev_proxy / NULLIF(ebitda, 0)) AS ev_ebitda_median,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ev_proxy / NULLIF(ebitda, 0)) AS ev_ebitda_p75,
    AVG(ev_proxy / NULLIF(ebitda, 0)) AS ev_ebitda_mean,
    COUNT(*) FILTER (WHERE ebitda > 0) AS ev_ebitda_count
  FROM company_fundamentals
  WHERE sector IS NOT NULL
  GROUP BY sector
)
SELECT
  ss.*,
  COALESCE(dc.deal_count, 0) AS deal_count_12m,
  COALESCE(fc.funding_count, 0) AS funding_count_12m
FROM sector_stats ss
LEFT JOIN (
  SELECT target_industry AS sector, COUNT(*) AS deal_count
  FROM deal_transactions WHERE announced_date > CURRENT_DATE - INTERVAL '12 months'
  GROUP BY target_industry
) dc ON dc.sector = ss.sector
LEFT JOIN (
  SELECT c.sector, COUNT(*) AS funding_count
  FROM funding_rounds fr JOIN companies c ON c.id = fr.company_id
  WHERE fr.date > CURRENT_DATE - INTERVAL '12 months'
  GROUP BY c.sector
) fc ON fc.sector = ss.sector;

CREATE UNIQUE INDEX ON mv_sector_multiples (sector);

-- Update the refresh function to handle the new view
CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_sector_multiples;
END;
$function$;
