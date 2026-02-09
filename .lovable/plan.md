

# Full Audit: Laurenzo's Private Intelligence Platform

## Status vs. Vision Scorecard

| Module | Status | Gap |
|--------|--------|-----|
| **Auth & Login** | DONE | Working email/password auth with protected routes |
| **Database Schema** | DONE | 12 tables, RLS on all, 50 companies, 64 rounds, 25 financials, 20 investors, 15 sectors |
| **Dashboard (Index)** | DONE | Real data: metrics, charts, activity feed, company table |
| **Company List** | DONE | Sortable, filterable, CSV export, keyboard nav |
| **Company Detail** | DONE | Funding, financials, notes, shared notes, confidence badges, data provenance |
| **Deal Pipeline** | DONE | Kanban with drag-drop, CSV export |
| **Cmd+K Search** | DONE | Companies + investors + navigation shortcuts |
| **AI Research** | DONE | Streaming chat on company detail via Lovable AI |
| **Investment Memo** | DONE | AI-generated structured memos with export |
| **Alerts** | DONE | Rule creation, notifications, toggle/delete |
| **Enrichment** | DONE | Firecrawl scraping, enrichment panel on company detail |
| **Confidence Badges** | DONE | Color-coded badges on funding + financials |
| **Exports** | DONE | CSV for companies/pipeline, print for company detail |
| **Shared Notes** | DONE | Team collaboration on company pages |
| **RBAC** | DONE | user_roles table with analyst/associate/partner/admin |
| **Keyboard Shortcuts** | DONE | Cmd+K, Cmd+/, arrow nav, focus indicators |
| **Settings** | DONE | Profile editing, role display, team activity log |
| **Analytics page** | PLACEHOLDER | Just says "coming soon" |
| **Screening page** | PLACEHOLDER | Just says "coming soon" |
| **Research page** | PLACEHOLDER | Just says "coming soon" |
| **People page** | PLACEHOLDER | Just says "coming soon" |
| **investor_company** | EMPTY | Table exists but 0 rows, not used in UI |
| **Watchlists** | NOT BUILT | Table exists (user_watchlists) but no UI |

## Critical Gaps to Fix

### 1. Four empty placeholder pages (Analytics, Screening, Research, People)
These are visible in the sidebar and lead to dead-end "coming soon" messages. For a production-grade platform, every nav link must deliver value.

### 2. No watchlist UI
The `user_watchlists` table exists but there is no way to create or view watchlists.

### 3. investor_company table is unused
No investor-to-company mapping data, and no UI showing which investors backed which companies.

### 4. Research page is standalone but AI research only lives on company detail
The `/research` sidebar link goes to a placeholder. It should be a standalone research hub.

---

## Implementation Plan

### Step A: Analytics Page (replace placeholder)
Build a real analytics dashboard with:
- **Deal flow trends** chart (already have the data hook `useDealFlowData`)
- **Sector breakdown** bar chart (already have `useSectorData`)
- **Valuation distribution** by stage (query funding_rounds grouped by round_type)
- **Geographic distribution** (query companies grouped by hq_country)
- **Top companies by ARR** leaderboard
- Reuse existing recharts components and add new chart types

### Step B: Screening Page (replace placeholder)
Build an advanced multi-filter search tool:
- Filters: sector, stage, geography, founded year range, employee count range, valuation range, ARR range
- Results table with inline metrics
- "Add to Pipeline" and "Add to Watchlist" quick actions on each result
- Save filter presets (store in localStorage for now)

### Step C: People / Investor Directory (replace placeholder)
Build using the existing `investors` table (20 records):
- Searchable, sortable table of investors
- Columns: name, type, AUM, HQ country, website
- Click to expand showing portfolio companies (will seed `investor_company` data)
- Link investors to companies via `investor_company` table

### Step D: Research Hub (replace placeholder)
Build a standalone AI research workspace:
- Company selector dropdown to pick a company for research
- Embedded AI chat (reuse `AIResearchChat` component)
- Quick-generate memo button (reuse `InvestmentMemo` component)
- Recent research sessions list (could store in localStorage)

### Step E: Watchlist UI
- Add "Add to Watchlist" button on company detail and company list
- Watchlist management panel on the dashboard sidebar or as a dropdown
- View watchlists on Settings or a dedicated sub-section

### Step F: Seed investor_company data
- Migration to insert mappings between the 20 investors and 50 companies based on the funding_rounds lead_investors data
- Display investor portfolio on People page and investors on Company Detail

---

## Technical Details

### Analytics Page
- New queries in `useData.ts`:
  - `useValuationByStage`: SELECT round_type, array of valuation_post from funding_rounds
  - `useGeographicDistribution`: SELECT hq_country, COUNT(*) from companies GROUP BY hq_country
  - `useTopCompaniesByARR`: SELECT companies + financials ordered by ARR desc limit 10
- Charts: recharts BarChart, PieChart (new), existing AreaChart

### Screening Page
- Single query with dynamic filters applied via Supabase query builder
- Reuse `useCompaniesWithFinancials` pattern but with dynamic filter params
- Filter state managed with useState, results update reactively

### People Page
- New hook `useInvestors` querying `investors` table
- New hook `useInvestorPortfolio(investorId)` querying `investor_company` joined with `companies`
- Expandable row or detail panel pattern

### Research Hub
- Wraps existing `AIResearchChat` and `InvestmentMemo` components
- Company selector uses `useSearchCompanies` hook
- No new edge functions needed

### Watchlist UI
- New hooks for CRUD on `user_watchlists` table
- Dialog/modal for creating watchlists and adding companies
- Watchlist indicator on company cards

### Data Seeding
- SQL migration to populate `investor_company` by matching `funding_rounds.lead_investors` text array to `investors.name`

### Files to create/modify:
- `src/pages/Analytics.tsx` (rewrite from placeholder)
- `src/pages/Screening.tsx` (rewrite from placeholder)
- `src/pages/People.tsx` (rewrite from placeholder)
- `src/pages/Research.tsx` (rewrite from placeholder)
- `src/hooks/useData.ts` (add new query hooks)
- `src/pages/CompanyDetail.tsx` (add watchlist button)
- `src/pages/Companies.tsx` (add watchlist action)
- New migration for `investor_company` seed data

