
-- Cross-deal search: searches thesis, notes, decision rationale across all deals
CREATE OR REPLACE FUNCTION public.search_deals_intelligence(search_query text, result_limit integer DEFAULT 10)
RETURNS TABLE(
  deal_id uuid,
  company_name text,
  company_sector text,
  stage text,
  thesis text,
  match_source text,
  match_text text,
  rank real
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tsq tsquery;
BEGIN
  IF search_query IS NULL OR length(trim(search_query)) < 2 THEN
    RETURN;
  END IF;
  
  tsq := websearch_to_tsquery('english', search_query);
  
  RETURN QUERY
  SELECT * FROM (
    -- Match on deal thesis/notes
    SELECT
      dp.id AS deal_id,
      c.name AS company_name,
      c.sector AS company_sector,
      dp.stage,
      dp.thesis,
      'thesis'::text AS match_source,
      COALESCE(dp.thesis, dp.notes, '')::text AS match_text,
      ts_rank(to_tsvector('english', COALESCE(dp.thesis, '') || ' ' || COALESCE(dp.notes, '')), tsq) AS rank
    FROM deal_pipeline dp
    JOIN companies c ON c.id = dp.company_id
    WHERE to_tsvector('english', COALESCE(dp.thesis, '') || ' ' || COALESCE(dp.notes, '')) @@ tsq
    
    UNION ALL
    
    -- Match on decision log rationale
    SELECT
      dp.id AS deal_id,
      c.name AS company_name,
      c.sector AS company_sector,
      dp.stage,
      dp.thesis,
      'decision'::text AS match_source,
      dl.rationale::text AS match_text,
      ts_rank(to_tsvector('english', COALESCE(dl.rationale, '')), tsq) AS rank
    FROM decision_log dl
    JOIN deal_pipeline dp ON dp.id = dl.deal_id
    JOIN companies c ON c.id = dp.company_id
    WHERE to_tsvector('english', COALESCE(dl.rationale, '')) @@ tsq
  ) combined
  ORDER BY combined.rank DESC
  LIMIT result_limit;
END;
$$;

-- Find similar historical deals by sector + keyword overlap
CREATE OR REPLACE FUNCTION public.find_similar_deals(target_company_id uuid, target_deal_id uuid, result_limit integer DEFAULT 3)
RETURNS TABLE(
  deal_id uuid,
  company_name text,
  company_sector text,
  stage text,
  thesis text,
  similarity_reason text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sector text;
  _sub_sector text;
  _description text;
  _thesis text;
  tsq tsquery;
BEGIN
  -- Get target company info
  SELECT c.sector, c.sub_sector, c.description
  INTO _sector, _sub_sector, _description
  FROM companies c WHERE c.id = target_company_id;

  -- Get target deal thesis
  SELECT dp.thesis INTO _thesis FROM deal_pipeline dp WHERE dp.id = target_deal_id;

  -- Build a tsquery from thesis keywords (fallback to description)
  IF _thesis IS NOT NULL AND length(trim(_thesis)) >= 3 THEN
    BEGIN
      tsq := websearch_to_tsquery('english', _thesis);
    EXCEPTION WHEN OTHERS THEN
      tsq := NULL;
    END;
  ELSIF _description IS NOT NULL AND length(trim(_description)) >= 3 THEN
    BEGIN
      tsq := websearch_to_tsquery('english', _description);
    EXCEPTION WHEN OTHERS THEN
      tsq := NULL;
    END;
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (dp.id)
    dp.id AS deal_id,
    c.name AS company_name,
    c.sector AS company_sector,
    dp.stage,
    dp.thesis,
    CASE
      WHEN c.sector = _sector AND c.sub_sector = _sub_sector THEN 'Same sub-sector'
      WHEN c.sector = _sector THEN 'Same sector'
      WHEN tsq IS NOT NULL AND to_tsvector('english', COALESCE(dp.thesis, '')) @@ tsq THEN 'Similar thesis'
      ELSE 'Related'
    END AS similarity_reason,
    dp.created_at
  FROM deal_pipeline dp
  JOIN companies c ON c.id = dp.company_id
  WHERE dp.id != target_deal_id
    AND dp.company_id != target_company_id
    AND (
      c.sector = _sector
      OR (tsq IS NOT NULL AND to_tsvector('english', COALESCE(dp.thesis, '') || ' ' || COALESCE(dp.notes, '')) @@ tsq)
    )
  ORDER BY dp.id,
    CASE
      WHEN c.sector = _sector AND c.sub_sector = _sub_sector THEN 1
      WHEN c.sector = _sector THEN 2
      ELSE 3
    END,
    dp.created_at DESC
  LIMIT result_limit;
END;
$$;
