

# Perfect the Valuation Engine

An audit of every valuation-related component reveals six systemic accuracy problems. This plan fixes each one, moving from "looks like a terminal" to "calculates like a terminal."

---

## Problem 1: Hardcoded Comparable Companies

**Current state:** The CompanyDetail Valuation tab (lines 492-504) shows the same 3 companies (Salesforce, Adobe, ServiceNow) for EVERY company regardless of sector. A cannabis company and a cybersecurity company both show identical comps.

**Fix:** Query real companies from the database that match the target company's sector, compute their actual EV/Revenue and EV/EBITDA from the `financials` and `funding_rounds` tables, and display dynamic comps.

**File:** `src/pages/CompanyDetail.tsx` (valuation tab, lines 446-509)
- Replace hardcoded array with a `useQuery` that fetches companies in the same sector
- Join financials + funding to compute real multiples
- Show median and mean sector multiples as summary stats
- Add a "Sector Median" row at the bottom for quick reference

---

## Problem 2: Gross Margin Display Bug

**Current state:** Line 435 in CompanyDetail.tsx displays `f.gross_margin.toFixed(1)%` -- but gross margins are stored as decimals (0.72, not 72). This renders as "0.7%" instead of "72%". The `formatPercent` helper exists and handles this correctly, but it's not used consistently.

**Fix:** Audit all gross_margin display points and ensure they multiply by 100 or use the `formatPercent` helper.

**Files affected:**
- `src/pages/CompanyDetail.tsx` line 435: change to `${(f.gross_margin * 100).toFixed(1)}%`

---

## Problem 3: Generic AI Analysis Template

**Current state:** The AI Analysis tab (lines 552-601) shows identical boilerplate text for every company: "strong recurring revenue model", "customer concentration risk in Fortune 500 segment" -- none of this is derived from actual data.

**Fix:** Replace the static template with data-driven analysis that references the company's actual metrics, score breakdown, and sector positioning.

**File:** `src/pages/CompanyDetail.tsx` (analysis tab)
- Use the `score` object (already computed) to generate dynamic strengths/risks
- Reference actual ARR, growth rate, burn rate, Rule of 40, and implied multiple
- Show sector-relative positioning ("trading at Xth percentile of sector EV/Revenue")
- Add a call to the existing `ai-research` edge function for a real AI-generated summary

---

## Problem 4: DCF Calculator Disconnected from Company Data

**Current state:** The DCF Calculator always starts with generic defaults ($100M revenue, 15% growth, 25% EBITDA margin). When a user is on a company's valuation tab, these defaults have no connection to that company's actual financials.

**Fix:** Accept optional company financials as props and pre-populate the DCF with real data when available.

**File:** `src/components/DCFCalculator.tsx`
- Add optional props: `initialRevenue`, `initialGrowth`, `initialMargin`, `companyName`
- When props are provided, use them as defaults instead of generic values
- Show a label: "Pre-populated from [Company Name] financials"

**File:** `src/pages/CompanyDetail.tsx`
- In the valuation tab, render `<DCFCalculator>` with the company's actual revenue, growth rate, and EBITDA margin passed as props

---

## Problem 5: Investment Score Accuracy Gaps

**Current state in `useCompanyScore.ts`:**
- **Sector momentum** is based purely on how many companies exist in that sector in our database (density), not on actual deal activity, funding trends, or multiple expansion
- **No EV/EBITDA scoring** -- the entire valuation score uses only EV/Revenue, ignoring profitability-adjusted multiples
- **Sector multiple benchmarking is missing** -- a 10x EV/Revenue is cheap for cybersecurity but expensive for healthcare services, yet both score identically

**Fixes:**
1. Add **sector-relative valuation scoring**: query the precedent_transactions table for sector median multiples, and score the company's multiple relative to its sector median rather than using absolute thresholds
2. Add **EV/EBITDA as a secondary valuation signal**: when EBITDA data exists, compute and factor in EV/EBITDA alongside EV/Revenue
3. Improve **sector momentum** to incorporate actual deal volume from `deal_transactions` and funding round counts from `funding_rounds` for that sector in the last 12 months
4. Add new output fields: `evEbitda`, `sectorMedianEvRevenue`, `sectorMedianEvEbitda` to `CompanyScoreResult`

**Files:**
- `src/hooks/useCompanyScore.ts` -- refactor valuation score section and sector momentum section
- `src/components/CompanyScore.tsx` -- display the new EV/EBITDA and sector comparison metrics

---

## Problem 6: Football Field Uses Static Defaults

**Current state:** The ValuationFootballField always shows the same hardcoded ranges ($280-$560M for DCF, etc.) regardless of context.

**Fix:** When rendered on a company page, compute ranges from:
- **DCF range**: Use the sensitivity matrix min/max from DCF calculator logic
- **Comp Companies**: Use sector median EV/Revenue applied to company's revenue (25th/50th/75th percentile)
- **Precedent Txns**: Use sector precedent transaction multiples
- **LBO Analysis**: Derive from standard LBO return thresholds (15-25% IRR)

**File:** `src/components/ValuationFootballField.tsx`
- Accept optional `companyData` prop with revenue, ebitda, sectorMultiples
- When provided, compute real ranges instead of showing static defaults
- Keep the hardcoded defaults as fallback for the standalone Valuations page

---

## Problem 7: Precedent Transactions Missing Statistical Context

**Current state:** The Precedent Transactions component shows raw averages but no distribution analysis (median, 25th/75th percentile, standard deviation).

**Fix:** Add percentile statistics to give users proper benchmarking context.

**File:** `src/components/PrecedentTransactions.tsx`
- Add median EV/Revenue and median EV/EBITDA alongside the existing averages
- Add 25th and 75th percentile stats
- Show deal count by year as a mini bar chart or stat row
- Highlight statistical outliers in the table

---

## Technical Summary

### Files to modify:
1. `src/hooks/useCompanyScore.ts` -- Sector-relative scoring, EV/EBITDA, improved momentum
2. `src/components/CompanyScore.tsx` -- Display new metrics (EV/EBITDA, sector comparisons)
3. `src/pages/CompanyDetail.tsx` -- Dynamic comps, data-driven AI analysis, DCF integration, gross margin fix
4. `src/components/DCFCalculator.tsx` -- Accept company data as props
5. `src/components/ValuationFootballField.tsx` -- Accept company data, compute real ranges
6. `src/components/PrecedentTransactions.tsx` -- Add percentile statistics
7. `src/hooks/useData.ts` -- Add `useSectorMultiples` hook for reuse

### New hooks:
1. `useSectorMultiples(sector)` -- Returns median/mean/p25/p75 EV/Revenue and EV/EBITDA for a sector from precedent_transactions

### No database migrations needed
All data already exists in precedent_transactions, financials, funding_rounds, and deal_transactions tables.

### Priority order:
1. Gross margin bug fix (instant credibility fix)
2. Dynamic comps on CompanyDetail (most visible per-company improvement)
3. Investment score accuracy (core engine)
4. DCF pre-population from company data
5. Football field with real ranges
6. Precedent transaction statistics
7. Data-driven AI analysis

