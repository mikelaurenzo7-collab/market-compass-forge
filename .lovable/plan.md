

# Ship-Ready Checklist: Founder Mode

This plan covers everything needed to get from current state to a polished, demo-ready product. Items are grouped by priority.

---

## Priority 1: Fix What's Broken (Blocking)

### 1A. Add `/distressed` route and sidebar nav
- **App.tsx**: Import `DistressedAssets` page and add `<Route path="/distressed" element={<DistressedAssets />} />`
- **AppSidebar.tsx**: Add "Distressed Assets" with `AlertTriangle` icon to `mainModules` array (after Real Estate). Rename "Real Estate Intel" to "Real Estate"

### 1B. Clean up dead public market code in Screening page
- Remove `showPublicCols` variable and all conditional blocks that reference it (Ticker column, Market Cap column, Market Cap/P/E filters)
- Remove `marketCapMin`, `marketCapMax`, `peMin`, `peMax` from the `Filters` type and `EMPTY_FILTERS`
- Remove `"Public"` from `STAGES` array
- Change `Globe` icon fallback in company rows to always show `Building2`
- Rename "ARR ($M)" filter label to "Revenue ($M)"

### 1C. Clean up Companies page
- Verify no remaining public market toggle or columns (already done in prior batch -- just confirm no dead imports)

---

## Priority 2: Complete Plan Features (High Value)

### 2A. Off-Market Listings tab on Real Estate page
- Add a 4th tab "Off-Market Listings" to the existing `Tabs` component
- Query `private_listings` table (25 entries already seeded)
- Filterable table with: listing type, property type, city/state, price, cap rate, NOI, status
- Summary cards: Total listings, Avg cap rate, Total value

### 2B. Update Landing page copy
- Update hero subtitle: remove PE-specific language, emphasize distressed opportunities and off-market access for wealthy individuals and family offices
- Add 2 new feature cards: "Distressed & Special Situations" and "Off-Market Real Estate"
- Update features description copy to mention private deal access broadly (not just PE analysts)

### 2C. Valuation Football Field -- make interactive
- Convert `defaultRanges` to state so users can edit low/mid/high values per methodology
- Add inline inputs that update the chart in real-time

### 2D. DCF Calculator -- add LBO tab
- Add a `Tabs` wrapper with "DCF" and "LBO Model" tabs
- LBO tab with inputs: Purchase price, equity %, debt interest rate, hold period, exit multiple
- Calculate IRR and equity return

---

## Priority 3: Polish & Mobile (Ship Quality)

### 3A. Mobile responsive fixes
- Screening page: wrap filters in a responsive grid instead of horizontal flex
- All data tables: ensure `overflow-x-auto` and sticky first column
- Dashboard metric cards: use `text-xs` for labels on mobile to prevent overflow
- Sidebar on mobile: already works via hamburger menu

### 3B. Remove remaining dead references
- Remove `"Public"` from `STAGES` array in Screening
- Remove `public_market_data` references in icon logic (Screening row shows Globe icon for public type -- switch to always Building2)
- Remove `market_type` checks in stage badge styling

### 3C. Screening page improvements
- Add EBITDA range filter alongside ARR/Revenue filter

---

## Technical Summary

### Files to modify:
1. `src/App.tsx` -- add distressed route
2. `src/components/AppSidebar.tsx` -- add nav item, rename Real Estate
3. `src/pages/Screening.tsx` -- remove public cols/filters, add EBITDA filter, rename ARR to Revenue, fix icons
4. `src/pages/RealEstateIntel.tsx` -- add Off-Market Listings tab
5. `src/pages/Landing.tsx` -- update copy, add feature cards
6. `src/components/ValuationFootballField.tsx` -- make editable
7. `src/components/DCFCalculator.tsx` -- add LBO tab

### No new database migrations needed
All tables and seed data are already in place (35 distressed assets, 25 private listings confirmed).

### Estimated scope
7 files modified, 0 new files, 0 database changes. Focused on wiring up what's already built and polishing for demo.

