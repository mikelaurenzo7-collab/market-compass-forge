-- Allow admins and partners to read waitlist signups
CREATE POLICY "Admins and partners can view waitlist signups"
ON public.waitlist_signups
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'partner')
);
