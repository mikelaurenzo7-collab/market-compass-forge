
-- Saved screens for screening presets
CREATE TABLE public.saved_screens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_key TEXT DEFAULT 'valuation',
  sort_asc BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_screens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved screens" ON public.saved_screens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own saved screens" ON public.saved_screens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved screens" ON public.saved_screens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved screens" ON public.saved_screens FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_saved_screens_updated_at BEFORE UPDATE ON public.saved_screens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
