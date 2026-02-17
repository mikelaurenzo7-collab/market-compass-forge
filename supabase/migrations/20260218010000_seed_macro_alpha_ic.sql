-- Migration 1: Seed macro_indicators, alpha_signals, ic_templates
-- These have zero FK dependencies and power Dashboard MacroBar, AlphaSignalWidget, and IC Templates

-- ============================================================
-- 1. MACRO INDICATORS (8 series x 5 observations = 40 rows)
-- ============================================================
INSERT INTO macro_indicators (series_id, label, value, unit, observation_date) VALUES
-- Fed Funds Rate
('FEDFUNDS', 'Fed Funds Rate', 5.33, 'percent', '2025-01-31'),
('FEDFUNDS', 'Fed Funds Rate', 5.25, 'percent', '2025-04-30'),
('FEDFUNDS', 'Fed Funds Rate', 5.00, 'percent', '2025-07-31'),
('FEDFUNDS', 'Fed Funds Rate', 4.75, 'percent', '2025-10-31'),
('FEDFUNDS', 'Fed Funds Rate', 4.50, 'percent', '2026-01-31'),
-- 10-Year Treasury
('DGS10', '10-Year Treasury', 4.55, 'percent', '2025-01-31'),
('DGS10', '10-Year Treasury', 4.40, 'percent', '2025-04-30'),
('DGS10', '10-Year Treasury', 4.25, 'percent', '2025-07-31'),
('DGS10', '10-Year Treasury', 4.10, 'percent', '2025-10-31'),
('DGS10', '10-Year Treasury', 4.15, 'percent', '2026-01-31'),
-- 2-Year Treasury
('DGS2', '2-Year Treasury', 4.30, 'percent', '2025-01-31'),
('DGS2', '2-Year Treasury', 4.15, 'percent', '2025-04-30'),
('DGS2', '2-Year Treasury', 3.95, 'percent', '2025-07-31'),
('DGS2', '2-Year Treasury', 3.85, 'percent', '2025-10-31'),
('DGS2', '2-Year Treasury', 3.90, 'percent', '2026-01-31'),
-- High-Yield Spread
('BAMLH0A0HYM2', 'HY OAS Spread', 3.50, 'percent', '2025-01-31'),
('BAMLH0A0HYM2', 'HY OAS Spread', 3.35, 'percent', '2025-04-30'),
('BAMLH0A0HYM2', 'HY OAS Spread', 3.20, 'percent', '2025-07-31'),
('BAMLH0A0HYM2', 'HY OAS Spread', 3.45, 'percent', '2025-10-31'),
('BAMLH0A0HYM2', 'HY OAS Spread', 3.30, 'percent', '2026-01-31'),
-- CPI (Year-over-year)
('CPIAUCSL', 'CPI YoY', 3.10, 'percent', '2025-01-31'),
('CPIAUCSL', 'CPI YoY', 2.90, 'percent', '2025-04-30'),
('CPIAUCSL', 'CPI YoY', 2.70, 'percent', '2025-07-31'),
('CPIAUCSL', 'CPI YoY', 2.50, 'percent', '2025-10-31'),
('CPIAUCSL', 'CPI YoY', 2.40, 'percent', '2026-01-31'),
-- Unemployment
('UNRATE', 'Unemployment Rate', 3.70, 'percent', '2025-01-31'),
('UNRATE', 'Unemployment Rate', 3.80, 'percent', '2025-04-30'),
('UNRATE', 'Unemployment Rate', 3.90, 'percent', '2025-07-31'),
('UNRATE', 'Unemployment Rate', 4.00, 'percent', '2025-10-31'),
('UNRATE', 'Unemployment Rate', 4.10, 'percent', '2026-01-31'),
-- GDP Growth (annualized)
('GDP', 'Real GDP Growth', 2.80, 'percent', '2025-01-31'),
('GDP', 'Real GDP Growth', 2.50, 'percent', '2025-04-30'),
('GDP', 'Real GDP Growth', 2.30, 'percent', '2025-07-31'),
('GDP', 'Real GDP Growth', 2.10, 'percent', '2025-10-31'),
('GDP', 'Real GDP Growth', 2.20, 'percent', '2026-01-31'),
-- 30-Year Mortgage
('MORTGAGE30US', '30-Year Mortgage', 6.85, 'percent', '2025-01-31'),
('MORTGAGE30US', '30-Year Mortgage', 6.70, 'percent', '2025-04-30'),
('MORTGAGE30US', '30-Year Mortgage', 6.55, 'percent', '2025-07-31'),
('MORTGAGE30US', '30-Year Mortgage', 6.40, 'percent', '2025-10-31'),
('MORTGAGE30US', '30-Year Mortgage', 6.35, 'percent', '2026-01-31')
ON CONFLICT (series_id, observation_date) DO NOTHING;


