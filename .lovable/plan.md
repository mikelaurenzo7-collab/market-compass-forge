

# Company-Centric Platform Overhaul

## What Already Exists (Will Reuse & Enhance)

The current codebase already has substantial coverage. Here is what maps to the user's request:

| Requested Feature | Current State | Action |
|---|---|---|
| Company data model (name, domain, industry, geography, funding) | `companies` + `funding_rounds` + `financials` tables exist | Enhance |
| Company Terminal / Profile page | `CompanyDetail.tsx` with 8 tabs (overview, financials, valuation, deals, analysis, news, research, memo) | Rebuild as "Company Terminal" |
| Comps Engine | `CompTableBuilder.tsx` with peer search, AI analysis, CSV export | Enhance with filters + save/sensitivity |
| Valuation Workbench | `Valuations.tsx` with DCF Calculator, Football Field, Precedent Transactions | Enhance with scenarios + reverse underwriting |
| Document Intelligence | `DocumentAnalyzer.tsx` with demo CIM extraction | Enhance with real AI extraction + company linking |
| IC Memo Generator | `InvestmentMemo.tsx` with AI-generated sections + PDF export | Enhance with templates |
| Monitoring & Alerts | `Alerts.tsx` with rules + notifications | Enhance with more signal types |
| Investment Score | `CompanyScore.tsx` with 6-factor weighted model | Keep |
| AI Research Chat | `AIResearchChat.tsx` with streaming + sector playbooks | Keep |
| Key Personnel | `key_personnel` table exists | Add UI to Company Terminal |

## New Data Model Additions

### 1. KPI Metrics Table
A dedicated time-series table for standardized KPIs beyond what `financials` covers:

```
kpi_metrics (new table)
- id, company_id, metric_name, value, period, period_type
- definition_source, confidence_score, created_at
```

Metric names: ARR, MRR, Revenue, Growth Rate, Gross Margin, Burn Rate, CAC, LTV, Payback Period, NRR, Logo Churn, Revenue Churn, Magic Number

### 2. Cap Table Snapshots
```
cap_table_snapshots (new table)
- id, company_id, snapshot_date, shareholder_name
- share_class, shares, ownership_pct, notes, created_at
```

### 3. Round Terms (extend funding_rounds)
Add columns to existing `funding_rounds` table:
- instrument_type (Preferred, Convertible Note, SAFE, Common)
- liquidation_preference, participation_cap
- anti_dilution_type (Broad-Based Weighted Average, Narrow-Based, Full Ratchet)
- option_pool_pct, pro_rata_rights (boolean)

### 4. Documents Table
```
company_documents (new table)
- id, company_id, file_name, file_url, document_type
- extracted_metrics (jsonb), citations (jsonb)
- version, ai_summary, red_flags (jsonb)
- uploaded_by, created_at, updated_at
```

## Implementation Steps

### Step 1: Database Migrations
Create 3 new tables (`kpi_metrics`, `cap_table_snapshots`, `company_documents`) and alter `funding_rounds` with new term columns. Add RLS policies (public read for showcase). Populate with sample data for 5 flagship companies.

### Step 2: Company Terminal Rebuild
Restructure `CompanyDetail.tsx` into a Bloomberg-style terminal with these sections:

**Overview tab (enhanced)**
- Funding timeline (already exists -- keep)
- KPI sparklines using `kpi_metrics` data (new)
- Investors and ownership from `cap_table_snapshots` (new)
- Key personnel from `key_personnel` table (new -- wire existing data)

**Financials tab (enhanced)**
- Standardized KPI table with definitions and sources from `kpi_metrics`
- Existing financial history table stays
- Add metric definition tooltips and confidence indicators

**Terms tab (new)**
- Round terms summary using new `funding_rounds` columns
- Waterfall preview showing liquidation scenarios at different exit values
- Participation cap and anti-dilution visualization

**Comps tab (new -- embed CompTableBuilder)**
- Dynamic peer set auto-populated by sector/stage matching
- Link to full Comps Engine at `/valuations`

**Documents tab (new)**
- Upload area linked to storage bucket
- AI extraction results display (metrics, citations, red flags)
- Document version history

### Step 3: Comps Engine Enhancement
Enhance `CompTableBuilder.tsx` with:
- Filter panel: industry, stage, geography, growth rate range, margin profile range
- "Save Comp Set" button persisting to localStorage (or DB if auth)
- Override peers: allow manual metric overrides with visual diff
- Valuation range calculation with sensitivity sliders (WACC, growth, multiple range)
- Export to Excel (CSV with formatted headers)

