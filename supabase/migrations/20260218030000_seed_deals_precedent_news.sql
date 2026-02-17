-- Migration 3: Seed deal_transactions, precedent_transactions, news_articles
-- deal_transactions and precedent_transactions use text fields (no FK)
-- news_articles has optional FK to companies

-- ============================================================
-- 1. DEAL TRANSACTIONS (~60 rows)
--    Mix of LBO, M&A, Growth, Add-on across sectors
-- ============================================================
INSERT INTO deal_transactions (target_company, target_industry, deal_type, deal_value, acquirer_investor, ev_ebitda, ev_revenue, status, announced_date, closed_date, is_synthetic, source_type) VALUES
-- Healthcare / Biotech
('MedTech Solutions Inc', 'Healthcare', 'LBO', 850000000, 'Welsh Carson Health', 14.2, 5.8, 'closed', '2025-11-15', '2026-01-20', true, 'seeded'),
('Precision Diagnostics Corp', 'Healthcare', 'M&A', 420000000, 'Danaher Corporation', 18.5, 7.2, 'closed', '2025-10-01', '2025-12-15', true, 'seeded'),
('NeuroStim Medical', 'Healthcare', 'Growth', 180000000, 'OrbiMed Advisors', 25.0, 9.5, 'closed', '2025-12-10', '2026-01-15', true, 'seeded'),
('PharmaStar Generics', 'Pharmaceuticals', 'LBO', 1200000000, 'Bain Capital', 11.5, 3.2, 'closed', '2025-09-20', '2025-11-30', true, 'seeded'),
('VitalCare Home Health', 'Healthcare', 'Add-on', 95000000, 'KKR Growth', 12.0, 4.5, 'closed', '2025-12-05', '2026-01-10', true, 'seeded'),
('BioAssay Instruments', 'Healthcare', 'M&A', 650000000, 'Thermo Fisher Scientific', 22.0, 8.5, 'announced', '2026-01-25', NULL, true, 'seeded'),
('CellGenix Therapeutics', 'Biotech', 'M&A', 380000000, 'Roche Holdings', NULL, 15.0, 'announced', '2026-02-05', NULL, true, 'seeded'),

-- Enterprise SaaS / Technology
('CloudSphere Analytics', 'Enterprise SaaS', 'M&A', 1200000000, 'Salesforce', 28.5, 8.2, 'closed', '2025-10-01', '2025-12-15', true, 'seeded'),
('DataSync Platform', 'Enterprise SaaS', 'LBO', 650000000, 'Francisco Partners', 22.0, 6.5, 'closed', '2025-11-20', '2026-01-05', true, 'seeded'),
('CyberShield Pro', 'Cybersecurity', 'M&A', 2800000000, 'Palo Alto Networks', 35.0, 12.5, 'closed', '2025-08-15', '2025-11-01', true, 'seeded'),
('DevOps Automation Inc', 'Enterprise SaaS', 'Growth', 250000000, 'Insight Partners', NULL, 15.0, 'closed', '2025-12-15', '2026-01-20', true, 'seeded'),
('ComplianceTech Pro', 'Enterprise SaaS', 'LBO', 480000000, 'Hellman Friedman', 18.0, 7.0, 'closed', '2025-10-25', '2025-12-20', true, 'seeded'),
('AICodeReview', 'Enterprise SaaS', 'M&A', 550000000, 'Microsoft', NULL, 20.0, 'announced', '2026-01-30', NULL, true, 'seeded'),
('LogisticsAI Platform', 'Enterprise SaaS', 'Growth', 150000000, 'General Atlantic', 30.0, 10.0, 'announced', '2026-02-10', NULL, true, 'seeded'),
('SecureNet Systems', 'Cybersecurity', 'Add-on', 120000000, 'Clearlake Capital', 15.0, 5.5, 'closed', '2025-12-01', '2026-01-08', true, 'seeded'),

-- FinTech
('PaymentBridge Corp', 'FinTech', 'M&A', 3500000000, 'FIS Global', 20.0, 8.0, 'closed', '2025-09-01', '2025-12-01', true, 'seeded'),
('LendingEngine', 'FinTech', 'LBO', 750000000, 'Advent International', 12.5, 5.0, 'closed', '2025-11-10', '2026-01-15', true, 'seeded'),
('WealthOS Platform', 'FinTech', 'Growth', 200000000, 'Tiger Global', NULL, 12.0, 'closed', '2025-12-20', '2026-01-25', true, 'seeded'),
('CryptoCompliance Inc', 'FinTech', 'M&A', 280000000, 'Coinbase', NULL, 18.0, 'announced', '2026-01-15', NULL, true, 'seeded'),
('InsuraPlatform', 'InsurTech', 'LBO', 520000000, 'Apax Partners', 14.0, 4.8, 'closed', '2025-10-15', '2025-12-10', true, 'seeded'),

