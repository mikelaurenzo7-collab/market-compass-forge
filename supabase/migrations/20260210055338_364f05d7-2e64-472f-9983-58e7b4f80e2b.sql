
-- Create news_articles table for AI-powered news wire
CREATE TABLE public.news_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  title TEXT NOT NULL,
  summary TEXT,
  ai_summary TEXT,
  source_url TEXT,
  source_name TEXT DEFAULT 'web',
  published_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sentiment_score NUMERIC, -- -1.0 (bearish) to 1.0 (bullish)
  sentiment_label TEXT, -- 'bullish', 'bearish', 'neutral'
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

-- News articles are publicly readable (market data)
CREATE POLICY "News articles are publicly readable"
  ON public.news_articles
  FOR SELECT
  USING (true);

-- Create index for fast lookups
CREATE INDEX idx_news_articles_company_id ON public.news_articles(company_id);
CREATE INDEX idx_news_articles_published_at ON public.news_articles(published_at DESC);
CREATE INDEX idx_news_articles_sentiment ON public.news_articles(sentiment_label);

-- Enable realtime for live news wire
ALTER PUBLICATION supabase_realtime ADD TABLE public.news_articles;
