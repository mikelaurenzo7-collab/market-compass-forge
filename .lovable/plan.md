
# Elite Audit: Grapevine — Private Markets Operating System

## Current State Assessment

The product has undergone two rapid pivots (Deal Room OS, then Capital Lifecycle OS). The core architecture is solid: clean sidebar, lifecycle-oriented routing, working Deal Room with 7 tabs, Discover engine, Portfolio with thesis-vs-actuals. However, the speed of pivoting has left **critical gaps, dead code, stale copy, security issues, and missing UX polish** that would undermine credibility in any pilot conversation.

---

## CRITICAL GAPS (Must Fix)

### 1. Dead Code: Index.tsx is a Ghost Dashboard
`src/pages/Index.tsx` (442 lines) is the old "Command Center" dashboard. It still references `/companies`, `/deal-matcher`, `/distressed` -- all dead routes. It renders `CompanyTable`, `OnboardingFlow`, `MorningBriefing`, etc. **It is still routed** via `App.tsx` redirects but if anyone lands on it directly, they see a broken page.

**Fix:** Delete `Index.tsx`. Ensure `/dashboard` redirect in `App.tsx` points to `/deals` (already done). Remove any imports.

### 2. OnboardingFlow References Dead Routes
`src/components/OnboardingFlow.tsx` has 5 onboarding steps pointing to `/companies`, `/dashboard`, `/research` -- all legacy routes. The copy says "command center" and "browse 800+ private companies."

**Fix:** Rewrite OnboardingFlow steps to match the Capital Lifecycle:
- Step 1: "Discover your first opportunity" -> `/discover`
- Step 2: "Open a Deal Room" -> `/deals`
- Step 3: "Document your thesis" -> `/deals` (first deal)
- Step 4: "Set up alerts" -> `/alerts`
- Step 5: "Track your portfolio" -> `/portfolio`
Update all copy to OS language.

### 3. Auth Page Copy is Stale
`Auth.tsx` line 240: "Private market intelligence that moves faster than your competition" -- this is terminal language, not OS language.

**Fix:** Change to "The system where capital gets deployed."

### 4. Help Page FAQ is Stale
`Help.tsx` FAQ still describes Grapevine as "an AI-powered private market intelligence platform" with references to "command center" and old feature descriptions.

**Fix:** Rewrite FAQ to describe the Capital Lifecycle OS, Deal Rooms, and the 5 verbs.

### 5. RLS Security: 4 Overly Permissive Policies
The database linter found 4 `USING (true)` or `WITH CHECK (true)` policies on non-SELECT operations:
- `waitlist_signups` INSERT (acceptable -- public form)
- `support_requests` INSERT (acceptable -- public form)
- `scheduler_runs` INSERT/UPDATE (should be service-role only, not anon-accessible)

**Fix:** Tighten `scheduler_runs` policies to require `auth.role() = 'service_role'` instead of `true`.

### 6. Materialized Views Exposed in API
3 materialized views (`mv_dashboard_summary`, `mv_sector_multiples`, `mv_company_scores`) are accessible via the public API. While read-only, they should be moved out of the public API schema or explicitly secured.

**Fix:** Revoke `SELECT` on these views from the `anon` and `authenticated` roles if they're only consumed by edge functions, or add explicit security documentation.

---

## IMPROVEMENTS (Should Fix)

### 7. DealRoom.tsx is 1038 Lines -- Needs Component Extraction
The entire Deal Room is a single file with 8 inline components (`SummaryTab`, `DiligenceTab`, `ValuationTab`, `DiscussionTab`, `TimelineTab`, `AllocationTab`, `UpdatesTab`, `MetricItem`). This hurts maintainability and makes the file unwieldy.

**Fix:** Extract each tab into its own file under `src/components/deal-room/`:
- `SummaryTab.tsx`
- `DiligenceTab.tsx`
- `ValuationTab.tsx`
- `DiscussionTab.tsx`
- `TimelineTab.tsx`
- `AllocationTab.tsx`
- `UpdatesTab.tsx`

### 8. Discussion Tab Shows User IDs Instead of Names
`DealRoom.tsx` line 764: `{c.user_id.slice(0, 8)}` -- comments show truncated UUIDs instead of display names. This is a bad UX for a collaboration tool.

**Fix:** Join `profiles` table in the comments query to show `display_name`. Same for decision log entries and votes.

### 9. Document Upload Button is Non-Functional
Diligence tab has an "Upload" button (line 508-509) that does nothing -- no `onClick` handler. For a data room product, this is a critical gap.

**Fix:** Wire up file upload to the `document-uploads` storage bucket, create a record in `company_documents`, and show the uploaded file.

### 10. Valuation Tab Links Out Instead of Embedding
The Valuation tab shows a "Open Valuation Tools" button that navigates to `/valuations` (line 676). The components (`DCFCalculator`, `CompTableBuilder`, `ValuationFootballField`) already exist.

**Fix:** Embed `DCFCalculator` and `CompTableBuilder` directly in the Valuation tab, pre-populated with the deal's financial data.

### 11. No Loading States on Key Mutations
Several mutations (`openRoom`, `updateStage`, `addAllocation`, `addComment`) don't show loading indicators, leading to double-clicks.

**Fix:** Add `isPending` checks to disable buttons and show spinners during mutations.

### 12. Developers Page is Orphaned
`src/pages/Developers.tsx` exists but has no route in `App.tsx` (redirects to `/settings`). It imports `Terminal` icon and has full API documentation. Either integrate it into Settings or delete it.

**Fix:** The Settings page already has an "API Access" tab. Verify Developers.tsx content is redundant and delete the file if so.

---

## NEXT STEPS (Strategic Features)

### 13. Deal Room File Upload + AI Extraction
Wire the Diligence tab upload button to actually accept files (PDF, XLSX), store them in the `document-uploads` bucket, and trigger the existing `analyze-document` edge function for AI extraction. This is the single most valuable feature for pilot conversations.

### 14. Deal Room Realtime
Add Supabase Realtime subscriptions to `deal_comments`, `deal_votes`, and `decision_log` so multiple team members see updates live. The DealFlow page already has realtime -- extend it to Deal Room.

### 15. IC Memo Generation from Deal Room
Add a "Generate IC Memo" button to the Summary tab that calls the existing `generate-memo` edge function with the deal's company data, thesis, financials, and decision history. This produces a structured investment memo -- the killer feature for pilot demos.

---

## Implementation Order

| Priority | Item | Effort |
|----------|------|--------|
| P0 | Delete Index.tsx, fix OnboardingFlow routes/copy | Small |
| P0 | Fix Auth.tsx and Help.tsx stale copy | Small |
| P0 | Fix scheduler_runs RLS policies | Small |
| P1 | Show display names in comments/decisions (join profiles) | Small |
| P1 | Wire document upload in Diligence tab | Medium |
| P1 | Embed DCF/Comps in Valuation tab | Medium |
| P2 | Extract DealRoom tab components | Medium |
| P2 | Add mutation loading states | Small |
| P2 | Delete Developers.tsx | Small |
| P3 | Deal Room realtime subscriptions | Medium |
| P3 | IC Memo generation from Deal Room | Medium |

All P0 and P1 items should ship before any pilot conversation. P2 items are code quality. P3 items are differentiators for the demo.
