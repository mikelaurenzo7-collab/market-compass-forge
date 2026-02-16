
-- Score snapshots for reproducibility
CREATE TABLE public.score_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  model_version text NOT NULL DEFAULT 'v1.0.0',
  model_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  outputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  explainability jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_by text NOT NULL DEFAULT 'system',
  decision_context text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_score_snapshots_company ON public.score_snapshots(company_id, created_at DESC);
CREATE INDEX idx_score_snapshots_version ON public.score_snapshots(model_version);

-- Enable RLS
ALTER TABLE public.score_snapshots ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view snapshots
CREATE POLICY "Authenticated users can view score snapshots"
  ON public.score_snapshots FOR SELECT
  USING (auth.uid() IS NOT NULL);
