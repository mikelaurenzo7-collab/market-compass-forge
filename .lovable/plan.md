

# Grapevine Moat Analysis and Enhancement Plan

## Current Moats Assessment

After a deep exploration of the codebase, here is where Grapevine stands competitively and where we can build defensible advantages that Bloomberg and PitchBook cannot easily replicate.

### Existing Moats (Strong)
1. **Proprietary Scoring Engine** -- The `useCompanyScore` algorithm is a 6-factor weighted model (ARR scale, valuation vs. sector median, growth CAGR, sector momentum, operational efficiency, capital efficiency) with Rule of 40 and forward multiple analysis. This is institutional-grade and unique to us.
2. **SEC EDGAR Pipeline** -- Real-time public company data at zero cost, proxied through our backend. No competitor at our price point offers this.
3. **AI Research + Memo Generation** -- Streaming AI research with sector-specific playbooks (AI/ML, Fintech, SaaS, Cybersecurity) and one-click investment memo generation with PDF export. Sticky workflow.
4. **Cross-Asset Coverage** -- Private companies, public markets, distressed assets, off-market real estate, fund intelligence -- all in one platform. Bloomberg has public markets. PitchBook has private. Nobody has both + distressed + real estate at $399/mo.

### Existing Moats (Weak / Underutilized)
5. **Data Enrichment** -- Firecrawl auto-enrichment exists but is passive. Not proactive enough to build a data moat.
6. **Intelligence Feed** -- Perplexity-powered signals exist but are generic. No personalization or alerting tied to portfolio.
7. **Document Analyzer** -- Has demo fallback data. Real pipeline exists but is underutilized.

---

## New Moats to Build

### Moat 1: Relationship Graph ("Who Knows Who")

**Why this is a moat:** In private markets, deals happen through relationships. No existing tool maps the connections between investors, fund managers, company executives, and deal intermediaries. This is data that compounds over time and cannot be replicated overnight.

**What we build:**
- A `relationship_edges` table storing entity-to-entity connections (investor -> company, person -> fund, company -> company via shared investors)
- A force-directed network visualization using the existing d3-force dependency (already installed)
- "Shared investors" and "Common board members" sections on company detail pages
- A `/people` page upgrade that shows connection degrees ("2nd degree connection to your portfolio")

**Technical approach:**
- New table: `relationship_edges (id, source_type, source_id, target_type, target_id, relationship_type, confidence, source_url)`
- Populate from existing `investor_company`, `key_personnel`, and `fund_commitments` tables
- D3 force-directed graph component for visual exploration
- Edge function to auto-discover relationships when viewing a company

### Moat 2: Comp Builder with SEC-Powered Public Benchmarks

**Why this is a moat:** When valuing a private company, the most important thing is finding the right public comparables. We have SEC XBRL data for every US public company. We can auto-suggest public comps based on sector, size, and growth profile -- then pull their real financials into a side-by-side comp table.

**What we build:**
- Upgrade `CompTableBuilder` to auto-suggest public company comparables from our SEC data
- "Find Public Comps" button that matches a private company's sector, revenue range, and growth rate against public companies with real XBRL financials
- Side-by-side view: your private target vs. 5-8 public comps with real Revenue, EBITDA, margins, and multiples
- Export the comp table as a formatted PDF/CSV ready for an IC deck

**Technical approach:**
- New edge function `comp-analysis` upgrade: query SEC financial facts for matching public companies by sector + revenue range
- Frontend: add "Auto-Match Public Comps" to the existing comp builder
- Pull real EV/Revenue, EV/EBITDA from SEC XBRL for each suggested comp

### Moat 3: Deal Alerts Engine (Proactive Intelligence)

**Why this is a moat:** Instead of users checking the dashboard, Grapevine pushes actionable alerts when something changes -- a new SEC filing on a watchlisted company, a distressed asset matching their criteria, or a sector multiple shift. This creates daily engagement and habit-forming behavior.

**What we build:**
- Upgrade the existing `check-alerts` edge function to monitor SEC filings, distressed asset additions, and intelligence signals
- Smart alert rules: "Notify me when any company in my watchlist files a 10-K" or "Alert me to new distressed assets in Healthcare under $5M"
- Email digest integration using the existing Resend API key
- In-app notification center with unread badges (partially built, wire it up)

**Technical approach:**
- Expand `user_alerts` table to support `alert_type` enum: `sec_filing`, `distressed_new`, `signal_match`, `watchlist_change`, `price_move`
- Scheduled edge function runs daily, checks each user's alert rules against new data
- Resend email with formatted HTML digest

