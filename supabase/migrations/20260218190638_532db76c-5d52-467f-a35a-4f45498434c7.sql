
-- Add thesis column to deal_pipeline
ALTER TABLE public.deal_pipeline ADD COLUMN IF NOT EXISTS thesis text;

-- Create deal_allocations table
CREATE TABLE public.deal_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.deal_pipeline(id) ON DELETE CASCADE,
  allocation_type text NOT NULL DEFAULT 'equity',
  amount numeric,
  source_name text,
  ownership_pct numeric,
  commitment_date date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.deal_allocations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view allocations on own deals"
  ON public.deal_allocations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deal_pipeline dp
      WHERE dp.id = deal_allocations.deal_id AND dp.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can create allocations on own deals"
  ON public.deal_allocations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM deal_pipeline dp
      WHERE dp.id = deal_allocations.deal_id AND dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own allocations"
  ON public.deal_allocations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own allocations"
  ON public.deal_allocations FOR DELETE
  USING (auth.uid() = user_id);
