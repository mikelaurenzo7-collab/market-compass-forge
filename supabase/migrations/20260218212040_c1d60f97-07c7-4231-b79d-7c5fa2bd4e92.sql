
-- Add conviction score to deal_votes for richer IC voting
ALTER TABLE public.deal_votes ADD COLUMN IF NOT EXISTS conviction_score INTEGER DEFAULT NULL;

-- Add comment constraint: conviction_score must be 1-10 if provided
ALTER TABLE public.deal_votes ADD CONSTRAINT deal_votes_conviction_range CHECK (conviction_score IS NULL OR (conviction_score >= 1 AND conviction_score <= 10));
