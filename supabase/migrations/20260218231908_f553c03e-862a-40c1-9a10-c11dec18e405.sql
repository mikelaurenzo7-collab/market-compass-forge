
-- Fix #2: Remove user UPDATE policy on subscription_tiers (users should NOT modify their own tier)
DROP POLICY IF EXISTS "Users can update own subscription tier" ON public.subscription_tiers;
DROP POLICY IF EXISTS "Users can update own tier" ON public.subscription_tiers;

-- Fix #3: Replace public SELECT policies with authenticated-only

-- companies
DROP POLICY IF EXISTS "Companies are publicly readable" ON public.companies;
CREATE POLICY "Authenticated users can view companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (true);

-- investors
DROP POLICY IF EXISTS "Investors are publicly readable" ON public.investors;
CREATE POLICY "Authenticated users can view investors"
  ON public.investors FOR SELECT
  TO authenticated
  USING (true);

-- funding_rounds
DROP POLICY IF EXISTS "Funding rounds are publicly readable" ON public.funding_rounds;
CREATE POLICY "Authenticated users can view funding rounds"
  ON public.funding_rounds FOR SELECT
  TO authenticated
  USING (true);

-- investor_company
DROP POLICY IF EXISTS "Investor-company links are publicly readable" ON public.investor_company;
CREATE POLICY "Authenticated users can view investor company links"
  ON public.investor_company FOR SELECT
  TO authenticated
  USING (true);

-- activity_events
DROP POLICY IF EXISTS "Activity events are publicly readable" ON public.activity_events;
CREATE POLICY "Authenticated users can view activity events"
  ON public.activity_events FOR SELECT
  TO authenticated
  USING (true);

-- company_enrichments
DROP POLICY IF EXISTS "Enrichments are publicly readable" ON public.company_enrichments;
CREATE POLICY "Authenticated users can view enrichments"
  ON public.company_enrichments FOR SELECT
  TO authenticated
  USING (true);
