

# Grapevine Platform Audit -- Founder's Perspective

## Executive Summary

The platform has strong bones but suffers from **feature bloat, unclear data visualization, and too many widgets competing for attention**. An investor walking through a demo would be overwhelmed. A user would struggle to find the 3-4 things that actually matter. This plan strips it down to what's genuinely useful and highlights the AI capabilities that differentiate Grapevine.

---

## What to REMOVE (Confusing or Not Useful)

### Dashboard (Index.tsx) -- The Biggest Problem Area

1. **"Deal Flow & Volume" chart** -- The area chart showing "Capital ($B)" by month is unclear. The Y-axis shows numbers like 10, 20, 30 but the legend says "$B" -- is it $30 billion? The data is from `funding_rounds` aggregated by month but the visual tells no story. **REMOVE.**

2. **"Sector Activity" bar chart** -- Shows horizontal bars with numbers (0-600) but no label explaining what the numbers represent. Are those deals? Companies? The tooltip just says "deals: 547" which is the `deal_count_trailing_12m` from the sectors table but the user has no context for whether 547 is good or bad. **REMOVE.**

3. **"Data Sources" badge** -- Shows "SEC EDGAR / Firecrawl / Proprietary" as a static widget. This is marketing copy, not actionable intelligence. It wastes prime dashboard real estate. **REMOVE.**

4. **"Today's Usage" meters** -- Shows AI Queries 0/200, Memos 0/100, Enrichments 0/100. This is internal product mechanics, not user value. An investor doesn't want to see rate limits on the homepage. **REMOVE from dashboard** (keep in Settings only).

5. **Ticker Tape (status strip)** -- The scrolling bar with "S&P 500 Level: 5980" and "CBOE VIX Index: 12.01" etc. is confusing for a private markets platform. Even after the public-market removal effort, it still shows S&P and VIX data. Contains a mix of real macro data and stale/synthetic numbers. **REMOVE entirely** -- it adds visual noise without actionable insight.

6. **"LIVE" badge and live indicator dots** -- Multiple "LIVE" indicators (header badge, status strip, news wire) feel performative. Keep one subtle indicator, remove the rest.

7. **"BETA" badge in header** -- Fine on landing page, redundant in the app header.

8. **Onboarding Flow** -- The multi-step onboarding widget is fine conceptually but clutters the dashboard for returning users. Keep it but make it dismissible (it already is, just verify).

9. **Dashboard "Customize" button with widget toggles** -- Overengineered for current stage. Users don't need 10 toggle switches. Just show the best layout.

### Sidebar -- Too Many Items

10. **"Portfolio" page** -- Separate portfolio tracking page with limited utility when Pipeline already exists in Deal Flow. **REMOVE from sidebar** -- merge any useful bits into Deal Flow.

11. **"Screening" vs "Private Markets"** -- These overlap significantly. Both let you browse/filter companies. **MERGE Screening into Private Markets** as a filter panel.

12. **"Intelligence Feed" vs "News Wire" on dashboard** -- The Intelligence Feed page and the dashboard News Wire widget show similar content. Keep Intelligence Feed as a page, remove the redundant dashboard widget or make it link cleanly.

13. **"Sector Pulse"** -- Has useful rotation analysis but requires data to be meaningful. The empty states are frequent. **KEEP but simplify** -- remove the sub-toggles (Flows vs Rotation views) and show one clean view.

14. **"Document Analyzer" as separate sidebar item** -- It's already a tab inside Research & AI. Having it in both places is confusing. **REMOVE from sidebar** (keep as tab in Research).

### Other Pages

15. **"API Docs" (Developers page)** -- Pre-revenue beta product shouldn't prominently feature API documentation in the main nav. **MOVE to Settings sub-section.**

16. **Keyboard shortcuts modal, Compare Mode** -- Power-user features that add complexity. Keep shortcuts, **remove Compare Mode** for now.

---

## What to KEEP and HIGHLIGHT

### Core Value Features (Promote These)

1. **AI Research & Chat** -- The ability to select a company and chat with AI about it, get deep analysis. This is the core differentiator. **Make this more prominent.**

2. **Investment Memo Generator** -- One-click IC-ready memos. High-value, instant wow factor. **Feature prominently.**

3. **Morning Briefing** -- AI-synthesized overnight digest. Genuinely useful. **KEEP at top of dashboard.**

