

# Speed Up AI Deal Matcher and General Performance Audit

## Problem
The Deal Matcher advertises "10-20 seconds" but takes 30+ seconds. The bottleneck is the backend function, not the frontend.

## Root Causes

1. **Over-fetching from database**: Queries fetch `SELECT *` on 4 tables (30 rows each) but only use 5-15 rows and a handful of fields
2. **Bloated AI prompt**: Pretty-printed JSON (`null, 2`) inflates the token count sent to the model by ~40%, which directly slows inference
3. **Redundant auth client**: Creates a second Supabase client instance just for `getUser()` -- adds cold-start latency
4. **No streaming**: Unlike the `ai-research` function (which streams SSE back to the client), deal-matcher waits for the entire AI response before returning anything
5. **Unused variable**: `companyNames` is computed but never used

## Plan

### 1. Optimize the Edge Function (`supabase/functions/deal-matcher/index.ts`)

- **Select only needed columns** instead of `SELECT *` on distressed_assets, global_opportunities, deal_transactions, alpha_signals
- **Reduce fetch limits** to match what's actually used (15, 15, 10, 5 instead of 30, 30, 30, 10)
- **Compact the AI prompt**: Use `JSON.stringify()` without pretty-printing (no `null, 2`), and reduce the prompt word count by trimming verbose instructions
- **Switch to a faster model**: Use `google/gemini-2.5-flash-lite` for this structured-output task -- it's the fastest option and perfectly capable of returning a sorted JSON array
- **Remove the unused `companyNames` variable**
- **Reuse a single Supabase anon client** for auth instead of creating a new one inline

### 2. Update the Loading Copy (`src/pages/DealMatcher.tsx`)

- Change "This typically takes 10-20 seconds" to "This typically takes 5-15 seconds" to reflect the improved speed
- Add an elapsed-time counter so users see real-time progress instead of a static message

### 3. General Performance Checks Across AI Functions

Review other AI-powered functions for the same anti-patterns:
- `generate-memo`: Already uses tool calling (good), no changes needed
- `ai-research`: Already streams (good), no changes needed
- `compute-scores`: No AI call, uses materialized views (good)

No other functions exhibit the same over-fetching + non-streaming + bloated-prompt combination.

## Technical Details

### Edge function changes (deal-matcher/index.ts)

```text
Before:
  select("*").limit(30)  x4 tables
  JSON.stringify(…, null, 2)  x5 blocks
  model: "google/gemini-3-flash-preview"
  Separate anon client for auth

After:
  select("id, name, sector, ...needed_cols").limit(15/10/5)
  JSON.stringify(…)  (compact)
  model: "google/gemini-2.5-flash-lite"
  Inline auth with service client getUser
  Remove companyNames
  Trim prompt instructions (~30% fewer words)
```

### Frontend changes (DealMatcher.tsx)

- Add elapsed timer showing "Analyzing... Xs" during loading
- Update static text from "10-20 seconds" to "5-15 seconds"

### Expected Impact

- Database queries: ~50% faster (fewer columns, fewer rows)
- AI inference: ~40-60% faster (smaller prompt + faster model)
- Total expected time: 8-15 seconds (down from 30+)