-- Industrials / Manufacturing
('PrecisionMetal Works', 'Industrials', 'LBO', 380000000, 'Platinum Equity', 8.5, 1.8, 'closed', '2025-10-20', '2025-12-18', true, 'seeded'),
('AutoParts International', 'Automotive', 'LBO', 920000000, 'Carlyle Digital', 9.0, 2.2, 'closed', '2025-09-15', '2025-11-25', true, 'seeded'),
('GreenPackaging Co', 'Materials', 'M&A', 450000000, 'Smurfit WestRock', 10.5, 2.5, 'closed', '2025-11-05', '2026-01-10', true, 'seeded'),
('SmartFactory Systems', 'Industrials', 'Growth', 180000000, 'EQT Partners', 15.0, 5.0, 'announced', '2026-02-01', NULL, true, 'seeded'),
('AeroComponent Corp', 'Aerospace & Defense', 'Add-on', 210000000, 'TransDigm Group', 12.0, 3.8, 'closed', '2025-12-12', '2026-01-18', true, 'seeded'),

-- Energy / CleanTech
('SunPower Residential', 'Energy', 'LBO', 600000000, 'Brookfield Renewables', 8.0, 1.5, 'closed', '2025-10-05', '2025-12-20', true, 'seeded'),
('GridStorage Solutions', 'CleanTech', 'M&A', 1800000000, 'NextEra Energy Partners', 25.0, 10.0, 'closed', '2025-08-20', '2025-11-15', true, 'seeded'),
('HydrogenFirst Corp', 'CleanTech', 'Growth', 300000000, 'Hy24', NULL, 8.0, 'announced', '2026-01-28', NULL, true, 'seeded'),
('WasteToEnergy Systems', 'CleanTech', 'LBO', 420000000, 'ArcLight Capital', 10.0, 3.0, 'closed', '2025-11-25', '2026-01-05', true, 'seeded'),

-- Real Estate / Infrastructure
('DataCenter Properties REIT', 'Real Estate', 'M&A', 4500000000, 'Blackstone Real Estate', 22.0, 12.0, 'closed', '2025-07-15', '2025-10-30', true, 'seeded'),
('UrbanLiving Communities', 'Real Estate', 'LBO', 1100000000, 'Brookfield Asset Mgmt', 15.0, 8.0, 'closed', '2025-09-10', '2025-12-05', true, 'seeded'),
('LogisPark Warehousing', 'Real Estate', 'M&A', 780000000, 'Prologis', 18.0, 10.5, 'closed', '2025-11-01', '2026-01-15', true, 'seeded'),

-- Consumer / Retail
('PremiumBrands Direct', 'Consumer', 'LBO', 550000000, 'L Catterton', 11.0, 2.8, 'closed', '2025-10-28', '2025-12-22', true, 'seeded'),
('FreshMeals Delivery', 'FoodTech', 'M&A', 320000000, 'DoorDash', NULL, 4.0, 'announced', '2026-02-08', NULL, true, 'seeded'),
('FitnessConnect Platform', 'Consumer', 'Growth', 120000000, 'Summit Partners', 18.0, 6.0, 'closed', '2025-12-18', '2026-01-22', true, 'seeded'),

-- Education / Media
('CorporateLearn Pro', 'EdTech', 'LBO', 280000000, 'Genstar Capital', 12.0, 4.5, 'closed', '2025-11-15', '2025-12-28', true, 'seeded'),
('StreamMedia Networks', 'Media & Entertainment', 'M&A', 900000000, 'Sony Group', 15.0, 5.0, 'rumored', '2026-02-12', NULL, true, 'seeded'),
('GameStudio Pro', 'Media & Entertainment', 'M&A', 450000000, 'Take-Two Interactive', 14.0, 6.0, 'announced', '2026-01-20', NULL, true, 'seeded'),

