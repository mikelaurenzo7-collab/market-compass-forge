
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
  SELECT * FROM (
    SELECT 'company'::text AS entity_type, c.id AS entity_id, c.name AS name, coalesce(c.sector, c.stage, '')::text AS subtitle, ts_rank(c.search_vector, tsq) AS rank
    FROM public.companies c
    WHERE c.search_vector @@ tsq
    UNION ALL
    SELECT 'news'::text, n.id, n.title, coalesce(n.source_name, '')::text, ts_rank(n.search_vector, tsq)
    FROM public.news_articles n
    WHERE n.search_vector @@ tsq
    UNION ALL
    SELECT 'signal'::text, s.id, s.headline, s.category::text, ts_rank(s.search_vector, tsq)
    FROM public.intelligence_signals s
    WHERE s.search_vector @@ tsq
    UNION ALL
    SELECT 'distressed'::text, d.id, d.name, coalesce(d.sector, d.asset_type, '')::text, ts_rank(d.search_vector, tsq)
    FROM public.distressed_assets d
    WHERE d.search_vector @@ tsq
  ) combined
  ORDER BY combined.rank DESC
  LIMIT result_limit;
END;
$$;
