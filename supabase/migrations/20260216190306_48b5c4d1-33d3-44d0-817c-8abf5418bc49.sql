
-- Conversion funnel events
CREATE TABLE public.conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL, -- trial_start, activation, paid_conversion, expansion, churn
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversion_events_user ON public.conversion_events(user_id, event_type);
CREATE INDEX idx_conversion_events_type ON public.conversion_events(event_type, created_at DESC);
ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversion events"
  ON public.conversion_events FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can insert conversion events"
  ON public.conversion_events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admin read policy for conversion events
CREATE POLICY "Admins can view all conversion events"
  ON public.conversion_events FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Billing seats table
CREATE TABLE public.billing_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid,
  user_id uuid NOT NULL,
  seat_type text NOT NULL DEFAULT 'member', -- owner, admin, member
  stripe_subscription_item_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz
);
ALTER TABLE public.billing_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage billing seats"
  ON public.billing_seats FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Entitlement definitions
CREATE TABLE public.plan_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL, -- essential, professional, institutional
  feature_key text NOT NULL, -- ai_research, memo_generation, enrichment, api_access, export, premium_datasets
  daily_limit integer, -- NULL means unlimited
  monthly_limit integer,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_name, feature_key)
);
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read entitlements"
  ON public.plan_entitlements FOR SELECT
  TO authenticated USING (true);

-- Seed entitlements
INSERT INTO public.plan_entitlements (plan_name, feature_key, daily_limit, monthly_limit, enabled) VALUES
  -- Essential (free tier)
  ('essential', 'ai_research', 10, 300, true),
  ('essential', 'memo_generation', 5, 150, true),
  ('essential', 'enrichment', 5, 150, true),
  ('essential', 'api_access', NULL, NULL, false),
  ('essential', 'export', 5, 150, true),
  ('essential', 'premium_datasets', NULL, NULL, false),
  -- Professional
  ('professional', 'ai_research', 200, NULL, true),
  ('professional', 'memo_generation', 100, NULL, true),
  ('professional', 'enrichment', 100, NULL, true),
  ('professional', 'api_access', NULL, NULL, true),
  ('professional', 'export', NULL, NULL, true),
  ('professional', 'premium_datasets', NULL, NULL, true),
  -- Institutional
  ('institutional', 'ai_research', NULL, NULL, true),
  ('institutional', 'memo_generation', NULL, NULL, true),
  ('institutional', 'enrichment', NULL, NULL, true),
  ('institutional', 'api_access', NULL, NULL, true),
  ('institutional', 'export', NULL, NULL, true),
  ('institutional', 'premium_datasets', NULL, NULL, true);

-- Server-side entitlement check function
CREATE OR REPLACE FUNCTION public.check_entitlement(
  _user_id uuid,
  _feature_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan text;
  _entitlement record;
  _daily_count bigint;
  _monthly_count bigint;
  _result jsonb;
BEGIN
  -- Get user's plan
  SELECT tier INTO _plan FROM public.subscription_tiers WHERE user_id = _user_id;
  IF _plan IS NULL THEN _plan := 'essential'; END IF;
  
  -- Map aliases
  IF _plan = 'pro' THEN _plan := 'professional'; END IF;
  IF _plan = 'enterprise' THEN _plan := 'institutional'; END IF;
  IF _plan = 'analyst' THEN _plan := 'essential'; END IF;
  
  -- Get entitlement
  SELECT * INTO _entitlement FROM public.plan_entitlements
  WHERE plan_name = _plan AND feature_key = _feature_key;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'feature_not_found');
  END IF;
  
  IF NOT _entitlement.enabled THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'feature_disabled', 'plan', _plan, 'upgrade_required', true);
  END IF;
  
  -- Check daily limit
  IF _entitlement.daily_limit IS NOT NULL THEN
    SELECT count(*) INTO _daily_count FROM public.usage_tracking
    WHERE user_id = _user_id AND action = _feature_key
      AND created_at >= date_trunc('day', now());
    
    IF _daily_count >= _entitlement.daily_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'daily_limit_exceeded', 'limit', _entitlement.daily_limit, 'used', _daily_count);
    END IF;
  END IF;
  
  -- Check monthly limit
  IF _entitlement.monthly_limit IS NOT NULL THEN
    SELECT count(*) INTO _monthly_count FROM public.usage_tracking
    WHERE user_id = _user_id AND action = _feature_key
      AND created_at >= date_trunc('month', now());
    
    IF _monthly_count >= _entitlement.monthly_limit THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'monthly_limit_exceeded', 'limit', _entitlement.monthly_limit, 'used', _monthly_count);
    END IF;
  END IF;
  
  RETURN jsonb_build_object('allowed', true, 'plan', _plan, 'daily_remaining', 
    CASE WHEN _entitlement.daily_limit IS NOT NULL THEN _entitlement.daily_limit - COALESCE(_daily_count, 0) ELSE NULL END);
END;
$$;
