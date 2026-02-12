
-- Grant SELECT on materialized views to authenticated users only (not anon)
GRANT SELECT ON public.mv_sector_multiples TO authenticated;
GRANT SELECT ON public.mv_dashboard_summary TO authenticated;
