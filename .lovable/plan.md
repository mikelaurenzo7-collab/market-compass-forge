

# The Private Markets Operating System Pivot

## Vision

Grapevine becomes **the system where capital gets deployed** -- not a terminal, not a CRM, not a data room. A capital lifecycle OS built around five verbs:

**Discover --> Diligence --> Coordinate --> Allocate --> Report**

Every feature maps to one of these verbs. The Deal Room is the atomic unit of the product.

---

## What Changes

### 1. Navigation: The Five Pillars

Replace current sidebar (Deals / Rooms / Portfolio / Intelligence) with the capital lifecycle spine:

```text
SIDEBAR
--------------------------
[GV] Grapevine

  Discover        /discover
  Deals           /deals
  Portfolio        /portfolio

  ─── utility ───
  Alerts           /alerts
  Settings         /settings
  Help             /help
  [Admin]          /admin
  Sign Out
```

**Why only 3 main items instead of 5?** Diligence, Coordinate, and Allocate all live *inside* the Deal Room (`/deals/:id`). They are not top-level pages -- they are tabs within a deal. This keeps the sidebar ultra-clean while the Deal Room itself embodies the full lifecycle.

- **Discover** = current Intelligence page, reimagined as "Surface rooms worth opening" -- the AI matcher, signal feed, and market intel all unified under one verb
- **Deals** = the pipeline (overview + flow + individual deal rooms with all lifecycle tabs)  
- **Portfolio** = the report phase -- performance vs. thesis, institutional memory

The "Rooms" concept merges into Deal Rooms. Every deal IS a room.

### 2. Deal Room: The Product's Center of Gravity

The existing `/deals/:id` DealRoom page gets upgraded from 6 tabs to a true lifecycle workspace. New tab structure:

| Tab | Verb | What It Does |
|-----|------|-------------|
| Summary | -- | High-signal overview with key metrics, thesis, and quick stats |
| Diligence | Diligence | Documents, AI extraction, risk flags, comparable analysis. Embeds the existing DataRoom CSV importer scoped to this deal |
| Valuation | Diligence | Embeds the existing Valuation toolkit (DCF, comps, football field) scoped to this deal |
| Discussion | Coordinate | Threaded comments (already working), IC notes |
| Timeline | Coordinate | Decision journal filtered to this deal (reuses existing Decisions component logic) |
| Allocation | Allocate | Capital stack: equity, debt, commitments, check size, ownership %. New lightweight form |
| Updates | Report | Memos, KPI updates, performance vs. original thesis |

### 3. Discover Page (replaces Intelligence)

Route: `/discover` (redirect `/intelligence` to `/discover`)

Transform the current Intelligence hub from a grid of "coming soon" cards into a live discovery engine:
- **AI Deal Matcher** embedded directly (currently at `/deals/recommended`)
- **Signal Feed** section showing latest alerts/notifications  
- **Buy Box Filters** for surfacing opportunities matching the firm's criteria
- Each discovered opportunity has a "Open Room" CTA that creates a deal and navigates to `/deals/:id`

### 4. Landing Page Reframe

Update copy from "AI-powered private market intelligence" to the OS positioning:
- Headline: "The system where capital gets deployed"
- Subline: "From signal to signed wire. One platform."
- Capabilities section maps to the 5 verbs instead of generic features
- Remove "AI terminal" language; replace with "operating system" language

### 5. Deals Overview Upgrade

The `/deals` page gets a new section: **Lifecycle Progress** -- a visual showing how many deals are in each verb stage (Discover/Diligence/Coordinate/Allocate), giving the GP/Partner a single-glance view of firm activity.

### 6. Portfolio as "Report" Phase

Add a "Thesis vs. Actuals" card to Portfolio positions that links back to the original Deal Room, showing:
- Original IC memo (if exists)
- Entry thesis / rationale from decision log
- Current performance metrics

### 7. Cleanup: Dead References and Orphaned Code

