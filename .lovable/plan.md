
# Grapevine CTO Roadmap — Capital Lifecycle OS

## Vision
Own the decision. From first signal to final wire. One system for the entire capital lifecycle.

---

## ✅ SHIPPED (v1 Audit)

### P0 — Critical Fixes
- [x] Deleted `Index.tsx` and `Developers.tsx` (dead code)
- [x] Rewired `OnboardingFlow` to lifecycle routes + OS copy
- [x] Fixed Auth.tsx and Help.tsx stale copy
- [x] Tightened `scheduler_runs` RLS to `service_role` only

### P1 — Functional Improvements
- [x] Embedded DCF Calculator + Comp Table Builder in Valuation tab
- [x] Wired document upload in Diligence tab
- [x] Display names in comments (profiles join)
- [x] Loading states on votes, comments, stage changes, uploads

### P2 — Component Extraction
- [x] Extracted DealRoom into 7 modular tab components under `src/components/deal-room/`
- [x] DealRoom.tsx reduced from 1111 lines to ~250 lines (orchestrator only)

### P3 — Strategic Features
- [x] Realtime subscriptions on `deal_comments`, `deal_votes`, `decision_log`, `deal_allocations`
- [x] IC Memo Generation button in Summary tab
- [x] Memo output renders inline with full structured sections

---

## 🔥 PHASE 2 — CTO EXPANSION

### P0 — Product Integrity (Ship Before Any Demo)

#### 0.1 Promote Decision Journal to Sidebar
The Decision Journal (`/decisions`) is one of our 3 core differentiators ("Decision Memory") but it's hidden under legacy tools with no sidebar link. Every PE partner who sees this feature says "this is what we've been building in Excel for 10 years."

**Fix:** Add to sidebar nav between Portfolio and Alerts. Icon: `BookOpen`.

#### 0.2 DRY Up Stage Constants
`STAGE_LABELS` and `STAGE_COLORS` are duplicated across 3 files: `DealFlow.tsx`, `DealsOverview.tsx`, and `deal-room/types.ts`. Any stage name change requires 3 edits.

**Fix:** Import from `deal-room/types.ts` everywhere. Add `STAGES` array to that file.

#### 0.3 Update AICopilot Page Context Map
`AICopilot.tsx` still references `/dashboard`, `/companies`, `/intelligence`, `/screening`, `/research` — all dead routes. The copilot gives wrong context for every page.

**Fix:** Update `PAGE_CONTEXT` to match current routes: `/discover`, `/deals`, `/deals/:id`, `/portfolio`, `/decisions`, `/alerts`, `/settings`.

#### 0.4 Fix CommandPalette Navigation
`CommandPalette.tsx` navigates all results to `/discover` regardless of type. Company clicks should open a Deal Room, not just go to Discover.

**Fix:** When selecting a company from search, call `openRoom` mutation to create/find a pipeline deal and navigate to `/deals/:id`.

### P1 — UX Polish (Differentiation Details)

#### 1.1 Realtime Toast Notifications
Realtime subscriptions currently silently invalidate queries. When a teammate comments on your deal or casts a vote, you should see a toast: "Alex commented on Anthropic deal."

**Fix:** Add toast notifications in DealRoom.tsx realtime handler, showing the event type and actor name.

#### 1.2 Mark All Notifications Read
The Alerts page shows notifications but has no "Mark all as read" button. Users with 30+ notifications have to click each one.

**Fix:** Add bulk "Mark all read" mutation.

#### 1.3 Replace prompt() Dialogs
Portfolio page uses `prompt("Portfolio name:")` for creating portfolios. This is amateur UX for a $599/mo product.

**Fix:** Replace with inline form or dialog component.

#### 1.4 Global Activity Feed
`team_activity` table exists but is only shown buried in Settings → Team tab. Team activity should be visible from the main layout — either in a collapsible sidebar panel or as a dedicated route.

