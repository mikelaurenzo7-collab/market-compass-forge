
-- Immutable audit log table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  deal_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'partner'));

-- Service role can insert (via triggers)
CREATE POLICY "Service role inserts audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- NO update or delete policies => immutable
-- Explicit deny for updates and deletes
CREATE POLICY "No updates to audit logs"
  ON public.audit_logs FOR UPDATE
  USING (false);

CREATE POLICY "No deletes from audit logs"
  ON public.audit_logs FOR DELETE
  USING (false);

-- Index for fast queries
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_deal ON public.audit_logs (deal_id);

-- ══ Trigger functions to auto-log events ══

-- 1. Stage changes (deal_pipeline updates)
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

CREATE TRIGGER trg_audit_stage_change
  AFTER UPDATE ON public.deal_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_stage_change();

-- 2. IC Votes
CREATE OR REPLACE FUNCTION public.audit_vote_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, deal_id, metadata)
  VALUES (
    NEW.user_id,
    'ic_vote',
    'deal_votes',
    NEW.id,
    NEW.pipeline_deal_id,
    jsonb_build_object('vote', NEW.vote, 'conviction_score', NEW.conviction_score, 'comment', NEW.comment)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_vote
  AFTER INSERT ON public.deal_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_vote_insert();

-- 3. Allocation changes
CREATE OR REPLACE FUNCTION public.audit_allocation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, deal_id, metadata)
  VALUES (
    COALESCE(NEW.user_id, auth.uid()),
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

CREATE TRIGGER trg_audit_allocation_insert
  AFTER INSERT ON public.deal_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_allocation_change();

CREATE TRIGGER trg_audit_allocation_update
  AFTER UPDATE ON public.deal_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_allocation_change();

-- 4. Decision log entries (already tracked, but audit for completeness)
CREATE OR REPLACE FUNCTION public.audit_decision_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, deal_id, metadata)
  VALUES (
    NEW.user_id,
    'decision_logged',
    'decision_log',
    NEW.id,
    NEW.deal_id,
    jsonb_build_object('decision_type', NEW.decision_type, 'from_state', NEW.from_state, 'to_state', NEW.to_state, 'rationale', NEW.rationale)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_decision
  AFTER INSERT ON public.decision_log
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_decision_log();
