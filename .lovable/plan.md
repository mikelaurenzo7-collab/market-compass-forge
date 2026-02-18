
# Elite Audit: Grapevine — Private Markets Operating System

## ✅ COMPLETED

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
  - `SummaryTab.tsx`, `DiligenceTab.tsx`, `ValuationTab.tsx`, `DiscussionTab.tsx`
  - `TimelineTab.tsx`, `AllocationTab.tsx`, `UpdatesTab.tsx`
  - `MetricItem.tsx`, `types.ts`
- [x] DealRoom.tsx reduced from 1111 lines to ~250 lines (orchestrator only)

### P3 — Strategic Features
- [x] Realtime subscriptions on `deal_comments`, `deal_votes`, `decision_log`, `deal_allocations`
- [x] IC Memo Generation button in Summary tab (calls `generate-memo` edge function)
- [x] Memo output renders inline with full structured sections

## REMAINING (Known Non-Critical)
- Materialized views exposed in API (monitoring only, read-only)
- `waitlist_signups` / `support_requests` INSERT `true` policies (acceptable for public forms)