-- ============================================================
-- 2. ALPHA SIGNALS (30 rows — one per sector)
-- ============================================================
INSERT INTO alpha_signals (sector, signal_type, direction, magnitude_pct, confidence, reasoning, macro_context, generated_at) VALUES
('Biotech', 'valuation_outlook', 'bullish', 8.5, 'high', 'Strong pipeline catalysts across gene therapy and mRNA platforms. FDA approval pace accelerating with 62 NMEs approved in 2025. Large pharma M&A appetite remains robust with $180B deployed.', '{"fed_rate": 4.5, "10y_yield": 4.15, "hy_spread": 3.3}', '2026-02-15 10:00:00+00'),
('AgTech', 'valuation_outlook', 'bullish', 5.2, 'medium', 'Precision agriculture adoption accelerating driven by commodity price volatility. Climate adaptation spending increasing globally. Vertical farming unit economics improving.', '{"fed_rate": 4.5, "10y_yield": 4.15, "cpi": 2.4}', '2026-02-15 10:00:00+00'),
('CleanTech', 'valuation_outlook', 'bullish', 12.0, 'high', 'IRA tailwinds continue driving deployment. Battery storage costs down 15% YoY. Green hydrogen reaching cost parity in select markets. Carbon credit prices stabilizing above $50/ton.', '{"fed_rate": 4.5, "10y_yield": 4.15, "cpi": 2.4}', '2026-02-15 10:00:00+00'),
('Digital Health', 'valuation_outlook', 'neutral', 2.1, 'medium', 'Post-pandemic normalization complete. Virtual care adoption plateauing at 25-30% of visits. AI diagnostics showing promise but reimbursement pathways unclear.', '{"fed_rate": 4.5, "unemployment": 4.1}', '2026-02-15 10:00:00+00'),
('FoodTech', 'valuation_outlook', 'bearish', -6.3, 'medium', 'Cultivated meat regulatory headwinds in EU markets. Plant-based protein sales growth decelerating. Consumer willingness-to-pay premium narrowing.', '{"fed_rate": 4.5, "cpi": 2.4}', '2026-02-15 10:00:00+00'),
('FinTech', 'valuation_outlook', 'bullish', 7.8, 'high', 'Embedded finance and BaaS gaining traction. Stablecoin regulatory clarity emerging. B2B payments digitization accelerating across SMB segment. Neobank profitability improving.', '{"fed_rate": 4.5, "10y_yield": 4.15}', '2026-02-15 10:00:00+00'),
('Enterprise SaaS', 'valuation_outlook', 'bullish', 9.4, 'high', 'AI copilot features driving upsell and expansion revenue. Net retention rates recovering to 115-125%. Vertical SaaS consolidation wave creating platform plays.', '{"fed_rate": 4.5, "10y_yield": 4.15}', '2026-02-15 10:00:00+00'),
('Cybersecurity', 'valuation_outlook', 'bullish', 11.2, 'high', 'Zero-trust architecture mandates expanding. AI-powered threat detection creating new category leaders. Cyber insurance requirements driving SMB adoption. $225B TAM by 2028.', '{"fed_rate": 4.5, "10y_yield": 4.15}', '2026-02-15 10:00:00+00'),
('Real Estate', 'valuation_outlook', 'neutral', -1.5, 'medium', 'Office vacancy stabilizing but not recovering. Industrial demand remains strong driven by nearshoring. Multifamily rent growth moderating to 2-3%. CRE refinancing wall creating selective opportunities.', '{"fed_rate": 4.5, "mortgage_30y": 6.35, "unemployment": 4.1}', '2026-02-15 10:00:00+00'),
('Energy', 'valuation_outlook', 'neutral', 1.8, 'medium', 'Oil prices range-bound $70-85. Natural gas demand rising from LNG exports and data center power. Energy transition creating bifurcated investment landscape.', '{"fed_rate": 4.5, "10y_yield": 4.15, "cpi": 2.4}', '2026-02-15 10:00:00+00'),
('Industrials', 'valuation_outlook', 'bullish', 4.5, 'medium', 'Reshoring and nearshoring driving capex cycle. Infrastructure spending from IRA and CHIPS Act flowing into manufacturing. Automation demand accelerating with labor shortages.', '{"fed_rate": 4.5, "gdp_growth": 2.2}', '2026-02-15 10:00:00+00'),
('Semiconductors', 'valuation_outlook', 'bullish', 14.5, 'high', 'AI accelerator demand exceeding supply. CHIPS Act fabs breaking ground. Advanced packaging becoming key differentiator. Edge AI creating new silicon opportunities.', '{"fed_rate": 4.5, "10y_yield": 4.15}', '2026-02-15 10:00:00+00'),
('Automotive', 'valuation_outlook', 'bearish', -4.2, 'medium', 'EV adoption growth slowing in mature markets. Chinese EV competition intensifying. ICE-to-EV transition costs straining OEM margins. Autonomous driving timelines extending.', '{"fed_rate": 4.5, "cpi": 2.4}', '2026-02-15 10:00:00+00'),
('Aerospace & Defense', 'valuation_outlook', 'bullish', 8.0, 'high', 'Defense budgets expanding globally with NATO 2% targets. Space economy commercializing rapidly. Drone technology creating new defense primes. Supply chain recovering post-pandemic.', '{"fed_rate": 4.5, "gdp_growth": 2.2}', '2026-02-15 10:00:00+00'),
('Pharmaceuticals', 'valuation_outlook', 'neutral', 2.5, 'medium', 'GLP-1 franchise expanding beyond diabetes. Biosimilar competition creating margin pressure. IRA drug price negotiation impact still being assessed. M&A remains primary growth strategy.', '{"fed_rate": 4.5, "10y_yield": 4.15}', '2026-02-15 10:00:00+00'),
('Telecommunications', 'valuation_outlook', 'bearish', -3.0, 'low', 'Revenue growth constrained by competitive pricing. 5G monetization below expectations. Fiber buildout capex burden weighing on FCF. Tower consolidation creating some value.', '{"fed_rate": 4.5, "10y_yield": 4.15}', '2026-02-15 10:00:00+00'),
('Media & Entertainment', 'valuation_outlook', 'neutral', -0.8, 'medium', 'Streaming consolidation phase underway. Ad-supported tiers gaining traction. AI content tools reducing production costs but raising IP concerns. Gaming sector showing resilience.', '{"fed_rate": 4.5, "cpi": 2.4}', '2026-02-15 10:00:00+00'),
('Consumer Staples', 'valuation_outlook', 'neutral', 1.2, 'medium', 'Volume recovery after two years of price-driven growth. Private label market share gains plateauing. Input cost deflation supporting margin expansion.', '{"fed_rate": 4.5, "cpi": 2.4}', '2026-02-15 10:00:00+00'),
('Insurance', 'valuation_outlook', 'bullish', 6.0, 'medium', 'Hard market cycle continuing in specialty lines. Insurtech enabling better risk selection. Climate-related losses driving rate adequacy. Life insurance demand rising with aging demographics.', '{"fed_rate": 4.5, "10y_yield": 4.15}', '2026-02-15 10:00:00+00'),
('Retail', 'valuation_outlook', 'bearish', -5.5, 'medium', 'Consumer spending shifting to services. Physical retail footprint rationalization accelerating. E-commerce growth normalizing to mid-single digits. Discount and value formats outperforming.', '{"fed_rate": 4.5, "cpi": 2.4, "unemployment": 4.1}', '2026-02-15 10:00:00+00'),
('Materials', 'valuation_outlook', 'neutral', 0.5, 'low', 'Commodity prices stabilizing after 2024 volatility. Lithium oversupply pressuring battery metals. Rare earth supply diversification underway. Sustainable materials gaining premium.', '{"fed_rate": 4.5, "cpi": 2.4}', '2026-02-15 10:00:00+00'),
('Utilities', 'valuation_outlook', 'bullish', 4.8, 'medium', 'Data center power demand creating generation-level growth not seen in decades. Rate base growth from grid modernization. Renewable procurement contracts providing visibility.', '{"fed_rate": 4.5, "10y_yield": 4.15}', '2026-02-15 10:00:00+00'),
('Transportation', 'valuation_outlook', 'neutral', 1.0, 'medium', 'Freight recession ending with inventory restocking cycle. Airlines maintaining pricing discipline. Autonomous trucking pilots expanding. Port congestion normalized.', '{"fed_rate": 4.5, "gdp_growth": 2.2}', '2026-02-15 10:00:00+00'),
('Robotics', 'valuation_outlook', 'bullish', 10.5, 'high', 'Humanoid robotics attracting record venture capital. Warehouse automation approaching mainstream adoption. Surgical robotics expanding to outpatient settings. Labor shortage tailwinds.', '{"fed_rate": 4.5, "unemployment": 4.1}', '2026-02-15 10:00:00+00'),
('ConstructionTech', 'valuation_outlook', 'bullish', 5.5, 'medium', 'Modular construction gaining market share. BIM adoption becoming mandatory in public projects. Construction labor shortage driving automation investment.', '{"fed_rate": 4.5, "mortgage_30y": 6.35}', '2026-02-15 10:00:00+00'),
('HRTech', 'valuation_outlook', 'neutral', 1.5, 'medium', 'AI-driven talent matching reducing time-to-hire. Skills-based hiring replacing degree requirements. Workforce analytics becoming strategic boardroom tool.', '{"fed_rate": 4.5, "unemployment": 4.1}', '2026-02-15 10:00:00+00'),
('MarTech', 'valuation_outlook', 'bearish', -2.5, 'medium', 'Cookie deprecation creating measurement gaps. MarTech stack consolidation reducing vendor count. AI automating campaign management reducing headcount-based pricing power.', '{"fed_rate": 4.5, "cpi": 2.4}', '2026-02-15 10:00:00+00'),
('Quantum Computing', 'valuation_outlook', 'bullish', 7.0, 'low', 'Error correction breakthroughs bringing practical quantum closer. Financial services and pharma exploring early use cases. Government funding accelerating. Still pre-revenue for most.', '{"fed_rate": 4.5, "10y_yield": 4.15}', '2026-02-15 10:00:00+00'),
('Space Tech', 'valuation_outlook', 'bullish', 9.0, 'medium', 'Launch costs continuing to decline. LEO satellite constellations proving commercial viability. Earth observation data becoming critical infrastructure. Space debris management emerging.', '{"fed_rate": 4.5, "10y_yield": 4.15}', '2026-02-15 10:00:00+00'),
('EdTech', 'valuation_outlook', 'neutral', -1.0, 'low', 'Post-pandemic normalization complete. AI tutoring showing strong learning outcomes but monetization unclear. Corporate upskilling budgets growing. International expansion opportunities.', '{"fed_rate": 4.5, "cpi": 2.4}', '2026-02-15 10:00:00+00');


