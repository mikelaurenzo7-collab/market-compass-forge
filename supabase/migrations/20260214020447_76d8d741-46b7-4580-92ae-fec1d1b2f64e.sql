-- Create usage_tracking table for monitoring free tier usage
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create subscription_tiers table
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on usage_tracking
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Enable RLS on subscription_tiers
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

-- RLS policies for usage_tracking (users can view their own)
CREATE POLICY "Users can view own usage tracking" 
ON public.usage_tracking
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage tracking" 
ON public.usage_tracking
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS policies for subscription_tiers (users can view their own)
CREATE POLICY "Users can view own subscription tier" 
ON public.subscription_tiers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription tier" 
ON public.subscription_tiers
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_usage_tracking_user_action ON public.usage_tracking(user_id, action, created_at DESC);
CREATE INDEX idx_subscription_tiers_user ON public.subscription_tiers(user_id);