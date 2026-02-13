
# Full Product Audit, Real-Time Data Integration, and Expansion Plan

## Part 1: Product Audit -- Current State

### Data Reality Check

| Asset Class | DB Records | Status |
|---|---|---|
| Private Companies | 841 | Seeded with synthetic data, functional |
| Public Companies | 0 | Table exists, seeder built, but never executed -- page is empty |
| Public Market Data | 0 | No ticker/price/market cap data at all |
| Distressed Assets | 301 | Well-populated, functional |
| Off-Market Real Estate | 200 | Populated, functional |
| Global Opportunities | 80 | Freshly seeded, functional |
| Intelligence Signals | 385 | AI-generated, functional |
| News Articles | 60 | Sparse but functional |
| Funds | 65 | Populated |
| LP Entities | 51 | Populated |
| Investors | 401 | Well-populated |
| Financials | 967 | Populated for private companies |
| Funding Rounds | 706 | Well-populated |
| Relationship Edges | 0 | Table created but never populated |
| Deal Transactions (precedent) | 70 | Populated |
| Precedent Transactions | 57 | Populated |
| CRE Transactions | 65 | Populated |
| CRE Market Data | 92 | Populated |

### Real-Time Subscriptions Audit

Only **2 components** use Supabase Realtime:
1. `NewsFeed.tsx` -- listens for new `news_articles` INSERTs
2. `SharedNotes.tsx` -- listens for changes on company notes

**All other pages** are static query-only. No realtime on:
- Deal Pipeline (drag-and-drop stage changes by teammates are invisible)
- Intelligence Signals (no live updates)
- Distressed Assets (no notifications on new listings)
- Global Opportunities (no live feed)
- Alert Notifications (no live badge updates)
- Activity Events (no live feed on dashboard)

### Critical Gaps Identified

1. **Public Markets is completely empty** -- the SEC seeder exists but was never run; 0 public companies, 0 market data rows, 0 CIK numbers
2. **Relationship Graph has no data** -- the `relationship_edges` table was created but never populated from existing `investor_company`, `key_personnel`, and `fund_commitments` data
3. **No realtime on 90% of pages** -- only News Feed and Shared Notes have live subscriptions
4. **Dashboard "Data as of" is misleading** -- it shows the latest activity event date, not actual data freshness
5. **Companies page shows only private** -- filtering by `market_type` is not applied, but since public_companies count is 0, this is moot

---

## Part 2: Real-Time Data Integration

### Add Supabase Realtime subscriptions to all key tables

**Tables to enable realtime on (via migration):**
- `intelligence_signals`
- `distressed_assets`
- `global_opportunities`
- `deal_pipeline`
- `alert_notifications`
- `activity_events`

**Components to add realtime listeners:**

| Component/Page | Table | Event | Behavior |
|---|---|---|---|
| `IntelligenceFeed.tsx` | `intelligence_signals` | INSERT | Auto-append new signals with fade-in animation |
| `DistressedAssets.tsx` | `distressed_assets` | INSERT/UPDATE | Invalidate query, show toast for new listings |
| `GlobalMarkets.tsx` | `global_opportunities` | INSERT/UPDATE | Invalidate query, show toast |
| `Deals.tsx` | `deal_pipeline` | UPDATE | Auto-refresh kanban when a teammate moves a deal |
| `Alerts.tsx` | `alert_notifications` | INSERT | Live badge counter + toast notification |
| `Index.tsx` (Dashboard) | `activity_events` | INSERT | Refresh dashboard metrics and activity feed |
| `Portfolio.tsx` | `portfolio_positions` | * | Refresh positions when changed |

### Implementation pattern (consistent across all pages):
```text
useEffect(() => {
  const channel = supabase
    .channel('table-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'target_table' }, () => {
      queryClient.invalidateQueries({ queryKey: ['relevant-key'] });
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [queryClient]);
```

---

## Part 3: Expansion and Perfection

### 3a. Populate the Relationship Graph

Create a backend function `populate-relationships` that:
- Reads all `investor_company` records and creates edges: investor -> company (type: "invested_in")
- Reads `key_personnel` and creates edges: person -> company (type: "board_member" or "executive")
- Reads `fund_commitments` and creates edges: LP -> fund (type: "committed_to")
- Discovers co-investor links: if two investors share 2+ portfolio companies, create an edge (type: "co_investor")
- Inserts into `relationship_edges` with deduplication

### 3b. Seed Public Companies

Run the existing `seed-public-companies` edge function to populate ~10,000+ companies from SEC EDGAR, then add a "Refresh Market Data" button that fetches live prices (or triggers the existing SEC filings pipeline).

### 3c. Dashboard Improvements

- Add a "Last Refreshed" timestamp that tracks the actual most recent data update across all tables
- Add realtime counters for new signals/alerts since last visit
- Show a "New since last visit" badge on sidebar nav items

### 3d. Live Status Indicators

Add a consistent "LIVE" pulse indicator to all realtime-enabled pages (same pattern as NewsFeed and IntelligenceFeed), so users know data is streaming.

---

## Technical Details

### Database Migration

```text
-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.intelligence_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.distressed_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_opportunities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_pipeline;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_positions;
```

### Files to Modify

| File | Change |
|---|---|
| `src/pages/IntelligenceFeed.tsx` | Add realtime subscription + LIVE indicator |
| `src/pages/DistressedAssets.tsx` | Add realtime subscription + LIVE indicator + toast on new listings |
| `src/pages/GlobalMarkets.tsx` | Add realtime subscription + LIVE indicator |
| `src/pages/Deals.tsx` | Add realtime subscription for pipeline changes |
| `src/pages/Alerts.tsx` | Add realtime subscription for new notifications |
| `src/pages/Index.tsx` | Add realtime subscription for activity events + signals |
| `src/pages/Portfolio.tsx` | Add realtime subscription for position changes |
| `src/components/AppSidebar.tsx` | Add live unread count badge for alerts |

### Files to Create

| File | Purpose |
|---|---|
| `supabase/functions/populate-relationships/index.ts` | Populate relationship_edges from existing data |

### Implementation Sequence

1. Database migration -- enable realtime on 7 tables
2. Add realtime subscriptions to all 8 pages/components listed above
3. Add LIVE pulse indicators to IntelligenceFeed, DistressedAssets, GlobalMarkets, Dashboard
4. Create and deploy `populate-relationships` edge function
5. Add "Populate Graph" trigger to the People page or RelationshipGraph component
6. Add sidebar alert badge with live unread count
7. Test end-to-end realtime across all pages
