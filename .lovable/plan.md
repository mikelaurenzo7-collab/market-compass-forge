
# Grapevine Platform Audit & Rebrand Plan
## Co-Founder Review: UX, Data Integrity, Branding, and Vision Alignment

---

## Part 1: Critical Issues Found

### 1A. Data Integrity Bug -- Private vs Public Markets
The Private Markets page (`/companies`) currently loads ALL 7,844 companies (844 private + 7,000 public) because `useCompaniesWithFinancialsAll` does not filter by `market_type`. The subtitle says "X private companies tracked" but the number includes public companies. This is misleading to users and investors.

**Fix:** Add `.eq("market_type", "private")` filter to the private markets query (or filter out `market_type = "public"` records). The Public Markets page correctly filters using `.eq("market_type", "public")` already.

### 1B. Broken Sidebar Link
The sidebar has "Platform Metrics" pointing to `/metrics`, but no route exists for it in `App.tsx`. The `InvestorMetrics` page component is imported but never wired up. This is a dead link -- users click and get a 404.

**Fix:** Either add the route (`/metrics` -> `InvestorMetrics`) or remove the sidebar item since it's an admin-facing concern.

### 1C. Landing Page Scroll Issue
The waitlist form and platform stats are cut off below the fold on the landing page. The form isn't visible without scrolling, which kills conversions.

---

## Part 2: Purple + Green Rebrand -- "Grape" Identity