**Fix:** Add activity feed to DealsOverview page as a sidebar widget, replacing the current "Recent Activity" (which only shows decision_log) with the full team_activity feed.

### P2 — Architecture & Code Quality

#### 2.1 TeamManager Refactoring
`TeamManager.tsx` is 261 lines with 3 sections (members, invites, activity) that should be separate components.

**Fix:** Extract `TeamMembersList`, `InviteForm`, `TeamActivityFeed`.

#### 2.2 Type Safety on Deal Queries
Multiple files cast `deal.companies as any`. This loses type safety.

**Fix:** Create proper TypeScript interfaces for joined query results.

#### 2.3 Consistent Error Boundaries
Only `AppLayout` has an `ErrorBoundary`. Individual pages crash silently.

**Fix:** Wrap each major page section in error boundaries with fallback UI.

### P3 — Strategic Differentiation

#### 3.1 Relationship Graph Visualization
`populate-relationships` edge function builds investor-company, co-investor, and executive edges. There's NO UI to visualize this. A relationship graph is the "wow" moment in every PE platform demo.

**Fix:** Build a force-directed graph visualization using d3-force (already installed) on the Discover page. Show investor networks, co-investment patterns, and board connections.

#### 3.2 Deal Room Activity Sidebar
The Deal Room is great but lacks a persistent activity sidebar showing real-time updates: "Maria advanced to IC Review 2h ago", "John uploaded Q3 financials", "IC vote: 3 yes, 1 no."

**Fix:** Add a collapsible activity rail on the right side of DealRoom, fed by `decision_log` + `deal_comments` + `company_documents` changes.

#### 3.3 Portfolio → Deal Room Deep Links
When viewing a position in Portfolio's "Thesis vs. Actuals" section, the "Open Room" link works, but there's no way to go from a Deal Room back to the Portfolio position to see performance.

**Fix:** Add "View in Portfolio" link in DealRoom Summary tab when the company has a portfolio position.

### P4 — Platform Hardening

#### 4.1 Rate Limiting on Edge Functions
No edge functions have rate limiting. A bad actor could hammer `enrich-company` or `generate-memo` and burn API credits.

**Fix:** Add rate limiting middleware using a simple token bucket in the `api_telemetry` table.

#### 4.2 Audit Log for Admin
The Admin dashboard exists but doesn't show who did what. For institutional clients, audit trails are table stakes.

**Fix:** Surface `team_activity` + `decision_log` + `api_telemetry` in Admin dashboard with filters.

#### 4.3 Data Export Compliance
Portfolio positions and deal pipeline data can be exported via CSV, but there's no audit trail of who exported what. For regulated firms, this matters.

**Fix:** Log export events to `team_activity`.

---

## Implementation Order

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0.1 | Decision Journal in sidebar | XS | High — surfaces hidden differentiator |
| P0.2 | DRY stage constants | XS | Medium — code quality |
| P0.3 | Fix AICopilot context map | XS | Medium — copilot gives wrong answers |
| P0.4 | Fix CommandPalette navigation | S | Medium — search is broken |
| P1.1 | Realtime toast notifications | S | High — collaboration feel |
| P1.2 | Mark all notifications read | XS | Medium — table stakes UX |
| P1.3 | Replace prompt() dialogs | S | Medium — professional UX |
| P1.4 | Global activity feed | M | High — team awareness |
| P2.1 | TeamManager refactoring | S | Low — maintainability |
| P2.2 | Type safety on queries | M | Low — developer experience |
| P3.1 | Relationship graph | L | Very High — demo wow factor |
| P3.2 | Deal Room activity sidebar | M | High — collaboration |
| P3.3 | Portfolio deep links | S | Medium — lifecycle continuity |
| P4.1-4.3 | Platform hardening | M | Medium — enterprise readiness |

---

## REMAINING (Known Non-Critical)
- Materialized views exposed in API (monitoring only, read-only)
- `waitlist_signups` / `support_requests` INSERT `true` policies (acceptable for public forms)
