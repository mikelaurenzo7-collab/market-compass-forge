

# Valuation Engine & Data Sources Overhaul

## The Problem Right Now

After auditing the entire data layer, here is the brutal truth:

| Data Point | Status | Impact |
|---|---|---|
| Public company market data (price, market cap, PE) | 7,000 companies seeded but **all prices/market_cap = NULL** | Football field, comp builder, and scoring engine all produce garbage for public comps |
| SEC financial facts (Revenue, EBITDA, EPS) | **0 rows** -- never fetched for any company | Public company valuations have no real financial data behind them |
| Sector multiples (mv_sector_multiples) | 74 rows but **almost all zeros** -- no real EV/Revenue or EV/EBITDA data | Scoring engine falls back to hardcoded heuristics instead of real benchmarks |
| Precedent transaction multiples | 57 rows with data | Working, but disconnected from the valuation engine |

The valuation engine is architecturally excellent (DCF, LBO, comps, football field, 6-factor scoring) but it is running on empty. Without real market prices, real SEC financials, and real sector multiples, every valuation output is synthetic.

---

## The Strategy: Maximum Data, Minimum Cost

### Tier 1: Completely Free (SEC EDGAR -- already built, never activated)

We already have the `fetch-sec-filings` edge function that pulls XBRL financial facts from SEC EDGAR. It has never been run at scale. SEC EDGAR is:
- 100% free, no API key needed
- Covers every US public company (10-K, 10-Q filings)
- Provides Revenue, Net Income, EPS, Assets, Equity, Cash, Debt, Gross Profit, Operating Income
- Updated within hours of filings

**Action**: Create a bulk SEC ingestion function that fetches XBRL data for our top 500 public companies (by market cap), populating `sec_financial_facts` with real Revenue, EBITDA, margins, and growth rates.

### Tier 2: Free Tier API -- Financial Modeling Prep (FMP)

FMP offers a free tier: 250 calls/day, covering:
- Real-time stock quotes (price, market cap, PE ratio, EPS, volume)
- Income statements, balance sheets, cash flow statements
- Company profiles with sector, industry, exchange
- Key metrics and financial ratios

250 calls/day is enough to refresh our top 250 companies daily and rotate through the full 7,000 over ~28 days.

**Action**: Create a `fetch-market-data` edge function that calls FMP's free API to populate `public_market_data` with real prices, market caps, and ratios. Store the FMP API key as a secret.

### Tier 3: Paid API (if you want instant full coverage)

If you want all 7,000 companies refreshed daily with real-time prices + full financial statements, FMP Starter is $14/month (300 calls/minute, 5 years of data). This is the best bang-for-buck in the industry.

---

## What We Build

### 1. Bulk SEC Financial Ingestion Function

A new edge function `bulk-sec-ingest` that:
- Queries our 7,000 public companies with CIK numbers
- Fetches XBRL companyfacts for the top 500 (by name recognition / existing market data)
- Extracts Revenue, Net Income, EBITDA (computed as Operating Income + D&A), Gross Profit, EPS, Total Assets, Cash, Debt
- Upserts into `sec_financial_facts`
- Runs in batches of 10 (SEC rate limit: 10 req/sec)
- Can be triggered manually or scheduled daily

### 2. FMP Market Data Pipeline

A new edge function `fetch-market-data` that:
- Calls FMP's `/api/v3/quote/{symbol}` for batches of tickers (FMP supports comma-separated, up to 50 per call)
- Populates `public_market_data` with: price, market_cap, pe_ratio, eps, price_change_pct, 52-week high/low, volume, beta, dividend_yield
- Calls FMP's `/api/v3/income-statement/{symbol}` for key fundamentals
- Computes EV/Revenue and EV/EBITDA from real data
- Updates the `financials` table for public companies so the scoring engine can use them

### 3. Real Sector Multiples Computation