-- Distressed / Special Situations
('RetailChain Holdings', 'Retail', 'Distressed', 180000000, 'Cerberus Capital', 6.0, 0.8, 'closed', '2025-10-10', '2025-12-15', true, 'seeded'),
('OilField Services Group', 'Energy', 'Distressed', 350000000, 'Riverstone Holdings', 5.5, 1.2, 'closed', '2025-09-25', '2025-11-30', true, 'seeded'),
('HospitalityGroup International', 'Real Estate', 'Distressed', 250000000, 'Ares Management', 8.0, 2.0, 'closed', '2025-11-18', '2026-01-05', true, 'seeded');


-- ============================================================
-- 2. PRECEDENT TRANSACTIONS (~50 rows, historical 2020-2025)
-- ============================================================
INSERT INTO precedent_transactions (acquirer_company_name, target_company_name, deal_type, deal_value, target_revenue, target_ebitda, ev_revenue, ev_ebitda, sector, deal_date) VALUES
-- Enterprise SaaS (high multiples)
('Salesforce', 'Slack Technologies', 'M&A', 27700000000, 900000000, 50000000, 30.8, NULL, 'Enterprise SaaS', '2021-07-21'),
('Adobe', 'Figma', 'M&A', 20000000000, 400000000, NULL, 50.0, NULL, 'Enterprise SaaS', '2022-09-15'),
('Cisco Systems', 'Splunk', 'M&A', 28000000000, 3800000000, 500000000, 7.4, 56.0, 'Enterprise SaaS', '2024-03-18'),
('SAP', 'Qualtrics', 'M&A', 12500000000, 1500000000, 150000000, 8.3, 83.3, 'Enterprise SaaS', '2023-06-20'),
('IBM', 'Apptio', 'M&A', 4600000000, 550000000, 80000000, 8.4, 57.5, 'Enterprise SaaS', '2023-06-26'),
('Thoma Bravo', 'Proofpoint', 'LBO', 12300000000, 1100000000, 250000000, 11.2, 49.2, 'Cybersecurity', '2021-08-13'),
('Vista Equity', 'Citrix Systems', 'LBO', 16500000000, 3200000000, 1100000000, 5.2, 15.0, 'Enterprise SaaS', '2022-09-30'),
('Permira', 'Zendesk', 'LBO', 10200000000, 1700000000, 250000000, 6.0, 40.8, 'Enterprise SaaS', '2022-11-22'),
('Insight Partners', 'Veeam Software', 'Growth', 5000000000, 1500000000, 400000000, 3.3, 12.5, 'Enterprise SaaS', '2020-03-09'),
('Francisco Partners', 'SolarWinds', 'LBO', 4400000000, 780000000, 350000000, 5.6, 12.6, 'Enterprise SaaS', '2023-10-02'),

-- Cybersecurity (premium multiples)
('Google', 'Mandiant', 'M&A', 5400000000, 480000000, 20000000, 11.3, NULL, 'Cybersecurity', '2022-09-12'),
('Broadcom', 'Symantec Enterprise', 'M&A', 10700000000, 2500000000, 850000000, 4.3, 12.6, 'Cybersecurity', '2020-01-13'),
('Palo Alto Networks', 'Demisto', 'M&A', 560000000, 30000000, NULL, 18.7, NULL, 'Cybersecurity', '2020-03-01'),
('CrowdStrike', 'Humio', 'M&A', 400000000, 25000000, NULL, 16.0, NULL, 'Cybersecurity', '2021-03-08'),

-- Healthcare / Biotech
('Amgen', 'Horizon Therapeutics', 'M&A', 27800000000, 3600000000, 1200000000, 7.7, 23.2, 'Pharmaceuticals', '2023-10-06'),
('Pfizer', 'Seagen', 'M&A', 43000000000, 2200000000, NULL, 19.5, NULL, 'Biotech', '2023-12-14'),
('Merck', 'Acceleron Pharma', 'M&A', 11500000000, 500000000, NULL, 23.0, NULL, 'Biotech', '2021-11-22'),
('Johnson & Johnson', 'Abiomed', 'M&A', 16600000000, 1000000000, 300000000, 16.6, 55.3, 'Healthcare', '2022-12-22'),
('Danaher', 'Abcam', 'M&A', 5700000000, 400000000, 120000000, 14.3, 47.5, 'Healthcare', '2023-10-30'),
('EQT Partners', 'Waystar Health', 'LBO', 2700000000, 500000000, 180000000, 5.4, 15.0, 'Healthcare', '2024-06-15'),

