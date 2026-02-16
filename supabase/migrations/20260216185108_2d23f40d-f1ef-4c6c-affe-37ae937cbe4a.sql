
-- =====================================================
-- 1. Deal Collaboration: assignments, comments, decision logs
-- =====================================================

-- Deal assignments (who is responsible for what stage)
CREATE TABLE public.deal_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.deal_pipeline(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'lead', -- lead, support, reviewer
  assigned_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(deal_id, user_id)
);
ALTER TABLE public.deal_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assignments on own deals" ON public.deal_assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM deal_pipeline dp WHERE dp.id = deal_assignments.deal_id AND dp.user_id = auth.uid())
    OR user_id = auth.uid()
  );
CREATE POLICY "Users can create assignments on own deals" ON public.deal_assignments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM deal_pipeline dp WHERE dp.id = deal_assignments.deal_id AND dp.user_id = auth.uid())
  );
CREATE POLICY "Users can delete assignments on own deals" ON public.deal_assignments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM deal_pipeline dp WHERE dp.id = deal_assignments.deal_id AND dp.user_id = auth.uid())
    OR assigned_by = auth.uid()
  );

-- Deal comments (threaded)
CREATE TABLE public.deal_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.deal_pipeline(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.deal_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deal_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on own deals" ON public.deal_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM deal_pipeline dp WHERE dp.id = deal_comments.deal_id AND dp.user_id = auth.uid())
    OR user_id = auth.uid()
  );
CREATE POLICY "Auth users can add comments" ON public.deal_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.deal_comments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.deal_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Immutable decision log (append-only audit trail)
CREATE TABLE public.decision_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.deal_pipeline(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  decision_type text NOT NULL, -- stage_change, approval, rejection, escalation, note
  from_state text,
  to_state text,
  rationale text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.decision_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view decision logs on own deals" ON public.decision_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM deal_pipeline dp WHERE dp.id = decision_log.deal_id AND dp.user_id = auth.uid())
    OR user_id = auth.uid()
  );
CREATE POLICY "Auth users can add decision log entries" ON public.decision_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- No UPDATE or DELETE — immutable

-- =====================================================
-- 2. IC Templates by strategy
-- =====================================================
CREATE TABLE public.ic_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy text NOT NULL, -- growth, buyout, distressed, real_estate
  name text NOT NULL,
  description text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_approvals integer NOT NULL DEFAULT 2,
  created_by uuid,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ic_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "IC templates are readable by authenticated users" ON public.ic_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage IC templates" ON public.ic_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 3. Review cadences
-- =====================================================
CREATE TABLE public.review_cadences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  frequency text NOT NULL DEFAULT 'weekly', -- weekly, biweekly, monthly, quarterly
  next_review_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  last_reviewed_at timestamptz,
  attendees text[] DEFAULT '{}'::text[],
  auto_include_watchlists boolean NOT NULL DEFAULT true,
  auto_include_alerts boolean NOT NULL DEFAULT true,
  auto_include_open_decisions boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.review_cadences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cadences" ON public.review_cadences
  FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can create cadences" ON public.review_cadences
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own cadences" ON public.review_cadences
  FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete own cadences" ON public.review_cadences
  FOR DELETE USING (auth.uid() = created_by);

-- =====================================================
-- 4. Decision outcomes tracking
-- =====================================================
CREATE TABLE public.decision_outcomes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES public.deal_pipeline(id) ON DELETE CASCADE,
  decision_log_id uuid REFERENCES public.decision_log(id),
  outcome_type text NOT NULL, -- realized, unrealized, written_off, exited
  outcome_date timestamptz,
  actual_return_multiple numeric,
  actual_irr numeric,
  predicted_return_multiple numeric,
  predicted_irr numeric,
  notes text,
  lessons_learned text,
  model_accuracy_score numeric, -- 0-100
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.decision_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outcomes" ON public.decision_outcomes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM deal_pipeline dp WHERE dp.id = decision_outcomes.deal_id AND dp.user_id = auth.uid())
    OR created_by = auth.uid()
  );
CREATE POLICY "Auth users can create outcomes" ON public.decision_outcomes
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own outcomes" ON public.decision_outcomes
  FOR UPDATE USING (auth.uid() = created_by);
