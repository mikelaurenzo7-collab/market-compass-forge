
-- Fix 1: shared_notes - restrict to owner only (was readable by all authenticated)
DROP POLICY IF EXISTS "Authenticated users can view shared notes" ON public.shared_notes;
CREATE POLICY "Users can view own shared notes"
  ON public.shared_notes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Fix 2: financials - restrict to authenticated users only (was public/anon readable)
DROP POLICY IF EXISTS "Financials are publicly readable" ON public.financials;
CREATE POLICY "Authenticated users can view financials"
  ON public.financials
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
