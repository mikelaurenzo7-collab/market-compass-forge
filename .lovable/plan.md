

# Comprehensive Moat + Quality Audit

## Grading (1-5 scale)

| Category | Grade | Key Issues |
|----------|-------|------------|
| Performance | 2/5 | No pagination anywhere (all 50+ companies loaded at once), no skeleton loading states, no query caching config (staleTime not set), no virtualized tables |
| Empty/Error States & Onboarding | 2/5 | No onboarding tour, no demo data guidance, sparse error boundaries, many "No data" states are bare text |
| Permissioning (RBAC) | 2/5 | `user_roles` table exists but role is never checked in UI or RLS. Every authenticated user can do everything. RBAC labels exist on Settings page but are purely cosmetic |
| Audit Logging | 2/5 | `team_activity` table exists but nothing writes to it automatically. No change history for pipeline stage changes, note edits, or data updates |
| Accessibility + Keyboard UX | 3/5 | `focus-visible` rings exist, Cmd+K works, arrow nav on company table. But most buttons/inputs lack aria labels, no skip-to-content, inconsistent focus management |
| Design Consistency | 3/5 | Good color system, mono fonts for data, consistent card patterns. But raw HTML inputs everywhere (no shared Input component used), inconsistent button styles (some use Tailwind classes directly, some use shadcn Button), no density controls |
| Security Posture | 3/5 | RLS enabled on all tables. But enrichment edge function has no rate limiting, AI functions have basic auth but no abuse prevention, no input sanitization on search fields |
| Design Differentiation | 3/5 | Clean dark theme, professional feel, good typography. But looks like "every dark dashboard" -- lacks signature visual identity, no unique data visualizations, no motion system |

---

## Moat Analysis: What's Missing

### 1. Data Credibility Moat -- Grade: 2/5
**What exists:** Confidence badges (High/Medium/Low), source attribution on enrichments
**What's missing:**
- No source timeline per datapoint (history of changes)
- No "data changed" monitoring (ARR updated, new round detected)
- No verification workflow (confirm/dispute/request evidence)
- Confidence scores are static strings, not computed from actual methodology

### 2. Workflow Moat -- Grade: 2/5
**What exists:** Screen, Research, Memo, Pipeline all exist as separate pages
**What's missing:**
- No guided loop connecting them (Screen -> Research -> Memo -> Pipeline is manual)
- No tasks/next-steps on pipeline cards (owner, due date, status)
- No decision trail (who changed stage, who wrote memo, who approved)
- Pipeline cards have no link to company detail

### 3. AI Moat -- Grade: 2/5
**What exists:** Free-form AI chat, memo generation
**What's missing:**
- AI outputs are unstructured prose -- no structured risk/catalyst/comp extraction
- No playbook prompts by sector/stage
- No citations from scraped sources or internal notes
- No way to save/reference AI outputs later

### 4. Integrations Moat -- Grade: 2/5
**What exists:** CSV export, text memo export, print
**What's missing:**
- No webhook/Zapier integration for events
- No shareable memo links
- No "copy to clipboard as markdown" for Notion/Docs
- No API-style export

---

## Top 5 Moat Builders (Highest ROI for Defensibility)

1. **Pipeline Tasks + Decision Trail** -- Add tasks, due dates, and automatic activity logging on every stage change. This creates habit-forming workflow stickiness.
2. **Guided Workflow Loop** -- Connect Screening -> Company Detail -> Research -> Memo -> Pipeline as a single flow with "next step" prompts and breadcrumbs.
3. **Data Change Monitoring** -- Surface "what changed" on the dashboard (ARR updated, new round, employee count changed). This is the #1 reason users return daily.
4. **Structured AI Outputs** -- Convert AI research into parseable sections (Key Risks, Catalysts, Comps, Questions for Diligence). Save these as reusable artifacts.
5. **Shareable Exports** -- Copy memo as markdown, webhook events for pipeline changes, and "share link" for memos.

## Top 5 UX Improvements for $20k/Seat Feel

1. **Dark mode is default but add density controls** -- Compact/comfortable/spacious toggle stored in localStorage
2. **Inline hover previews** -- Hover on any company name anywhere to see a mini-card (valuation, ARR, stage, latest event)
3. **Pipeline cards need richness** -- Show company sector, valuation, last activity, assigned owner, and next step directly on each card
4. **Skeleton loading states everywhere** -- Replace Loader2 spinners with shimmer skeletons that match the layout
5. **Motion system** -- Subtle transitions on page changes, card hover lifts, smooth list reordering

## Missing Core VC Workflows
- **Follow-up tracking** (tasks with due dates on pipeline items)
- **IC meeting prep** (batch-generate memos for all items in "IC Review" stage)
- **Watchlist management** (table exists, no UI)
- **Company comparison** (side-by-side view of 2-3 companies)

