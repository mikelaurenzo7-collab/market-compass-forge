

# Institutional Hardening Sweep -- Grapevine OS

## Overview

A comprehensive sweep across the entire platform to elevate visual consistency, data precision, system robustness, security UI, and navigation to institutional-grade standards. This is broken into 5 workstreams that can be executed sequentially.

---

## 1. Visual & UI Consistency ("High-Finance" Aesthetic)

### 1A. Standardize Card Borders & Bento Layouts
- Update `src/index.css`: Replace `glass-premium`, `glass-elevated`, and animated gradient borders with a single, clean card style using `1px solid hsl(var(--border))` and flat `bg-card`. Remove `border-gradient-animated`, `holo-shimmer`, `aurora-gradient`, and `scanlines` CSS utilities that create playful/startup aesthetics.
- Update `MetricCard.tsx`: Strip `TiltCard` wrapper, `glass-premium`, `glow-primary-intense`, and animated gradient top borders. Replace with flat `rounded-lg border border-border bg-card p-4`.
- Update `DealsOverview.tsx`: Restructure the dashboard into a strict Bento grid using `grid grid-cols-12` for precise column alignment across the Pulse Metrics, Bottleneck chart, and deal lists.

### 1B. Typography -- Tabular Numbers
- Already using `font-mono` and `tabular-nums` in some places. Sweep all financial values in `SummaryTab`, `AllocationTab`, `ValuationTab`, `DealsOverview`, `CompanyTable`, and `MetricItem` to ensure every numeric value uses `font-mono tabular-nums` classes.
- Update `MetricItem.tsx` to always apply `font-mono tabular-nums` to the value `<p>` tag.

### 1C. Color Palette Cleanup
- Update CSS variables in `src/index.css`:
  - `--primary`: Change from electric green (`145 100% 39%`) to a professional teal-green (`160 84% 39%`, approximately `#10b981`).
  - `--destructive`: Keep at red but normalize to `0 84% 60%` (matching `#ef4444`).
  - Remove or mute `--brand-purple` references from card backgrounds (keep only in the GV logo).
  - `--chart-4` (purple in charts): Replace with a muted slate blue.
- Remove gradient overlays: `noise-overlay`, `vignette`, `text-glow`, `text-glow-grape`, `text-glow-intense`, `glow-grape`, `border-breathe` utilities from `index.css`. These create a gaming/neon feel inconsistent with institutional platforms.

---

## 2. Data Precision & Logic ("No-Error" Policy)

### 2A. Number Formatting Utility
- Create `src/lib/format.ts` with helper functions:
  - `formatCurrency(value: number): string` -- Returns `$1,250,500.00` format with commas and 2 decimals.
  - `formatCurrencyCompact(value: number): string` -- Returns `$1.25M` for dashboard display.
  - `formatPercent(value: number, decimals = 2): string` -- Returns `12.34%`, capped at 2 decimals.
  - `formatNumber(value: number): string` -- Comma-separated with tabular formatting.
- Sweep all pages (`DealsOverview`, `SummaryTab`, `ValuationTab`, `AllocationTab`, `CompanyTable`, `MetricItem`, `DCFCalculator`) to use these formatters instead of inline `.toFixed()` / `.toLocaleString()` calls.

### 2B. LaTeX for Financial Formulas
- Already using KaTeX in `DealsOverview` for Yield Velocity. Extend to:
  - `ValuationTab.tsx`: Render Cap Rate, WACC, and NPV formulas in KaTeX inside the sensitivity panel and DCF sections.
  - `DCFCalculator.tsx`: Add a LaTeX-rendered formula block showing the DCF equation.
  - `GrapevineScore.tsx`: Show the weighted-average formula in the tooltip breakdown.

### 2C. Zero-State Professionalism
- Audit every tab in the Deal Room and replace bare "No data" text with the existing `EmptyState` component, providing specific CTAs:
  - Diligence: "No documents found. Upload your first PDF to begin extraction."
  - Discussion: "No comments yet. Start the conversation with your deal team."
  - Timeline: "No activity recorded. Stage changes and decisions will appear here."
  - Allocation: "No allocations defined. Add your first capital commitment."
  - Valuation: "No financial data available. Add financials to unlock valuation models."
- Apply the same pattern to `CompanyTable` (no companies), `DealsOverview` (no deals), and `Portfolio` page.

---

## 3. System Robustness ("Bank-Grade" Feel)

### 3A. Global Loading States for Mutations
- Sweep all mutation-triggering buttons across the app:
  - `SummaryTab`: "Save" thesis button, "Generate IC Memo" button (already has `isPending`).
  - `DiscussionTab`: Comment submit, Vote buttons.
  - `AllocationTab`: Add/delete allocation buttons.
  - `DiligenceTab`: Upload document, "Invite External Contributor" button.
  - `DealRoom` header: Stage change `<select>` (already has `disabled={updateStage.isPending}`).
  - `DealsOverview`: "Activate" watched company button.
- Pattern: Add `disabled={mutation.isPending}` and replace button text with `<Loader2 className="h-3.5 w-3.5 animate-spin" />` when pending.

