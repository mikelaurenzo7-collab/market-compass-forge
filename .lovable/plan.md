

# Laurenzo: The Bloomberg Competitor Pivot

## Vision

Transform Laurenzo from a private-market-only tool into a **unified Private + Public Market Intelligence Platform** -- a true Bloomberg alternative that gives emerging managers something Bloomberg can't: AI-native research, private market depth, and cross-market comparison at a fraction of the cost.

## What Changes

### 1. Database Schema: Add Public Market Data Layer

**New table: `public_market_data`** -- stores real-time-style public market metrics that Bloomberg charges $24K/year for:

| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| company_id | uuid | FK to companies |
| market_cap | numeric | Market capitalization |
| pe_ratio | numeric | Price-to-earnings ratio |
| eps | numeric | Earnings per share |
| dividend_yield | numeric | Dividend yield (decimal) |
| price | numeric | Current share price |
| price_change_pct | numeric | Daily price change % |
| fifty_two_week_high | numeric | 52-week high |
| fifty_two_week_low | numeric | 52-week low |
| volume_avg | numeric | Average daily volume |
| beta | numeric | Beta coefficient |
| ticker | text | Stock ticker symbol |
| exchange | text | Exchange (NYSE, NASDAQ, etc.) |
| updated_at | timestamptz | Last update |

**Add column to `companies` table:**
- `market_type` (text, default 'private') -- values: 'private' or 'public'

**Add new sectors** to the `sectors` table for broader public market coverage (Energy, Real Estate, Industrials, Telecom, Pharma, etc.).

### 2. Data Population: 100+ Public Companies

Insert **100+ major public companies** across sectors that Bloomberg covers, with full market data. Focus on companies that emerging managers actually benchmark against:

**Tech**: Apple, Microsoft, Google, Amazon, Meta, NVIDIA, Tesla, Netflix, AMD, Intel, Salesforce, Adobe, Oracle, ServiceNow, Workday, Intuit, Fortinet, CrowdStrike (already exists), etc.

**Finance**: JPMorgan, Goldman Sachs, Visa, Mastercard, PayPal, Block (Square), Marqeta, etc.

**Healthcare**: UnitedHealth, Johnson & Johnson, Pfizer, Moderna, Intuitive Surgical, etc.

**Energy/Industrials**: ExxonMobil, Chevron, NextEra Energy, Caterpillar, Deere, etc.

**Consumer**: Nike, Starbucks, McDonald's, Costco, Walmart, etc.

Each gets: market cap, P/E, EPS, dividend yield, price, 52-week range, beta, ticker, exchange.

Set existing 32 "Public" stage companies to `market_type = 'public'` and populate their `public_market_data`.

### 3. Sidebar Navigation: Market Context

Update the sidebar to show clear market context with section headers:

```
-- MARKETS --
  Dashboard
  Private Markets  (new)
  Public Markets   (new)

-- INTELLIGENCE --
  Companies
  Screening
  Analytics
  Research

-- WORKFLOW --
  Deal Flow
  Compare
  Network
  People

-- SYSTEM --
  Alerts
  Integrations
  Settings
```

New routes:
- `/markets/private` -- private market dashboard (filtered view of current dashboard)
- `/markets/public` -- public market dashboard with indices, movers, sector performance

### 4. Dashboard: Dual-Market Intelligence Hub

Replace the single dashboard with a **tabbed dashboard**: "All Markets" | "Private" | "Public"

**All Markets tab**: Combined metrics showing total coverage
**Private tab**: Current dashboard experience (deal flow, pipeline, private company table)
**Public tab**: New public markets dashboard with:
- Market summary cards (S&P 500 level, NASDAQ level, market sentiment)
- Top gainers / losers table
- Sector performance heatmap (public)
- Market cap leaders table

### 5. Companies Page: Market Type Filter

Add a **market type toggle** at the top of the Companies page:
- "All" | "Private" | "Public" pill buttons
- When "Public" is selected, show additional columns: Ticker, Market Cap, P/E, Price Change %
- When "Private" is selected, show current columns (Valuation, ARR, Stage)

### 6. Company Detail: Public Market Enhancements