The `mv_sector_multiples` materialized view currently returns zeros because there is no financial data to compute from. Once we have real SEC + FMP data:
- Rewrite the materialized view SQL to compute P25/Median/P75 of EV/Revenue and EV/EBITDA from actual `sec_financial_facts` + `public_market_data`
- Group by the `sector` column on `companies`
- Include deal count from `deal_transactions` and funding count from `funding_rounds`
- Refresh the view after each data ingestion

### 4. Valuation Engine Enhancements

With real data flowing, upgrade the engine:
- **Auto-populate DCF assumptions** from SEC filings (real revenue growth rate, real EBITDA margin, real capex as % of revenue)
- **Football Field auto-compute** using real sector P25/P50/P75 multiples instead of fallback defaults
- **Public comp matching** in CompTableBuilder: when a user adds a private company, auto-suggest 5-8 public comps by sector + revenue range, pre-populated with real SEC financials
- **Scoring engine upgrade**: feed real sector medians into the valuation score, growth score, and sector momentum calculations

### 5. Data Freshness Dashboard

Add a "Data Sources" panel to the Settings page showing:
- Last SEC ingestion timestamp and count
- Last FMP market data refresh and count
- Sector multiples freshness
- A "Refresh Now" button for each pipeline

---

## Technical Details

### New Edge Functions

| Function | Purpose | Data Source | Cost |
|---|---|---|---|
| `bulk-sec-ingest` | Fetch XBRL financials for top 500 public companies | SEC EDGAR | Free |
| `fetch-market-data` | Fetch real-time quotes + fundamentals | FMP API | Free (250/day) or $14/mo |

### Database Changes

1. **New materialized view** `mv_sector_multiples` -- rewrite to compute from real `sec_financial_facts` + `public_market_data` joined on `companies`
2. **Add columns** to `public_market_data`: `ev_revenue`, `ev_ebitda`, `revenue`, `ebitda`, `enterprise_value` (computed fields from FMP data)
3. **Add `last_sec_fetch` and `last_market_fetch` timestamps** to companies table for staleness tracking

### Files to Create

| File | Purpose |
|---|---|
| `supabase/functions/bulk-sec-ingest/index.ts` | Batch XBRL ingestion for top public companies |
| `supabase/functions/fetch-market-data/index.ts` | FMP API integration for real-time quotes |
| `src/components/DataSourcesPanel.tsx` | Settings panel showing data pipeline status |

### Files to Modify

| File | Change |
|---|---|
| `src/hooks/useSectorMultiples.ts` | Handle new real data from refreshed materialized view |
| `src/components/ValuationFootballField.tsx` | Use real sector multiples when available, show data source badge |
| `src/components/DCFCalculator.tsx` | Auto-populate from SEC XBRL data when viewing public companies |
| `src/pages/CompTableBuilder.tsx` | "Find Public Comps" uses real SEC revenue/EBITDA for matching |
| `src/hooks/useCompanyScore.ts` | Enhance with real sector benchmarks from refreshed mv |
| `src/pages/PublicMarkets.tsx` | Show real prices, add "Refresh Market Data" button |
| `src/pages/Settings.tsx` | Add Data Sources panel |
| `supabase/functions/compute-scores/index.ts` | Feed real sector multiples into batch scoring |

### Materialized View Rewrite (SQL)

