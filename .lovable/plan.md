

# Laurenzo's Private Intelligence — Ship-Ready Transformation Plan

## Current State Assessment

The platform today is a **static UI mockup** (~3% of the vision). Specifically:
- 6 hardcoded companies in a JS array, no database
- Charts with fake static data, no API
- Search bar is a visual placeholder (no logic)
- Sidebar navigation does nothing (no routes)
- No authentication, no backend, no AI layer
- No company detail pages, no deal tracking, no financial modeling
- Brand still says "Meridian" — needs renaming to **Laurenzo's Private Intelligence**

---

## Phase 1: Foundation (Steps 1-4) — "Make it real"
*Goal: Database, auth, routing, rebrand. After this phase, a user can log in, browse real company data, and navigate between modules.*

### Step 1: Rebrand to Laurenzo's Private Intelligence
- Update `index.html` title/meta tags
- Update `AppSidebar.tsx` logo text from "Meridian" to "Laurenzo's"
- Update favicon and any brand references

### Step 2: Enable Lovable Cloud + Database Schema
- Enable Lovable Cloud (Supabase)
- Create core tables via migrations:

```text
companies (id, name, domain, logo_url, sector, sub_sector, hq_country, hq_city, founded_year, description, employee_count, stage, status, created_at, updated_at)

funding_rounds (id, company_id, round_type, amount, valuation_pre, valuation_post, date, lead_investors, co_investors, source_url, confidence_score)

financials (id, company_id, period, period_type, revenue, arr, mrr, gross_margin, burn_rate, runway_months, ebitda, source, confidence_score)

investors (id, name, type, aum, hq_country, website, logo_url)

investor_company (id, investor_id, company_id, round_id, ownership_pct_est)

sectors (id, name, parent_id, deal_count_trailing_12m)

activity_events (id, company_id, event_type, headline, detail, source_url, published_at)

user_watchlists (id, user_id, name, company_ids)

user_notes (id, user_id, company_id, content, created_at)

deal_pipeline (id, user_id, company_id, stage, priority, notes, updated_at)
```

- Seed with 50+ real companies using publicly available data (Stripe, Databricks, Canva, Rippling, Wiz, Figma, Anduril, Perplexity, Cursor, etc.) with real funding rounds and approximate financials
- Enable Row Level Security on all tables

### Step 3: Authentication
- Create `/auth` page with login + signup (email/password)
- Protect all routes behind auth
- Add user avatar/logout to the top bar
- Store user profile in a `profiles` table

### Step 4: Routing + Sidebar Navigation
- Add routes for each sidebar module:
  - `/` — Dashboard (current Index page, wired to real data)
  - `/companies` — Company list with filters
  - `/companies/:id` — Company detail page
  - `/deals` — Deal flow pipeline
  - `/analytics` — Analytics dashboards
  - `/screening` — Screening/search
  - `/research` — Research hub (AI memos later)
  - `/people` — Investor/people directory
  - `/alerts` — Alert center
  - `/settings` — User settings
- Wire `AppSidebar` to use `react-router-dom` navigation

---

## Phase 2: Core Intelligence (Steps 5-8) — "Make it useful"
*Goal: Company profiles, live data tables, functional search, deal pipeline. After this, a VC analyst can actually use the product for basic research.*

### Step 5: Company Intelligence Module
- **Company List Page** (`/companies`): Sortable, filterable table pulling from Supabase. Filters: sector, stage, geography, valuation range, ARR range
- **Company Detail Page** (`/companies/:id`):
  - Overview section (description, HQ, employees, stage)
  - Funding history timeline (from `funding_rounds` table)
  - Financial metrics cards (ARR, revenue, margins from `financials`)
  - Investor list with ownership estimates
  - Comparable companies (same sector/stage)
  - Activity feed (company-specific events)
  - Notes section (user can add private notes)
  - Add to watchlist / deal pipeline buttons

### Step 6: Functional Search (Cmd+K)
- Wire the existing `cmdk` dependency into a real command palette
- Search across companies, investors, sectors
- Support keyboard shortcut (Cmd+K / Ctrl+K)
- Add recent searches and suggested queries
- Later: NLP parsing for structured queries

### Step 7: Dashboard Wired to Real Data
- Replace hardcoded metric cards with Supabase queries:
  - Total deal value (sum of recent rounds)
  - Active companies count
  - Median valuation
  - Sector breakdown
- Charts pull from `funding_rounds` and `sectors` tables
- Activity feed pulls from `activity_events` table
- Add date range filters

### Step 8: Deal Pipeline (CRM-Style)
- Kanban board view on `/deals` page
- Stages: Sourced, Screening, Due Diligence, IC Review, Committed, Passed
- Drag-and-drop between stages
- Each card shows company name, sector, valuation, notes
- Backed by `deal_pipeline` table with RLS per user

---

## Phase 3: Intelligence Layer (Steps 9-11) — "Make it smart"
*Goal: AI research assistant, investment memos, alerts. This is where differentiation begins.*

### Step 9: AI Research Assistant
- Enable Lovable AI integration
- Create edge function `ai-research` that:
  - Takes a company ID + question
  - Pulls company data from database as context
  - Calls Lovable AI (gemini-3-flash-preview) with structured prompt
  - Returns grounded analysis