-- FinTech
('Visa', 'Tink', 'M&A', 2150000000, 100000000, NULL, 21.5, NULL, 'FinTech', '2022-03-14'),
('Fidelity National', 'Worldpay', 'M&A', 43000000000, 5400000000, 2200000000, 8.0, 19.5, 'FinTech', '2020-07-31'),
('Global Payments', 'EVO Payments', 'M&A', 4000000000, 580000000, 200000000, 6.9, 20.0, 'FinTech', '2023-03-24'),
('Nuvei', 'Paya Holdings', 'M&A', 1300000000, 280000000, 80000000, 4.6, 16.3, 'FinTech', '2023-06-22'),
('Advent International', 'Clearent', 'LBO', 1200000000, 200000000, 70000000, 6.0, 17.1, 'FinTech', '2021-04-01'),

-- Industrials / Materials
('Parker Hannifin', 'Meggitt', 'M&A', 8800000000, 2200000000, 450000000, 4.0, 19.6, 'Aerospace & Defense', '2022-09-12'),
('Roper Technologies', 'Frontline Education', 'M&A', 3700000000, 650000000, 250000000, 5.7, 14.8, 'Industrials', '2024-01-15'),
('Emerson Electric', 'AspenTech', 'M&A', 11000000000, 800000000, 300000000, 13.8, 36.7, 'Industrials', '2022-05-16'),
('Honeywell', 'Carrier Global Security', 'M&A', 4950000000, 1200000000, 350000000, 4.1, 14.1, 'Industrials', '2024-12-18'),

-- Energy / CleanTech
('TotalEnergies', 'SunPower Corp', 'M&A', 3200000000, 1500000000, 150000000, 2.1, 21.3, 'Energy', '2023-08-01'),
('Brookfield Renewable', 'Westinghouse Electric', 'M&A', 7900000000, 3500000000, 700000000, 2.3, 11.3, 'Energy', '2023-11-07'),
('AES Corp', 'sPower', 'M&A', 1600000000, 400000000, 200000000, 4.0, 8.0, 'CleanTech', '2021-06-15'),

-- Real Estate
('Blackstone', 'American Campus Communities', 'M&A', 12800000000, 1400000000, 700000000, 9.1, 18.3, 'Real Estate', '2022-08-09'),
('Prologis', 'Duke Realty', 'M&A', 26000000000, 1600000000, 1200000000, 16.3, 21.7, 'Real Estate', '2022-10-03'),
('Brookfield', 'Waterfall Asset Management', 'M&A', 3200000000, 400000000, 180000000, 8.0, 17.8, 'Real Estate', '2024-07-22'),
('KKR', 'Global Atlantic Financial', 'M&A', 4700000000, 2800000000, 600000000, 1.7, 7.8, 'Insurance', '2024-01-02'),

-- Consumer / Retail
('L Catterton', 'Birkenstock', 'LBO', 4300000000, 1200000000, 400000000, 3.6, 10.8, 'Consumer', '2021-02-25'),
('Sycamore Partners', 'Kohl''s Department Stores', 'LBO', 8000000000, 18000000000, 1400000000, 0.4, 5.7, 'Retail', '2024-04-15'),
('TPG Capital', 'McAfee', 'LBO', 14000000000, 2900000000, 1100000000, 4.8, 12.7, 'Consumer', '2022-02-25'),
('Bain Capital', 'Varsity Brands', 'LBO', 4200000000, 1800000000, 500000000, 2.3, 8.4, 'Consumer', '2024-09-10'),

-- Media / EdTech
('Veritas Capital', 'Cambium Learning', 'LBO', 1700000000, 400000000, 120000000, 4.3, 14.2, 'EdTech', '2023-04-01'),
('Bain Capital', 'PowerSchool', 'LBO', 5600000000, 700000000, 200000000, 8.0, 28.0, 'EdTech', '2024-06-07'),
('Sony', 'Bungie', 'M&A', 3600000000, 800000000, 150000000, 4.5, 24.0, 'Media & Entertainment', '2022-07-15');


