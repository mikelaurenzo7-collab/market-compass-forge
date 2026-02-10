
-- Fix team_activity: restrict to own activity only
DROP POLICY IF EXISTS "Authenticated users can view team activity" ON public.team_activity;
CREATE POLICY "Users can view own activity"
  ON public.team_activity FOR SELECT
  USING (auth.uid() = user_id);

-- Fix shared_notes: restrict to own notes only
DROP POLICY IF EXISTS "Authenticated users can view shared notes" ON public.shared_notes;
CREATE POLICY "Users can view own shared notes"
  ON public.shared_notes FOR SELECT
  USING (auth.uid() = user_id);
