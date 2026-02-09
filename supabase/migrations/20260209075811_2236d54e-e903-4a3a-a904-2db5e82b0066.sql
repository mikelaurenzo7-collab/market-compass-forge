
-- Create webhook_configs table
CREATE TABLE public.webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhooks"
  ON public.webhook_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own webhooks"
  ON public.webhook_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhooks"
  ON public.webhook_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhooks"
  ON public.webhook_configs FOR DELETE
  USING (auth.uid() = user_id);