## 3D / Eye-Catching Assessment
- **2D relationship graph** is the right call. A force-directed graph (companies <-> investors <-> sectors) using a library like `d3-force` rendered in SVG is performant and useful. 3D adds complexity without improving comprehension.
- **Pipeline momentum visuals** -- A sparkline or mini-bar showing velocity (deals moved per week) per stage is more useful than animation.
- **Inline drilldowns on hover** -- This is the single biggest "wow" that also compresses complexity. A floating card on hover is high-impact, low-risk.

---

## Implementation Plan (Priority Order)

### Phase 1: Pipeline Tasks + Decision Trail (Workflow Moat)

**Database changes:**
- Create `pipeline_tasks` table: `id, pipeline_deal_id, title, assignee_id, due_date, status (todo/in_progress/done), created_at`
- RLS: users can CRUD own tasks

**Code changes:**
- Add task list UI to each pipeline card (expandable section)
- Auto-log to `team_activity` when: pipeline stage changes, note added, memo generated, enrichment run
- Show decision trail on company detail (who did what, when)

### Phase 2: Company Hover Preview (UX Differentiation)

**New component: `CompanyHoverCard.tsx`**
- Uses Radix HoverCard primitive (already installed)
- Shows: name, sector, stage, valuation, ARR, employee count, latest event headline
- Wraps every company name link across the app (CompanyTable, Pipeline cards, People portfolio, Search results)

### Phase 3: Structured AI Outputs + Playbooks

**Update `ai-research` edge function:**
- Add sector-specific playbook prompts (e.g., "For SaaS companies, always analyze: NDR, CAC payback, Rule of 40")
- Return structured JSON sections alongside prose: `{ risks: [], catalysts: [], comps: [], diligence_questions: [] }`

**Update `AIResearchChat.tsx`:**
- Parse structured sections and render them as collapsible cards
- Add "Copy as Markdown" button on each AI response

### Phase 4: Data Change Monitoring (Dashboard Moat)

**New component: `ChangesFeed.tsx`**
- Query `company_enrichments` for recent scrapes
- Compare current vs previous values (simple diff)
- Show on Dashboard: "Stripe ARR updated: $1.2B -> $1.4B (Crunchbase, 2h ago)"

### Phase 5: Shareable Exports + Webhook

**Memo sharing:**
- "Copy as Markdown" button on investment memos
- "Copy Link" that generates a shareable URL (store memo in DB with a public UUID)

**Webhook events:**
- Settings page: "Zapier Webhook URL" input field
- Fire webhooks on: pipeline stage change, new alert notification, enrichment complete

### Phase 6: Watchlist UI

**New component: `WatchlistManager.tsx`**
- Create/edit/delete watchlists
- "Add to Watchlist" button on company detail, screening results
- Watchlist view showing all companies in a watchlist with latest metrics

### Phase 7: Polish

- Skeleton loading states (replace all `Loader2` spinners)
- Density control toggle in Settings (compact/comfortable CSS variables)
- Activity auto-logging middleware (wrap mutations to auto-insert team_activity)
- Pipeline cards: add company sector, valuation, clickable link to company detail

---

## Files to Create/Modify

**New files:**
- `src/components/CompanyHoverCard.tsx` -- Reusable hover preview
- `src/components/PipelineTasks.tsx` -- Task management on pipeline cards
- `src/components/ChangesFeed.tsx` -- Data change monitoring feed
- `src/components/WatchlistManager.tsx` -- Watchlist CRUD UI
- `src/components/SkeletonLoaders.tsx` -- Shared skeleton components

**Modified files:**
- `src/pages/Deals.tsx` -- Add tasks, decision trail, richer cards, company links
- `src/pages/Index.tsx` -- Add changes feed widget
- `src/pages/CompanyDetail.tsx` -- Add watchlist button, decision trail, hover cards
- `src/pages/Settings.tsx` -- Add webhook URL input, density toggle
- `src/pages/Companies.tsx` -- Wrap company names in hover cards
- `src/pages/Screening.tsx` -- Add watchlist action, hover cards
- `src/pages/People.tsx` -- Hover cards on portfolio companies
- `src/components/AIResearchChat.tsx` -- Structured outputs, copy markdown, playbook prompts
- `src/components/InvestmentMemo.tsx` -- Copy as markdown, shareable link
- `src/components/CompanyTable.tsx` -- Hover cards
- `src/hooks/useData.ts` -- Add change detection queries
- `src/index.css` -- Density control CSS variables
- `supabase/functions/ai-research/index.ts` -- Structured output format, playbook prompts

**Database migrations:**
- Create `pipeline_tasks` table with RLS
- Add auto-logging trigger or handle in application code

