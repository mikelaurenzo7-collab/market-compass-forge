
-- Revoke API access to materialized views (prevents exposure via Data API)
REVOKE ALL ON public.mv_dashboard_summary FROM anon, authenticated;
REVOKE ALL ON public.mv_sector_multiples FROM anon, authenticated;
REVOKE ALL ON public.mv_company_scores FROM anon, authenticated;

-- Grant back SELECT only to authenticated (these are read-only summaries used by the app)
GRANT SELECT ON public.mv_dashboard_summary TO authenticated;
GRANT SELECT ON public.mv_sector_multiples TO authenticated;
GRANT SELECT ON public.mv_company_scores TO authenticated;
