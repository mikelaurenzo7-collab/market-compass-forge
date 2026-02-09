

# Founder-Mode Audit: Laurenzo's Private Intelligence

## Current State (Honest)

**155 companies, 144 funding rounds, 111 financials, 35 investors, 65 activity events.** 14 sectors, 11 stages. 15 pages, 4 edge functions, full auth, dark theme, keyboard shortcuts, command palette.

### What Works
- Full Screen -> Research -> Memo -> Pipeline workflow with navigation between pages
- AI Research chat (streaming, sector playbooks) and AI Investment Memo (structured tool-call output)
- Company Detail with funding history, financials, enrichment, private notes, team notes, decision trail, watchlists, print
- Kanban deal pipeline with drag-and-drop, tasks, CSV export
- Network graph (d3-force canvas), Company Comparison (up to 4), Integrations (webhook configs in DB)
- Analytics: deal flow, sector heatmap, valuation by stage, geographic distribution, ARR leaderboard
- Alerts system with custom rules, notifications, mark-read
- People/Investors with expandable portfolio rows
- Dynamic sidebar badges, onboarding card, command palette (Cmd+K), keyboard shortcuts
- Screening with 14 sector chips, 11 stage chips, ARR/valuation/employee/founded ranges, save/reset presets
- CSV export on Companies + Pipeline, Print on Company Detail, Markdown export on Memos

### What's Broken or Missing

1. **Companies page has stale filters** -- STAGES array is `["All", "Late Stage", "Growth", "Series B", "Series C", "Series D", "Public"]` but the database has 11 stages including Series A, E, F, G, H. Same issue with SECTORS missing Climate Tech, EdTech, E-Commerce.

2. **44 companies have zero financials.** 54 companies have zero funding rounds. These show as blank dashes across the product.

3. **Zero pipeline deals, zero pipeline tasks, zero team activity, zero watchlists, zero webhooks, zero user alerts, zero notifications.** Every user-generated table is empty. The Kanban board is blank. The Dashboard's "Recent Pipeline" shows nothing. The Settings "Team Activity" shows nothing.

4. **Stage distribution is skewed.** 45 Public, 37 Late Stage, but only 5 Series A and 6 Growth. A private market intelligence tool should weight toward private companies.

5. **No "Forgot Password" flow** on the auth page.

6. **No data freshness indicator.** Users don't know if data is from 2024 or yesterday. The dashboard says "Updated live" but nothing is live.

7. **No bulk actions.** Can't select multiple companies to add to pipeline, compare, or export at once.

8. **No saved screening views.** Filter presets save to localStorage only. Can't name or share them.

9. **Network Graph is limited to 100 companies** (hardcoded `.limit(100)`) and only shows companies with investor links (many companies have no investor_company rows).

10. **No loading/empty states for several components** -- the dashboard "Sectors" metric card is hardcoded to "15".

11. **Alerts page SECTOR_OPTIONS is stale** -- only 11 sectors, missing Climate Tech, EdTech, E-Commerce.

---

## What We Could Expand Into

### Near-Term (This Sprint)
- **Saved Views / Screening Presets in DB** -- replace localStorage with a `saved_screens` table so users can name, save, and recall filter combos
- **Bulk Pipeline Actions** -- multi-select checkboxes on Screening/Companies to "Add 5 to Pipeline" in one click
- **"Last Updated" timestamps** on data cards so users know data age
- **Watchlist Dashboard Widget** -- show watchlist companies with recent activity on the Dashboard

### Medium-Term (Next 2 Sprints)
- **Real-time collaborative notes** -- use Supabase Realtime on `shared_notes` so team members see updates live
- **PDF memo export** -- generate formatted PDFs from investment memos (browser print is already close)
- **Company scoring model** -- algorithmic ranking based on ARR growth, valuation multiples, sector momentum
- **Historical financials charting** -- plot revenue/ARR over time for companies with multiple periods
- **Deal pipeline analytics** -- conversion rates by stage, average time in stage, win/loss metrics

### Long-Term (After First Customers)
- **API access** -- let customers pull data programmatically
- **Custom data ingestion** -- let users upload their own company data / portfolio
- **Multi-tenant workspaces** -- team management with RBAC enforcement
- **Mobile-responsive layout** -- currently desktop-only

---

## The Plan: Ship-Ready Sprint

### 1. Sync All Filter Arrays Across Pages

The Companies page, Alerts page, and Screening page all have different sector/stage arrays. They should all reflect the actual database values.

**Files to modify:**
- `src/pages/Companies.tsx` -- Update STAGES and SECTORS arrays to include all 11 stages and 14 sectors
- `src/pages/Alerts.tsx` -- Update SECTOR_OPTIONS to include Climate Tech, EdTech, E-Commerce

### 2. Fill Remaining Data Gaps

44 companies still have no financials. 54 have no funding rounds. These gaps make the product feel incomplete on every page.

**Database migration:**
- INSERT estimated financials for 44 remaining companies (confidence_score: 'low', source: 'Estimates')
- INSERT at least 1 funding round for the 54 companies missing them (based on known stage and publicly available data)

### 3. Rebalance Stage Distribution

45 Public + 37 Late Stage = 82 out of 155 companies are public/late. A private market intel tool should have more private companies.

