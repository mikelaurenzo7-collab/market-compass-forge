
-- 1. Fix scheduler_runs: restrict to service_role only
DROP POLICY IF EXISTS "Only service_role can insert scheduler runs" ON public.scheduler_runs;
DROP POLICY IF EXISTS "Only service_role can update scheduler runs" ON public.scheduler_runs;

CREATE POLICY "Service role inserts scheduler runs"
  ON public.scheduler_runs FOR INSERT
  WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "Service role updates scheduler runs"
  ON public.scheduler_runs FOR UPDATE
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- 2. Fix support_requests: require authenticated user
DROP POLICY IF EXISTS "Anyone can create support requests" ON public.support_requests;

CREATE POLICY "Authenticated users create support requests"
  ON public.support_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Fix company_documents: restrict public read to authenticated
DROP POLICY IF EXISTS "Company documents are publicly readable" ON public.company_documents;

CREATE POLICY "Authenticated users can view company documents"
  ON public.company_documents FOR SELECT
  TO authenticated
  USING (true);

-- 4. Fix property_photos: restrict to authenticated
DROP POLICY IF EXISTS "Users can view property photos" ON public.property_photos;

CREATE POLICY "Authenticated users can view property photos"
  ON public.property_photos FOR SELECT
  TO authenticated
  USING (true);

-- 5. Fix sales_comparisons: restrict to authenticated
DROP POLICY IF EXISTS "Users can view sales comparisons" ON public.sales_comparisons;

CREATE POLICY "Authenticated users can view sales comparisons"
  ON public.sales_comparisons FOR SELECT
  TO authenticated
  USING (true);

-- 6. Remove duplicate waitlist policy
DROP POLICY IF EXISTS "Admins can view waitlist signups" ON public.waitlist_signups;
