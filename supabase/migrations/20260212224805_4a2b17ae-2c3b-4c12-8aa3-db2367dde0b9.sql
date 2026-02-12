
-- Remove materialized views from public API exposure
REVOKE SELECT ON public.mv_dashboard_summary FROM anon, authenticated;
REVOKE SELECT ON public.mv_sector_multiples FROM anon, authenticated;
