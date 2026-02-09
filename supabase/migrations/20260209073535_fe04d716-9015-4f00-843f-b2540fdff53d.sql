
-- Create pipeline_tasks table for follow-up tracking on deals
CREATE TABLE public.pipeline_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_deal_id UUID NOT NULL REFERENCES public.deal_pipeline(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assignee_id UUID NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_tasks ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can view tasks on deals they own
CREATE POLICY "Users can view tasks on own deals"
ON public.pipeline_tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.deal_pipeline dp
    WHERE dp.id = pipeline_deal_id AND dp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create tasks on own deals"
ON public.pipeline_tasks
FOR INSERT
WITH CHECK (
  auth.uid() = assignee_id AND
  EXISTS (
    SELECT 1 FROM public.deal_pipeline dp
    WHERE dp.id = pipeline_deal_id AND dp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own tasks"
ON public.pipeline_tasks
FOR UPDATE
USING (auth.uid() = assignee_id);

CREATE POLICY "Users can delete own tasks"
ON public.pipeline_tasks
FOR DELETE
USING (auth.uid() = assignee_id);

-- Trigger for updated_at
CREATE TRIGGER update_pipeline_tasks_updated_at
BEFORE UPDATE ON public.pipeline_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