For public companies, the detail page adds:
- **Market Data Card**: Ticker, Exchange, Market Cap, P/E, EPS, Beta, 52-week range, dividend yield
- **Price indicator**: Current price with daily change %
- Replace "Add to Pipeline" with "Add to Watchlist" for public companies (they're not deal targets)
- Keep AI Research, Memo Generator, and Enrichment tabs for both private and public

### 7. Screening: Cross-Market Power

Add market type filter chips ("Private" | "Public") alongside existing sector/stage chips. When public is selected, add:
- Market Cap range filter (replaces Valuation for public)
- P/E ratio range filter
- Dividend yield filter

### 8. Analytics: Dual-Market Analytics

Add a market toggle to the Analytics page. Public market analytics include:
- Sector performance comparison (public vs private multiples)
- Market cap distribution
- P/E ratio by sector

### 9. Landing Page: Repositioned

Update hero and positioning:
- Badge: "Market Intelligence Platform" (already done)
- Headline: "AI-Powered Intelligence for **Private & Public Markets**"
- Subheadline: "The only platform that combines private deal intelligence with public market data -- built for emerging managers who need Bloomberg-level insight without the Bloomberg price tag."
- Stats bar: Update to show "300+ Companies" (after adding public companies), add "Private & Public Markets" stat
- Add a new feature card: "Cross-Market Intelligence" -- Compare private companies against public benchmarks

### 10. What Bloomberg Doesn't Offer (Differentiators)

These already exist but need to be highlighted more prominently on the landing page:
- **AI Research Chat** -- Ask questions, get sourced answers (Bloomberg has no equivalent)
- **Investment Memo Generator** -- One-click IC-ready memos (Bloomberg doesn't do this)
- **Deal Pipeline** -- Integrated Kanban workflow (Bloomberg is view-only, no workflow)
- **Data Provenance** -- Confidence scoring on every data point (Bloomberg doesn't show this)
- **Cross-Market Benchmarking** -- Compare private company ARR multiples against public comps (Bloomberg has separate terminals for each)

## File Changes Summary

| File | Change |
|---|---|
| `src/pages/Landing.tsx` | Update hero copy, add "Cross-Market Intelligence" feature card, update stats |
| `src/pages/Index.tsx` | Add Private/Public/All tabs, add public market summary section |
| `src/pages/Companies.tsx` | Add market type toggle, show public-specific columns conditionally |
| `src/pages/CompanyDetail.tsx` | Add public market data card for public companies, conditional UI |
| `src/pages/Screening.tsx` | Add market type filter, public-specific filters (market cap, P/E) |
| `src/pages/Analytics.tsx` | Add market toggle, public market analytics charts |
| `src/components/AppSidebar.tsx` | Restructure nav with section headers, add Private/Public Markets links |
| `src/components/CompanyTable.tsx` | Add market type awareness, show ticker for public companies |
| `src/hooks/useData.ts` | Add `usePublicMarketData` hook, update company type |
| `src/hooks/useAnalyticsData.ts` | Add public market analytics hooks |
| `src/App.tsx` | Add new routes for `/markets/private` and `/markets/public` |
| New: `src/pages/PublicMarkets.tsx` | Public markets dashboard with indices, movers, sector performance |
| New: `src/pages/PrivateMarkets.tsx` | Filtered private-only dashboard |
| New: `src/components/PublicMarketCard.tsx` | Reusable public market data display component |
| New: `src/components/MarketToggle.tsx` | Reusable Private/Public/All toggle component |

## Technical Details

### Migration: New table + column

```sql
-- Add market_type to companies
ALTER TABLE companies ADD COLUMN market_type text NOT NULL DEFAULT 'private';

-- Set existing public companies
UPDATE companies SET market_type = 'public' WHERE stage = 'Public';

-- Create public market data table
CREATE TABLE public_market_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  exchange text,
  market_cap numeric,
  pe_ratio numeric,
  eps numeric,
  dividend_yield numeric,
  price numeric,
  price_change_pct numeric,
  fifty_two_week_high numeric,
  fifty_two_week_low numeric,
  volume_avg numeric,
  beta numeric,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id)
);

-- RLS: publicly readable
ALTER TABLE public_market_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public market data is publicly readable"
  ON public_market_data FOR SELECT USING (true);
```

### Database inserts (via insert tool)

1. Insert 100+ new public companies into `companies` with `market_type = 'public'`
2. Insert corresponding `public_market_data` records with ticker, market cap, P/E, etc.
3. Insert financials for new public companies (revenue, EPS -- publicly available data)
4. Insert funding rounds where applicable (IPO records)
5. Add new sectors to `sectors` table
6. Add new activity events for public companies

### Reusable MarketToggle component

A simple pill toggle used across Dashboard, Companies, Screening, and Analytics:

```tsx
type MarketFilter = 'all' | 'private' | 'public';

const MarketToggle = ({ value, onChange }) => (
  <div className="flex gap-1 bg-muted rounded-lg p-1">
    {['all', 'private', 'public'].map(m => (
      <button key={m} onClick={() => onChange(m)}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          value === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
        }`}>
        {m === 'all' ? 'All Markets' : m === 'private' ? 'Private' : 'Public'}
      </button>
    ))}
  </div>
);
```

### Data hooks

```typescript
// New hook for public market data
export const usePublicMarketData = (companyId: string) =>
  useQuery({
    queryKey: ["public-market-data", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_market_data")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

// Updated companies query with market_type filter
export const useCompaniesFiltered = (marketType: 'all' | 'private' | 'public') =>
  useQuery({
    queryKey: ["companies", marketType],
    queryFn: async () => {
      let query = supabase.from("companies").select("*").order("name");
      if (marketType !== 'all') query = query.eq("market_type", marketType);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
```

## Execution Order

1. Database migration (add `market_type` column + `public_market_data` table)
2. Database inserts (100+ public companies + market data)
3. Create reusable `MarketToggle` component
4. Update `useData.ts` hooks
5. Update sidebar navigation
6. Update routes in `App.tsx`
7. Create `PublicMarkets.tsx` and `PrivateMarkets.tsx` pages
8. Update `Index.tsx` dashboard with tabs
9. Update `Companies.tsx` with market filter
10. Update `CompanyDetail.tsx` with public data card
11. Update `Screening.tsx` with market filters
12. Update `Analytics.tsx` with market toggle
13. Update `Landing.tsx` positioning and copy
14. Update `CompanyTable.tsx` for market awareness

