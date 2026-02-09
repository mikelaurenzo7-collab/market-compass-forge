

# Ship-Ready Sprint: 5 Fatal Flaw Fixes

## Step 1: Seed Demo Content on Signup

**Problem:** Every user-generated table is empty. New users see blank Kanban boards, empty watchlists, and no alerts. The product feels broken on first login.

**Solution:** Extend the `onAuthStateChange` handler in `useAuth.tsx` to seed demo data when a new user signs up (`SIGNED_IN` event). Use a deferred `setTimeout` call (same pattern already used for profile upsert) to insert:

- 6 demo pipeline deals (one per Kanban stage) using real company IDs from the database
- 1 default watchlist ("Top AI Companies") with 5 company IDs
- 2 starter alerts ("AI/ML Funding" and "Series B+ Rounds")

**Files to modify:**
- `src/hooks/useAuth.tsx` -- Add a `seedDemoContent(userId)` function called after profile upsert on `SIGNED_IN`. It checks if the user already has deals (to avoid re-seeding on re-login) and inserts demo data if count is 0.

**Database changes:** None needed -- all tables already exist with correct RLS policies allowing user inserts.

---

## Step 2: Secure All Edge Functions

**Problem:** All 4 edge functions have `verify_jwt = false` and 2 of them (`enrich-company`, `check-alerts`) perform no auth checks at all. Anyone can call them and consume AI credits or Firecrawl quota.

**Solution:** Add JWT validation to `enrich-company` and `check-alerts`. The `ai-research` and `generate-memo` functions already validate auth in code -- they're fine. Keep `verify_jwt = false` in config (required for signing-keys) but add code-level auth checks.

**Files to modify:**
- `supabase/functions/enrich-company/index.ts` -- Add auth header check + `getUser()` call at the top, return 401 if unauthorized
- `supabase/functions/check-alerts/index.ts` -- This is a cron-style function. Add an auth check that accepts either a valid JWT OR a service-role key (for cron invocations)
- `supabase/functions/api-access/index.ts` -- Already uses API key auth, no changes needed

---

## Step 3: Implement Usage Tracking and Soft Paywall

**Problem:** No monetization path. No usage limits. No way to differentiate free vs paid users.

**Solution:** Create a `usage_tracking` table to log key actions (AI research queries, memo generations, enrichments). Add a client-side hook that checks usage against free-tier limits and shows an upgrade prompt when exceeded.

**Database migration:**
- Create `usage_tracking` table: `id`, `user_id`, `action` (text), `created_at`
- RLS: users can insert own rows and select own rows
- Create `subscription_tiers` table: `id`, `user_id`, `tier` (free/pro/enterprise), `created_at`
- RLS: users can view own tier

**Files to create/modify:**
- `src/hooks/useUsageTracking.ts` -- Hook that inserts usage events and checks against limits (free tier: 10 AI queries/day, 3 memos/day, 5 enrichments/day)
- `src/components/UpgradePrompt.tsx` -- Modal shown when limits are hit, with pricing tiers and a "Contact us" CTA (no Stripe integration yet -- just capture intent)
- `src/components/AIResearchChat.tsx` -- Call `trackUsage('ai_research')` before each query
- `src/components/InvestmentMemo.tsx` -- Call `trackUsage('memo_generation')` before generating
- `src/pages/CompanyDetail.tsx` -- Call `trackUsage('enrichment')` before enriching

---

## Step 4: Add Second Financial Period for Top 50 Companies

**Problem:** Every company has exactly 1 financial record. The `FinancialsChart` component requires `financials.length >= 2` to render, so NO company ever shows a chart. This feature is completely invisible.

**Solution:** Insert a second financial period (prior year) for the top 50 companies by revenue. This makes the historical chart render for those companies, showing year-over-year trends.

**Database insert (not migration):** Insert 50 rows into `financials` with:
- `period`: prior year (e.g., "FY2024" if existing is "FY2025")
- Revenue/ARR ~15-30% lower than current (to show growth)
- `confidence_score`: 'low', `source`: 'Estimates'

This is a data insert, not a schema change, so it uses the insert tool.

---

## Step 5: Automate Data Freshness via Scheduled Enrichment

**Problem:** Data is static. No automated ingestion. The "Data as of" timestamp on the dashboard never changes.

**Solution:** Create a new edge function `scheduled-refresh` that:
1. Picks 5 random companies that haven't been enriched in 7+ days (or never)
2. Calls the `enrich-company` function for each
3. Inserts an activity event "Data refresh completed" so the dashboard timestamp updates

Set up a `pg_cron` job to call this function daily.

**Files to create:**
- `supabase/functions/scheduled-refresh/index.ts` -- The refresh function (no JWT needed since called by cron, but validates a service header)

**Config update:**
- `supabase/config.toml` -- Add `[functions.scheduled-refresh]` with `verify_jwt = false`

**Database:** Run SQL via insert tool to set up the cron job using `pg_cron` + `pg_net`.

---

## Summary of All Changes

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Add `seedDemoContent()` on signup |
| `supabase/functions/enrich-company/index.ts` | Add JWT auth check |
| `supabase/functions/check-alerts/index.ts` | Add auth check (JWT or service key) |
| `src/hooks/useUsageTracking.ts` | New: usage tracking hook |
| `src/components/UpgradePrompt.tsx` | New: soft paywall modal |
| `src/components/AIResearchChat.tsx` | Add usage tracking call |
| `src/components/InvestmentMemo.tsx` | Add usage tracking call |
| `src/pages/CompanyDetail.tsx` | Add usage tracking for enrichment |
| `supabase/functions/scheduled-refresh/index.ts` | New: daily data refresh function |
| `supabase/config.toml` | Add scheduled-refresh function |
| Database migration | Create `usage_tracking` + `subscription_tiers` tables with RLS |
| Database insert | 50 rows of prior-year financials for top companies |
| Database insert | pg_cron job for daily refresh |

## Execution Order
1. Database migration (usage tables) -- needs approval first
2. Seed demo content in useAuth
3. Secure edge functions
4. Usage tracking hook + upgrade prompt
5. Historical data insert
6. Scheduled refresh function + cron setup

