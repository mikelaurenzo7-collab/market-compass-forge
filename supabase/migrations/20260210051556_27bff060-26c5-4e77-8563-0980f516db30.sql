
-- 1. api_key_secrets: Add SELECT policy so only the key owner can read their secrets
CREATE POLICY "Users can view own api key secrets"
  ON public.api_key_secrets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.api_keys
      WHERE api_keys.id = api_key_secrets.api_key_id
        AND api_keys.user_id = auth.uid()
    )
  );

-- 2. shared_notes: Replace restrictive policy with team-visible policy
-- Shared notes are meant to be collaborative - all authenticated users can view them
DROP POLICY IF EXISTS "Users can view own shared notes" ON public.shared_notes;
CREATE POLICY "Authenticated users can view shared notes"
  ON public.shared_notes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 3. team_activity: Restore team-wide visibility for audit trail
DROP POLICY IF EXISTS "Users can view own activity" ON public.team_activity;
CREATE POLICY "Authenticated users can view team activity"
  ON public.team_activity FOR SELECT
  USING (auth.uid() IS NOT NULL);
