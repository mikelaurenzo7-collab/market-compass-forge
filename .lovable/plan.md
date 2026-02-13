

# Grapevine Product Perfection Plan

## Where We Are Today

Grapevine has a strong foundation: landing page, auth, dashboard, company profiles with scoring, valuation tools (DCF/LBO/comps/football field), deal pipeline, fund intelligence (LP/GP directory), distressed assets, off-market real estate, AI research chat, document analyzer, intelligence feed, watchlists, alerts, and team collaboration. The architecture has materialized views, full-text search, and server-side compute. All data is currently synthetic/seeded.

## What This Plan Delivers

A phased set of improvements aligned to the GTM strategy, prioritizing features that make the product **demo-ready and investor-ready** without waiting for paid data APIs. The SEC EDGAR integration gives us **real, free financial data** for public companies immediately.

---

## Phase 1: SEC EDGAR Integration (Free Real Data)

The SEC EDGAR API is completely free, requires no API key, and provides real-time filings data for all publicly traded companies. This is the single highest-impact integration we can do at zero cost.

**What we build:**
- A new `fetch-sec-filings` backend function that pulls company filings, financials (revenue, net income, total assets, EPS), and insider transactions from `data.sec.gov`
- A CIK (Central Index Key) lookup system to map our company names to SEC identifiers
- A new "SEC Filings" tab on company detail pages showing 10-K, 10-Q, 8-K filings with direct links
- Auto-population of financial data (revenue, EBITDA, margins) from XBRL-tagged filings for any public company in our database
- A "Public Market Data" enrichment that runs when viewing a public company (similar to the existing Firecrawl auto-enrich pattern)

**Data available for free:**
- Full filing history (10-K, 10-Q, 8-K, S-1, etc.)
- Extracted financial facts via XBRL (Revenue, NetIncome, Assets, EPS, etc.)
- Company metadata (SIC codes, addresses, officer/director names)
- Recent filings feed (real-time as filed)

**Technical approach:**
- New database table `sec_filings` to cache filing metadata
- New database table `sec_financial_facts` to store extracted XBRL data points
- Backend function calls `data.sec.gov/submissions/CIK{cik}.json` and `data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json`
- Required: Add a `cik_number` column to the `companies` table for SEC cross-referencing
- Proxy through backend function since SEC does not support CORS

## Phase 1b: Public Markets Discovery (DONE)

Separate `/public-markets` page with SEC-powered discovery for all US public companies.

**What we built:**
- Edge function `seed-public-companies` that imports all ~10,000+ US public companies from SEC's `company_tickers.json`
- Public Markets discovery page with search, sector filter, sortable table (name, ticker, market cap, price, P/E, change)
- Market data integration via `public_market_data` table for ticker/exchange mapping
- Sidebar navigation with "Public Markets" entry under Platform
- Full company detail pages work for public companies (with SEC Filings tab)

## Phase 2: Product Polish for Beta Readiness

These improvements make the platform feel professional and complete for beta users.

**2a. Data Freshness and Transparency**
- Show "Last updated" timestamps on all data cards
- Add clear "Sample Data" badges on synthetic data (already partially built) and "SEC Filing" / "Verified" badges on real data
- Settings page option to toggle sample data visibility

**2b. Dashboard Refinements**
- Remove the "Real Data in Use" stats widget (internal metric, not user-facing value)
- Add a "Recent Filings" widget showing latest SEC filings across tracked companies
- Add a "Market Pulse" widget showing key macro indicators

**2c. Company Detail Upgrades**
- New "Filings" tab showing SEC filing history with links to full documents (DONE)
- Financial charts auto-populated from SEC XBRL data for public companies (DONE)
- Key personnel section enriched with SEC officer/director data
- Insider trading activity section from SEC filings

**2d. Landing Page Improvements**
- Replace placeholder testimonials with more credible copy or remove them until real ones exist
- Add a "Data Sources" section showing SEC, Firecrawl, and Perplexity logos/badges
- Add an interactive demo preview (screenshot or animated GIF of the dashboard)

## Phase 3: Core UX Improvements

**3a. Onboarding Flow**
- Guided tour highlighting key features (valuations, AI research, deal pipeline)
- Prompt users to add their first watchlist and pipeline deal
- Sector preference selection to personalize the dashboard

**3b. Performance and Reliability**
- Add error boundaries around all dashboard widgets so one failure doesn't crash the page
- Implement optimistic updates for pipeline stage changes and note creation
- Add skeleton loading states to any pages still missing them

**3c. Export and Reporting**
- One-click PDF export of company profiles (already have print support -- upgrade to styled PDF)
- Batch export of watchlist companies to CSV with financial data
- Investment memo export as formatted PDF

## Phase 4: Monetization Readiness

**4a. Stripe Payment Integration**
- Stripe is already connected (secret key present). Wire up subscription checkout for the $399/mo Professional plan
- Add a billing page in Settings showing current plan, usage, and payment method
- Implement usage gates: cap AI queries and memo generations for free-tier users
- Trial period support (e.g., 14-day free trial with full access)

**4b. Usage Tracking Enforcement**
- The `useUsageTracking` hook exists but needs enforcement gates on AI Research, Memo Generation, and Document Analysis
- Show usage meters prominently with upgrade prompts when approaching limits

---

## Technical Details

### New Database Tables

```text
sec_filings
-----------
id, company_id, cik_number, accession_number, filing_type,
filing_date, description, primary_document_url, created_at

sec_financial_facts
-------------------
id, company_id, cik_number, taxonomy, concept, period_start,
period_end, value, unit, form_type, filed_date, created_at
```

### New Backend Functions

1. `fetch-sec-filings` -- Fetches and caches SEC filing data for a given CIK
2. `fetch-sec-financials` -- Extracts XBRL financial facts and stores them

### Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `supabase/functions/fetch-sec-filings/index.ts` | SEC EDGAR API proxy |
| Create | `src/hooks/useSECFilings.ts` | React hooks for SEC data |
| Create | `src/components/SECFilingsTab.tsx` | Filings list UI component |
| Create | `src/components/SECFinancials.tsx` | XBRL financial data display |
| Modify | `src/pages/CompanyDetail.tsx` | Add Filings tab, wire SEC data |
| Modify | `src/pages/Index.tsx` | Remove internal stats, add filings widget |
| Modify | `src/pages/Landing.tsx` | Polish copy, add data sources section |
| Modify | `src/components/FinancialsChart.tsx` | Overlay SEC data when available |
| Migration | New tables + `cik_number` column | Database schema |

### SEC EDGAR API Details

- Base URL: `https://data.sec.gov`
- No authentication required
- Required header: `User-Agent: Grapevine contact@grapevine.io`
- Rate limit: 10 requests/second (we'll respect this server-side)
- Key endpoints:
  - `/submissions/CIK{cik}.json` -- Company filings list
  - `/api/xbrl/companyfacts/CIK{cik}.json` -- All financial facts
  - `/api/xbrl/companyconcept/CIK{cik}/us-gaap/{concept}.json` -- Specific metric

### Implementation Order

1. Database migration (new tables + cik_number column)
2. `fetch-sec-filings` backend function
3. SEC UI components and CompanyDetail integration
4. Dashboard widget updates
5. Landing page polish
6. Stripe checkout wiring
7. Usage enforcement gates