-- ============================================================
-- 3. NEWS ARTICLES (~60 rows)
--    Mix of company-linked and general market news
-- ============================================================
INSERT INTO news_articles (company_id, title, summary, ai_summary, sentiment_score, sentiment_label, tags, source_name, published_at) VALUES
-- Company-linked news (bullish)
((SELECT id FROM companies WHERE name = 'RiboTech Sciences' LIMIT 1), 'RiboTech Sciences Phase 2 Results Exceed Expectations', 'Self-amplifying RNA platform shows 94% efficacy in respiratory virus trial, beating analyst estimates of 80%.', 'RiboTech''s Phase 2 trial demonstrates strong clinical results that could accelerate FDA review timeline and partnership interest from big pharma.', 0.85, 'bullish', ARRAY['biotech', 'clinical-trial', 'rna'], 'STAT News', '2026-02-14 08:00:00+00'),
((SELECT id FROM companies WHERE name = 'SolarVault Energy' LIMIT 1), 'SolarVault Achieves Record 200-Hour Discharge Duration', 'Iron-air battery technology demonstrates multi-week energy storage capability, a breakthrough for grid reliability.', 'SolarVault''s 200-hour discharge test positions iron-air as the leading long-duration storage technology, potentially disrupting lithium-ion dominance for grid applications.', 0.90, 'bullish', ARRAY['cleantech', 'battery', 'grid-storage'], 'Bloomberg Green', '2026-02-10 09:00:00+00'),
((SELECT id FROM companies WHERE name = 'SecureID Cloud' LIMIT 1), 'SecureID Cloud Wins FedRAMP Authorization', 'Decentralized identity platform receives government cloud authorization, opening $5B federal market.', 'FedRAMP authorization positions SecureID as a leading candidate for federal identity infrastructure modernization under the Zero Trust Executive Order.', 0.82, 'bullish', ARRAY['cybersecurity', 'government', 'identity'], 'CyberScoop', '2026-02-08 10:00:00+00'),
((SELECT id FROM companies WHERE name = 'CropMind' LIMIT 1), 'CropMind Reduces Water Usage by 30% in California Pilot', 'AI precision agriculture platform demonstrates significant water savings across 50,000 acres of Central Valley farmland.', 'CropMind''s water optimization results could accelerate adoption among California''s drought-stressed agricultural sector.', 0.78, 'bullish', ARRAY['agtech', 'water', 'ai'], 'AgFunder News', '2026-02-06 07:00:00+00'),
((SELECT id FROM companies WHERE name = 'NeoBank Asia' LIMIT 1), 'NeoBank Asia Turns Profitable in Singapore Market', 'Digital banking platform reaches profitability in its home market with 800K active SME customers.', 'Profitability milestone validates NeoBank Asia''s unit economics and strengthens case for regional expansion.', 0.80, 'bullish', ARRAY['fintech', 'banking', 'profitability'], 'TechInAsia', '2026-01-28 06:00:00+00'),
((SELECT id FROM companies WHERE name = 'Taipei Semiconductor' LIMIT 1), 'Taipei Semiconductor Signs $500M Contract with NVIDIA', 'Advanced chiplet packaging company secures multi-year supply agreement for next-gen AI accelerators.', 'The NVIDIA contract validates Taipei Semiconductor''s packaging technology and provides revenue visibility through 2029.', 0.88, 'bullish', ARRAY['semiconductors', 'ai', 'nvidia'], 'Nikkei Asia', '2026-02-03 04:00:00+00'),
((SELECT id FROM companies WHERE name = 'Sakura Robotics' LIMIT 1), 'Sakura Robotics Deploys 500th Robot in Toyota Factory', 'Collaborative robotics platform reaches major milestone in automotive manufacturing deployment.', 'Scale deployment at Toyota validates Sakura''s cobots for precision manufacturing and positions company for broader automotive adoption.', 0.75, 'bullish', ARRAY['robotics', 'automotive', 'manufacturing'], 'Nikkei Asia', '2026-01-18 05:00:00+00'),
((SELECT id FROM companies WHERE name = 'PayStream Global' LIMIT 1), 'PayStream Global TPV Exceeds $50B Annually', 'Cross-border payments processor passes major volume milestone as African expansion drives growth.', 'Total payment volume growth of 65% YoY positions PayStream for potential IPO in 2026-2027.', 0.82, 'bullish', ARRAY['fintech', 'payments', 'africa'], 'The Information', '2026-01-25 08:00:00+00'),

