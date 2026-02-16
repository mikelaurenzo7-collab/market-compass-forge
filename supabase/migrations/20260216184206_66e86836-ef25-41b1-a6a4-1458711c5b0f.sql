
-- Store generated memos with machine-readable citations and review state
CREATE TABLE public.memo_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  user_id UUID NOT NULL,
  memo_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_version TEXT NOT NULL DEFAULT 'v1.0.0',
  review_state TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Review audit trail
CREATE TABLE public.memo_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memo_id UUID NOT NULL REFERENCES public.memo_snapshots(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.memo_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memo_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for memo_snapshots
CREATE POLICY "Users can view own memos" ON public.memo_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own memos" ON public.memo_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memos" ON public.memo_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own memos" ON public.memo_snapshots FOR DELETE USING (auth.uid() = user_id);

-- Policies for memo_reviews
CREATE POLICY "Users can view reviews on own memos" ON public.memo_reviews FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.memo_snapshots ms WHERE ms.id = memo_reviews.memo_id AND ms.user_id = auth.uid())
);
CREATE POLICY "Authenticated users can create reviews" ON public.memo_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Index for lookups
CREATE INDEX idx_memo_snapshots_company ON public.memo_snapshots(company_id);
CREATE INDEX idx_memo_snapshots_user ON public.memo_snapshots(user_id);
CREATE INDEX idx_memo_reviews_memo ON public.memo_reviews(memo_id);

-- Trigger for updated_at
CREATE TRIGGER update_memo_snapshots_updated_at
  BEFORE UPDATE ON public.memo_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
