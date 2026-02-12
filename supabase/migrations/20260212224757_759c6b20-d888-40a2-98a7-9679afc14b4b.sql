
-- ============================================================
-- 1. FULL-TEXT SEARCH: Add tsvector columns + GIN indexes
-- ============================================================

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.companies_search_vector_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.sector, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.sub_sector, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.domain, '')), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_search_vector_trigger ON public.companies;
CREATE TRIGGER companies_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.companies_search_vector_update();

UPDATE public.companies SET search_vector = 
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(sector, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(sub_sector, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(domain, '')), 'D');

CREATE INDEX IF NOT EXISTS idx_companies_search ON public.companies USING GIN(search_vector);

ALTER TABLE public.news_articles ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.news_search_vector_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.ai_summary, '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS news_search_vector_trigger ON public.news_articles;
CREATE TRIGGER news_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.news_articles
  FOR EACH ROW EXECUTE FUNCTION public.news_search_vector_update();

UPDATE public.news_articles SET search_vector = 
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(ai_summary, '')), 'C');

CREATE INDEX IF NOT EXISTS idx_news_search ON public.news_articles USING GIN(search_vector);

ALTER TABLE public.intelligence_signals ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.signals_search_vector_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.headline, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.ai_summary, '')), 'B');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS signals_search_vector_trigger ON public.intelligence_signals;
CREATE TRIGGER signals_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.intelligence_signals
  FOR EACH ROW EXECUTE FUNCTION public.signals_search_vector_update();

