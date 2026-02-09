
# Co-Founder Audit: Laurenzo's Private Intelligence

## Executive Summary

We've built a solid foundation. Every sidebar link works, the data model is sound, and the core workflow exists. But we're at a critical inflection point: **the product feels like a demo, not a tool someone would pay $20k/seat for.** The gaps are specific and fixable.

---

## What We've Shipped (Honest Assessment)

### Strong
- 18 database tables with RLS on every one (linter: zero issues)
- 50 companies, 64 funding rounds, 25 financials, 20 investors, 50 investor-company links, 15 activity events
- 4 edge functions (ai-research, generate-memo, enrich-company, check-alerts), all with auth
- Full auth flow with email verification
- Every page works: Dashboard, Companies, Company Detail, Deals (Kanban), Analytics, Screening, Research, People, Alerts, Settings
- AI research chat with streaming + sector playbooks
- Investment memo generation with copy-as-markdown
- Hover previews, skeleton loaders, density controls, activity logging

### Weak
- **Zero pipeline deals** in the database -- the Kanban is empty
- **Zero team activity** logged -- the decision trail shows nothing
- **Zero watchlists** created -- the feature exists but is untested
- **Zero pipeline tasks** -- the task system exists but is unused
- **Only 25 financials for 50 companies** -- half the companies have no financial data
- **Only 15 activity events** -- the activity feed is thin
- **38 of 50 companies are "Late Stage"** -- stage distribution is unrealistic

---

## Critical Next Steps (Ranked by Impact)

### Priority 1: Seed Realistic Demo Data
**Why:** Every investor demo, every screenshot, every first login falls flat with empty Kanban boards and sparse data. This is the single highest-ROI task.

What to seed:
- 8-10 deal pipeline entries across all 6 stages (sourced through passed)
- 3-5 pipeline tasks per deal (mix of todo/in_progress/done)
- 25 more financial records to fill gaps (every company should have at least 1)
- 50+ activity events (mix of funding, hiring, product launches, partnerships)
- Rebalance company stages: ~10 Series B, ~10 Growth, ~8 Series C, ~8 Series D, ~8 Late Stage, ~3 Public, ~3 Series A
- 3 sample team_activity entries to populate the decision trail
- 2 sample watchlists

### Priority 2: Guided Workflow Loop
**Why:** Right now Screen, Research, Memo, and Pipeline are disconnected pages. A power user has to manually navigate between them. The #1 workflow stickiness feature is connecting them.

What to build:
- After screening results, each row gets a "Research" quick action that navigates to `/research` pre-loaded with that company
- After generating a memo, a "Add to Pipeline" CTA appears
- After adding to pipeline, a "Create Follow-up Task" prompt appears
- On the Dashboard, a "Continue where you left off" section showing the user's most recent company research + pipeline deals

### Priority 3: Notification Badge + Onboarding
**Why:** The alerts badge in the sidebar is hardcoded to "3". The notification dot on the bell icon is always shown. No first-run guidance exists.

What to fix:
- Make the sidebar badge dynamic (count from `alert_notifications` where `is_read = false`)
- Make the bell dot dynamic (hide when 0 unread)
- Add a first-run welcome state on the Dashboard for users with 0 pipeline deals: "Welcome to Laurenzo's -- here's how to get started" with 3 steps

### Priority 4: QueryClient Caching + Performance
**Why:** Every page re-fetches on mount. No `staleTime` is set anywhere. With 50 companies and growing, this creates unnecessary load.

What to fix:
- Set `staleTime: 5 * 60 * 1000` (5 min) on the QueryClient default options
- Add `staleTime: 30_000` on frequently-changing queries (pipeline, notifications)
- This is a one-line change in `App.tsx` that dramatically improves perceived performance

### Priority 5: Premium Motion + Card Polish
**Why:** The app looks clean but static. Adding subtle motion makes it feel alive without harming usability.

What to build:
- Add `transition-lift` class to all cards (MetricCard, pipeline cards, company table rows)
- Animate page transitions with a simple fade-in (CSS `@keyframes` already exists as `animate-fade-in`)
- Pipeline Kanban: animate card movement between columns on drop
- Hover state improvements: scale(1.01) on cards, color shift on interactive elements

---

## Technical Details

### Data Seeding Migration
A single SQL migration will insert:
- `deal_pipeline`: 8-10 rows covering all stages, linked to real company IDs
- `pipeline_tasks`: 15-20 rows across those deals
- `financials`: 25 rows to fill companies missing financial data
- `activity_events`: 50 rows with realistic event types and dates
- `team_activity`: 5 sample audit trail entries
- `user_watchlists`: 2 sample watchlists
- Update `companies` table to rebalance `stage` values

### Sidebar Badge Fix
- `AppSidebar.tsx`: Query `alert_notifications` count where `is_read = false`, replace hardcoded `badge: 3`
- `AppLayout.tsx`: Conditionally render the bell dot based on the same count

### Workflow Loop
- `Screening.tsx`: Add "Research" button per row that navigates to `/research?company={id}`
- `Research.tsx`: Read `company` query param on mount to auto-select
- `InvestmentMemo.tsx`: After generation, show "Add to Pipeline" CTA
- `Index.tsx`: Add "Recent Activity" section querying user's last 3 pipeline deals

### QueryClient Config
- `App.tsx`: Change `new QueryClient()` to include `defaultOptions.queries.staleTime: 300000`

### Files to Modify
- `supabase/migrations/` -- new seed migration
- `src/App.tsx` -- QueryClient staleTime
- `src/components/AppSidebar.tsx` -- dynamic badge
- `src/components/AppLayout.tsx` -- dynamic bell dot
- `src/pages/Screening.tsx` -- "Research" quick action
- `src/pages/Research.tsx` -- auto-select from query param
- `src/pages/Index.tsx` -- onboarding state + recent activity
- `src/components/InvestmentMemo.tsx` -- pipeline CTA after generation
- `src/components/MetricCard.tsx` -- transition-lift class
- `src/pages/Deals.tsx` -- card hover animation
- `src/pages/Companies.tsx` -- update stage data references

### Files to Create
- None -- all changes are to existing files and a new migration

---

## What NOT to Build Yet

- 2D/3D network graph -- looks impressive but zero users have asked for it. Build after we have 10 paying customers who need pattern-finding.
- Webhook/Zapier integration -- premature. No external users yet.
- RBAC enforcement in RLS -- the role table exists, but enforcing it now adds complexity without users to protect.
- Company comparison side-by-side -- nice-to-have, not on the critical path.

---

## Success Criteria After This Sprint

1. A new user signs up and sees a populated Dashboard with real metrics
2. The Kanban board has deals in every stage with tasks
3. Clicking "Research" on a screening result flows directly into AI chat
4. Generating a memo offers a one-click path to the pipeline
5. The sidebar badge and bell icon reflect real notification counts
6. Page navigation feels snappy (no re-fetching on every mount)