The current brand is pure electric green (#00C853). The vision: green and purple are the colors of grapes. We introduce a rich purple as the secondary brand color, with the "GV" logo rendered in purple everywhere.

### Color System Changes

**New CSS variables (added to `:root`):**
- `--brand-purple: 270 60% 55%` -- the primary purple (a majestic amethyst)  
- `--brand-purple-foreground: 0 0% 100%`
- Update `--accent` to use the purple tint: `270 40% 14%`
- Update `--accent-foreground` to purple: `270 60% 55%`
- Update `--sidebar-accent` to purple-tinted: `270 30% 12%`
- Introduce `--chart-6: 270 60% 55%` for a purple chart option

### Logo Treatment -- "GV" in Purple Site-Wide
Every instance of the GV logo block (Landing, Sidebar, Auth page, mobile header) will use a purple background with white text instead of the green background. The glow/shadow effects shift to purple hues.

**Affected locations:**
- `AppSidebar.tsx` -- logo block (line 156)
- `Landing.tsx` -- hero logo (line 108) and nav logo (line 82)
- `Auth.tsx` -- login page logo
- `AppLayout.tsx` -- if any logo reference exists in header

### Gradient & Ambient Updates
- Landing page ambient orbs: blend green AND purple radials for a grape-inspired aurora
- Sidebar group dividers: gradient from green to purple (`from-primary/20 via-[hsl(270,60%,55%,0.15)] to-transparent`)
- Glass card premium variant: add subtle purple shimmer edge
- `holo-shimmer` utility: incorporate purple into the gradient sweep

---

## Part 3: Sidebar Cleanup & Navigation Architecture

### Current Navigation Groups (Clean but has issues)

```text
COMMAND CENTER
  Dashboard
  Platform Metrics  <-- BROKEN LINK (no route)

MARKETS
  Private Markets   <-- Shows ALL companies (bug)
  Public Markets
  Global Markets

DEAL ENGINE
  Deal Flow
  AI Deal Matcher
  Valuations
  Screening
  Portfolio

INTELLIGENCE
  Research & AI
  Intelligence Feed
  Sector Pulse
  Document Analyzer

ALTERNATIVES
  Real Estate
  Distressed Assets
  Fund Intelligence
```

### Proposed Changes
1. **Remove "Platform Metrics"** from Command Center (or wire it up as admin-only like the Admin link). For now, remove it -- metrics data belongs in the Admin dashboard.
2. **Move "Portfolio"** from Deal Engine to Command Center. Portfolio is a top-level concern, not a deal workflow step. Users want quick access to their holdings.
3. **Move "Screening"** from Deal Engine to Intelligence. Screening is a research/discovery activity, not a deal execution step.
4. **Rename group separators** with purple accent dots instead of green.

### Revised Sidebar Structure

```text
COMMAND CENTER
  Dashboard
  Portfolio

MARKETS
  Private Markets (844 companies)
  Public Markets (7,000 companies)
  Global Markets

DEAL ENGINE
  Deal Flow
  AI Deal Matcher
  Valuations

INTELLIGENCE
  Research & AI
  Screening
  Intelligence Feed
  Sector Pulse
  Document Analyzer

ALTERNATIVES
  Real Estate
  Distressed Assets
  Fund Intelligence
```

---

## Part 4: Visual Polish -- "Majestic Yet Useful"

### 4A. Landing Page Elevation
- Purple GV logo with green-to-purple gradient glow behind it
- Add a subtle animated grape-vine tendril SVG pattern as background decoration
- Upgrade the "Beta -- Building in Public" badge to use a purple/green gradient border
- Platform stats: show accurate numbers (844 private companies, 7,000+ public, 45+ distressed)
- More prominent CTA button with purple-to-green gradient

### 4B. Sidebar Polish
- GV logo: purple square with white text, purple glow shadow
- Active nav item: keep the green left bar indicator (it pops against the dark sidebar)
- Group label dots: alternate between green and purple
- Collapse/expand button: subtle purple hover state
- Bottom section: add a small "Grapevine" wordmark with grape emoji when expanded

### 4C. Header Bar Enhancement
- "BETA" badge: shift to purple-tinted with purple border
- The "LIVE" indicator in the status strip: keep green (it semantically means live/active)
- Add a subtle purple gradient line at the very top of the viewport (1px brand bar)

### 4D. Card & Surface Upgrades
- `glass-premium` utility: add `hsl(270 60% 55% / 0.04)` to the linear gradient for a purple undertone
- Active/selected states across the app: use purple tint instead of only green
- Score badges in company tables: keep the existing grade colors (they're semantic)

---

## Part 5: Page-Level Accuracy Fixes

### Private Markets (`/companies`)
- Filter query to only show `market_type = "private"` (or null for legacy records)
- Subtitle: "844 private companies tracked" (accurate)
- Page title: keep "Companies" but subtitle should say "Private market intelligence"

### Public Markets (`/public-markets`)  
- Already correctly filtered. Subtitle says "X public companies tracked via SEC EDGAR" -- accurate.
- No changes needed.

### Dashboard (`/dashboard`)
- The `companyCount` in the batch query counts ALL companies (7,844). Should show private + public as separate metrics, or clarify "Total Companies Tracked: 7,844 (844 Private / 7,000 Public)".

### Landing Page Stats
- Update from hardcoded "150+ Companies Tracked" to actual numbers or remove specific counts since they're synthetic.

---

## Technical Implementation Summary

| Change | Files Modified |
|--------|---------------|
| Purple color variables | `src/index.css` |
| Purple in Tailwind config | `tailwind.config.ts` |
| GV logo purple everywhere | `AppSidebar.tsx`, `Landing.tsx`, `Auth.tsx` |
| Fix private markets filter | `src/hooks/useData.ts` (add market_type filter) |
| Remove broken metrics link | `AppSidebar.tsx` |
| Reorganize sidebar groups | `AppSidebar.tsx` |
| Landing page rebrand | `Landing.tsx` |
| Header BETA badge purple | `AppLayout.tsx` |
| Glass card purple tint | `src/index.css` (glass-premium) |
| Dashboard accurate counts | `src/pages/Index.tsx` |
| Holo-shimmer purple blend | `src/index.css` |
| Auth page logo | `src/pages/Auth.tsx` |
| Product footer update | `src/components/ProductFooter.tsx` |

Total estimated changes: ~15 files, primarily CSS/branding with one critical data query fix.
