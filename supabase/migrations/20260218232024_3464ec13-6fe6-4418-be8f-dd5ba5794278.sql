
-- Fix #1: Restrict audit log access — admin-only full access, partners scoped to their deals
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;

CREATE POLICY "Admins can read all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners can view own deal audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'partner')
    AND deal_id IN (
      SELECT deal_id FROM public.deal_team WHERE user_id = auth.uid()
    )
  );

-- Fix #2: Audit triggers — always use auth.uid(), never trust row data
CREATE OR REPLACE FUNCTION public.audit_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, deal_id, metadata)
    VALUES (
      auth.uid(),
      'stage_change',
      'deal_pipeline',
      NEW.id,
      NEW.id,
      jsonb_build_object('from_stage', OLD.stage, 'to_stage', NEW.stage, 'company_id', NEW.company_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_vote_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, deal_id, metadata)
  VALUES (
    auth.uid(),
    'ic_vote',
    'deal_votes',
    NEW.id,
    NEW.pipeline_deal_id,
    jsonb_build_object('vote', NEW.vote, 'conviction_score', NEW.conviction_score, 'comment', NEW.comment)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_allocation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, deal_id, metadata)
  VALUES (
    auth.uid(),
    CASE TG_OP
      WHEN 'INSERT' THEN 'allocation_created'
      WHEN 'UPDATE' THEN 'allocation_updated'
      ELSE 'allocation_changed'
    END,
    'deal_allocations',
    NEW.id,
    NEW.deal_id,
    jsonb_build_object(
      'amount', NEW.amount,
      'allocation_type', NEW.allocation_type,
      'ownership_pct', NEW.ownership_pct,
      'source_name', NEW.source_name
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_decision_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, deal_id, metadata)
  VALUES (
    auth.uid(),
    'decision_logged',
    'decision_log',
    NEW.id,
    NEW.deal_id,
    jsonb_build_object('decision_type', NEW.decision_type, 'from_state', NEW.from_state, 'to_state', NEW.to_state, 'rationale', NEW.rationale)
  );
  RETURN NEW;
END;
$$;
