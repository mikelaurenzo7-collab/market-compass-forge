-- Allow users to view their own API observability records.
CREATE POLICY IF NOT EXISTS "Users can view own api telemetry"
ON public.api_telemetry
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own rate limit windows"
ON public.rate_limits
FOR SELECT
USING (identifier = auth.uid()::text);
