

# Co-Founder Sprint: Fix Fatal Flaws + Ship-Ready Polish

## What We're Fixing

Three fatal flaws are blocking us from being a shippable product. This plan fixes all three plus fills critical data gaps.

---

## Changes (in execution order)

### 1. Wire Orphaned Pages into Router + Sidebar

Three complete pages (Network Graph, Company Comparison, Integrations) exist as built code but are not accessible to users. We'll add them to the router and sidebar.

**Files to modify:**
- `src/App.tsx` -- Add 3 routes: `/network`, `/compare`, `/integrations`
- `src/components/AppSidebar.tsx` -- Add 3 sidebar links: Network, Compare, Integrations

### 2. Update Screening Filters for Real Data

The Screening page only has 6 stage options and 11 sectors, but our database has 11 stage values and 14 sectors. Missing: Series A, Series E, Series F, Series G, Series H, Climate Tech, EdTech, E-Commerce.

**File to modify:**
- `src/pages/Screening.tsx` -- Update SECTORS and STAGES arrays to match database reality

### 3. Seed Pipeline Demo Data

Insert via SQL migration:
- 10 `deal_pipeline` entries across all 6 stages, linked to real company IDs
- 15 `pipeline_tasks` across those deals (mix of todo/in_progress/done)
- 5 `team_activity` entries (stage changes, memo generations)

**Database migration** -- single SQL insert

### 4. Fill 65 Companies Missing Financials

65 of 155 companies have zero financial records. We'll insert estimated financials for each, clearly marked with `confidence_score: 'low'` and `source: 'Estimates'`.

**Database migration** -- batch INSERT into `financials`

### 5. Move Webhook Configs to Database

Currently stored in `localStorage` which means they vanish on logout and can't fire server-side. We'll:
- Create `webhook_configs` table with RLS (user_id, name, url, events, active)
- Update `src/pages/Integrations.tsx` to read/write from database instead of localStorage

**Database migration** -- CREATE TABLE + RLS policies
**File to modify:** `src/pages/Integrations.tsx` -- Replace localStorage with database queries

---

## Technical Details

### Router Changes (App.tsx)
Add imports for `NetworkGraph`, `CompanyComparison`, `Integrations` and add 3 Route elements inside the protected layout.

### Sidebar Changes (AppSidebar.tsx)
Add to the `modules` array:
- Network (Share2 icon, `/network`)
- Compare (ArrowLeftRight icon, `/compare`)

Add to bottom modules:
- Integrations (Zap icon, `/integrations`)

### Screening Filter Update
```
SECTORS: Add "Climate Tech", "EdTech", "E-Commerce"
STAGES: Add "Series A", "Series E", "Series F", "Series G", "Series H"
```

### Database: webhook_configs table
```
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL REFERENCES auth.users
name TEXT NOT NULL
url TEXT NOT NULL
events TEXT[] DEFAULT '{}'
active BOOLEAN DEFAULT true
created_at TIMESTAMPTZ DEFAULT now()
```
RLS: Users can CRUD only their own rows.

### Pipeline Seed Data
10 deals distributed: 2 sourced, 2 screening, 2 due_diligence, 2 ic_review, 1 committed, 1 passed. Companies chosen from well-known names (Stripe, OpenAI, Databricks, etc.) that are already in our database.

### Financial Gap Fill
Estimated revenue/ARR for the 65 companies based on publicly available employee counts and sector benchmarks. All marked `confidence_score: 'low'`, `source: 'Estimates'`.

---

## Files Summary

| File | Change |
|------|--------|
| `src/App.tsx` | Add 3 route imports + Route elements |
| `src/components/AppSidebar.tsx` | Add Network, Compare, Integrations to nav |
| `src/pages/Screening.tsx` | Update SECTORS and STAGES arrays |
| `src/pages/Integrations.tsx` | Replace localStorage with database queries |
| Database migration | Create webhook_configs table, seed pipeline data, fill financial gaps |

