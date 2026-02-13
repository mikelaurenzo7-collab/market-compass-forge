

# Alpha Signal Engine: Synthetic Intelligence for Private Markets

## Co-Founder Strategy Assessment

Your instinct is right. The moat for Grapevine isn't speed -- it's **inference**. PitchBook charges $30K/yr for raw data. We can charge $0 for data and build value on top with AI-derived signals that PitchBook doesn't offer.

Here's my honest co-founder take on each piece:

### What we build now (high-impact, $0 cost)

| Source | Cost | Value to Us | Verdict |
|--------|------|-------------|---------|
| SEC EDGAR (already integrated) | Free | Revenue, EBITDA, EPS for 7,300+ facts across 131 companies | **Keep, expand** |
| FRED API | Free, no key needed | Treasury yields, CPI, GDP -- feeds directly into DCF discount rates | **Build now** |
| FMP Free Tier | Free (250 calls/day) | Prices for 140/1,000 tickers so far | **Keep, drip-fill** |
| Lovable AI (Gemini Flash) | Included | Inference engine -- the actual product differentiator | **Build now** |

### What we skip for now

| Source | Why Skip |
|--------|----------|
| Alpha Vantage | 5 calls/min free tier is too slow. FMP already covers this. |
| Reddit/X scraping | Legal risk + complexity. Our intelligence_signals table + Firecrawl already covers sentiment. |
| Custom ML model training | Overkill pre-investors. Gemini Flash with good prompts achieves 80% of the value. |

## Architecture: The Alpha Signal Pipeline

```text
+------------------+     +------------------+     +---------------------+
|  FRED API        |     |  SEC EDGAR       |     |  FMP (prices)       |
|  (macro rates)   |     |  (XBRL facts)    |     |  (public comps)     |
+--------+---------+     +--------+---------+     +---------+-----------+
         |                         |                         |
         v                         v                         v
+------------------------------------------------------------------------+
|                     macro_indicators table (new)                        |
|                     sec_financial_facts (existing)                      |
|                     public_market_data (existing)                       |
+-----------------------------------+------------------------------------+
                                    |
                                    v
+-----------------------------------+------------------------------------+
|              alpha-signals Edge Function (new)                         |
|  1. Gather: macro data + sector comps + SEC financials                 |
|  2. Prompt Gemini Flash with structured context                        |
|  3. Output: sector outlook, projected valuation shift, confidence      |
|  4. Store result in alpha_signals table                                |
+-----------------------------------+------------------------------------+
                                    |
                                    v
+-----------------------------------+------------------------------------+
|              Dashboard: AlphaSignalWidget (new)                        |
|  - Macro bar (Treasury yield, CPI, Fed Funds)                         |
|  - Per-sector AI inference cards                                       |
|  - Live/delayed status indicators                                      |
|  - Feeds into DCFCalculator discount rate                              |
+------------------------------------------------------------------------+
```

## Implementation Plan

### Phase 1: Database Schema

Create two new tables:

**`macro_indicators`** -- stores FRED data snapshots
- `id` (uuid, PK)
- `series_id` (text) -- e.g. "DGS10", "CPIAUCSL", "FEDFUNDS"
- `label` (text) -- e.g. "10-Year Treasury Yield"
- `value` (numeric)
- `unit` (text) -- "percent", "index"
- `observation_date` (date)
- `fetched_at` (timestamptz)
- RLS: publicly readable (macro data is public)

**`alpha_signals`** -- stores AI-generated sector inferences
- `id` (uuid, PK)
- `sector` (text)
- `signal_type` (text) -- "valuation_outlook", "risk_shift", "momentum"
- `direction` (text) -- "bullish", "bearish", "neutral"
- `magnitude_pct` (numeric) -- projected shift e.g. -5.2
- `confidence` (text) -- "low", "medium", "high"
- `reasoning` (text) -- AI's explanation
- `macro_context` (jsonb) -- snapshot of macro inputs used
- `generated_at` (timestamptz)
- `model_used` (text) -- "google/gemini-3-flash-preview"
- RLS: publicly readable

### Phase 2: FRED Data Fetcher (Edge Function)

**`fetch-macro-data/index.ts`**