UPDATE public.intelligence_signals SET search_vector = 
  setweight(to_tsvector('english', coalesce(headline, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(ai_summary, '')), 'B');

CREATE INDEX IF NOT EXISTS idx_signals_search ON public.intelligence_signals USING GIN(search_vector);

ALTER TABLE public.distressed_assets ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.distressed_search_vector_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.sector, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS distressed_search_vector_trigger ON public.distressed_assets;
CREATE TRIGGER distressed_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.distressed_assets
  FOR EACH ROW EXECUTE FUNCTION public.distressed_search_vector_update();

UPDATE public.distressed_assets SET search_vector = 
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(sector, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C');

CREATE INDEX IF NOT EXISTS idx_distressed_search ON public.distressed_assets USING GIN(search_vector);

-- ============================================================
-- 2. FULL-TEXT SEARCH FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_all(search_query text, result_limit int DEFAULT 20)
RETURNS TABLE(
  entity_type text,
  entity_id uuid,
  name text,
  subtitle text,
  rank real
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  tsq tsquery;
BEGIN
  tsq := websearch_to_tsquery('english', search_query);
  
  RETURN QUERY
  (
    SELECT 'company'::text, c.id, c.name, coalesce(c.sector, c.stage, ''), ts_rank(c.search_vector, tsq)
    FROM public.companies c
    WHERE c.search_vector @@ tsq
    ORDER BY ts_rank(c.search_vector, tsq) DESC
    LIMIT result_limit
  )
  UNION ALL
  (
    SELECT 'news'::text, n.id, n.title, coalesce(n.source_name, ''), ts_rank(n.search_vector, tsq)
    FROM public.news_articles n
    WHERE n.search_vector @@ tsq
    ORDER BY ts_rank(n.search_vector, tsq) DESC
    LIMIT result_limit / 2
  )
  UNION ALL
  (
    SELECT 'signal'::text, s.id, s.headline, s.category, ts_rank(s.search_vector, tsq)
    FROM public.intelligence_signals s
    WHERE s.search_vector @@ tsq
    ORDER BY ts_rank(s.search_vector, tsq) DESC
    LIMIT result_limit / 2
  )
  UNION ALL
  (
    SELECT 'distressed'::text, d.id, d.name, coalesce(d.sector, d.asset_type, ''), ts_rank(d.search_vector, tsq)
    FROM public.distressed_assets d
    WHERE d.search_vector @@ tsq
    ORDER BY ts_rank(d.search_vector, tsq) DESC
    LIMIT result_limit / 2
  )
  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$;

-- ============================================================
-- 3. PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_financials_company_period ON public.financials(company_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_funding_company_date ON public.funding_rounds(company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_user_stage ON public.deal_pipeline(user_id, stage);
CREATE INDEX IF NOT EXISTS idx_news_company_published ON public.news_articles(company_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_enrichments_company_scraped ON public.company_enrichments(company_id, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_company ON public.activity_events(company_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_activity_entity ON public.team_activity(entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notes_company ON public.user_notes(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_notes_company ON public.shared_notes(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_precedent_sector ON public.precedent_transactions(sector);
CREATE INDEX IF NOT EXISTS idx_deal_transactions_industry ON public.deal_transactions(target_industry);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON public.companies(sector);
CREATE INDEX IF NOT EXISTS idx_companies_stage ON public.companies(stage);
CREATE INDEX IF NOT EXISTS idx_investor_company_investor ON public.investor_company(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_company_company ON public.investor_company(company_id);

-- ============================================================
-- 4. MATERIALIZED VIEW: Dashboard summary
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_dashboard_summary AS
SELECT
  (SELECT count(*) FROM public.companies) AS total_companies,
  (SELECT count(*) FROM public.funding_rounds) AS total_rounds,
  (SELECT coalesce(sum(amount), 0) FROM public.funding_rounds) AS total_deal_value,
  (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY valuation_post) FROM public.funding_rounds WHERE valuation_post IS NOT NULL) AS median_valuation,
  (SELECT count(*) FROM public.distressed_assets WHERE status = 'active') AS active_distressed,
  (SELECT count(*) FROM public.intelligence_signals) AS total_signals,
  (SELECT count(*) FROM public.news_articles) AS total_news,
  now() AS refreshed_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_summary ON public.mv_dashboard_summary(refreshed_at);

-- ============================================================
-- 5. MATERIALIZED VIEW: Sector multiples (cached)
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_sector_multiples AS
SELECT 
  s.sector,
  coalesce(pt.ev_rev_median, 0) AS ev_rev_median,
  coalesce(pt.ev_rev_mean, 0) AS ev_rev_mean,
  coalesce(pt.ev_rev_p25, 0) AS ev_rev_p25,
  coalesce(pt.ev_rev_p75, 0) AS ev_rev_p75,
  coalesce(pt.ev_rev_count, 0)::int AS ev_rev_count,
  coalesce(pt.ev_ebitda_median, 0) AS ev_ebitda_median,
  coalesce(pt.ev_ebitda_mean, 0) AS ev_ebitda_mean,
  coalesce(pt.ev_ebitda_p25, 0) AS ev_ebitda_p25,
  coalesce(pt.ev_ebitda_p75, 0) AS ev_ebitda_p75,
  coalesce(pt.ev_ebitda_count, 0)::int AS ev_ebitda_count,
  coalesce(dc.deal_count, 0)::int AS deal_count_12m,
  coalesce(fc.funding_count, 0)::int AS funding_count_12m
FROM (SELECT DISTINCT sector FROM public.companies WHERE sector IS NOT NULL) s
LEFT JOIN LATERAL (
  SELECT
    percentile_cont(0.5) WITHIN GROUP (ORDER BY ev_revenue) FILTER (WHERE ev_revenue > 0) AS ev_rev_median,
    avg(ev_revenue) FILTER (WHERE ev_revenue > 0) AS ev_rev_mean,
    percentile_cont(0.25) WITHIN GROUP (ORDER BY ev_revenue) FILTER (WHERE ev_revenue > 0) AS ev_rev_p25,
    percentile_cont(0.75) WITHIN GROUP (ORDER BY ev_revenue) FILTER (WHERE ev_revenue > 0) AS ev_rev_p75,
    count(*) FILTER (WHERE ev_revenue > 0) AS ev_rev_count,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY ev_ebitda) FILTER (WHERE ev_ebitda > 0) AS ev_ebitda_median,
    avg(ev_ebitda) FILTER (WHERE ev_ebitda > 0) AS ev_ebitda_mean,
    percentile_cont(0.25) WITHIN GROUP (ORDER BY ev_ebitda) FILTER (WHERE ev_ebitda > 0) AS ev_ebitda_p25,
    percentile_cont(0.75) WITHIN GROUP (ORDER BY ev_ebitda) FILTER (WHERE ev_ebitda > 0) AS ev_ebitda_p75,
    count(*) FILTER (WHERE ev_ebitda > 0) AS ev_ebitda_count
  FROM public.precedent_transactions WHERE sector = s.sector
) pt ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS deal_count 
  FROM public.deal_transactions 
  WHERE target_industry = s.sector 
    AND announced_date >= (current_date - interval '12 months')
) dc ON true
LEFT JOIN LATERAL (
  SELECT count(DISTINCT fr.company_id) AS funding_count
  FROM public.funding_rounds fr
  JOIN public.companies c ON c.id = fr.company_id AND c.sector = s.sector
  WHERE fr.date::date >= (current_date - interval '12 months')
) fc ON true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_sector_multiples ON public.mv_sector_multiples(sector);

-- ============================================================
-- 6. REFRESH FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_sector_multiples;
END;
$$;
