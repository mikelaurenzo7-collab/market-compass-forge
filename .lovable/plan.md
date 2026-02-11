

# Elite Private Investment Intelligence Platform Overhaul

## Vision

Transform Laurenzo's Grapevine from a VC/PE-centric company tracker into an **elite private investment platform** serving wealthy individuals, family offices, and institutional investors across ALL private asset classes -- including distressed businesses, foreclosed properties, off-market real estate, and small/mid-market acquisition targets.

## What Changes

### 1. Remove All Public Market Artifacts

Since all public companies were removed from the database, the UI still shows dead references:
- Dashboard shows "PUBLIC COMPANIES: 0" metric card (embarrassing)
- Dashboard has a "Public Movers" widget that returns empty data
- Companies page has a market type toggle (All/Private/Public) -- unnecessary
- Screening page has the same toggle plus Market Cap and P/E filters
- CompanyDetail still imports PublicMarketCard and checks for `isPublic`
- MarketToggle component still offers "Public" option
- useData.ts has `usePublicMarketMovers`, `usePublicMarketLeaders`, `usePublicMarketData` hooks -- all return nothing
- Landing page still says "private & public markets" in copy

**Actions:**
- Remove PublicMarketSnapshot widget from Dashboard, replace "Public Companies" metric with "Distressed Alerts" or "Off-Market Listings"
- Remove MarketToggle component entirely; default everything to private
- Strip public market columns/filters from Companies and Screening pages
- Clean up CompanyDetail to remove public market card and ticker displays
- Update Landing page hero copy to focus purely on private investments

### 2. New Asset Class: Distressed & Special Situations

Add a new database table and page for tracking distressed businesses, bankruptcies, and turnaround opportunities -- a high-value dataset for wealthy individuals looking for bargain acquisitions.

**New table: `distressed_assets`**
- id, asset_type (business / real_estate / loan), name, description, sector, location_city, location_state, asking_price, estimated_value, discount_pct, distress_type (bankruptcy, foreclosure, receivership, voluntary_sale, tax_lien), status (active, under_contract, sold), listed_date, source, contact_info, key_metrics (JSONB), created_at

**New page: Distressed & Special Situations (`/distressed`)**
- Summary cards: Total listings, Avg discount to value, Active opportunities, Median asking price
- Filterable table: asset type, distress type, location, price range, sector
- Each row shows discount-to-estimated-value as a key metric
- Status badges: Active (green), Under Contract (yellow), Sold (gray)

**Populate with 30-40 realistic entries** across:
- Small businesses (dry cleaners, restaurants, auto shops, manufacturing)
- Mid-market companies (regional distributors, healthcare practices, SaaS companies)
- Foreclosed commercial properties (retail, office, industrial)
- Tax lien properties
- Receivership/bankruptcy estates

### 3. New Asset Class: Off-Market Real Estate Listings

Expand the Real Estate Intel page from just Chicago CRE market data into a comprehensive private real estate investment platform.

**New table: `private_listings`**
- id, listing_type (off_market, pocket_listing, pre_foreclosure, auction, 1031_exchange), property_type, address, city, state, asking_price, estimated_cap_rate, noi, size_sf, units, year_built, description, status (available, under_contract, sold), source_network, listed_date, created_at

**Enhance Real Estate Intel page:**
- Add a new "Off-Market Listings" tab alongside existing Market Overview / Transaction Log / Submarket Data
- Private network listings table with filters
- Add 20-25 realistic off-market listings across multiple property types and cities (not just Chicago)

### 4. Expand Company Database: Small & Mid-Market Targets

Add 50+ smaller private companies ($1M-$50M revenue) that wealthy individuals and search fund operators would target for acquisition:
- Main Street businesses (HVAC, plumbing, electrical contractors)
- Professional services (dental practices, accounting firms, staffing agencies)
- Light manufacturing and distribution
- Franchise operations
- E-commerce brands
- Regional food/beverage companies

