
-- Tighten anon policy: only allow reading non-revoked, non-expired invites
DROP POLICY "Anon can read by token" ON public.data_room_invites;

CREATE POLICY "Anon can read valid invites"
  ON public.data_room_invites FOR SELECT
  TO anon
  USING (
    revoked_at IS NULL
    AND expires_at > now()
  );