### Moat 4: Portfolio Benchmarking ("How Am I Doing?")

**Why this is a moat:** The `portfolios` and `portfolio_positions` tables exist but the Portfolio page is likely basic. For family offices and PE firms, the killer feature is: "How does my portfolio perform vs. sector benchmarks, vs. public market equivalents?"

**What we build:**
- Portfolio performance dashboard: total value, MOIC, IRR (estimated from entry price and current estimated value)
- Public Market Equivalent (PME) comparison: compare your private portfolio returns against S&P 500 or sector ETFs
- Sector concentration analysis with risk warnings
- Quarterly mark-to-market using sector multiples from our scoring engine

**Technical approach:**
- Enhance `Portfolio.tsx` with Recharts performance charts
- Use `useSectorMultiples` to estimate current fair value of private positions
- PME calculation: compare against a synthetic public market benchmark using SEC data

### Moat 5: Collaborative Due Diligence Workspace

**Why this is a moat:** Investment decisions are team-based. `SharedNotes` and `team_activity` tables exist but the collaboration story is thin. Building a "war room" for each deal in the pipeline -- where team members can assign tasks, share notes, flag risks, and vote on decisions -- creates massive switching costs.

**What we build:**
- Deal workspace view within the pipeline: notes timeline, task assignments, document attachments, and team voting
- "@mention" team members in notes (leveraging existing `team_invitations` table)
- Decision log: "IC voted 3-1 to proceed to DD" with timestamps
- Attach document analyses to specific pipeline deals

**Technical approach:**
- Enhance `Deals.tsx` with a deal detail panel showing all collaborative context
- Connect `pipeline_tasks`, `team_activity`, `user_notes`, and `company_documents` into a unified deal view
- Add a `deal_votes` table for IC decision tracking

---

## Implementation Priority

Ranked by defensibility and time-to-impact:

| Priority | Moat | Effort | Impact | Defensibility |
|----------|------|--------|--------|---------------|
| 1 | Comp Builder with SEC Public Benchmarks | Medium | Very High | High -- real data advantage |
| 2 | Deal Alerts Engine | Medium | High | High -- habit-forming |
| 3 | Relationship Graph | High | Very High | Very High -- compounds over time |
| 4 | Portfolio Benchmarking | Medium | High | Medium -- differentiator |
| 5 | Collaborative Due Diligence | Medium | Medium | Very High -- switching costs |

## Technical Details

### New Database Tables

```text
relationship_edges
------------------
id, source_type (company/investor/person/fund), source_id,
target_type, target_id, relationship_type (invested_in/board_member/
co_investor/acquired/partnership), confidence, source_url, created_at

deal_votes
----------
id, pipeline_deal_id, user_id, vote (proceed/pass/hold),
comment, created_at
```

### New/Modified Edge Functions

1. `comp-analysis` -- Upgrade to auto-match public comps from SEC data
2. `check-alerts` -- Expand to monitor SEC filings, distressed, and signals
3. `daily-briefing` -- Wire up Resend email with personalized digest

### Key Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/components/RelationshipGraph.tsx` | D3 force-directed network viz |
| Create | `src/components/PortfolioBenchmark.tsx` | PME and sector benchmark charts |
| Create | `src/components/DealWorkspace.tsx` | Collaborative deal detail panel |
| Modify | `src/pages/CompTableBuilder.tsx` | Add "Find Public Comps" from SEC |
| Modify | `src/pages/Deals.tsx` | Add deal workspace and voting |
| Modify | `src/pages/Portfolio.tsx` | Add performance and benchmarking |
| Modify | `src/pages/Alerts.tsx` | Add smart alert rule configuration |
| Modify | `src/components/CompanyScore.tsx` | Add public comp benchmarking |
| Migration | New tables | `relationship_edges`, `deal_votes` |

### Implementation Sequence

1. SEC-powered Comp Builder upgrade (highest ROI, fastest to ship)
2. Smart Alert Engine with SEC filing monitoring
3. Portfolio Benchmarking with PME
4. Relationship Graph (d3-force is already installed)
5. Collaborative Deal Workspace with voting

Each phase builds on existing infrastructure and makes the platform stickier. The SEC data integration from Phase 1 directly feeds into the Comp Builder and Alert Engine -- creating a flywheel where more data leads to better analysis, which drives more engagement.

