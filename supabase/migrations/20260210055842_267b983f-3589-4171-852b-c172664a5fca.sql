
-- Briefing preferences per user
CREATE TABLE public.briefing_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT NOT NULL DEFAULT 'daily', -- daily, weekly
  include_watchlists BOOLEAN NOT NULL DEFAULT true,
  include_portfolio BOOLEAN NOT NULL DEFAULT true,
  include_funding BOOLEAN NOT NULL DEFAULT true,
  include_news_sentiment BOOLEAN NOT NULL DEFAULT true,
  email_override TEXT, -- if null, uses auth email
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.briefing_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own briefing prefs"
  ON public.briefing_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own briefing prefs"
  ON public.briefing_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own briefing prefs"
  ON public.briefing_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own briefing prefs"
  ON public.briefing_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_briefing_prefs_updated_at
  BEFORE UPDATE ON public.briefing_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
