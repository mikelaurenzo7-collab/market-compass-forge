
# Operation Domination: The Next Offensive

## Situation Report

**Current Force Strength:**
| Asset | Count | Status |
|-------|-------|--------|
| Total Companies | 7,841 | 841 private, 7,000 public |
| Global Opportunities | 139 | Good but needs 500+ for credibility |
| Distressed Assets | 326 | Solid, diversify geography |
| Real Estate Listings | 244 | Strong, expand property types |
| Precedent Transactions | 87 | Needs 200+ for reliable comps |
| Deal Transactions | 70 | Thin -- needs expansion |
| Alpha Signals | 10 | Engine works, needs deeper integration |
| Macro Indicators | 18 | Good baseline |
| Intelligence Signals | 385 | Strong sentiment coverage |

**Gaps the Enemy (PitchBook/Bloomberg) Exploits:**
1. DCF Calculator uses hardcoded WACC (10%) -- not wired to live Treasury yield data
2. Valuation Football Field has no "AI-Adjusted" bar showing predicted valuation shift
3. Company Detail page doesn't show sector alpha signals
4. No company-level AI health assessment (only sector-level signals exist)
5. Data density is thin in precedent transactions and deal flow -- undermines comps credibility
6. No cross-asset correlation view (macro shifts affecting RE, distressed, and PE simultaneously)

## Battle Plan: 5 Fronts

### Front 1: Wire AI Into Valuations (High Impact, Low Effort)

**DCF Calculator** -- Auto-populate the risk-free rate from `macro_indicators`:
- Query `macro_indicators` for `DGS10` (10-Year Treasury) on component mount
- Pre-fill the WACC field: `risk_free_rate + equity_risk_premium`
- Show a small label: "Risk-free rate: 4.28% (10Y Treasury, delayed)"
- User can still override manually

**Valuation Football Field** -- Add a 5th "AI Projected" bar:
- Query `alpha_signals` for the company's sector
- Apply the `magnitude_pct` shift to the Comp Companies range
- Display as a dashed-outline bar labeled "AI Adjusted" with the signal's confidence badge
- Example: If SaaS comps show $320M-$580M and alpha signal says +5.2%, the AI bar shows $337M-$610M

### Front 2: Company-Level AI Intelligence

Add an **AI Health Assessment** to `CompanyDetail.tsx`:
- New component `CompanyAIAssessment` shown in the overview tab sidebar
- Pulls the sector's alpha signal and overlays it on the company's specific metrics
- Displays a 3-line summary: "Based on macro conditions (10Y at 4.28%, Fed holding), public comps in Enterprise SaaS rising 5.2%, and this company's 25% growth rate, we project valuation stability with upside bias."
- Shows the sector signal direction + magnitude inline with the Investment Score
- No new edge function needed -- pure client-side composition of existing data

### Front 3: Data Arsenal Expansion

Seed additional data to reach institutional-grade density:

**Precedent Transactions** (target: 200+, currently 87):
- Add 120+ major M&A/PE transactions across Technology, Healthcare, Financial Services, Industrials, Consumer, and Energy
- Include recent 2024-2025 megadeals (Synopsys/Ansys, Juniper/HPE, Discover/Capital One)
- Ensures the Comp Analysis and Football Field have real benchmark multiples

**Deal Transactions** (target: 150+, currently 70):
- Add 80+ PE/VC deals with EV/Revenue and EV/EBITDA multiples
- Focus on mid-market ($50M-$2B) where our users operate

**Global Opportunities** (target: 300+, currently 139):
- Expand Sub-Saharan Africa (Nigeria, Kenya, South Africa fintech boom)
- Add Eastern Europe (Poland, Czech Republic PE activity)
- Add Southeast Asia depth (Vietnam, Philippines infrastructure plays)

**Distressed Assets** (target: 400+, currently 326):
- Add international distressed (UK retail, German industrial, Chinese property)
- Add specialty categories (shipping vessels, mineral rights, franchise portfolios)

### Front 4: Cross-Asset Macro Dashboard

Create a new **Macro Impact Matrix** component for the Analytics page:
- A grid showing how the current macro regime affects each asset class
- Rows: PE/VC, Distressed, Real Estate, Public Markets, Global
- Columns: Direction, Magnitude, Key Driver, AI Confidence
- Powered entirely by existing `alpha_signals` + `macro_indicators` data
- Shows correlations: "Rising rates compress PE multiples but create distressed opportunities"

### Front 5: Pattern Recognition Alerts

Add a **Smart Alerts** edge function that runs after alpha signals are generated:
- Detects sentiment-fundamental divergences (bullish sentiment + declining revenue = warning)
- Detects sector rotation patterns (capital flowing from one sector to another)
- Stores alerts in `alert_notifications` table (already exists)
- Surfaces on the dashboard with a new "AI Alerts" badge count

## Implementation Sequence

1. **Data seeding** (SQL migrations) -- expand precedent_transactions, deal_transactions, global_opportunities, distressed_assets
2. **DCF + Football Field wiring** -- connect macro_indicators and alpha_signals to valuation components
3. **CompanyAIAssessment component** -- new component for CompanyDetail sidebar
4. **Macro Impact Matrix** -- new Analytics page component
5. **Smart Alerts edge function** -- pattern detection + alert generation

## Technical Details

### New Files
- `src/components/CompanyAIAssessment.tsx` -- Company-level AI health overlay
- `src/components/MacroImpactMatrix.tsx` -- Cross-asset macro correlation grid
- `supabase/functions/smart-alerts/index.ts` -- Pattern detection engine

### Modified Files
- `src/components/DCFCalculator.tsx` -- Wire `useMacroIndicators` for risk-free rate auto-fill
- `src/components/ValuationFootballField.tsx` -- Add AI-Adjusted bar using `useAlphaSignals`
- `src/pages/CompanyDetail.tsx` -- Add CompanyAIAssessment to overview sidebar
- `src/pages/Analytics.tsx` -- Add MacroImpactMatrix section
- `src/components/AlphaSignalWidget.tsx` -- Add alert count badge
- `supabase/config.toml` -- Register smart-alerts function

### Data Seeding
- ~120 precedent transactions (SQL INSERT)
- ~80 deal transactions (SQL INSERT)  
- ~160 global opportunities (SQL INSERT)
- ~75 distressed assets (SQL INSERT)

### Cost Impact
- All data seeding: $0
- Smart Alerts: Uses existing Lovable AI credits (triggered only after alpha-signals runs)
- No new API keys or external dependencies

## What This Achieves

After this offensive, Grapevine will have:
- **Live macro-adjusted valuations** that no competitor offers at our price point
- **Company-level AI assessments** that synthesize sector + macro + company data
- **500+ precedent transactions** for institutional-grade comps
- **300+ global opportunities** across 6 regions
- **400+ distressed assets** including international
- **Pattern recognition alerts** that proactively surface opportunities

The enemy charges $30K/year for static data. We charge $399/month for predictive intelligence. That is how we win.
