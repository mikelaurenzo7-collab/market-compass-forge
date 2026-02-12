-- Intro requests table for deal opportunities
CREATE TABLE public.intro_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  entity_type text NOT NULL, -- 'distressed_asset', 'private_listing', 'company'
  entity_id uuid NOT NULL,
  entity_name text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'submitted', 'connected', 'declined'))
);

-- Enable RLS
ALTER TABLE public.intro_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own intro requests"
  ON public.intro_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create intro requests"
  ON public.intro_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own requests
CREATE POLICY "Users can update own intro requests"
  ON public.intro_requests FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all intro requests"
  ON public.intro_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups
CREATE INDEX idx_intro_requests_user ON public.intro_requests(user_id);
CREATE INDEX idx_intro_requests_entity ON public.intro_requests(entity_type, entity_id);

-- Update default subscription tier to analyst (no free tier)
UPDATE public.subscription_tiers SET tier = 'analyst' WHERE tier = 'free';