```text
DROP MATERIALIZED VIEW IF EXISTS mv_sector_multiples;

CREATE MATERIALIZED VIEW mv_sector_multiples AS
WITH company_fundamentals AS (
  SELECT
    c.sector,
    pmd.market_cap,
    -- Compute EV = Market Cap + Debt - Cash (from SEC data)
    COALESCE(pmd.market_cap, 0) AS ev_proxy,
    -- Get latest annual revenue from sec_financial_facts
    rev.value AS revenue,
    ebitda.value AS ebitda
  FROM companies c
  JOIN public_market_data pmd ON pmd.company_id = c.id
  LEFT JOIN LATERAL (
    SELECT value FROM sec_financial_facts
    WHERE company_id = c.id AND concept IN ('Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax')
    AND form_type = '10-K' ORDER BY period_end DESC LIMIT 1
  ) rev ON true
  LEFT JOIN LATERAL (
    SELECT value FROM sec_financial_facts
    WHERE company_id = c.id AND concept = 'OperatingIncomeLoss'
    AND form_type = '10-K' ORDER BY period_end DESC LIMIT 1
  ) ebitda ON true
  WHERE c.market_type = 'public' AND pmd.market_cap > 0
),
sector_stats AS (
  SELECT
    sector,
    -- EV/Revenue distribution
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ev_proxy / NULLIF(revenue, 0)) AS ev_rev_p25,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ev_proxy / NULLIF(revenue, 0)) AS ev_rev_median,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ev_proxy / NULLIF(revenue, 0)) AS ev_rev_p75,
    AVG(ev_proxy / NULLIF(revenue, 0)) AS ev_rev_mean,
    COUNT(*) FILTER (WHERE revenue > 0) AS ev_rev_count,
    -- EV/EBITDA distribution
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ev_proxy / NULLIF(ebitda, 0)) AS ev_ebitda_p25,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ev_proxy / NULLIF(ebitda, 0)) AS ev_ebitda_median,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ev_proxy / NULLIF(ebitda, 0)) AS ev_ebitda_p75,
    AVG(ev_proxy / NULLIF(ebitda, 0)) AS ev_ebitda_mean,
    COUNT(*) FILTER (WHERE ebitda > 0) AS ev_ebitda_count
  FROM company_fundamentals
  WHERE sector IS NOT NULL
  GROUP BY sector
)
SELECT
  ss.*,
  COALESCE(dc.deal_count, 0) AS deal_count_12m,
  COALESCE(fc.funding_count, 0) AS funding_count_12m
FROM sector_stats ss
LEFT JOIN (
  SELECT target_industry AS sector, COUNT(*) AS deal_count
  FROM deal_transactions WHERE announced_date > CURRENT_DATE - INTERVAL '12 months'
  GROUP BY target_industry
) dc ON dc.sector = ss.sector
LEFT JOIN (
  SELECT c.sector, COUNT(*) AS funding_count
  FROM funding_rounds fr JOIN companies c ON c.id = fr.company_id
  WHERE fr.date > CURRENT_DATE - INTERVAL '12 months'
  GROUP BY c.sector
) fc ON fc.sector = ss.sector;

CREATE UNIQUE INDEX ON mv_sector_multiples (sector);
```

### Implementation Sequence

1. Store FMP API key as a secret (free signup at financialmodelingprep.com)
2. Database migration: add columns to `public_market_data`, add timestamp columns to `companies`
3. Create `bulk-sec-ingest` edge function -- fetch XBRL for top 500 companies
4. Create `fetch-market-data` edge function -- FMP quotes + fundamentals
5. Rewrite `mv_sector_multiples` materialized view with real data computation
6. Run both ingestion functions to populate real data
7. Refresh materialized view
8. Update frontend components to reflect real data (badges, auto-population)
9. Add Data Sources panel to Settings
10. Test the full valuation pipeline end-to-end with real numbers

### Cost Summary

| Source | Cost | Coverage |
|---|---|---|
| SEC EDGAR XBRL | Free forever | All US public company financials (10-K, 10-Q) |
| FMP Free Tier | Free | 250 quotes/day -- covers top 250 daily |
| FMP Starter (optional) | $14/month | 300/minute -- covers all 7,000 companies multiple times daily |

This gives us institutional-grade financial data at $0-14/month vs Bloomberg at $25,000/year. The SEC data alone (revenue, EBITDA, EPS, balance sheet) is the same XBRL data that Bloomberg Terminal reads -- we just skip the middleman.