-- ============================================================
-- 3. IC TEMPLATES (5 strategy templates)
-- ============================================================
INSERT INTO ic_templates (name, strategy, description, sections, checklist, required_approvals, is_system) VALUES
(
  'Growth Equity IC Memo',
  'growth',
  'Standard investment committee memo template for growth equity investments in technology and healthcare companies.',
  '[
    {"title": "Executive Summary", "prompt": "Provide a concise overview of the investment opportunity, including company description, deal terms, and investment thesis in 3-5 sentences."},
    {"title": "Company Overview", "prompt": "Describe the company, its products/services, founding story, leadership team, and current market position."},
    {"title": "Market Opportunity", "prompt": "Analyze the total addressable market (TAM), serviceable addressable market (SAM), and growth drivers. Include competitive landscape."},
    {"title": "Financial Performance", "prompt": "Present historical and projected revenue, ARR/MRR, gross margins, unit economics, burn rate, and path to profitability."},
    {"title": "Growth Strategy", "prompt": "Outline the company growth plan, including product roadmap, go-to-market strategy, and expansion opportunities."},
    {"title": "Competitive Moat", "prompt": "Analyze sustainable competitive advantages: technology, network effects, switching costs, brand, or regulatory barriers."},
    {"title": "Deal Terms & Valuation", "prompt": "Detail proposed investment amount, valuation, ownership stake, board rights, protective provisions, and comparable valuations."},
    {"title": "Risk Analysis", "prompt": "Identify key risks (market, execution, technology, regulatory, competitive) and proposed mitigation strategies."},
    {"title": "Value Creation Plan", "prompt": "Outline the 100-day plan and 3-5 year value creation initiatives including operational improvements and potential exits."},
    {"title": "Recommendation", "prompt": "State clear investment recommendation with conditions, required approvals, and next steps."}
  ]'::jsonb,
  '[
    {"item": "Financial model reviewed and stress-tested", "required": true},
    {"item": "Management references completed (3+ customers, 2+ former employees)", "required": true},
    {"item": "Legal due diligence complete", "required": true},
    {"item": "Technology/product due diligence complete", "required": true},
    {"item": "Market sizing validated with primary research", "required": false},
    {"item": "Competitive analysis reviewed", "required": true},
    {"item": "ESG screening passed", "required": false},
    {"item": "Tax structure reviewed", "required": true}
  ]'::jsonb,
  3,
  true
),
(
  'Leveraged Buyout IC Memo',
  'buyout',
  'Comprehensive IC memo template for leveraged buyout transactions targeting mature, cash-flow generative businesses.',
  '[
    {"title": "Executive Summary", "prompt": "Summarize the LBO opportunity including target description, enterprise value, leverage profile, and expected returns."},
    {"title": "Business Description", "prompt": "Detail the target business model, customer concentration, revenue mix, and operational infrastructure."},
    {"title": "Industry Analysis", "prompt": "Analyze industry structure, cyclicality, regulatory environment, and secular trends affecting the business."},
    {"title": "Historical Financial Analysis", "prompt": "Present 3-5 years of revenue, EBITDA, margins, capex, working capital, and cash conversion metrics."},
    {"title": "Leverage & Capital Structure", "prompt": "Detail proposed debt structure including senior, mezzanine, and equity layers. Include coverage ratios and covenant analysis."},
    {"title": "Operating Improvement Plan", "prompt": "Identify margin expansion opportunities through cost optimization, procurement savings, and operational efficiency."},
    {"title": "Add-on Acquisition Strategy", "prompt": "Outline potential bolt-on acquisitions with target profiles, expected multiples, and integration synergies."},
    {"title": "Management Assessment", "prompt": "Evaluate existing management team capabilities, incentive alignment, and any required hires."},
    {"title": "Exit Analysis", "prompt": "Model exit scenarios (strategic sale, IPO, secondary) with timeline, expected multiples, and IRR/MOIC sensitivity."},
    {"title": "Downside Protection", "prompt": "Analyze asset coverage, liquidation value, minimum EBITDA for debt service, and break-even scenarios."}
  ]'::jsonb,
  '[
    {"item": "Quality of earnings (QoE) report completed", "required": true},
    {"item": "Debt financing commitment letters obtained", "required": true},
    {"item": "Management presentation and site visit completed", "required": true},
    {"item": "Insurance review completed", "required": true},
    {"item": "Environmental due diligence completed", "required": true},
    {"item": "Customer and supplier concentration analyzed", "required": true},
    {"item": "IT systems and cybersecurity assessment", "required": false},
    {"item": "Antitrust/regulatory clearance assessment", "required": true},
    {"item": "Employment and benefits review", "required": false}
  ]'::jsonb,
  4,
  true
),
(
  'Distressed / Special Situations IC Memo',
  'distressed',
  'IC memo template for distressed debt, bankruptcy acquisitions, and special situations investments.',
  '[
    {"title": "Situation Overview", "prompt": "Describe the distressed situation including triggers, current legal status (Chapter 7/11, receivership), and timeline."},
    {"title": "Asset Description", "prompt": "Detail the assets being acquired including physical assets, IP, contracts, real estate, and workforce."},
    {"title": "Valuation Analysis", "prompt": "Present liquidation value, going-concern value, and recovery analysis under multiple scenarios."},
    {"title": "Legal Framework", "prompt": "Analyze bankruptcy proceedings, creditor claims, priority waterfall, DIP financing, and Section 363 sale process."},
    {"title": "Restructuring Plan", "prompt": "Outline the proposed operational restructuring including cost cuts, asset dispositions, and new capital structure."},
    {"title": "Competitive Bid Landscape", "prompt": "Identify potential competing bidders, stalking horse protections, and auction dynamics."},
    {"title": "Risk Factors", "prompt": "Assess environmental liabilities, successor liability, labor obligations, and litigation exposure."},
    {"title": "Return Analysis", "prompt": "Model IRR and MOIC under base, upside, and downside cases with clear assumption sensitivity."}
  ]'::jsonb,
  '[
    {"item": "Legal counsel engaged and opinions received", "required": true},
    {"item": "Environmental Phase I/II assessments", "required": true},
    {"item": "Lien and title search completed", "required": true},
    {"item": "Claims analysis and waterfall model reviewed", "required": true},
    {"item": "Key employee retention plans assessed", "required": false},
    {"item": "Insurance and liability transfer reviewed", "required": true},
    {"item": "Stalking horse bid protections negotiated", "required": false}
  ]'::jsonb,
  3,
  true
),
(
  'Real Estate Investment IC Memo',
  'real_estate',
  'IC memo template for commercial real estate acquisitions including multifamily, industrial, office, and retail properties.',
  '[
    {"title": "Property Overview", "prompt": "Describe the property including location, size, year built, condition, and recent capital improvements."},
    {"title": "Market Analysis", "prompt": "Analyze the submarket including vacancy rates, rent trends, cap rates, new supply pipeline, and demand drivers."},
    {"title": "Tenant Analysis", "prompt": "Detail the rent roll, lease terms, tenant credit quality, rollover schedule, and mark-to-market opportunity."},
    {"title": "Financial Projections", "prompt": "Present pro forma NOI, debt service coverage, cash-on-cash returns, and IRR with detailed assumptions."},
    {"title": "Capital Plan", "prompt": "Outline planned capital expenditures including renovations, amenity upgrades, and deferred maintenance."},
    {"title": "Financing Structure", "prompt": "Detail proposed debt terms including LTV, rate, term, interest-only period, and prepayment provisions."},
    {"title": "Comparable Sales", "prompt": "Present recent comparable transactions with price/SF, cap rate, and buyer profile analysis."},
    {"title": "Risk Factors & Sensitivity", "prompt": "Analyze key risks including interest rate sensitivity, vacancy scenarios, capex overruns, and exit cap rate assumptions."}
  ]'::jsonb,
  '[
    {"item": "Property inspection and condition assessment", "required": true},
    {"item": "Environmental Phase I completed", "required": true},
    {"item": "Title and survey review", "required": true},
    {"item": "Rent roll and lease abstracts verified", "required": true},
    {"item": "Property tax assessment reviewed", "required": true},
    {"item": "Zoning and entitlements confirmed", "required": true},
    {"item": "Insurance quotes obtained", "required": false},
    {"item": "Third-party appraisal completed", "required": true}
  ]'::jsonb,
  3,
  true
),
(
  'Venture Capital IC Memo',
  'venture',
  'Streamlined IC memo template for seed through Series B venture capital investments in high-growth startups.',
  '[
    {"title": "Deal Summary", "prompt": "One-paragraph overview: company, round size, valuation, lead investor, and our proposed allocation."},
    {"title": "Problem & Solution", "prompt": "What customer pain point does this solve? How is the solution 10x better than alternatives?"},
    {"title": "Founding Team", "prompt": "Assess founders backgrounds, domain expertise, founder-market fit, and any prior exits or notable experience."},
    {"title": "Traction & Metrics", "prompt": "Present key metrics: MRR/ARR, growth rate, retention/churn, CAC/LTV, and engagement metrics."},
    {"title": "Market & Competition", "prompt": "Size the opportunity and map the competitive landscape. Why can this team win?"},
    {"title": "Business Model", "prompt": "Detail unit economics, pricing strategy, expansion revenue potential, and path to contribution margin."},
    {"title": "Use of Funds", "prompt": "How will this round be deployed? What milestones will be achieved before the next raise?"},
    {"title": "Risks & Mitigants", "prompt": "Top 3-5 risks and how the team plans to address them."},
    {"title": "Return Scenario Analysis", "prompt": "Model base, bull, and bear exit scenarios with implied fund-level returns."}
  ]'::jsonb,
  '[
    {"item": "Founder reference calls completed (3+)", "required": true},
    {"item": "Customer interviews conducted (5+)", "required": true},
    {"item": "Cap table reviewed", "required": true},
    {"item": "Technical architecture review (for deep tech)", "required": false},
    {"item": "Market sizing cross-referenced with bottom-up analysis", "required": false},
    {"item": "Term sheet reviewed by legal", "required": true}
  ]'::jsonb,
  2,
  true
);
