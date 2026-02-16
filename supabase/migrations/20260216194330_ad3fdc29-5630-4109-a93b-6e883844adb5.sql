
-- ══════════════════════════════════════════════
-- SCOPE A: Enhance subscription_tiers for Stripe state
-- ══════════════════════════════════════════════
ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS last_webhook_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS billing_interval text DEFAULT 'month';

-- ══════════════════════════════════════════════
-- SCOPE B: Scheduler tables
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.scheduler_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  function_name text NOT NULL,
  cron_expression text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_status text DEFAULT 'pending',
  last_error text,
  last_duration_ms integer,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduler_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scheduler jobs"
  ON public.scheduler_jobs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view scheduler jobs"
  ON public.scheduler_jobs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.scheduler_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES public.scheduler_jobs(id) ON DELETE CASCADE,
  job_name text NOT NULL,
  function_name text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  response_status integer,
  response_body text,
  error_message text,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduler_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scheduler runs"
  ON public.scheduler_runs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service can insert scheduler runs"
  ON public.scheduler_runs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update scheduler runs"
  ON public.scheduler_runs FOR UPDATE
  USING (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_scheduler_runs_job_id ON public.scheduler_runs(job_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_runs_started_at ON public.scheduler_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduler_runs_idempotency ON public.scheduler_runs(idempotency_key);

-- Seed scheduler jobs
INSERT INTO public.scheduler_jobs (name, function_name, cron_expression) VALUES
  ('refresh-views', 'refresh-views', '*/15 * * * *'),
  ('scheduled-refresh', 'scheduled-refresh', '0 * * * *'),
  ('check-alerts', 'check-alerts', '*/5 * * * *'),
  ('daily-briefing', 'daily-briefing', '0 7 * * *')
ON CONFLICT (name) DO NOTHING;

-- ══════════════════════════════════════════════
-- SCOPE C: Document uploads storage bucket
-- ══════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('document-uploads', 'document-uploads', false, 20971520)
ON CONFLICT (id) DO NOTHING;

-- RLS: Only authenticated users can upload to their own folder
CREATE POLICY "Users can upload their own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'document-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'document-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'document-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
