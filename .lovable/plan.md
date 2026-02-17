

# Customizable Dashboard with Highlighted Core Features

## Overview

Transform the Command Center dashboard into a user-customizable layout that surfaces the most valuable features by default while letting users drag, reorder, show/hide, and resize widgets. The design follows a "smart defaults, full control" philosophy -- new users see the highest-value layout immediately, power users can tailor it to their workflow.

## Default Widget Order (Most Common Use Cases First)

1. **Morning Briefing** -- AI-synthesized daily digest (collapsible)
2. **Quick Actions Bar** -- NEW: One-click access to "Analyze Document", "Generate Memo", "AI Research", "Match Deals"
3. **Key Metrics** -- 4 stat cards (Deal Value, Companies, Distressed, Pipeline)
4. **Alpha Signals** -- AI sector analysis with reasoning
5. **Companies Table** -- Top companies by valuation (2/3 width)
6. **Pipeline Deals** -- User's active deal pipeline (1/3 width sidebar)
7. **Watchlists** -- Saved company groups (1/3 width sidebar)
8. **Distressed Opportunities** -- Active distressed assets (1/3 width sidebar)
9. **News Wire** -- Compact intelligence feed (full width)

## New: Quick Actions Bar

A prominent horizontal bar below the hero header with 4-5 large action buttons that surface the platform's AI differentiators:

- **AI Research** -- opens /research
- **Generate Memo** -- opens /research with memo tab
- **Analyze Document** -- opens /research with document tab
- **Match Deals** -- opens /deal-matcher
- **Screen Companies** -- opens /companies

Each button has an icon, label, and short description. This replaces the need for users to discover these features buried in the sidebar.

## Customization System

### User Preferences Storage
- Add a `dashboard_widgets` JSONB column to the `profiles` table
- Schema: `{ widgets: [{ id: string, visible: boolean, order: number }], layout?: string }`
- Default value: null (uses built-in defaults)

### Customize UI
- A small "Customize" gear icon in the dashboard hero header (not a full panel)
- Clicking it opens an overlay/modal with a simple toggle list of widgets (show/hide each)
- Drag handles on each toggle to reorder
- "Reset to defaults" button
- Changes save automatically to the profiles table

### Widget IDs
Each dashboard section gets a stable ID:
- `morning-briefing`
- `quick-actions`
- `metrics`
- `alpha-signals`
- `companies-table`
- `pipeline-deals`
- `watchlists`
- `distressed`
- `news-wire`

## Technical Implementation

### Database Migration
Add `dashboard_widgets` JSONB column to `profiles`:
```sql
ALTER TABLE profiles ADD COLUMN dashboard_widgets jsonb DEFAULT NULL;
```

### New Files
1. **`src/hooks/useDashboardLayout.ts`** -- Hook that reads/writes widget preferences from profiles table. Returns ordered, visible widget list and update function.
2. **`src/components/QuickActions.tsx`** -- The new Quick Actions bar component highlighting AI capabilities.
3. **`src/components/DashboardCustomizer.tsx`** -- Modal/sheet with toggle list and drag-to-reorder for widgets.

### Modified Files
1. **`src/pages/Index.tsx`** -- Refactor dashboard to render widgets dynamically based on user preferences from `useDashboardLayout`. Each widget section becomes a named component rendered via a widget map. Add the Quick Actions bar. Add the customize button to the hero header.
2. **`src/components/OnboardingFlow.tsx`** -- Fix the "Go to Screening" link (step 2) to point to `/companies` instead of `/screening` since Screening was merged.

### Widget Rendering Pattern
```typescript
const WIDGET_MAP = {
  'morning-briefing': MorningBriefingWidget,
  'quick-actions': QuickActions,
  'metrics': MetricsRow,
  'alpha-signals': AlphaSignalsWidget,
  'companies-table': CompaniesWidget,
  // sidebar widgets handled separately
  'pipeline-deals': RecentPipelineDeals,
  'watchlists': WatchlistWidget,
  'distressed': DistressedWidget,
  'news-wire': NewsFeedWidget,
};

// Render in user-defined order, skip hidden ones
{visibleWidgets.map(w => {
  const Component = WIDGET_MAP[w.id];
  return Component ? <Component key={w.id} /> : null;
})}
```

### Layout Logic
- Main content widgets (morning-briefing, quick-actions, metrics, alpha-signals) render full-width in order
- The 3-column grid section renders companies-table (2/3) + sidebar widgets (1/3)
- Sidebar widget order is also customizable
- If a user hides all sidebar widgets, companies-table goes full width

## Summary of Changes

| Change | Purpose |
|--------|---------|
| Add `dashboard_widgets` column to profiles | Persist user layout preferences |
| Create QuickActions bar | Surface AI features (memos, research, docs) prominently |
| Create DashboardCustomizer modal | Let users toggle and reorder widgets |
| Create useDashboardLayout hook | Read/write preferences, provide defaults |
| Refactor Index.tsx to dynamic rendering | Enable customizable widget order |
| Fix OnboardingFlow screening link | Correct stale /screening path |

