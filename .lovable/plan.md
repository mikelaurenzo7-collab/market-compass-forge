

# Founder Mode Audit -- Full Report

## Current State Summary

| Metric | Value | Verdict |
|---|---|---|
| Companies in DB | 155 | OK |
| Funding rounds | 144 | OK |
| Financial records | 205 (3 periods) | Improved (was 1 period) |
| Companies with charts enabled | 50 | Good (was 0) |
| Investors | 35 | Thin |
| Activity events | 65 | OK |
| Demo seeding | Implemented | Fixed |
| Edge function auth | Added | Fixed |
| Usage tracking/paywall | Implemented | Fixed |
| Alert notifications | 0 | No trigger pipeline |
| Team activity | 0 | No real usage yet |

---

## Axis 1: Console Errors and Code Bugs

### BUG: React ref warning on Screening page
- **Severity**: Medium
- **Issue**: Console shows "Function components cannot be given refs" for `Screening`. React Router is trying to pass a ref to the `Screening` component because the `<Route>` element wraps it. The `Screening` component is exported as a plain function, not wrapped in `forwardRef`. This causes a noisy console warning on every render.
- **Fix**: Either wrap `Screening` in `React.forwardRef` or (better) ignore it since React Router v6 doesn't actually require refs on route elements. The warning is cosmetic but looks unprofessional in dev tools.

### BUG: Auth page calls `navigate()` during render
- **Severity**: Low-Medium
- **Issue**: In `Auth.tsx` line 23, if `user` is truthy, `navigate("/", { replace: true })` is called directly in the component body (during render). This is a React anti-pattern -- side effects should be in `useEffect`. It can cause "Cannot update a component while rendering a different component" warnings.
- **Fix**: Move the redirect into a `useEffect`.

### BUG: Deals page query missing user filter
- **Severity**: Low (RLS protects)
- **Issue**: `Deals.tsx` line 53 queries `deal_pipeline` without `.eq("user_id", user!.id)`. RLS handles it, but the query relies entirely on RLS for correctness. The `pipeline-count` query on the Index page correctly uses `.eq("user_id", user!.id)`. The inconsistency could cause confusion.
- **Fix**: Add explicit `.eq("user_id", user!.id)` for clarity and to not rely solely on RLS.

### BUG: Duplicate deal inserts not prevented
- **Severity**: Medium
- **Issue**: Both `Screening.tsx` and `CompanyDetail.tsx` allow adding a company to the pipeline multiple times (no unique constraint on `(user_id, company_id)` in `deal_pipeline`). The bulk add in Screening also has this issue. The error toast says "Some companies may already be in your pipeline" but there's no DB constraint to enforce uniqueness.
- **Fix**: Add a unique constraint on `(user_id, company_id)` in `deal_pipeline`, and use `ON CONFLICT DO NOTHING` or check existence before insert.

---

## Axis 2: UX and Flow Issues

### No pagination anywhere
- **Severity**: High
- **Issue**: Companies page, Screening page, People page -- all load full datasets in a single query. With 155 companies this is fine, but it won't scale. More critically, Supabase has a 1000-row default limit, so if data grows, results will silently truncate.
- **Fix**: Add cursor-based or offset pagination to Companies, Screening, and People pages. Show page controls.

### Mobile layout gaps
- **Severity**: Medium
- **Issue**: 
  - Screening filters are not collapsible on mobile -- they take up most of the screen
  - Deals Kanban board uses fixed 280px columns with horizontal scroll, which works but feels clunky on mobile (no touch-friendly drag)
  - CompanyDetail header has action buttons that overflow on small screens
  - CompanyComparison table is not readable on mobile
- **Fix**: Add collapsible filter panel on mobile, consider a list view alternative for Deals on mobile, make CompanyDetail header stack vertically on small screens.

### No loading/error boundaries
- **Severity**: Medium
- **Issue**: If any query throws, the entire page crashes with no recovery. There's no React Error Boundary wrapping routes or major sections.
- **Fix**: Add a top-level `ErrorBoundary` component around the `<Outlet>` in `AppLayout`, and individual error states on key data-loading components.

### Command palette investor selection is broken
- **Severity**: Low
- **Issue**: `CommandPalette.tsx` line 42 -- `selectInvestor` always navigates to `/people` regardless of which investor is selected. It should ideally scroll to or highlight the selected investor.
- **Fix**: Pass investor ID as a query param or hash to the People page.

### No "empty pipeline" CTA
- **Severity**: Low
- **Issue**: When the Deals page has 0 deals, it shows an empty Kanban with no guidance. The onboarding card on the dashboard helps, but once dismissed, new users who visit Deals directly see nothing actionable.
- **Fix**: Add an empty state with a CTA to go to Screening or Companies.

---

## Axis 3: Performance Optimizations

### Triple-fetch on Companies page
- **Severity**: Medium
- **Issue**: `useCompaniesWithFinancials` makes 3 sequential queries: companies, then funding rounds, then financials. With 155 companies, the `.in("company_id", companyIds)` sends all 155 UUIDs as a query parameter. This is inefficient and will hit URL length limits at scale.
- **Fix**: Consider a database view or RPC function that joins companies with their latest funding/financial data in a single query.