### Step 4: Valuation Workbench Enhancement
Enhance `Valuations.tsx` and `DCFCalculator.tsx` with:
- Market multiples tab pulling live medians from Comps Engine
- KPI-based valuation method (revenue multiple * projected revenue)
- Scenario sliders for bull/base/bear cases
- Reverse underwriting: "What growth rate justifies $X valuation?" solver
- Assumption audit log (localStorage history of changed inputs)
- "Export Valuation Memo" button generating formatted PDF

### Step 5: Document Intelligence (Real AI)
Upgrade `DocumentAnalyzer.tsx` from demo-only to functional:
- Create a `company-documents` storage bucket for file uploads
- Build an `extract-document` edge function that:
  - Receives uploaded file reference
  - Calls Lovable AI to extract: ARR, growth, cohort metrics, terms clauses
  - Returns structured JSON with citations (page numbers) and confidence scores
- Store results in `company_documents` table linked to a company
- Generate: red flags list, diligence questions, KPI table
- Allow linking extracted data back to `kpi_metrics` for the company

### Step 6: IC Memo Generator Enhancement
Enhance `InvestmentMemo.tsx`:
- Auto-populate sections from company data: thesis, market, KPIs (from `kpi_metrics`), comps (from saved comp sets), valuation (from Valuation Workbench), risks (from AI analysis), terms summary (from `funding_rounds` terms)
- Add firm template selector (e.g., "Standard IC Memo", "Quick Screen", "Deep Dive")
- Export to formatted HTML/PDF (already exists) and add Google Slides-style export option

### Step 7: Monitoring Enhancement
Enhance `Alerts.tsx` with additional signal types:
- KPI change alerts (e.g., "ARR dropped > 10%")
- Hiring spike detection (employee count change threshold)
- Executive departure signals
- Web traffic signals (placeholder for future API)
- Weekly digest email option (add `digest_frequency` to `user_alerts`)

## Technical Details

**Storage**: Create `company-documents` bucket for uploaded files (PDF, DOCX, XLSX).

**Edge Function**: New `extract-document` function using Lovable AI (`google/gemini-3-flash-preview`) with tool calling to extract structured metrics from document text.

**Data Hooks**: New hooks in `useData.ts`:
- `useCompanyKPIs(companyId)` -- fetches from `kpi_metrics`
- `useCapTable(companyId)` -- fetches from `cap_table_snapshots`
- `useCompanyDocuments(companyId)` -- fetches from `company_documents`

**Sample Data**: Populate KPI time series (quarterly, 8 periods) for 5 flagship companies, cap table snapshots for 3 companies, and round terms for all existing funding rounds.

**Routes**: No new routes needed. All enhancements are within existing pages. The Company Terminal remains at `/companies/:id`.

**Files Modified**:
- `src/pages/CompanyDetail.tsx` -- Major rebuild with new tabs
- `src/pages/CompTableBuilder.tsx` -- Add filters, save, sensitivity
- `src/pages/Valuations.tsx` -- Add scenarios, reverse underwriting
- `src/pages/DocumentAnalyzer.tsx` -- Real AI extraction + company linking
- `src/components/InvestmentMemo.tsx` -- Templates, auto-populate
- `src/pages/Alerts.tsx` -- New signal types
- `src/hooks/useData.ts` -- New query hooks

**New Files**:
- `src/components/CapTableView.tsx` -- Ownership pie chart + table
- `src/components/KPISparklines.tsx` -- Sparkline grid for KPI metrics
- `src/components/RoundTerms.tsx` -- Terms summary + waterfall
- `src/components/DocumentUpload.tsx` -- Upload + extraction UI
- `supabase/functions/extract-document/index.ts` -- AI document extraction

**Database Migrations**:
- Create `kpi_metrics`, `cap_table_snapshots`, `company_documents` tables
- Alter `funding_rounds` with term columns
- Insert sample KPI data, cap table snapshots, round terms

## Implementation Sequence

Due to scope, this will be implemented across 3-4 messages:

1. **Message 1**: Database migrations (3 new tables + alter funding_rounds) + sample data + new data hooks + KPI/CapTable/Terms components
2. **Message 2**: Company Terminal rebuild (wire all new components into CompanyDetail.tsx tabs)
3. **Message 3**: Comps Engine enhancements + Valuation Workbench enhancements
4. **Message 4**: Document Intelligence (storage bucket + edge function + real extraction) + Memo enhancements + Monitoring enhancements

