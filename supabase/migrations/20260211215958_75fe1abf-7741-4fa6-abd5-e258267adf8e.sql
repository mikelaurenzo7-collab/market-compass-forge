
-- 1A: Intelligence Signals table
CREATE TABLE public.intelligence_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  headline TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'web',
  ai_summary TEXT,
  tags TEXT[] DEFAULT '{}',
  sentiment TEXT NOT NULL DEFAULT 'neutral',
  category TEXT NOT NULL DEFAULT 'pe_ma',
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.intelligence_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Intelligence signals are publicly readable"
  ON public.intelligence_signals
  FOR SELECT
  USING (true);

-- 1B: Document Analyses table
CREATE TABLE public.document_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  document_type TEXT DEFAULT 'other',
  company_name TEXT,
  page_count INTEGER,
  extracted_metrics JSONB DEFAULT '[]'::jsonb,
  risk_factors JSONB DEFAULT '[]'::jsonb,
  valuation_indicators JSONB DEFAULT '[]'::jsonb,
  key_terms JSONB DEFAULT '[]'::jsonb,
  ai_summary TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses"
  ON public.document_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create analyses"
  ON public.document_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
  ON public.document_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON public.document_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket for document uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

CREATE POLICY "Users can upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
