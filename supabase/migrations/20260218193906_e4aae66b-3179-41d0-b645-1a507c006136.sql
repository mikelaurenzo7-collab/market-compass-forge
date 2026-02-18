
-- P0: Tighten scheduler_runs RLS policies
-- Drop overly permissive INSERT/UPDATE policies and restrict to service_role only

DROP POLICY IF EXISTS "Service can insert scheduler runs" ON public.scheduler_runs;
DROP POLICY IF EXISTS "Service can update scheduler runs" ON public.scheduler_runs;

CREATE POLICY "Only service_role can insert scheduler runs"
ON public.scheduler_runs
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only service_role can update scheduler runs"
ON public.scheduler_runs
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);
