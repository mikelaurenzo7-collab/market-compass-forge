

# Platform Reorganization: Clean, Futuristic, Professional

## The Problem

The sidebar currently has **17 navigation items** spread across two sections ("Platform" with 13 items and "Insights" with 4 items). This creates cognitive overload and makes the platform feel sprawling rather than premium. Several modules overlap in purpose (e.g., Discover vs Companies, Sector Momentum vs Competitive Intel), and the grouping doesn't tell a clear story.

## The Vision

Reorganize into **5 clear groups** with a maximum of 3-4 items each. The sidebar should feel like a Bloomberg terminal's left rail -- tight, purposeful, no wasted space. Every item earns its spot.

## New Sidebar Architecture

```text
COMMAND CENTER
  Dashboard             (home base -- metrics, signals, pipeline)

MARKETS
  Private Markets       (was "Private Companies" + "Discover" merged)
  Public Markets        (stays)
  Global Markets        (stays -- cross-border & international)

DEAL ENGINE
  Deal Flow             (pipeline kanban + transactions)
  AI Deal Matcher       (AI-powered matching)
  Valuations            (DCF, comps, football field)

INTELLIGENCE
  Research & AI         (chat + memos)
  Intelligence Feed     (news, signals, competitive intel merged)
  Sector Pulse          (sector momentum + macro matrix combined)

ALTERNATIVES
  Real Estate           (off-market listings)
  Distressed Assets     (distressed opportunities)
  Fund Intelligence     (LP/GP data)
```

Plus the bottom rail: Alerts, Watchlists, Settings, Admin (role-gated).

## Key Decisions

1. **Merge "Discover" into "Private Markets"** -- Discover is just a filtered view of companies. The Companies page will absorb Discover's preset filters as tabs/chips at the top.

2. **Merge "Competitive Intel" into "Intelligence Feed"** -- Competitive signals are intelligence. The Intelligence Feed page will get a new "Competitive" tab alongside PE/M&A, Real Estate, Venture, etc.

3. **Merge "Sector Momentum" + "Macro Matrix" into "Sector Pulse"** -- One page with two tabs: Momentum (capital flows, rotation map) and Macro (impact matrix, cross-asset grid). Eliminates a standalone page.

4. **Promote "Watchlists" to bottom rail** -- It's a utility/workflow tool, not a content module. Sits alongside Alerts and Settings.

5. **Remove "Document Analyzer" from sidebar** -- It's a tool, not a destination. Access it from Research & AI page as a tab, or from the Command Palette (Cmd+K).

## Visual & UX Improvements

### Sidebar Refresh
- **Section dividers**: Thin 1px lines with subtle primary glow between groups instead of text labels (cleaner, more futuristic)
- **Active state**: Left accent bar (2px primary) + subtle bg glow instead of just bg-accent
- **Hover micro-animation**: Slight scale(1.01) + glow on hover for premium feel
- **Group icons**: Each section header gets a tiny decorative dot in primary color
- **Collapsed state**: Show group separator dots for orientation

### AppLayout Header
- Replace plain search bar with a frosted-glass search pill with a subtle pulse ring on the border
- Add a slim "status strip" below the header showing connection status and data freshness in a futuristic mono font

### Dashboard Polish
- Metric cards get a subtle gradient border that pulses on data refresh
- Section transitions use staggered fade-up animations (already partially implemented)

### Global Page Transitions
- Ensure all pages use consistent PageTransition wrapper with the same animation curve

## Technical Plan

### Files Modified

1. **`src/components/AppSidebar.tsx`** -- Complete restructure of navigation groups:
   - New groups: Command Center, Markets, Deal Engine, Intelligence, Alternatives
   - Subtle separator styling between groups
   - Active state with left accent bar
   - Hover micro-animations via Tailwind

2. **`src/App.tsx`** -- Route cleanup:
   - Remove `/discover` route (redirect to `/companies`)
   - Remove `/competitive-intel` route (redirect to `/intelligence`)
   - Remove `/sector-momentum` route (new route `/sector-pulse`)
   - Remove `/documents` standalone route (embed in `/research`)
   - Add `/sector-pulse` route
   - Add legacy redirects for removed paths

3. **`src/pages/Companies.tsx`** -- Absorb Discover:
   - Add preset filter chips from Discover (Growth Stage, Unicorn Hunters, Quick Bets) as a top bar
   - Keep existing table view as default, add card grid toggle from Discover

4. **`src/pages/IntelligenceFeed.tsx`** -- Absorb Competitive Intel:
   - Add "Competitive" as a new category tab
   - Pull in the competitive signals logic from CompetitiveIntel

5. **`src/pages/SectorPulse.tsx`** (new) -- Merge Sector Momentum + Macro Matrix:
   - Two main tabs: "Momentum" and "Macro Impact"
   - Momentum tab contains the existing sector momentum charts
   - Macro tab contains the MacroImpactMatrix component

6. **`src/pages/Research.tsx`** -- Add Document Analyzer tab:
   - Three tabs: "AI Chat", "Investment Memo", "Document Analyzer"

7. **`src/components/AppLayout.tsx`** -- Header visual upgrade:
   - Frosted glass search pill styling
   - Slim data freshness indicator

8. **`src/index.css`** -- New utility classes:
   - `.sidebar-active` with left border accent + glow
   - `.sidebar-glow-separator` for group dividers
   - Refined hover transitions

9. **`src/hooks/useHotkeys.ts`** -- Update SIDEBAR_ROUTES array to match new navigation order

### Files Removed (content absorbed elsewhere)
- `src/pages/Discover.tsx` -- Logic merged into Companies
- `src/pages/CompetitiveIntel.tsx` -- Logic merged into IntelligenceFeed
- `src/pages/SectorMomentum.tsx` -- Logic moved to SectorPulse

### Estimated Scope
- 8-10 files modified
- 1 new file created (SectorPulse.tsx)
- 3 files deprecated (content merged, files kept with redirect exports)
- No database changes required
- No edge function changes required

