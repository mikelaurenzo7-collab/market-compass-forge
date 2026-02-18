
-- Tighten the INSERT policy: only allow inserts where user_id matches the authenticated user
-- (triggers use SECURITY DEFINER so they bypass RLS anyway)
DROP POLICY "Service role inserts audit logs" ON public.audit_logs;

CREATE POLICY "Authenticated users can insert own audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