- Add chat-style interface on company detail pages
- Support questions like "What are the key risks for this company?" or "Compare this to competitors"

### Step 10: Automated Investment Memo Generation
- Create edge function `generate-memo` that:
  - Pulls all data for a company (financials, rounds, investors, sector comps)
  - Generates a structured memo: Thesis, Market, Traction, Risks, Valuation, Recommendation
  - Uses tool-calling for structured JSON output
- Add "Generate Memo" button on company detail page
- Render memo in a professional format with export to PDF

### Step 11: Alerts and Monitoring
- `/alerts` page showing triggered alerts
- Users can set alerts: "Notify me when any cybersecurity company raises Series B+"
- Edge function `check-alerts` runs on new activity events
- Toast notifications for real-time alerts

---

## Phase 4: Professional Grade (Steps 12-14) — "Make it enterprise"
*Goal: Exports, collaboration, keyboard workflows. This is what justifies a price tag over $200/seat.*

### Step 12: Export System
- Export company profiles to PDF (using browser print/CSS)
- Export tables to CSV
- Export memos to PDF
- Export deal pipeline summary

### Step 13: Collaboration Features
- Shared watchlists (team-level)
- Shared notes on companies
- Activity log of team actions
- Role-based permissions (Analyst, Associate, Partner)

### Step 14: Keyboard-First UX
- Global hotkeys: Cmd+K (search), Cmd+/ (help), Cmd+N (new note)
- Arrow key navigation in tables
- Escape to close modals
- Tab navigation through dashboard widgets
- Focus indicators for accessibility

---

## Phase 5: Data Moat (Steps 15-16) — "Make it defensible"
*Goal: External data enrichment and confidence scoring.*

### Step 15: Data Enrichment Pipeline
- Connect Firecrawl for web scraping of company news, press releases, blog posts
- Edge function `enrich-company` that scrapes a company's website for latest info
- Store enriched data with source attribution and confidence scores
- Display data provenance on every metric ("Source: Crunchbase, scraped 2h ago, confidence: high")

### Step 16: Confidence Scoring System
- Every data point gets a confidence badge (High / Medium / Low / Estimated)
- Color-coded in the UI (green/yellow/orange)
- Tooltip explaining the source and methodology
- This directly addresses the "would a PE data team trust this?" question

---

## Technical Details

### Database: Lovable Cloud (Supabase)
- PostgreSQL with RLS on all tables
- Edge functions for AI calls and data enrichment
- Real-time subscriptions for activity feed

### Frontend Architecture
- React + Vite + Tailwind (existing)
- react-router-dom for routing (already installed)
- @tanstack/react-query for data fetching (already installed)
- cmdk for command palette (already installed)
- recharts for charts (already installed)
- New: react-beautiful-dnd or similar for Kanban drag-and-drop

### Edge Functions Needed
1. `ai-research` — Company research Q&A
2. `generate-memo` — Investment memo generation
3. `enrich-company` — Firecrawl-based data enrichment
4. `check-alerts` — Alert evaluation

### Auth Model
- Supabase Auth (email/password initially, Google SSO later)
- RLS policies ensuring users only see their own notes, watchlists, pipelines
- Team/workspace model in Phase 4

---

## Implementation Sequence (Recommended Order)

The plan should be executed in this order, with each step being a separate prompt/conversation:

1. Rebrand to Laurenzo's Private Intelligence
2. Enable Cloud + create database schema + seed data
3. Add authentication
4. Add routing + wire sidebar
5. Build company list page (with real data)
6. Build company detail page
7. Wire dashboard to real data
8. Build Cmd+K search
9. Build deal pipeline
10. Add AI research assistant
11. Add memo generation
12. Add alerts system
13. Add exports
14. Add keyboard shortcuts
15. Add data enrichment (Firecrawl)
16. Add confidence scoring

---

## What This Achieves vs. The Original Vision

| Vision Module | Coverage After Plan |
|---|---|
| Company Intelligence | Full profiles, financials, funding, comps |
| Market & Deal Intelligence | Deal pipeline, sector heatmaps, activity feed |
| Financial Modeling | Basic metrics display (full modeling is V2) |
| NLP Search | Cmd+K with filters; true NLP parsing is V2 |
| Alerts | Company/sector monitoring with notifications |
| Collaboration | Shared watchlists, notes, team roles |
| Exports | PDF, CSV for key views |
| AI Layer | Research assistant + memo generation |
| Data Strategy | Firecrawl enrichment + confidence scoring |
| Auth & Security | Supabase Auth + RLS + SOC-2 foundations |

### Deferred to V2 (post-ship)
- Cap table modeling with dilution tracking
- Scenario and sensitivity analysis
- Cohort analysis and unit economics
- Custom KPI dashboard builder
- PowerPoint export
- Full NLP query parsing ("Series B fintech in LATAM with ARR > $10M")
- LP reporting module
- SOC-2 certification process
- GDPR/CCPA compliance tooling

---

## Pricing Justification After This Plan

After completing all 16 steps, the product supports:
- **$200-500/seat/month** for individual analysts and small funds
- **$1,000+/seat/month** for enterprise with AI memos, team features, and data enrichment
- Competitive with Crunchbase Pro ($49/mo) on data, approaching PitchBook ($thousands) on workflow

