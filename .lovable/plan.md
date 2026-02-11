
# Product Perfection Plan: Full Gap Analysis and Polish

A systematic audit of the entire platform reveals gaps across data coverage, UX completeness, feature depth, and production readiness. This plan addresses every identified issue, organized by impact.

---

## Category 1: Data Gaps That Undermine Credibility

### 1A. Zero Company Logos (0/628 companies have logo_url)
Every company row shows a generic Building2 icon. For an institutional-grade platform, this is a credibility killer.

**Fix:** Generate deterministic avatar initials (first 2 letters of company name) with sector-based color coding in CompanyTable, CompanyDetail, CompanyHoverCard, and the Deals kanban cards. Replace the Building2 placeholder with a styled initial circle.

**Files:** `CompanyTable.tsx`, `CompanyDetail.tsx`, `CompanyHoverCard.tsx`, `Deals.tsx`, `Companies.tsx`

### 1B. Key Personnel Coverage (26/628 companies = 4%)
Only 4% of companies have key personnel data. The remaining 96% show empty states on CompanyDetail.

**Fix:** Add 80+ key personnel records for the top-valued companies via database insert.

### 1C. Company Enrichments Table is Empty (0 rows)
The EnrichmentPanel on CompanyDetail queries this table but always returns nothing.

**Fix:** Seed 30+ enrichment records for high-profile companies with scraped summaries, source URLs, and confidence scores.

### 1D. Intelligence Feed is Shallow (50 signals)
For a "live" feed claiming AI curation, 50 items feels thin. No date variation or recency.

**Fix:** Add 30+ recent intelligence signals with varied dates across the last 30 days.

---

## Category 2: Broken or Incomplete Features

### 2A. user_notes Table Missing
CompanyDetail queries a `user_notes` table (line 132-140) but this table doesn't exist in the schema. The private notes feature silently fails.

**Fix:** Create `user_notes` table (id, company_id, user_id, content, created_at) with RLS policies for user-scoped CRUD.

### 2B. user_watchlists Missing is_active / updated_at for Alerts
The `user_alerts` table references `is_active` column (line 81 of Alerts.tsx: `toggleAlert` mutation). Need to verify this column exists.

### 2C. Landing Page Footer Links Are Dead
Footer has "About", "Careers", "API Docs", "Privacy", "Terms" -- all are `<span>` tags with `cursor-default`, not actual links. They do nothing.

**Fix:** Convert footer links to either real pages or mailto/external links. Add a minimal `/terms` and `/privacy` static page, or link to a hosted document.

### 2D. "Benchmark" Tag on Public Companies
CompanyTable line 71 shows a "Benchmark" badge for `stage === 'Public'`, but the memory says all public companies have been removed. Dead code that may confuse.

**Fix:** Remove the Public/Benchmark badge logic from CompanyTable.

### 2E. Screening Score Logic Differs from CompanyDetail Score
The `Screening.tsx` page has its own inline scoring algorithm (lines 133-174) that uses different weights and logic than `useCompanyScore.ts`. A company can show different grades on different pages.

**Fix:** Refactor `Screening.tsx` to use the centralized `useCompanyScore` hook (or a lightweight version of it) so scores are consistent platform-wide. Same for `Companies.tsx` (lines 39-87).

---

## Category 3: UX Gaps and Polish

### 3A. No Pagination on Large Tables
Companies page loads all 628 companies at once. No pagination or virtualization. Same for Screening (loads all via `useCompaniesWithFinancials`).

**Fix:** Add client-side pagination (25/50/100 per page) to Companies and Screening pages with page controls at the bottom.

### 3B. Empty State for Valuation Tab Without Data
CompanyDetail's valuation tab (line 559) only renders when `latestFinancial && latestRound` both exist. If either is missing, the tab appears clickable but shows nothing.

**Fix:** Add a meaningful empty state: "Insufficient financial data to compute valuation. Missing: [revenue/valuation]."

### 3C. Dashboard "Customize" Mode Lacks Persistence Feedback
The widget customizer saves to localStorage silently. No toast confirmation.

**Fix:** Add a toast when widgets are toggled.

### 3D. No Loading State on Intelligence Feed Page
IntelligenceFeed shows a centered spinner but no skeleton cards, making the page feel empty.

**Fix:** Add 3-4 skeleton card placeholders during loading.

### 3E. Search Bar in Header Opens Command Palette Only
The SearchBar in the AppLayout header triggers the CommandPalette via keyboard event dispatch, which is fragile. It should work as a direct click handler.

**Fix:** Use a shared state or context for the command palette open state instead of dispatching synthetic keyboard events.

### 3F. Auth Page Has No "Back to Landing" Link
Once on /auth, there's no way to go back to the Landing page without using the browser back button.

**Fix:** Add a "Back to home" link with ArrowLeft icon above the login form.

### 3G. CompanyDetail Tabs Are Not URL-Aware
Navigating directly to a company with a specific tab (e.g., from Research linking to the valuation tab) is impossible. Tab state is local-only.

**Fix:** Sync `activeTab` to a URL search parameter (`?tab=valuation`) so tabs are deep-linkable and shareable.

---

## Category 4: Production-Readiness

### 4A. No Global Error Toasts for Query Failures
All `useQuery` calls throw errors but the QueryClient has no `onError` handler. Failed API calls silently fail with no user feedback.

**Fix:** Add a global `onError` handler to the QueryClient that shows a toast for failed queries.

### 4B. Missing Meta Tags and OG Data
`index.html` likely has default Vite meta tags. For a product at this level, proper title, description, and OG tags are essential for sharing.

**Fix:** Update `index.html` with proper meta tags, OG image, and description.

### 4C. No Favicon Branding
The favicon is the default Lovable/Vite icon.

**Fix:** Update `public/favicon.svg` to match the "LG" branding used in the sidebar and landing page.

---

## Technical Summary

### Database Migrations:
1. Create `user_notes` table (id uuid PK, company_id uuid, user_id uuid, content text, created_at timestamptz) with RLS

### Database Inserts:
1. ~80 key_personnel records for top companies
2. ~30 company_enrichments records  
3. ~30 intelligence_signals with recent dates

### Files to Modify:
1. `src/App.tsx` -- Add global QueryClient error handler
2. `src/pages/Companies.tsx` -- Replace inline scoring with shared hook, add pagination, fix company avatar
3. `src/pages/Screening.tsx` -- Replace inline scoring with shared hook, add pagination
4. `src/pages/CompanyDetail.tsx` -- URL-synced tabs, valuation empty state, company avatar
5. `src/pages/IntelligenceFeed.tsx` -- Skeleton loading cards
6. `src/pages/Landing.tsx` -- Fix footer links, add Terms/Privacy routes
7. `src/pages/Auth.tsx` -- Add "Back to home" link
8. `src/components/CompanyTable.tsx` -- Remove "Public/Benchmark" badge, company avatar
9. `src/components/CompanyHoverCard.tsx` -- Company avatar initials
10. `src/components/NewsFeed.tsx` -- No changes needed (already solid)
11. `index.html` -- Meta tags, OG data, favicon reference

### New Files:
1. `src/components/CompanyAvatar.tsx` -- Reusable avatar component with sector-based colors
2. `src/pages/Terms.tsx` -- Static terms page
3. `src/pages/Privacy.tsx` -- Static privacy page

### Priority Order:
1. user_notes table (fixes broken feature)
2. Consistent scoring across pages (fixes data integrity)  
3. Company avatars (biggest visual improvement)
4. Pagination (performance)
5. Data seeding (depth)
6. UX polish (empty states, auth back link, URL tabs)
7. Production meta (favicon, OG tags, error handling)
