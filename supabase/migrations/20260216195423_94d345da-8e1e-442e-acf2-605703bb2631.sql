
-- Research threads table
CREATE TABLE public.research_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Research',
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deal_pipeline(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Research messages table
CREATE TABLE public.research_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.research_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Full-text search on threads
ALTER TABLE public.research_threads ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A')
  ) STORED;
CREATE INDEX idx_research_threads_search ON public.research_threads USING GIN(search_vector);

-- Full-text search on messages
ALTER TABLE public.research_messages ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) STORED;
CREATE INDEX idx_research_messages_search ON public.research_messages USING GIN(search_vector);

-- Indexes
CREATE INDEX idx_research_threads_user ON public.research_threads(user_id);
CREATE INDEX idx_research_threads_company ON public.research_threads(company_id);
CREATE INDEX idx_research_threads_deal ON public.research_threads(deal_id);
CREATE INDEX idx_research_messages_thread ON public.research_messages(thread_id);

-- Timestamp trigger
CREATE TRIGGER update_research_threads_updated_at
  BEFORE UPDATE ON public.research_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.research_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own threads"
  ON public.research_threads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own threads"
  ON public.research_threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own threads"
  ON public.research_threads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own threads"
  ON public.research_threads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own messages"
  ON public.research_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages"
  ON public.research_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