**Database migration:**
- Move ~20 "Public" companies to their actual last private stage (e.g., Stripe is not Public, it's Late Stage)
- Move ~10 "Late Stage" companies to more specific stages (Series D, Growth, etc.) based on their actual last round

### 4. Add "Forgot Password" to Auth

Currently no way to recover an account. This is a basic requirement.

**File to modify:**
- `src/pages/Auth.tsx` -- Add "Forgot password?" link that calls `supabase.auth.resetPasswordForEmail()`, plus a state to show "Check your email" confirmation

### 5. Add Bulk Select to Screening

Power users want to select multiple companies and add them all to pipeline at once.

**File to modify:**
- `src/pages/Screening.tsx` -- Add checkbox column, "X selected" counter, and "Add to Pipeline" bulk action button

### 6. Add "Data as of" Timestamp to Dashboard

Replace the misleading "Updated live" text with actual data freshness.

**File to modify:**
- `src/pages/Index.tsx` -- Query the most recent `activity_events.published_at` and display "Data as of [date]" instead of "Updated live"

### 7. Fix Dashboard Hardcoded "15" Sectors

The Sectors MetricCard shows "15" but the actual count is 14.

**File to modify:**
- `src/pages/Index.tsx` -- Query `SELECT count(DISTINCT sector) FROM companies` dynamically

### 8. Remove Network Graph 100-Company Limit

The Network Graph arbitrarily limits to 100 companies. With 155 companies this cuts out data.

**File to modify:**
- `src/pages/NetworkGraph.tsx` -- Remove `.limit(100)` on the companies query or increase to 200

### 9. Add Watchlist Widget to Dashboard

Watchlists exist but there's no visibility on the dashboard.

**File to modify:**
- `src/pages/Index.tsx` -- Add a "Watchlists" card next to RecentPipelineDeals that shows the user's watchlists with company counts

### 10. Add "Last Updated" Indicators on Financial Data

Users need to know how fresh the data is, especially since much of it is estimated.

**File to modify:**
- `src/components/DataProvenance.tsx` -- Already shows confidence/source; add a "Last updated" line showing the financials period
- `src/pages/CompanyDetail.tsx` -- Show "Data as of {period}" next to financial metrics

---

## Technical Details

### Filter Array Updates

Companies.tsx:
```
const STAGES = ["All", "Series A", "Series B", "Series C", "Series D", "Series E", "Series F", "Series G", "Series H", "Growth", "Late Stage", "Public"];
const SECTORS = ["All", "AI/ML", "Fintech", "Cybersecurity", "Enterprise SaaS", "Developer Tools", "Healthcare", "Defense Tech", "Consumer", "Infrastructure", "Logistics", "Crypto/Web3", "Climate Tech", "EdTech", "E-Commerce"];
```

Alerts.tsx:
```
const SECTOR_OPTIONS = ["AI/ML", "Fintech", "Cybersecurity", "Enterprise SaaS", "Developer Tools", "Healthcare", "Defense Tech", "Consumer", "Infrastructure", "Logistics", "Crypto/Web3", "Climate Tech", "EdTech", "E-Commerce"];
```

### Forgot Password (Auth.tsx)
Add a `forgotPassword` state. When active, show email input + "Send Reset Link" button that calls `supabase.auth.resetPasswordForEmail(email)`. Show success message on completion.

### Bulk Select (Screening.tsx)
- Add `selectedIds: Set<string>` state
- Add checkbox column in the table
- Add "Select All" in header
- Show floating action bar when selectedIds.size > 0: "{N} selected -- Add to Pipeline"
- Mutation does `Promise.all` of inserts

### Dashboard Data Freshness (Index.tsx)
Replace:
```
Updated <span className="font-mono text-primary">live</span>
```
With:
```
Data as of <span className="font-mono text-primary">{latestDate}</span>
```
Where `latestDate` comes from `SELECT MAX(published_at) FROM activity_events`.

### Dashboard Sectors Count
Replace hardcoded `"15"` with a query:
```sql
SELECT count(DISTINCT sector) FROM companies WHERE sector IS NOT NULL
```

### Network Graph Fix
Change `.limit(100)` to `.limit(500)` in `NetworkGraph.tsx` line 41.

### Stage Rebalancing Migration
Audit each company against its actual known status. Companies like Stripe, SpaceX, Databricks are not "Public" -- they should be "Late Stage" or their actual last round stage.

### Financial Gap Fill
For the remaining 44 companies, insert 1 row each into `financials` with estimated data marked `confidence_score: 'low'`.

### Funding Gap Fill
For the 54 companies with no funding rounds, insert 1 row each into `funding_rounds` based on their stage and known public data, marked `confidence_score: 'low'`.

---

## Files Summary

| File | Change |
|------|--------|
| `src/pages/Companies.tsx` | Update STAGES + SECTORS arrays |
| `src/pages/Alerts.tsx` | Update SECTOR_OPTIONS array |
| `src/pages/Auth.tsx` | Add forgot password flow |
| `src/pages/Screening.tsx` | Add bulk select + bulk pipeline action |
| `src/pages/Index.tsx` | Dynamic sectors count, data freshness timestamp, watchlist widget |
| `src/pages/NetworkGraph.tsx` | Remove 100-company limit |
| Database migration | Fill financials for 44 companies, funding for 54 companies, rebalance stages |

---

## What NOT to Build Yet
- Real-time collaborative editing (premature without multiple users)
- PDF generation (browser print works for now)
- API access (no external consumers)
- Mobile layout (desktop-first for institutional users)
- Company scoring algorithm (need user feedback on what metrics matter)

## Ship Criteria
1. Every company has at least 1 financial record and 1 funding round
2. All filter dropdowns match actual database values across every page
3. Users can recover their password
4. Users can bulk-select and add to pipeline
5. Dashboard shows real data freshness, not "live"
6. Network graph shows all companies, not just 100