### Dashboard makes 5+ parallel queries
- **Severity**: Low
- **Issue**: The Index page fires: `dashboard-metrics`, `pipeline-count`, `sector-count`, `latest-event-date`, `recent-pipeline`, `dashboard-watchlists`, plus the embedded `CompanyTable` and chart components each fire their own queries. That's 8-10 queries on page load.
- **Fix**: Consolidate into 2-3 RPC calls. Acceptable for now with staleTime caching.

### No query deduplication for shared data
- **Severity**: Low
- **Issue**: Both `/companies` and `/screening` use `useCompaniesWithFinancials`, but navigating between them triggers separate fetches (mitigated by staleTime). The dashboard's `CompanyTable` also calls the same hook.
- **Fix**: Already mitigated by React Query's 5-minute staleTime. No action needed.

---

## Axis 4: Data and Trust

### Alert notifications pipeline is dead
- **Severity**: High
- **Issue**: The `check-alerts` edge function exists and is secured, but there's no cron job or trigger actually calling it. The `alert_notifications` table has 0 rows. Users create alerts but never receive notifications. The `scheduled-refresh` cron was set up, but `check-alerts` has no scheduled invocation.
- **Fix**: Add a `pg_cron` job to call `check-alerts` daily (or piggyback on the `scheduled-refresh` function to also trigger alert checking after enrichment).

### No data validation on financial inserts
- **Severity**: Low
- **Issue**: The `financials` table accepts any values -- negative ARR, revenue > 10T, etc. There's no validation. Since inserts are admin-only (no user INSERT RLS), this is low risk but could lead to chart rendering issues.
- **Fix**: Add reasonable check constraints or validation triggers.

### Enrichment function may fail silently
- **Severity**: Medium
- **Issue**: The `enrich-company` function uses Firecrawl to scrape company websites. If the company has no `domain`, it would fail. Error handling should be verified.
- **Fix**: Add explicit handling for companies without domains in the enrichment function.

---

## Axis 5: Security

### Webhook test sends user data to arbitrary URLs
- **Severity**: Medium
- **Issue**: `Integrations.tsx` line 93 -- the `testWebhook` function sends a POST to any URL the user provides. While `mode: "no-cors"` limits response reading, it still sends outbound requests from the user's browser. This is by design for webhooks, but there's no URL validation (could be internal IPs, localhost, etc.).
- **Fix**: Validate webhook URLs are HTTPS and not internal/reserved IP ranges. Or move webhook delivery to an edge function.

### No rate limiting on client-side actions
- **Severity**: Low-Medium
- **Issue**: Usage tracking checks daily limits client-side, but a user could bypass the `checkAndTrack` function by calling the edge functions directly (though they now require JWT auth). The usage check is client-side only -- the edge functions themselves don't enforce limits.
- **Fix**: Add server-side usage checking in the edge functions themselves, or accept the risk since JWT auth prevents anonymous abuse.

---

## Top 5 Improvements to Implement

1. **Fix the alert notification pipeline** -- Add a `pg_cron` job to call `check-alerts` daily so users actually receive notifications. Without this, the entire Alerts feature is decorative.

2. **Add a unique constraint on `deal_pipeline(user_id, company_id)`** -- Prevents duplicate deals and fixes the bulk-add edge case. Add `ON CONFLICT DO NOTHING` to insert calls.

3. **Fix the Auth page render-time navigation** -- Move the `navigate()` call into a `useEffect` to prevent React warnings and potential state update bugs.

4. **Add an Error Boundary** -- Wrap the `<Outlet>` in `AppLayout` with a React Error Boundary that shows a friendly "Something went wrong" message with a retry button, instead of a blank white screen.

5. **Make Screening filters collapsible on mobile** -- The filter panel takes up 60%+ of the mobile viewport. Add a toggle button to collapse/expand it, defaulting to collapsed on mobile.

---

## Technical Details

### Fix 1: Alert notification cron
- Add SQL migration with `pg_cron` job calling `check-alerts` edge function via `pg_net`
- Schedule: daily at 07:30 UTC (30 min after the existing scheduled-refresh)
- The `check-alerts` function already accepts service-role key auth

### Fix 2: Unique constraint migration
```sql
ALTER TABLE deal_pipeline ADD CONSTRAINT deal_pipeline_user_company_unique UNIQUE (user_id, company_id);
```
- Update `addToPipeline` mutations in `Screening.tsx`, `CompanyDetail.tsx` to use `.upsert()` or handle conflict gracefully

### Fix 3: Auth navigation fix
- `Auth.tsx`: Replace the synchronous `navigate()` call with `useEffect(() => { if (user) navigate("/", { replace: true }); }, [user])`

### Fix 4: Error Boundary
- Create `src/components/ErrorBoundary.tsx` using React class component pattern
- Wrap `<Outlet />` in `AppLayout.tsx` with `<ErrorBoundary>`
- Show a card with error message + "Reload" button

### Fix 5: Collapsible mobile filters
- `Screening.tsx`: Add `const [filtersOpen, setFiltersOpen] = useState(false)` + `useIsMobile()` hook
- On mobile, show a "Filters" toggle button; hide filter panel when collapsed
- Default to collapsed on mobile, expanded on desktop