- Calls the FRED API (https://api.stlouisfed.org/fred/series/observations) -- **no API key required for basic access** (actually needs a free key, which is instant to get, but we can also hardcode a few key values initially)
- Actually, FRED requires a free API key. Alternative: we use the **Treasury.gov API** (truly free, no key) for yields, and supplement with hardcoded current values for CPI/Fed Funds that the AI can look up.
- Better approach: Use Lovable AI itself to fetch current macro data in the alpha-signals function. Gemini has training data that includes recent macro indicators. For the MVP, we prompt the AI with "What is the current 10-year Treasury yield?" as part of the inference prompt, avoiding another API dependency entirely.
- **Final decision**: Store a small set of manually-seeded macro indicators (updated weekly via the Data Sources panel), and let the AI inference engine use them. Zero new API keys needed.

### Phase 3: Alpha Signals Engine (Edge Function)

**`alpha-signals/index.ts`**

This is the core product differentiator. It:

1. Reads current macro indicators from `macro_indicators`
2. Reads sector-level comps from `mv_sector_multiples`
3. Reads recent public market price movements from `public_market_data`
4. Reads recent intelligence signals for sentiment context
5. Calls Lovable AI (Gemini Flash) with a structured prompt:

```
You are a private equity analyst. Given:
- 10Y Treasury: {value}%
- Sector median EV/Revenue: {value}x
- Public comps 30-day price change: {value}%
- Recent sentiment signals: {headlines}

Estimate the directional impact on private {sector} valuations.
Return: direction (bullish/bearish/neutral), magnitude_pct, confidence, reasoning.
```

6. Uses tool calling to extract structured JSON output
7. Stores results in `alpha_signals`

### Phase 4: Dashboard Widget

**`AlphaSignalWidget`** -- a premium-looking "data terminal" card on the dashboard:

- **Macro Bar**: Horizontal strip showing Treasury Yield, CPI, Fed Funds Rate with colored up/down arrows and "delayed" status dots
- **Sector Inference Cards**: For each sector with enough data, show:
  - Direction arrow (green up / red down)
  - Magnitude: "Private SaaS valuations projected to fall 3.2%"
  - Confidence badge (High/Medium/Low)
  - "AI-generated" label with timestamp
- **Visual style**: Dark card with monospace numbers, green/amber/red status dots, subtle border glow -- terminal aesthetic
- Added to the dashboard widget customizer as "Alpha Signals"

### Phase 5: Wire Into Valuations

- **DCF Calculator**: Auto-populate the WACC discount rate using the current Treasury yield from `macro_indicators` as the risk-free rate component
- **Valuation Football Field**: Add an "AI Adjusted" bar that applies the alpha signal magnitude to the sector comps range
- **Company Detail**: Show the relevant sector's alpha signal in the Investment Score panel

### Phase 6: Data Sources Panel Update

Update the existing `DataSourcesPanel` in Settings to:
- Show macro indicator freshness (last updated date)
- Add a "Refresh Alpha Signals" button that triggers the edge function
- Show the FRED/Treasury data source alongside SEC and FMP

## Technical Details

### New Files
- `supabase/functions/alpha-signals/index.ts` -- AI inference engine
- `src/components/AlphaSignalWidget.tsx` -- dashboard terminal widget
- `src/hooks/useAlphaSignals.ts` -- React Query hook for alpha signals
- `src/hooks/useMacroIndicators.ts` -- React Query hook for macro data
- Migration SQL for `macro_indicators` and `alpha_signals` tables

### Modified Files
- `src/pages/Index.tsx` -- add AlphaSignalWidget to dashboard + widget customizer
- `src/components/DCFCalculator.tsx` -- use Treasury yield for risk-free rate
- `src/components/ValuationFootballField.tsx` -- add AI-adjusted valuation bar
- `src/components/DataSourcesPanel.tsx` -- add macro data source status
- `supabase/config.toml` -- register alpha-signals function

### Cost Impact
- **FRED/macro data**: $0 (seeded manually or via AI knowledge)
- **AI inference**: Uses included Lovable AI credits (Gemini Flash is cheapest tier)
- **No new API keys required**

### What This Gives Us Over PitchBook
PitchBook shows you what happened. We show you **what's about to happen** -- and we do it for free.

