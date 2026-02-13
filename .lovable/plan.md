

# Global Investment Opportunities -- New Asset Class Module

## Overview

Add a dedicated **Global Markets** page (`/global`) that surfaces international investment opportunities across emerging markets, frontier economies, and developed non-US markets. This becomes a unique moat because no sub-$1,000/mo platform offers cross-border deal intelligence alongside domestic private + public market coverage.

## What Makes This a Moat

1. **Cross-border intelligence is fragmented** -- Bloomberg Terminal covers global equities but costs $25K/yr. PitchBook is US/EU-centric. Nobody aggregates global PE/VC, sovereign wealth fund activity, and emerging market opportunities in one view at our price point.
2. **Compounds with existing data** -- Our SEC pipeline, fund intelligence (LP/GP directory), and relationship graph become more valuable when extended internationally. A family office tracking a US SaaS company can now see which sovereign wealth funds from Singapore or Abu Dhabi are co-investing.
3. **Network effect on relationships** -- Every global entity added to the relationship graph deepens the "who knows who" moat.

## Data Strategy (No Paid APIs Required)

We seed the global opportunities table with curated data across key regions, then enrich over time via Firecrawl web scraping of public deal announcements, sovereign fund disclosures, and international stock exchange filings.

**Regions covered:**
- Emerging Asia (India, Southeast Asia, China)
- Middle East & Africa (UAE, Saudi, Nigeria, Kenya)
- Latin America (Brazil, Mexico, Colombia)
- Europe (UK, DACH, Nordics)
- Frontier (Vietnam, Bangladesh, Egypt)

**Opportunity types:**
- Cross-border M&A targets
- Emerging market PE/VC deals
- Sovereign wealth fund co-investment opportunities
- International distressed / restructuring
- Global infrastructure projects

## What We Build

### 1. New Database Table: `global_opportunities`

Stores international investment opportunities with region, country, currency, deal type, and risk metrics.

```text
global_opportunities
--------------------
id (uuid, PK)
name (text) -- Company or project name
country (text) -- ISO country
region (text) -- Emerging Asia, LATAM, MENA, Europe, Frontier
sector (text)
opportunity_type (text) -- cross_border_ma, pe_vc, swf_coinvest, distressed, infrastructure
description (text)
deal_value_usd (numeric) -- Normalized to USD
local_currency (text)
deal_value_local (numeric)
stage (text) -- sourced, screening, active, closed
risk_rating (text) -- low, medium, high, very_high
sovereign_fund_interest (text[]) -- Names of SWFs known to be involved
key_metrics (jsonb) -- GDP growth, FX rate, country risk premium, etc.
source_url (text)
listed_date (date)
status (text) -- active, under_review, closed
created_at (timestamptz)
```

RLS: Publicly readable (same pattern as distressed_assets).

### 2. New Page: `/global` (Global Markets)

A discovery page following the same proven pattern as Distressed Assets and Public Markets:

- **Summary cards**: Total opportunities, Avg deal size, Region breakdown, Active deals
- **Filters**: Region, Country, Sector, Opportunity Type, Risk Rating, Deal Size range
- **Sortable table**: Name, Country, Region, Sector, Deal Value, Risk Rating, Status, Source
- **Detail panel** (drawer): Full description, key metrics (country risk premium, FX considerations, GDP growth), sovereign fund involvement, source links
- **Export CSV** for filtered results

### 3. Sidebar + Routing Integration

- Add "Global Markets" nav item with a Globe icon between "Distressed Assets" and the Insights section
- Route: `/global` protected behind auth
- Import and lazy-load the page component

### 4. Dashboard Integration

- Add a "Global Pulse" widget on the dashboard showing recent international opportunities by region
- Cross-link from Fund Intelligence page when a fund has international LP relationships

### 5. Seed Data via Backend Function

A `seed-global-opportunities` backend function that inserts ~50-100 curated opportunities across all regions with realistic deal structures, risk ratings, and sovereign fund associations.

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/[timestamp].sql` | Create `global_opportunities` table with RLS |
| `src/pages/GlobalMarkets.tsx` | Main discovery page with filters, table, detail panel |
| `src/components/GlobalDetailPanel.tsx` | Drawer showing full opportunity details |
| `src/hooks/useGlobalOpportunities.ts` | Data hook for fetching/filtering |
| `supabase/functions/seed-global-opportunities/index.ts` | Seed function with curated data |

### Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/global` route |
| `src/components/AppSidebar.tsx` | Add "Global Markets" nav item |
| `src/lib/export.ts` | Add `exportGlobalOpportunitiesCSV` |
| `supabase/config.toml` | Register seed function |
| `src/pages/Index.tsx` | Add "Global Pulse" dashboard widget |

### Database Migration SQL (Simplified)

```text
CREATE TABLE global_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL,
  region text NOT NULL,
  sector text,
  opportunity_type text NOT NULL DEFAULT 'pe_vc',
  description text,
  deal_value_usd numeric,
  local_currency text DEFAULT 'USD',
  deal_value_local numeric,
  stage text DEFAULT 'active',
  risk_rating text DEFAULT 'medium',
  sovereign_fund_interest text[] DEFAULT '{}',
  key_metrics jsonb DEFAULT '{}',
  source_url text,
  listed_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE global_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Global opportunities are publicly readable"
  ON global_opportunities FOR SELECT USING (true);
```

### Seed Data Coverage (~80 opportunities)

- **Emerging Asia (20)**: Indian SaaS unicorns, Southeast Asian fintech, Chinese cross-border logistics
- **MENA (15)**: Saudi Vision 2030 infrastructure, UAE fintech, African mobile banking
- **LATAM (15)**: Brazilian agritech, Mexican manufacturing nearshoring, Colombian fintech
- **Europe (15)**: UK distressed retail, Nordic cleantech, DACH industrial automation
- **Frontier (15)**: Vietnamese manufacturing, Bangladeshi textiles, Egyptian renewables

Each opportunity includes realistic deal values (converted to USD), country-specific risk ratings, sovereign fund associations (e.g., "Mubadala", "Temasek", "GIC", "PIF"), and key metrics like country risk premium and GDP growth rate.

### Implementation Sequence

1. Database migration (create table + RLS)
2. Seed backend function with curated global data
3. Data hook (`useGlobalOpportunities`)
4. Detail panel component
5. Main page with filters, stats, table
6. Sidebar + routing integration
7. Dashboard "Global Pulse" widget
8. Export utility

