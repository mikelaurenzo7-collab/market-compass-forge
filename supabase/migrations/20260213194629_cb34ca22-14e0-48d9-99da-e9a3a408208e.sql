
-- Relationship Graph: edges between entities
CREATE TABLE public.relationship_edges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type text NOT NULL, -- company, investor, person, fund
  source_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  relationship_type text NOT NULL, -- invested_in, board_member, co_investor, acquired, partnership
  confidence text NOT NULL DEFAULT 'medium',
  source_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(source_type, source_id, target_type, target_id, relationship_type)
);

ALTER TABLE public.relationship_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Relationship edges are publicly readable"
  ON public.relationship_edges FOR SELECT USING (true);

CREATE INDEX idx_relationship_edges_source ON public.relationship_edges(source_type, source_id);
CREATE INDEX idx_relationship_edges_target ON public.relationship_edges(target_type, target_id);

-- Deal Votes for IC decisions
CREATE TABLE public.deal_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_deal_id uuid NOT NULL REFERENCES public.deal_pipeline(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote text NOT NULL CHECK (vote IN ('proceed', 'pass', 'hold')),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(pipeline_deal_id, user_id)
);

ALTER TABLE public.deal_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view votes on own deals"
  ON public.deal_votes FOR SELECT
  USING (EXISTS (SELECT 1 FROM deal_pipeline dp WHERE dp.id = deal_votes.pipeline_deal_id AND dp.user_id = auth.uid()));

CREATE POLICY "Users can cast votes on own deals"
  ON public.deal_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM deal_pipeline dp WHERE dp.id = deal_votes.pipeline_deal_id AND dp.user_id = auth.uid()));

CREATE POLICY "Users can update own votes"
  ON public.deal_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON public.deal_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Add alert_type to user_alerts conditions support (no schema change needed, conditions is JSONB)
-- Add SEC filing monitoring support via a new column
ALTER TABLE public.user_alerts ADD COLUMN IF NOT EXISTS alert_type text NOT NULL DEFAULT 'custom';

-- Enable realtime for deal_votes (for collaborative IC voting)
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_votes;