-- Company-linked news (bearish)
((SELECT id FROM companies WHERE name = 'UrbanMobility' LIMIT 1), 'UrbanMobility Faces New City Regulations in Portland and Austin', 'Micro-mobility operator confronts restrictive speed limits and parking mandates in two key markets.', 'New regulations could increase operating costs by 15-20% and reduce unit economics for UrbanMobility in regulated markets.', -0.45, 'bearish', ARRAY['transportation', 'regulation', 'micro-mobility'], 'TechCrunch', '2026-02-04 10:00:00+00'),
((SELECT id FROM companies WHERE name = 'Helsinki Gaming' LIMIT 1), 'Helsinki Gaming Revenue Miss Sparks Valuation Concerns', 'Mobile gaming studio reports Q4 revenue 12% below expectations as user acquisition costs rise.', 'Revenue miss raises questions about sustainable growth in mobile gaming as Apple privacy changes continue to impact targeting.', -0.40, 'bearish', ARRAY['gaming', 'revenue', 'mobile'], 'PocketGamer', '2026-01-30 08:00:00+00'),
((SELECT id FROM companies WHERE name = 'BlockSettle' LIMIT 1), 'BlockSettle Pauses US Operations Pending SEC Clarity', 'Digital asset custody platform halts US institutional onboarding amid regulatory uncertainty.', 'US regulatory pause could delay BlockSettle''s growth plans as institutional crypto custody demand remains strong globally.', -0.50, 'bearish', ARRAY['crypto', 'regulation', 'custody'], 'CoinDesk', '2026-01-22 09:00:00+00'),

-- Company-linked news (neutral)
((SELECT id FROM companies WHERE name = 'NuclearMicro' LIMIT 1), 'NuclearMicro Selects Wyoming for First Commercial Deployment', 'Microreactor company chooses former coal plant site for inaugural 50MW installation.', 'Site selection represents meaningful progress but NuclearMicro still faces 18-24 month construction timeline before revenue generation.', 0.30, 'neutral', ARRAY['nuclear', 'energy', 'deployment'], 'Utility Dive', '2026-02-11 10:00:00+00'),
((SELECT id FROM companies WHERE name = 'Bengaluru SaaS' LIMIT 1), 'Bengaluru SaaS Reaches 10,000 Enterprise Customers', 'Indian CRM platform crosses customer milestone as expansion into Middle East begins.', 'Customer milestone is positive but ARPU remains below Western competitors, requiring continued land-and-expand execution.', 0.40, 'neutral', ARRAY['saas', 'india', 'crm'], 'YourStory', '2026-01-20 06:00:00+00'),
((SELECT id FROM companies WHERE name = 'GreenH2 Systems' LIMIT 1), 'GreenH2 Systems Electrolyzer Costs Down 22% YoY', 'PEM electrolyzer manufacturer reduces production costs through scale and process optimization.', 'Cost reductions tracking ahead of DOE targets but green hydrogen still requires $2-3/kg to reach fossil fuel parity.', 0.50, 'neutral', ARRAY['hydrogen', 'cleantech', 'cost-reduction'], 'Hydrogen Insight', '2026-02-07 09:00:00+00'),

