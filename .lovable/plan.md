

# Data Upload Hub + High-Value PE Features

## Part 1: User Data Upload Hub

The existing `DataIngestion` component (in Settings > Data Import) only supports CSV company imports. We will build a dedicated **Data Room / Upload Hub** page that serves as a central place for users to upload their proprietary data across multiple entity types, with full storage integration and import history tracking.

### New Page: `/data-room`

A full page (not buried in Settings) with tabs for different upload types:

| Upload Type | Target Table | Mappable Fields |
|---|---|---|
| Companies | `companies` | name, sector, stage, hq_country, domain, employee_count, founded_year, description |
| Financials | `financials` | company_name (resolved to company_id), period, revenue, arr, ebitda, gross_margin, burn_rate |
| Deals/Transactions | `deal_transactions` | company_name, deal_type, value, date, buyer, seller |
| Portfolio Positions | `portfolio_positions` | company_name, shares, entry_price, entry_date, notes |
| Contacts/People | `key_personnel` | name, title, company_name, email, phone, linkedin_url |

**Key features:**
- Drag-and-drop CSV upload with intelligent column auto-mapping
- Preview first 5 rows before import
- Import history log (new `import_history` table) showing date, file name, row count, status
- Ability to download a template CSV for each entity type
- File stored in Supabase Storage (`document-uploads` bucket) for auditability
- Progress bar for large imports (batched inserts)

### Database Changes
```sql
CREATE TABLE public.import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  entity_type text NOT NULL,        -- 'companies', 'financials', 'deals', etc.
  row_count integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processing',  -- processing, complete, failed
  errors jsonb DEFAULT '[]',
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own imports"
  ON public.import_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Navigation
- Add "Data Room" to sidebar under a new "Workspace" nav group (between Deal Engine and Intelligence), with the `Upload` icon

---

## Part 2: High-Usefulness PE Features (score > 7/10)

After analyzing the platform against PE/FO workflow needs, here are features that score 8+ and are currently missing:

### Feature A: Portfolio Tracker in Sidebar (Usefulness: 9/10)

**Problem:** Portfolio is currently hidden behind a redirect (`/portfolio` -> `/deals`). PE firms and family offices track active positions constantly. This is a core workflow.

**Solution:**
- Un-hide the `/portfolio` route (remove the redirect, use the existing `Portfolio.tsx` page directly)
- Add "Portfolio" to the sidebar under "Deal Engine" group
- The existing Portfolio page with P&L tracking, sector allocation pie chart, and benchmark tab is already fully built

### Feature B: Decision Journal / IC Memo Trail (Usefulness: 8/10)

**Problem:** The `decision_log` table exists and is written to, but there is no dedicated page to browse, search, and reflect on past investment decisions across all deals. PE firms do post-mortems and need a decision audit trail.

**Solution:** New page `/decisions` that aggregates the decision log across all deals with:
- Timeline view of all decisions (stage changes, pass/commit rationale, votes)
- Filter by deal, decision type, user, date range
- Export to CSV for IC reporting
- Links back to deal workspace

### Feature C: Watchlist Alerts Summary Widget (Usefulness: 8/10)

**Problem:** Users can create watchlists and alerts, but there's no at-a-glance "what changed on my watchlists" view. Family office analysts check this daily.

**Solution:** Already partially covered by the Alpha Signals widget and Alerts page. Instead of a new page, enhance the existing Morning Briefing to include a "Watchlist Activity" section showing companies from the user's watchlists that had recent news, funding, or data changes. This is a modification to the existing `morning-briefing` edge function and `MorningBriefing.tsx` component. **Deferred to a follow-up** since it requires edge function changes and is more complex.

---

## Implementation Plan

### Files to Create
| File | Purpose |
|---|---|
| `src/pages/DataRoom.tsx` | Full data upload hub page with multi-entity CSV import, templates, and import history |
| `src/pages/Decisions.tsx` | Decision journal / IC audit trail page |

### Files to Modify
| File | Change |
|---|---|
| `src/App.tsx` | Add `/data-room` and `/decisions` routes; remove `/portfolio` redirect |
| `src/components/AppSidebar.tsx` | Add "Data Room", "Portfolio", and "Decisions" nav items |

### Database Migration
- Create `import_history` table with RLS
- Enable realtime on `import_history` for live progress updates

### Component Architecture

**DataRoom.tsx** will be structured as:
1. Tab bar: Companies | Financials | Deals | Portfolio | Contacts | History
2. Each tab shows a reusable `<CSVImporter>` component (refactored from `DataIngestion`) with:
   - Entity-specific field maps and DB target tables
   - Template download button
   - Preview table
   - Import button with progress
3. History tab queries `import_history` for the user

**Decisions.tsx** will:
1. Query `decision_log` joined with `deal_pipeline` and `companies` for context
2. Render as a reverse-chronological timeline
3. Include filters for decision_type, date range, and company search
4. Export button for CSV

### What We Are NOT Adding (scored below 7)
- Capital call management (too niche, requires complex fund admin logic)
- LP reporting portal (would need a separate app/portal)
- Full fund accounting (out of scope for an intelligence platform)
- Co-investment tracking (covered adequately by deal pipeline)

