
-- Deal-level team roles
CREATE TYPE public.deal_role AS ENUM ('viewer', 'contributor', 'lead', 'approver');

CREATE TABLE public.deal_team (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deal_pipeline(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role deal_role NOT NULL DEFAULT 'viewer',
  added_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id, user_id)
);

ALTER TABLE public.deal_team ENABLE ROW LEVEL SECURITY;

-- Security definer to check deal role without recursion
CREATE OR REPLACE FUNCTION public.get_deal_role(_user_id UUID, _deal_id UUID)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.deal_team
  WHERE user_id = _user_id AND deal_id = _deal_id
  LIMIT 1
$$;

-- Deal owner (creator) always has access
CREATE OR REPLACE FUNCTION public.is_deal_owner(_user_id UUID, _deal_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deal_pipeline
    WHERE id = _deal_id AND user_id = _user_id
  )
$$;

-- RLS: users can see team members for deals they own or are on
CREATE POLICY "Users can view deal team for their deals"
ON public.deal_team FOR SELECT
USING (
  public.is_deal_owner(auth.uid(), deal_id)
  OR public.get_deal_role(auth.uid(), deal_id) IS NOT NULL
);

-- Only deal owner, lead, or approver can manage team
CREATE POLICY "Leads and owners can manage deal team"
ON public.deal_team FOR INSERT
WITH CHECK (
  public.is_deal_owner(auth.uid(), deal_id)
  OR public.get_deal_role(auth.uid(), deal_id) IN ('lead', 'approver')
);

CREATE POLICY "Leads and owners can update deal team"
ON public.deal_team FOR UPDATE
USING (
  public.is_deal_owner(auth.uid(), deal_id)
  OR public.get_deal_role(auth.uid(), deal_id) IN ('lead', 'approver')
);

CREATE POLICY "Leads and owners can remove deal team members"
ON public.deal_team FOR DELETE
USING (
  public.is_deal_owner(auth.uid(), deal_id)
  OR public.get_deal_role(auth.uid(), deal_id) IN ('lead', 'approver')
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_team;
