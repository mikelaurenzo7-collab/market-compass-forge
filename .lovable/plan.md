

# Next Steps: Ship-Ready Enhancement Plan

This plan addresses the highest-impact gaps to make the platform feel complete, data-rich, and worth paying for.

---

## Phase 1: Make Fake Things Real (Critical Credibility)

### 1A. Intelligence Feed -- Database-Backed
The Intelligence Feed is currently 22 hardcoded JavaScript objects. This is the most visible credibility gap.

- Create a `intelligence_signals` table (headline, source, timestamp, ai_summary, tags, sentiment, category, url)
- Migrate the 22 existing items into the database as seed data
- Update `IntelligenceFeed.tsx` to query the database instead of using the hardcoded array
- Add a "Last updated" timestamp in the header

### 1B. Document Analyzer -- Wire Up Real AI
The Document Analyzer currently shows a static demo. Make the upload and analysis functional.

- Create a `document_analyses` table to store results
- Create a backend function that accepts uploaded documents and uses AI to extract metrics, risks, terms, and generate summaries
- Wire the upload area to actually accept files, store them, and trigger analysis
- Keep the demo as a fallback but show real results when available

### 1C. Research AI -- Remove "Coming Soon" Gate
The AI Research Assistant shows a teaser with "Coming Soon" badge and disabled inputs. The `AIResearchChat` component already exists.

- Remove the "Coming Soon" teaser block
- Show the actual AI chat interface directly (the component already exists and is used when a company is selected)
- Enable the general-purpose chat input at the top level (not just per-company)

---

## Phase 2: Data Depth (Perceived Value)

### 2A. Expand Fund Intelligence
Currently only 25 funds and 18 LPs. This is too thin for a module that competes with PitchBook.

- Seed 40+ additional funds across PE, VC, Real Estate, Credit, and Infrastructure strategies
- Seed 30+ additional LP entities (pensions, endowments, sovereign wealth, family offices)
- Add vintage years spanning 2015-2025 for better trend analysis

### 2B. Expand Real Estate Beyond Chicago
CRE data is currently Chicago-only. Wealthy individuals invest nationally.

- Seed CRE transactions for 4-5 additional metros (NYC, Dallas, Miami, LA, Denver)
- Seed market data for these metros
- Add 15-20 more off-market listings across diverse geographies
- Add a city/metro filter to the Market Overview tab

### 2C. Expand Precedent Transactions by Sector
36 entries is decent but could be richer. Add sector diversity.

- Seed 20+ more transactions covering healthcare, industrials, consumer, and real estate sectors
- Ensure date range spans 2020-2026

---

## Phase 3: Usability & Polish

### 3A. Export Everywhere
Users pay for data they can take with them.

- Add CSV export button to Distressed Assets page
- Add CSV export button to Off-Market Listings tab
- Add CSV export to Fund Intelligence tables
- Add PDF export to Document Analyzer results

### 3B. Detail Views for New Asset Classes
Distressed assets and off-market listings currently have no click-through detail view.

- Add a slide-out panel or modal for distressed asset details showing full description, key metrics JSON, contact info
- Add similar detail panel for off-market listings showing full property description, address, year built, units

### 3C. Saved Searches and Alert Creation from Screening
Users should be able to save their screening filter state and get alerts when new matches appear.

- Add "Save Search" button to Screening page that persists the current filter configuration
- Show saved searches in a dropdown at the top
- Option to "Create Alert" from a saved search

### 3D. Mobile Polish Pass
- Distressed Assets filters: wrap in collapsible panel on mobile
- Real Estate tabs: ensure horizontal scroll on tab triggers
- Fund Intelligence table: add sticky first column
- Landing page pricing cards: stack cleanly on mobile

---

## Technical Summary

### Database migrations needed:
1. Create `intelligence_signals` table + seed 22 items + 10 new items
2. Create `document_analyses` table for storing analysis results
3. Seed ~40 additional funds into `funds` table
4. Seed ~30 additional LPs into `lp_entities` table  
5. Seed CRE transactions and market data for 4 additional metros
6. Seed 15-20 more off-market listings
7. Seed 20+ more precedent transactions

### Backend functions needed:
1. `analyze-document` edge function -- accepts file, calls AI model for extraction

### Files to modify:
1. `src/pages/IntelligenceFeed.tsx` -- Replace hardcoded array with database query
2. `src/pages/DocumentAnalyzer.tsx` -- Wire real upload and AI analysis
3. `src/pages/Research.tsx` -- Remove "Coming Soon" gate, enable top-level AI chat
4. `src/pages/RealEstateIntel.tsx` -- Add metro/city filter
5. `src/pages/DistressedAssets.tsx` -- Add detail panel and CSV export
6. `src/pages/Screening.tsx` -- Add "Save Search" functionality
7. `src/pages/FundIntelligence.tsx` -- Add sticky columns for mobile
8. `src/hooks/useData.ts` -- Add `useIntelligenceSignals` hook
9. `src/lib/export.ts` -- Add export functions for new tables

### New files:
1. `src/components/DistressedDetailPanel.tsx` -- Slide-out detail view
2. `src/components/ListingDetailPanel.tsx` -- Slide-out detail view

### Estimated scope:
- 7 database migrations (mostly seed data)
- 1 new backend function
- 10 files modified
- 2 new component files
- Priority order: Phase 1 first (credibility), then Phase 2 (depth), then Phase 3 (polish)

