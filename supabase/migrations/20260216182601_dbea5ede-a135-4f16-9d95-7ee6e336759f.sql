
-- ═══════════════════════════════════════════════════════════════
-- Ingestion Pipeline: staging tables, run tracking, dead-letter queue
-- ═══════════════════════════════════════════════════════════════

-- Pipeline run tracking
CREATE TABLE public.ingestion_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline text NOT NULL,               -- 'sec_edgar', 'bankruptcy', 'cre_records'
  status text NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, partial
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  records_ingested int DEFAULT 0,
  records_normalized int DEFAULT 0,
  records_deduped int DEFAULT 0,
  records_validated int DEFAULT 0,
  records_published int DEFAULT 0,
  records_failed int DEFAULT 0,
  error_message text,
  run_metadata jsonb DEFAULT '{}'::jsonb,
  retry_count int DEFAULT 0,
  max_retries int DEFAULT 3,
  triggered_by text DEFAULT 'scheduler',  -- scheduler, manual, webhook
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Stage-level logs for lineage
CREATE TABLE public.ingestion_stage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
  stage text NOT NULL,                    -- 'ingest', 'normalize', 'dedupe', 'validate', 'publish'
  status text NOT NULL DEFAULT 'running', -- running, completed, failed, skipped
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  records_in int DEFAULT 0,
  records_out int DEFAULT 0,
  records_dropped int DEFAULT 0,
  drop_reasons jsonb DEFAULT '[]'::jsonb,
  error_message text,
  stage_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Raw source snapshots for auditability & replay
CREATE TABLE public.raw_source_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
  pipeline text NOT NULL,
  source_identifier text NOT NULL,        -- CIK number, case number, property ID
  raw_payload jsonb NOT NULL,
  source_url text,
  fetched_at timestamptz DEFAULT now(),
  checksum text,                          -- SHA-256 for dedup
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Dead-letter queue for failed records
CREATE TABLE public.dead_letter_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid REFERENCES public.ingestion_runs(id) ON DELETE SET NULL,
  pipeline text NOT NULL,
  stage text NOT NULL,                    -- stage where failure occurred
  source_identifier text,
  raw_payload jsonb NOT NULL,
  error_message text NOT NULL,
  error_type text DEFAULT 'unknown',      -- validation, schema_drift, transform, network
  retry_count int DEFAULT 0,
  max_retries int DEFAULT 3,
  next_retry_at timestamptz,
  resolved_at timestamptz,
  resolved_by text,                       -- 'auto_retry', 'manual', 'expired'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Pipeline schedule configuration
CREATE TABLE public.pipeline_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline text NOT NULL UNIQUE,
  enabled boolean DEFAULT true,
  cron_expression text NOT NULL DEFAULT '0 6 * * *',  -- default: 6 AM daily
  last_run_at timestamptz,
  next_run_at timestamptz,
  retry_backoff_minutes int DEFAULT 15,
  max_retries int DEFAULT 3,
  alert_on_failure boolean DEFAULT true,
  alert_on_stale boolean DEFAULT true,
  staleness_threshold_hours int DEFAULT 48,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_stage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_source_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_schedules ENABLE ROW LEVEL SECURITY;

-- Admin-only read for all ingestion tables
CREATE POLICY "Admins can view ingestion runs"
  ON public.ingestion_runs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view stage logs"
  ON public.ingestion_stage_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view raw snapshots"
  ON public.raw_source_snapshots FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view dead letter queue"
  ON public.dead_letter_queue FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view pipeline schedules"
  ON public.pipeline_schedules FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_ingestion_runs_pipeline_status ON public.ingestion_runs(pipeline, status);
CREATE INDEX idx_ingestion_runs_created ON public.ingestion_runs(created_at DESC);
CREATE INDEX idx_stage_logs_run_id ON public.ingestion_stage_logs(run_id);
CREATE INDEX idx_raw_snapshots_run_id ON public.raw_source_snapshots(run_id);
CREATE INDEX idx_raw_snapshots_checksum ON public.raw_source_snapshots(checksum);
CREATE INDEX idx_dlq_pipeline_resolved ON public.dead_letter_queue(pipeline, resolved_at);
CREATE INDEX idx_dlq_next_retry ON public.dead_letter_queue(next_retry_at) WHERE resolved_at IS NULL;

-- Seed pipeline schedules
INSERT INTO public.pipeline_schedules (pipeline, cron_expression, staleness_threshold_hours) VALUES
  ('sec_edgar', '0 6 * * *', 168),       -- weekly staleness for SEC
  ('bankruptcy', '0 8 * * 1,4', 96),     -- Mon/Thu, 4 day staleness
  ('cre_records', '0 7 * * 1', 168);     -- Weekly
