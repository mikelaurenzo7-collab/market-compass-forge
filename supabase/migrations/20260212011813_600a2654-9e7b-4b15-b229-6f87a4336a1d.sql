
-- Fix overly permissive UPDATE policy: only allow updating invites where the user is the invitee
DROP POLICY "Service can update invites" ON public.team_invites;
CREATE POLICY "Invitees can accept their invites"
  ON public.team_invites FOR UPDATE
  USING (auth.uid() IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Fix overly permissive SELECT: remove the catch-all, the creator policy is sufficient
-- Token-based lookup will happen server-side via service role
DROP POLICY "Anyone can view invites by token" ON public.team_invites;