-- General market news (no company link)
(NULL, 'Global PE Deal Volume Rebounds 25% in H2 2025', 'Private equity transaction activity recovers from 2023-2024 lows as financing conditions improve and valuation expectations reset.', 'PE deal activity approaching 2021 levels as dry powder deployment accelerates. LBO financing spreads tightened 75bps in H2 2025.', 0.75, 'bullish', ARRAY['private-equity', 'deal-activity', 'macro'], 'PitchBook', '2026-02-01 08:00:00+00'),
(NULL, 'Venture Capital Returns Diverge: Top Quartile Outperforms by Record Margin', 'Top-quartile VC funds generated 35% net IRR vs. median of 8%, widest gap since 2001 vintage.', 'Manager selection matters more than ever in venture capital. Top decile concentration in AI and infrastructure driving performance dispersion.', 0.60, 'neutral', ARRAY['venture-capital', 'returns', 'performance'], 'Institutional Investor', '2026-01-28 09:00:00+00'),
(NULL, 'CRE Distress Reaches $98B as Office Refinancing Wave Begins', 'Commercial real estate distressed debt volume nears $100B, driven primarily by office and retail properties needing refinancing.', 'Office sector distress creating buying opportunities for well-capitalized investors as banks accelerate loan workouts.', -0.30, 'bearish', ARRAY['real-estate', 'distressed', 'office'], 'Wall Street Journal', '2026-02-05 06:00:00+00'),
(NULL, 'AI Infrastructure Spending to Reach $200B in 2026', 'Hyperscaler capital expenditure on AI training and inference infrastructure expected to double from 2025 levels.', 'Massive capex cycle benefits semiconductor, power generation, and cooling infrastructure companies across the value chain.', 0.80, 'bullish', ARRAY['ai', 'infrastructure', 'capex'], 'Bloomberg', '2026-02-12 08:00:00+00'),
(NULL, 'SEC Proposes Enhanced Private Fund Reporting Requirements', 'New rule proposal would mandate quarterly net asset value and fee reporting for private funds above $500M AUM.', 'Regulatory changes could increase operational costs for mid-size fund managers but improve LP transparency and due diligence.', -0.15, 'neutral', ARRAY['regulation', 'private-funds', 'sec'], 'Reuters', '2026-01-15 10:00:00+00'),
(NULL, 'Sovereign Wealth Funds Increase Direct Co-Investment by 40%', 'Global SWFs deployed $180B in direct and co-investment deals in 2025, bypassing GP fund structures.', 'Direct investing trend accelerating as SWFs build internal teams. GPs face pressure to offer co-investment rights to maintain LP relationships.', 0.55, 'neutral', ARRAY['sovereign-wealth', 'co-investment', 'lp-gp'], 'Sovereign Wealth Fund Institute', '2026-02-03 07:00:00+00'),
(NULL, 'European Biotech Funding Recovers with $8.2B Raised in Q4 2025', 'European biotech sector sees strongest quarter since 2021 as US crossover investors return.', 'European biotech valuations still trade at 25-30% discount to US peers, creating relative value opportunity.', 0.65, 'bullish', ARRAY['biotech', 'europe', 'funding'], 'Endpoints News', '2026-01-10 08:00:00+00'),
(NULL, 'Private Credit Defaults Rise to 3.2% as Fed Holds Rates Higher', 'Direct lending portfolio defaults increase for third consecutive quarter, though still below historical averages.', 'Rising defaults remain manageable for well-underwritten portfolios but signal selectivity is becoming more important.', -0.35, 'bearish', ARRAY['private-credit', 'defaults', 'rates'], 'Bloomberg', '2026-02-09 08:00:00+00'),
(NULL, 'India Emerges as Top VC Destination Outside US and China', 'Indian startups raised $18B in 2025, surpassing UK and Germany to become third-largest venture market.', 'India''s digital transformation, 1.4B population, and improving regulatory environment driving sustained VC interest.', 0.70, 'bullish', ARRAY['india', 'venture-capital', 'emerging-markets'], 'Financial Times', '2026-01-22 06:00:00+00'),
(NULL, 'LP Appetite for Continuation Vehicles Grows as GP-Led Volume Hits $80B', 'GP-led secondary transactions surge as fund managers offer LP liquidity alternatives to traditional exits.', 'Continuation vehicles increasingly accepted by institutional LPs but pricing and governance remain contentious.', 0.35, 'neutral', ARRAY['secondaries', 'continuation-vehicle', 'gp-led'], 'Buyouts Insider', '2026-02-06 09:00:00+00'),
(NULL, 'Carbon Credit Prices Stabilize Above $60/Ton in EU ETS', 'European carbon allowance prices find floor after 2024 volatility, supporting CleanTech investment thesis.', 'Stable carbon pricing above $60 makes carbon capture and industrial decarbonization economics more attractive.', 0.55, 'neutral', ARRAY['carbon', 'cleantech', 'policy'], 'Carbon Pulse', '2026-01-18 08:00:00+00'),
(NULL, 'Distressed Retail Real Estate Creates Opportunistic CRE Plays', 'Retail CMBS delinquency rate hits 7.2%, highest since 2012, as regional mall owners struggle with refinancing.', 'Distressed retail-to-industrial or retail-to-residential conversion projects offering 15-20% unlevered returns.', -0.20, 'bearish', ARRAY['real-estate', 'retail', 'distressed'], 'Commercial Observer', '2026-02-10 07:00:00+00'),
(NULL, 'CHIPS Act Fabs Break Ground: 5 New Semiconductor Plants in Construction', 'CHIPS Act-funded fabrication facilities begin construction across Arizona, Ohio, New York, and Texas.', 'US semiconductor manufacturing capacity expected to triple by 2030. Construction creates near-term demand for industrial and data center infrastructure.', 0.72, 'bullish', ARRAY['semiconductors', 'chips-act', 'manufacturing'], 'Semiconductor Engineering', '2026-01-30 09:00:00+00');