### 3B. Institutional Error Messages
- Update the global `QueryClient` `onError` handler to use professional copy instead of raw error messages.
- Create a `src/lib/errorMessages.ts` map that translates common error patterns (e.g., "row-level security", "permission denied", "network error") into institutional language like:
  - "System was unable to complete this operation. Please verify your permissions or contact an Administrator."
  - "Connection to the data service was interrupted. Please retry in a moment."

### 3C. Skeleton Loaders for Deal Room
- Update `DealRoom.tsx`: Replace the spinning circle loader with `KanbanSkeleton`-style layout skeletons that match the Deal Room header + tab structure.
- Add skeleton states inside each tab component for when their individual queries are loading:
  - `SummaryTab`: Use `MetricsSkeleton` + `CardSkeleton` placeholders.
  - `DiligenceTab`: Use `TableSkeleton` for document list.
  - `ValuationTab`: Use `CardSkeleton` blocks for DCF and comps sections.

---

## 4. Security & Permissions UI ("Need-to-Know" Barrier)

### 4A. RBAC DOM Removal
- The Allocation tab is already filtered from TABS via `canViewAllocation` in `DealRoom.tsx` -- this is correct (DOM removal, not just hiding).
- Extend this pattern:
  - `AppSidebar.tsx`: The Admin link is already conditionally rendered for `admin`/`partner` roles. Verify this also applies to the Settings page "Audit Trail" tab.
  - `SummaryTab.tsx`: Wrap the "Allocated" value display in a `canViewAllocation` check so Contributors/Viewers cannot see capital figures.
  - `DealsOverview.tsx`: Wrap the "Institutional Velocity" section (Total Allocated, Yield Velocity) in an `isAdminOrPartner` check, since these are GP-level metrics.

### 4B. "Last Modified" Accountability Stamps
- Create a small reusable `<LastModified timestamp={string} userId={string} profiles={Record} />` component.
- Add it to:
  - `SummaryTab` -- Investment Thesis card footer.
  - `AllocationTab` -- Each allocation row.
  - `ValuationTab` -- Sensitivity panel.
  - Deal cards on `DealsOverview` -- Show `updated_at` + last actor.

---

## 5. Navigation & Search ("Command" Logic)

### 5A. Deal Room Breadcrumbs
- Already partially implemented in `DealRoom.tsx` (line 287-291: "Deals > CompanyName"). Enhance to include:
  - Sector if available: `Deals > Real Estate > 123 Main St`.
  - Make each segment a clickable link (Deals links to `/deals`, sector could filter the deals list).

### 5B. Command Palette Polish
- Update `CommandPalette.tsx`:
  - Add "Stage" and "Owner" metadata to company search results by joining `deal_pipeline` data in the `search_all` results or via a secondary lookup.
  - Add navigation shortcuts for all major sections: Valuations (`/valuations`), Data Room (`/data-room`), Portfolio (`/portfolio`), Admin (`/admin`), Settings (`/settings`).
  - Show keyboard hint `Stage: Screening | Owner: J. Smith` as subtitle text in `CommandItem`.

---

## Files Modified (Summary)

| File | Changes |
|------|---------|
| `src/index.css` | Remove playful gradients/glows, standardize card styles, adjust color palette |
| `src/lib/format.ts` | **NEW** -- Centralized number/currency/percent formatting |
| `src/lib/errorMessages.ts` | **NEW** -- Institutional error copy map |
| `src/components/MetricCard.tsx` | Strip TiltCard, use flat professional card |
| `src/components/MetricItem` | Add `font-mono tabular-nums` |
| `src/components/SkeletonLoaders.tsx` | Add `DealRoomSkeleton` variant |
| `src/components/LastModified.tsx` | **NEW** -- Accountability timestamp component |
| `src/components/CommandPalette.tsx` | Add stage/owner metadata, more nav shortcuts |
| `src/components/EmptyState.tsx` | Minor refinements for institutional copy |
| `src/pages/DealsOverview.tsx` | Bento grid, format numbers, RBAC gating on GP metrics |
| `src/pages/DealRoom.tsx` | Enhanced breadcrumbs, skeleton loader, RBAC checks |
| `src/components/deal-room/SummaryTab.tsx` | Format numbers, add LastModified, EmptyState, RBAC |
| `src/components/deal-room/ValuationTab.tsx` | KaTeX formulas, format numbers, skeleton |
| `src/components/deal-room/AllocationTab.tsx` | LastModified stamps, isPending states |
| `src/components/deal-room/DiligenceTab.tsx` | EmptyState, isPending on upload |
| `src/components/deal-room/DiscussionTab.tsx` | EmptyState, isPending on submit |
| `src/components/deal-room/TimelineTab.tsx` | EmptyState |
| `src/components/CompanyTable.tsx` | Format numbers with formatCurrency |
| `src/components/GrapevineScore.tsx` | KaTeX formula in tooltip |
| `tailwind.config.ts` | No structural changes needed |
| `src/main.tsx` | Update QueryClient error handler |

---

## Execution Order

1. Create utility files (`format.ts`, `errorMessages.ts`, `LastModified.tsx`)
2. CSS and color palette cleanup (`index.css`, `MetricCard`)
3. Number formatting sweep (all pages/components)
4. Skeleton loaders and loading states
5. RBAC gating and LastModified stamps
6. Command palette and breadcrumb polish
7. EmptyState and LaTeX additions

