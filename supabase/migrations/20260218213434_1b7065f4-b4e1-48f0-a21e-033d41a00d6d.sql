
-- Stage task templates (seed data for auto-generation)
CREATE TABLE IF NOT EXISTS public.stage_task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage TEXT NOT NULL,
  title TEXT NOT NULL,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  deal_mode TEXT NOT NULL DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stage_task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read templates" ON public.stage_task_templates FOR SELECT USING (true);

-- Deal tasks (instances of tasks per deal)
CREATE TABLE IF NOT EXISTS public.deal_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deal_pipeline(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stage TEXT NOT NULL,
  is_critical BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  assignee_id UUID,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view deal tasks" ON public.deal_tasks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert tasks" ON public.deal_tasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update tasks" ON public.deal_tasks FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete tasks" ON public.deal_tasks FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_deal_tasks_deal_id ON public.deal_tasks(deal_id);
CREATE INDEX idx_deal_tasks_stage ON public.deal_tasks(deal_id, stage);

-- Seed stage task templates
INSERT INTO public.stage_task_templates (stage, title, is_critical, sort_order, deal_mode) VALUES
-- Sourced
('sourced', 'Initial company research', false, 1, 'all'),
('sourced', 'Identify key contacts', false, 2, 'all'),
('sourced', 'Preliminary sector analysis', false, 3, 'all'),

-- Screening
('screening', 'Review financial summary', false, 1, 'enterprise'),
('screening', 'Assess market positioning', false, 2, 'all'),
('screening', 'Preliminary valuation range', false, 3, 'all'),
('screening', 'Screen property condition', false, 2, 'asset'),
('screening', 'Zoning & entitlement check', false, 3, 'asset'),

-- Due Diligence
('due_diligence', 'Review tax returns (3 years)', true, 1, 'all'),
('due_diligence', 'Verify KYC / AML compliance', true, 2, 'all'),
('due_diligence', 'Run background checks', true, 3, 'all'),
('due_diligence', 'Legal document review', true, 4, 'all'),
('due_diligence', 'Financial model validation', false, 5, 'enterprise'),
('due_diligence', 'Customer / tenant reference calls', false, 6, 'all'),
('due_diligence', 'IP / technology assessment', false, 7, 'enterprise'),
('due_diligence', 'Management team interviews', false, 8, 'enterprise'),
('due_diligence', 'Phase I environmental review', true, 5, 'asset'),
('due_diligence', 'Property inspection report', true, 6, 'asset'),
('due_diligence', 'Title search & survey', true, 7, 'asset'),
('due_diligence', 'Rent roll verification', false, 8, 'asset'),

-- IC Review
('ic_review', 'Prepare investment memo', true, 1, 'all'),
('ic_review', 'Risk matrix completion', true, 2, 'all'),
('ic_review', 'IC presentation deck', false, 3, 'all'),
('ic_review', 'Collect IC votes', true, 4, 'all'),

-- Committed
('committed', 'Execute term sheet', true, 1, 'all'),
('committed', 'Wire transfer authorization', true, 2, 'all'),
('committed', 'Final legal sign-off', true, 3, 'all'),
('committed', 'LP notification', false, 4, 'all');

-- Function to auto-generate tasks when stage changes
CREATE OR REPLACE FUNCTION public.auto_generate_deal_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire on stage change
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    -- Check if tasks already exist for this stage
    IF NOT EXISTS (SELECT 1 FROM public.deal_tasks WHERE deal_id = NEW.id AND stage = NEW.stage LIMIT 1) THEN
      INSERT INTO public.deal_tasks (deal_id, title, stage, is_critical, sort_order)
      SELECT NEW.id, t.title, t.stage, t.is_critical, t.sort_order
      FROM public.stage_task_templates t
      WHERE t.stage = NEW.stage
        AND (t.deal_mode = 'all' OR t.deal_mode = NEW.deal_mode);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_generate_deal_tasks
BEFORE UPDATE ON public.deal_pipeline
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_deal_tasks();

-- Also generate initial tasks on insert
CREATE OR REPLACE FUNCTION public.auto_generate_deal_tasks_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.deal_tasks (deal_id, title, stage, is_critical, sort_order)
  SELECT NEW.id, t.title, t.stage, t.is_critical, t.sort_order
  FROM public.stage_task_templates t
  WHERE t.stage = NEW.stage
    AND (t.deal_mode = 'all' OR t.deal_mode = NEW.deal_mode);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_generate_deal_tasks_insert
AFTER INSERT ON public.deal_pipeline
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_deal_tasks_on_insert();