Files and references to fix:
- **`src/pages/Index.tsx`**: Currently the old dashboard with references to `/companies`, `/distressed`, etc. Replace with a redirect to `/deals` (the dashboard IS DealsOverview now)
- **`src/pages/Rooms.tsx`**: Delete -- rooms are now Deal Rooms
- **`src/pages/Intelligence.tsx`**: Delete -- replaced by Discover
- **`src/components/CommandPalette.tsx`**: Fix `navigate("/distressed")` to `/discover`
- **`src/pages/DealMatcher.tsx`**: Fix `navigate("/distressed")` and `navigate("/global")` to `/discover`
- **`src/pages/Portfolio.tsx`**: Fix `navigate("/companies")` to `/discover`
- **`src/pages/Decisions.tsx`**: Fix `navigate("/companies/...")` to `/deals/...`
- **`src/components/CompanyTable.tsx`**: Fix `navigate("/companies")` to `/discover`
- **`src/pages/Landing.tsx`**: Fix `navigate("/data-coverage")` to `/discover`, update all copy
- **`src/hooks/useHotkeys.ts`**: Update SIDEBAR_ROUTES to match new nav
- **`src/components/QuickActions.tsx`**: Update actions to new routes

### 8. Route Map (Final)

```text
AUTHENTICATED ROUTES
  /deals                    DealsOverview (home after auth)
  /deals/flow               DealFlow (Kanban pipeline)  
  /deals/recommended        DealMatcher (AI matching)
  /deals/:id                DealRoom (lifecycle workspace)
  /discover                 Discover (signals + matcher + intel)
  /portfolio                Portfolio (reporting + tracking)
  /alerts                   Alerts
  /settings                 Settings
  /help                     Help
  /admin                    AdminDashboard

LEGACY TOOLS (accessible, not in nav)
  /valuations               Valuations (standalone)
  /decisions                Decisions (standalone journal)
  /data-room                DataRoom (standalone importer)

REDIRECTS
  /dashboard --> /deals
  /intelligence --> /discover
  /rooms --> /deals
  /companies/* --> /discover
  /distressed --> /discover
  /global --> /discover
  /research --> /discover
  /fund-intelligence --> /discover
  /real-estate --> /discover
  /sector-pulse --> /discover
  ... (all other legacy paths)
```

---

## Technical Implementation Order

### Step 1: Sidebar + Routes + Cleanup
- Rewrite `AppSidebar.tsx` with 3 main nav items (Discover, Deals, Portfolio)
- Update `App.tsx` routes: add `/discover`, redirect `/intelligence` and `/rooms`
- Delete `src/pages/Rooms.tsx` and `src/pages/Intelligence.tsx`
- Fix all stale `navigate()` calls across the codebase
- Update `useHotkeys.ts` and `QuickActions.tsx`
- Route `/dashboard` and old Index to `/deals`

### Step 2: Discover Page
- Create `src/pages/Discover.tsx` -- unified signal + matcher + buy-box hub
- Embed the AI Deal Matcher as the hero action
- Add a "Recent Signals" feed from `alert_notifications`
- Each result card has "Open Room" CTA

### Step 3: Deal Room Lifecycle Upgrade
- Add Diligence tab (embed deal-scoped file upload + AI extraction placeholder)
- Add Valuation tab (embed existing `ValuationFootballField` + `DCFCalculator` + `CompTableBuilder`)
- Upgrade Allocation tab from placeholder to a lightweight capital stack form (equity amount, debt source, ownership %, commitment date) -- stored in a new `deal_allocations` table
- Upgrade Updates tab to show decision log entries for this deal + memo attachment placeholder
- Improve Summary tab with a "Thesis" editable field

### Step 4: Database Migration
- Create `deal_allocations` table: `id, deal_id, allocation_type (equity/debt/mezzanine), amount, source_name, ownership_pct, commitment_date, notes, created_at, user_id`
- Add `thesis` column to `deal_pipeline` table for storing the investment thesis
- RLS policies scoped to authenticated users

### Step 5: Landing Page Reframe
- Update headline, subline, and capabilities to reflect the OS positioning
- Map capabilities to the 5 verbs (Discover, Diligence, Coordinate, Allocate, Report)
- Remove "terminal" and "command center" language

### Step 6: Portfolio "Report" Enhancement
- Add "Thesis vs. Actuals" linking back to Deal Room
- Show original entry rationale from `decision_log`