4. **Alpha Signals** -- AI-generated sector signals with reasoning. Strong feature. **KEEP but clean up the macro bar** inside it (remove S&P/VIX references).

5. **Deal Pipeline (Kanban)** -- Clean drag-and-drop pipeline management with stages. Core workflow. **KEEP.**

6. **Company Database + Screening filters** -- 844 companies with sector/stage/revenue filters. **KEEP as unified "Companies" page.**

7. **Distressed Assets** -- Unique dataset, clear value prop. **KEEP.**

8. **Document Analyzer** -- Upload CIMs/PPMs, extract metrics. Strong feature. **KEEP inside Research.**

9. **Valuation Toolkit** -- DCF, comps, football field. Solid toolset. **KEEP.**

10. **AI Deal Matcher** -- Strategic deal matching. Differentiator. **KEEP.**

---

## Restructured Dashboard Layout

The new dashboard should tell a clear story in this order:

```text
+------------------------------------------+
| Command Center (header)                   |
+------------------------------------------+
| Morning Briefing (collapsible)            |
+------------------------------------------+
| Alpha Signals (AI sector analysis)        |
+------------------------------------------+
| 4 Metric Cards (clean, clear labels)      |
| Deal Value | Companies | Distressed | Pipeline |
+------------------------------------------+
| Companies Table        | Your Pipeline    |
|                        | Watchlists       |
|                        | Distressed Opps  |
+------------------------------------------+
| News Wire (compact)                       |
+------------------------------------------+
```

**Removed from dashboard:** Deal Flow chart, Sector Activity chart, Data Sources badge, Usage Meters, Off-Market widget, Global Pulse widget, Ticker Tape, Customize panel.

---

## Restructured Sidebar

```text
COMMAND CENTER
  Dashboard

MARKETS
  Companies (merged Private Markets + Screening)
  Global Markets
  Distressed Assets
  Real Estate

DEAL ENGINE
  Deal Flow (includes former Portfolio)
  AI Deal Matcher
  Valuations

INTELLIGENCE
  Research & AI (includes Doc Analyzer tab)
  Intelligence Feed
  Sector Pulse

---
Alerts
Settings (includes API Docs, Usage)
```

**Removed:** Portfolio, Screening (merged), Document Analyzer (duplicate), API Docs (moved to Settings), Fund Intelligence sidebar item (merge into global or keep as-is based on usage).

---

## Technical Changes Summary

### Files to Modify

1. **`src/pages/Index.tsx`** -- Remove DealFlowChart, SectorHeatmap, DataSourcesBadge, UsageMeters, OffMarketWidget, GlobalPulseWidget, customization panel. Simplify to: Morning Briefing, Alpha Signals, Metric Cards, Company Table, Pipeline widget, Watchlist widget, Distressed widget, News Feed.

2. **`src/components/AppLayout.tsx`** -- Remove Ticker Tape component and status strip. Remove "BETA" badge from header. Simplify to just search bar + alerts bell.

3. **`src/components/AppSidebar.tsx`** -- Restructure NAV_GROUPS: remove Portfolio, Screening, Document Analyzer as separate items. Move API Docs under Settings.

4. **`src/App.tsx`** -- Add redirect from `/portfolio` to `/deals`, `/screening` to `/companies`. Remove `/document-analyzer` route (handled as tab in Research).

5. **`src/components/Charts.tsx`** -- Can be deleted entirely (DealFlowChart and SectorHeatmap removed).

6. **`src/components/TickerTape.tsx`** -- Delete entirely.

7. **`src/components/AlphaSignalWidget.tsx`** -- Clean up MacroBar to remove public market indicators (S&P 500, VIX). Only show private-market-relevant macro data (Fed Funds, 10Y Treasury, Unemployment).

8. **`src/components/CompareMode.tsx`** -- Delete or keep but remove keyboard shortcut and sidebar reference.

9. **`src/components/UsageMeters.tsx`** -- Remove from dashboard import. Keep component for use in Settings page only.

10. **`src/pages/Screening.tsx`** -- Merge filtering capabilities into Companies page. The Screening page becomes a redirect.

11. **`src/components/DataSourcesPanel.tsx`** -- Remove dashboard references (still useful in Admin).

### Files to Delete

- `src/components/Charts.tsx`
- `src/components/TickerTape.tsx`

### Sidebar Navigation Count

- **Before:** 19 items (including bottom items)
- **After:** 14 items -- a 26% reduction in cognitive load

