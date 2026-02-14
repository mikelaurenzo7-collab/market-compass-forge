

# Grapevine: Co-Founder Audit & Strategic Roadmap

## Part 1: Revert Landing Page to "Coming Soon"

Replace the current feature-rich landing page with a polished "Coming Soon" page that collects waitlist signups via the existing `waitlist_signups` table and `EarlyAccessModal` component. The page will feature the GV brand, a countdown/launch teaser, social proof stats, and a waitlist form -- no product details exposed.

---

## Part 2: Full Platform Audit

### What's Working Well
- **Data depth is real**: 7,844 companies, 734 funding rounds, 991 financial records, 354 distressed assets, 263 off-market CRE listings, 179 global opportunities, 87 CRE transactions, 65 funds -- this is serious data infrastructure
- **Sidebar reorganization** is clean: 5 groups, tight navigation, glow separators
- **AI moats** (Morning Briefing, Deal Matcher, Investment Memo) are differentiated
- **Realtime infrastructure**: channels on deals, distressed assets, global opportunities, alerts, intelligence signals
- **Security**: RLS policies on sensitive tables, JWT auth on edge functions
- **Export everywhere**: CSV export on Companies, Deals, Distressed, Real Estate, Global, Funds

### Critical Gaps Identified

**1. Data Quality Issues**
- 5,832 companies labeled "Services" sector -- over 74% of the database is poorly categorized
- Financial records exist for only 991/7,844 companies (12.6%)
- Funding rounds exist for 734 companies -- meaning most companies have zero investment history
- No data validation: companies with $0 valuation and $0 revenue still appear in rankings

**2. Missing Conversion Infrastructure**
- No pricing page or checkout flow despite "$399/mo Professional" in Settings
- No Stripe integration for payments
- No free trial gating -- everything is accessible post-signup
- No usage limit enforcement despite `usage_tracking` and `UsageMeters` components existing

**3. UX Friction Points**
- Dashboard loads 8+ parallel queries on mount -- can feel slow on first load
- No loading states between page transitions (only skeleton loaders within pages)
- CompanyDetail page is 840 lines -- tabs don't lazy-load, everything renders
- Intelligence Feed calls edge function with anon key instead of user session token (security issue)
- Public Markets requires manual "Import from SEC" button click -- should auto-seed

**4. Feature Completeness Gaps**
- Relationship Graph component exists but isn't accessible from any page
- Portfolio Benchmarking exists but has no route
- No email notifications -- alerts exist but only show in-app
- Document Analyzer is hidden as a tab in Research -- low discoverability
- No mobile optimization on Deals kanban (cards exist but layout is basic)

**5. Competitive Intel Gap**
- The "Competitive" tab was added to Intelligence Feed but no competitive-specific data model or AI prompt backs it -- it just filters the same signals table

---

## Part 3: The Perfect Plan Forward

### Phase 1: Foundation Fixes (this implementation)

All items below will be implemented in a single pass:

**1. Coming Soon Landing Page**
- Replace `Landing.tsx` with a premium "coming soon" page
- Full-screen hero with GV branding, animated gradient background
- Waitlist form (name, email, firm, interest) writing to `waitlist_signups`
- Stats strip showing platform data (7,800+ companies, 350+ distressed assets, etc.)
- "Sign In" link for existing beta users to access `/auth`

**2. Fix Intelligence Feed Security**
- Change `fetch-intelligence` calls from anon key to user session token
- Consistent with how `morning-briefing` and `deal-matcher` already work

**3. CompanyDetail Performance**
- Lazy-load tab content (financials, valuation, research, memo, filings)
- Only render the active tab's heavy components
- Reduces initial render from ~840 lines of mounted components to ~200

**4. Data Quality Guardrails**
- Filter out companies with zero financials AND zero funding rounds from scoring algorithms
- Add "Data Coverage" indicator on Companies page showing what % has financials
- Suppress $0 valuations from appearing in metric cards and charts

**5. Dashboard Performance**
- Wrap each widget section in `Suspense` with dedicated skeleton
- Stagger widget loading to prevent all 8 queries from firing simultaneously
- Add error boundaries per widget so one failure doesn't break the dashboard

**6. Relationship Graph Access**
- Add as a tab in CompanyDetail ("Network" tab) showing the D3 force graph for that company's connections
- This surfaces a key moat feature that currently has zero discoverability

**7. Portfolio Benchmarking Access**
- Add as a tab in Fund Intelligence page
- LP/GP benchmarking data is already in the database via `funds` table (MOIC, TVPI, DPI, IRR)

**8. Mobile Polish**
- Make Deal kanban horizontally scrollable with snap points
- Add swipe-to-change-stage on mobile deal cards
- Collapsible sidebar that slides in from left on mobile (already partially implemented -- polish the animation)

**9. Auto-seed Public Markets**
- Remove the manual "Import from SEC" button requirement
- Auto-trigger seed on first visit if company count for public companies is 0
- Show progress indicator during import

**10. Competitive Intelligence Data Model**
- Add distinct handling in the "Competitive" tab of Intelligence Feed
- When the tab is selected, the refresh function passes `category: "competitive"` to the edge function
- Update `fetch-intelligence` edge function to generate competitive-specific signals (market share shifts, executive moves, product launches)

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Landing.tsx` | Complete rewrite to "Coming Soon" waitlist page |
| `src/pages/IntelligenceFeed.tsx` | Fix anon key -> session token auth; competitive tab logic |
| `src/pages/CompanyDetail.tsx` | Lazy-load tab content via React.lazy + Suspense |
| `src/pages/Index.tsx` | Add Suspense boundaries + staggered loading per widget |
| `src/pages/Companies.tsx` | Add data coverage indicator, filter zero-data companies from scoring |
| `src/pages/PublicMarkets.tsx` | Auto-trigger seed on first visit |
| `src/pages/FundIntelligence.tsx` | Add Portfolio Benchmarking tab using existing PortfolioBenchmark component |
| `src/components/AppLayout.tsx` | Polish mobile sidebar animation |
| `supabase/functions/fetch-intelligence/index.ts` | Add competitive-specific signal generation |
| `.lovable/plan.md` | Update with completed audit and roadmap |

### Files to Create
None -- all changes enhance existing files.

### Database Changes
None required -- all data models already exist.

### Edge Function Changes
- `fetch-intelligence`: Add competitive category handling with tailored AI prompt for competitive signals

### Estimated Scope
- 10 files modified
- 0 new files
- 0 database migrations
- 1 edge function updated

