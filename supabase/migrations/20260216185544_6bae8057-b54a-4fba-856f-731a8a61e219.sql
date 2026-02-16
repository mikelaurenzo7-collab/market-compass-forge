
-- Fix: Set v_api_slos as SECURITY INVOKER
DROP VIEW IF EXISTS public.v_api_slos;
CREATE VIEW public.v_api_slos WITH (security_invoker = on) AS
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

-- Fix: rate_limits needs admin-only policy
CREATE POLICY "Admins can manage rate limits" ON public.rate_limits
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