These fill the gap between the current unicorn-heavy database and the needs of individual investors doing $500K-$10M acquisitions.

### 5. Visual & UX Optimization

**Dashboard overhaul:**
- Replace the 4 metric cards with relevant private-only metrics: Total Deal Value, Private Companies, Active Opportunities, Distressed Alerts
- Remove Public Movers widget, add "Distressed Opportunities" widget
- Add "Off-Market Properties" widget showing latest listings
- Fix mobile: metric cards overflow labels on small screens

**Companies page:**
- Remove market toggle, public columns (ticker, market cap)
- Add "Revenue Range" filter label (currently says "ARR" which is SaaS jargon -- not all target companies have ARR)
- Add EBITDA range filter (currently missing)

**Screening page:**
- Remove market toggle, public-specific filters (Market Cap, P/E)
- Make filters more mobile-friendly (currently a horizontal scroll nightmare on 390px)

**All tables:**
- Ensure horizontal scroll works cleanly on mobile with sticky first column
- Increase touch targets for mobile (minimum 44px tap targets)

**Sidebar:**
- Add "Distressed Assets" navigation item under Platform section
- Rename "Real Estate Intel" to "Real Estate" for brevity

**Landing page:**
- Update hero to emphasize private deal access, distressed opportunities, and off-market listings
- Update features grid to include Distressed Assets and Off-Market Listings
- Remove "private & public" references

### 6. Data & Valuation Optimization

**Improve scoring model:**
- Current score only uses ARR/valuation/sector/efficiency -- add EBITDA margin and revenue growth as factors
- Show Revenue alongside ARR (many companies report revenue, not ARR)

**Improve DCF Calculator:**
- Add ability to save scenarios and compare them
- Add an LBO model tab alongside DCF (PE firms care about leveraged returns)

**Improve Precedent Transactions:**
- Currently only 6 entries -- populate with 30+ realistic transactions across sectors
- Add sector filter and date range filter

**Improve Football Field chart:**
- Make it interactive -- let users input their own valuation ranges per methodology

## Technical Details

### Database Migrations
1. Create `distressed_assets` table with RLS (public read)
2. Create `private_listings` table with RLS (public read)
3. Populate `distressed_assets` with 35 realistic entries
4. Populate `private_listings` with 25 realistic entries
5. Populate `companies` with 50+ small/mid-market businesses
6. Add financials and funding data for new companies
7. Expand `precedent_transactions` from 6 to 35+ entries

### New Files
- `src/pages/DistressedAssets.tsx` -- Full page with filters, summary stats, sortable table
- Update `src/pages/RealEstateIntel.tsx` -- Add "Off-Market Listings" tab

### Modified Files
- `src/App.tsx` -- Add `/distressed` route
- `src/components/AppSidebar.tsx` -- Add "Distressed Assets" nav item
- `src/pages/Index.tsx` -- Remove public market widget/metrics, add distressed & listings widgets
- `src/pages/Companies.tsx` -- Remove MarketToggle and public columns
- `src/pages/Screening.tsx` -- Remove public filters, improve mobile layout
- `src/pages/CompanyDetail.tsx` -- Remove PublicMarketCard import and public market sections
- `src/pages/Landing.tsx` -- Update copy and features
- `src/hooks/useData.ts` -- Remove public market hooks, add distressed/listings queries
- `src/components/DCFCalculator.tsx` -- Add scenario save and LBO tab
- `src/components/PrecedentTransactions.tsx` -- Add filters
- `src/components/ValuationFootballField.tsx` -- Make interactive
- `src/index.css` -- Mobile responsive fixes

### Files to Delete
- `src/components/MarketToggle.tsx` -- No longer needed
- `src/components/PublicMarketCard.tsx` -- No longer needed

### Existing Files That Can Stay (no public data to serve)
- `src/pages/Portfolio.tsx` -- Still useful for tracking private positions
- `src/hooks/usePortfolio.ts` -- Will need minor cleanup of public_market_data references

