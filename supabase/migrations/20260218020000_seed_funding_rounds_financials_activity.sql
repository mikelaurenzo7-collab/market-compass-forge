-- Migration 2: Seed funding_rounds, expand financials, seed activity_events
-- Depends on: companies (exist from prior migrations)

-- ============================================================
-- 1. FUNDING ROUNDS (~120 rows across ~50 companies)
--    Dates span Aug 2024 – Feb 2026 for SectorMomentum to show trends
-- ============================================================
INSERT INTO funding_rounds (company_id, round_type, amount, valuation_pre, valuation_post, date, lead_investors, co_investors, confidence_score, is_synthetic, source_type) VALUES
-- Biotech
((SELECT id FROM companies WHERE name = 'Nuclera Therapeutics' LIMIT 1), 'Seed', 6000000, 18000000, 24000000, '2020-03-15', ARRAY['ARCH Venture Partners'], ARRAY['Y Combinator'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Nuclera Therapeutics' LIMIT 1), 'Series A', 28000000, 85000000, 113000000, '2022-01-20', ARRAY['Polaris Partners'], ARRAY['ARCH Venture Partners'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Nuclera Therapeutics' LIMIT 1), 'Series B', 65000000, 250000000, 315000000, '2025-09-10', ARRAY['Deerfield Management'], ARRAY['Polaris Partners', 'ARCH Venture Partners'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'OmniGenome' LIMIT 1), 'Seed', 4500000, 15000000, 19500000, '2021-06-01', ARRAY['Andreessen Horowitz Bio'], ARRAY['Khosla Ventures'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'OmniGenome' LIMIT 1), 'Series A', 22000000, 70000000, 92000000, '2025-11-15', ARRAY['Flagship Pioneering'], ARRAY['Andreessen Horowitz Bio'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'BioVault Sciences' LIMIT 1), 'Series A', 18000000, 55000000, 73000000, '2020-09-01', ARRAY['Syncona'], ARRAY['IP Group'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'BioVault Sciences' LIMIT 1), 'Series B', 45000000, 180000000, 225000000, '2023-04-20', ARRAY['GV'], ARRAY['Syncona', 'IP Group'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'BioVault Sciences' LIMIT 1), 'Series C', 85000000, 400000000, 485000000, '2025-12-05', ARRAY['OrbiMed'], ARRAY['GV', 'Syncona'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'RiboTech Sciences' LIMIT 1), 'Seed', 5000000, 16000000, 21000000, '2020-05-10', ARRAY['Atlas Venture'], ARRAY['Polaris Partners'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'RiboTech Sciences' LIMIT 1), 'Series A', 30000000, 95000000, 125000000, '2022-08-15', ARRAY['RA Capital'], ARRAY['Atlas Venture'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'RiboTech Sciences' LIMIT 1), 'Series C', 110000000, 520000000, 630000000, '2026-01-18', ARRAY['Fidelity Biosciences'], ARRAY['RA Capital', 'Atlas Venture'], 'high', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'NovaBiome' LIMIT 1), 'Series A', 20000000, 65000000, 85000000, '2021-04-01', ARRAY['Lux Capital'], ARRAY['Khosla Ventures'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'NovaBiome' LIMIT 1), 'Series B', 55000000, 220000000, 275000000, '2025-10-20', ARRAY['DCVC'], ARRAY['Lux Capital'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'GeneStar Therapeutics' LIMIT 1), 'Series A', 15000000, 50000000, 65000000, '2022-02-10', ARRAY['SoftBank Vision'], ARRAY['Global Brain'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'GeneStar Therapeutics' LIMIT 1), 'Series B', 42000000, 170000000, 212000000, '2025-08-28', ARRAY['Takeda Ventures'], ARRAY['SoftBank Vision'], 'medium', true, 'seeded'),

-- AgTech
((SELECT id FROM companies WHERE name = 'CropMind' LIMIT 1), 'Seed', 3500000, 12000000, 15500000, '2020-02-01', ARRAY['Anterra Capital'], ARRAY['AgFunder'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'CropMind' LIMIT 1), 'Series A', 18000000, 60000000, 78000000, '2022-06-15', ARRAY['S2G Ventures'], ARRAY['Anterra Capital'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'CropMind' LIMIT 1), 'Series B', 40000000, 165000000, 205000000, '2025-11-22', ARRAY['Breakthrough Energy'], ARRAY['S2G Ventures'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'AquaFarm Technologies' LIMIT 1), 'Series A', 12000000, 40000000, 52000000, '2020-08-01', ARRAY['Hatch Blue'], ARRAY['Cargill Ventures'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'AquaFarm Technologies' LIMIT 1), 'Series B', 35000000, 140000000, 175000000, '2025-09-30', ARRAY['Temasek'], ARRAY['Hatch Blue'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'VertiFresh' LIMIT 1), 'Series A', 15000000, 50000000, 65000000, '2021-01-15', ARRAY['ADM Ventures'], ARRAY['Mubadala'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'VertiFresh' LIMIT 1), 'Series B', 50000000, 200000000, 250000000, '2023-07-10', ARRAY['SoftBank Vision'], ARRAY['ADM Ventures'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'VertiFresh' LIMIT 1), 'Series C', 80000000, 380000000, 460000000, '2026-02-01', ARRAY['Abu Dhabi Growth Fund'], ARRAY['SoftBank Vision', 'ADM Ventures'], 'high', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'PhytoGen Crop Science' LIMIT 1), 'Series B', 30000000, 120000000, 150000000, '2021-11-01', ARRAY['Bayer Crop Science Ventures'], ARRAY['Leaps by Bayer'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'PhytoGen Crop Science' LIMIT 1), 'Series C', 70000000, 300000000, 370000000, '2025-12-18', ARRAY['Temasek'], ARRAY['Bayer Crop Science Ventures'], 'medium', true, 'seeded'),

-- CleanTech
((SELECT id FROM companies WHERE name = 'SolarVault Energy' LIMIT 1), 'Series A', 20000000, 70000000, 90000000, '2021-05-01', ARRAY['Breakthrough Energy'], ARRAY['Energy Impact Partners'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'SolarVault Energy' LIMIT 1), 'Series B', 55000000, 230000000, 285000000, '2023-09-01', ARRAY['Fifth Wall'], ARRAY['Breakthrough Energy'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'SolarVault Energy' LIMIT 1), 'Series C', 120000000, 600000000, 720000000, '2026-01-10', ARRAY['Goldman Sachs Asset Mgmt'], ARRAY['Fifth Wall', 'Breakthrough Energy'], 'high', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'CarbonCapture Inc' LIMIT 1), 'Series A', 25000000, 80000000, 105000000, '2020-10-01', ARRAY['Lowercarbon Capital'], ARRAY['Stripe Climate'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'CarbonCapture Inc' LIMIT 1), 'Series B', 60000000, 250000000, 310000000, '2025-10-05', ARRAY['BlackRock Climate'], ARRAY['Lowercarbon Capital'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'GreenH2 Systems' LIMIT 1), 'Series A', 18000000, 60000000, 78000000, '2022-03-01', ARRAY['Hy24'], ARRAY['ENGIE New Ventures'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'GreenH2 Systems' LIMIT 1), 'Series B', 48000000, 195000000, 243000000, '2025-12-20', ARRAY['AP Moller Holding'], ARRAY['Hy24'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'NuclearMicro' LIMIT 1), 'Series A', 30000000, 100000000, 130000000, '2021-08-01', ARRAY['Founders Fund'], ARRAY['Peter Thiel'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'NuclearMicro' LIMIT 1), 'Series B', 75000000, 320000000, 395000000, '2024-02-15', ARRAY['Bill Gates Ventures'], ARRAY['Founders Fund'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'NuclearMicro' LIMIT 1), 'Series C', 140000000, 750000000, 890000000, '2026-01-25', ARRAY['Samsung Venture Investment'], ARRAY['Bill Gates Ventures', 'Founders Fund'], 'high', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'EcoGrid Solutions' LIMIT 1), 'Series B', 38000000, 155000000, 193000000, '2025-09-15', ARRAY['ABB Technology Ventures'], ARRAY['EQT Ventures'], 'medium', true, 'seeded'),

-- Digital Health
((SELECT id FROM companies WHERE name = 'NeuraMed' LIMIT 1), 'Series A', 16000000, 52000000, 68000000, '2021-06-01', ARRAY['GV'], ARRAY['a16z Bio'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'NeuraMed' LIMIT 1), 'Series B', 42000000, 175000000, 217000000, '2025-11-08', ARRAY['Venrock Healthcare'], ARRAY['GV'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Bogota HealthTech' LIMIT 1), 'Series A', 8000000, 28000000, 36000000, '2025-10-15', ARRAY['QED Investors'], ARRAY['Kaszek'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'PetHealth AI' LIMIT 1), 'Series A', 12000000, 40000000, 52000000, '2025-12-01', ARRAY['Digitalis Ventures'], ARRAY['Mars Petcare'], 'medium', true, 'seeded'),

-- FinTech
((SELECT id FROM companies WHERE name = 'NeoBank Asia' LIMIT 1), 'Series A', 15000000, 50000000, 65000000, '2021-04-01', ARRAY['Sequoia Capital SEA'], ARRAY['GIC'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'NeoBank Asia' LIMIT 1), 'Series B', 45000000, 180000000, 225000000, '2023-06-01', ARRAY['Temasek'], ARRAY['Sequoia Capital SEA'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'NeoBank Asia' LIMIT 1), 'Series C', 90000000, 450000000, 540000000, '2025-12-15', ARRAY['Warburg Pincus'], ARRAY['Temasek', 'Sequoia Capital SEA'], 'high', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'PayStream Global' LIMIT 1), 'Series A', 12000000, 40000000, 52000000, '2020-06-01', ARRAY['Balderton Capital'], ARRAY['Index Ventures'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'PayStream Global' LIMIT 1), 'Series B', 35000000, 150000000, 185000000, '2022-08-01', ARRAY['General Catalyst'], ARRAY['Balderton Capital'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'PayStream Global' LIMIT 1), 'Growth', 150000000, 800000000, 950000000, '2025-08-15', ARRAY['Tiger Global'], ARRAY['General Catalyst'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'CreditPulse' LIMIT 1), 'Seed', 3000000, 10000000, 13000000, '2021-01-01', ARRAY['Ribbit Capital'], ARRAY['QED Investors'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'CreditPulse' LIMIT 1), 'Series A', 15000000, 55000000, 70000000, '2023-03-01', ARRAY['Andreessen Horowitz'], ARRAY['Ribbit Capital'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'CreditPulse' LIMIT 1), 'Series B', 40000000, 160000000, 200000000, '2025-10-30', ARRAY['Insight Partners'], ARRAY['Andreessen Horowitz'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Lagos Payments' LIMIT 1), 'Series A', 10000000, 35000000, 45000000, '2021-03-01', ARRAY['Stripe'], ARRAY['Y Combinator'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Lagos Payments' LIMIT 1), 'Series B', 32000000, 130000000, 162000000, '2025-09-20', ARRAY['a16z'], ARRAY['Stripe'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Sao Paulo FinTech' LIMIT 1), 'Series B', 40000000, 165000000, 205000000, '2022-05-01', ARRAY['SoftBank LATAM'], ARRAY['Kaszek'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Sao Paulo FinTech' LIMIT 1), 'Growth', 120000000, 650000000, 770000000, '2025-11-30', ARRAY['General Atlantic'], ARRAY['SoftBank LATAM'], 'medium', true, 'seeded'),

-- Enterprise SaaS / Cybersecurity
((SELECT id FROM companies WHERE name = 'SecureID Cloud' LIMIT 1), 'Series A', 20000000, 65000000, 85000000, '2020-07-01', ARRAY['Insight Partners'], ARRAY['Battery Ventures'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'SecureID Cloud' LIMIT 1), 'Series B', 50000000, 210000000, 260000000, '2022-11-01', ARRAY['Sequoia Capital'], ARRAY['Insight Partners'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'SecureID Cloud' LIMIT 1), 'Series C', 100000000, 550000000, 650000000, '2025-08-22', ARRAY['Accel'], ARRAY['Sequoia Capital'], 'high', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'RetailOS' LIMIT 1), 'Seed', 4000000, 14000000, 18000000, '2020-03-01', ARRAY['Redpoint Ventures'], ARRAY['Forerunner Ventures'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'RetailOS' LIMIT 1), 'Series A', 18000000, 60000000, 78000000, '2022-01-01', ARRAY['Bessemer Venture'], ARRAY['Redpoint Ventures'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'RetailOS' LIMIT 1), 'Series B', 45000000, 185000000, 230000000, '2025-09-05', ARRAY['IVP'], ARRAY['Bessemer Venture'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Bengaluru SaaS' LIMIT 1), 'Series A', 10000000, 35000000, 45000000, '2021-05-01', ARRAY['Accel India'], ARRAY['Matrix Partners India'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Bengaluru SaaS' LIMIT 1), 'Series B', 28000000, 110000000, 138000000, '2023-09-01', ARRAY['Lightspeed India'], ARRAY['Accel India'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Bengaluru SaaS' LIMIT 1), 'Series C', 65000000, 300000000, 365000000, '2026-01-15', ARRAY['Tiger Global'], ARRAY['Lightspeed India'], 'high', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Warsaw CyberSec' LIMIT 1), 'Series A', 8000000, 28000000, 36000000, '2025-10-10', ARRAY['Insight Partners'], ARRAY['Point Nine'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Seoul AI Labs' LIMIT 1), 'Series A', 12000000, 42000000, 54000000, '2021-07-01', ARRAY['Samsung NEXT'], ARRAY['SV Investment'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Seoul AI Labs' LIMIT 1), 'Series B', 35000000, 145000000, 180000000, '2025-11-25', ARRAY['Softbank Ventures Asia'], ARRAY['Samsung NEXT'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'EnergyOS' LIMIT 1), 'Series A', 14000000, 48000000, 62000000, '2021-09-01', ARRAY['Congruent Ventures'], ARRAY['Fifth Wall'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'EnergyOS' LIMIT 1), 'Series B', 38000000, 155000000, 193000000, '2025-10-28', ARRAY['Schneider Electric Ventures'], ARRAY['Fifth Wall'], 'medium', true, 'seeded'),

-- Robotics / Hardware / Other
((SELECT id FROM companies WHERE name = 'Sakura Robotics' LIMIT 1), 'Series A', 15000000, 50000000, 65000000, '2020-11-01', ARRAY['JAFCO'], ARRAY['SBI Investment'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Sakura Robotics' LIMIT 1), 'Series B', 40000000, 165000000, 205000000, '2023-05-01', ARRAY['Fanuc Ventures'], ARRAY['JAFCO'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Sakura Robotics' LIMIT 1), 'Series C', 80000000, 380000000, 460000000, '2026-01-08', ARRAY['Toyota Ventures'], ARRAY['Fanuc Ventures'], 'high', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Taipei Semiconductor' LIMIT 1), 'Series B', 50000000, 200000000, 250000000, '2021-02-01', ARRAY['TSMC Ventures'], ARRAY['MediaTek'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Taipei Semiconductor' LIMIT 1), 'Growth', 200000000, 1200000000, 1400000000, '2025-08-01', ARRAY['Intel Capital'], ARRAY['TSMC Ventures', 'Samsung Venture'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Forge Materials' LIMIT 1), 'Series A', 12000000, 40000000, 52000000, '2020-06-01', ARRAY['Engine Ventures'], ARRAY['DCVC'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Forge Materials' LIMIT 1), 'Series B', 35000000, 145000000, 180000000, '2025-09-18', ARRAY['Lockheed Martin Ventures'], ARRAY['Engine Ventures'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Mexico City Logistics' LIMIT 1), 'Series A', 8000000, 28000000, 36000000, '2021-02-01', ARRAY['Kaszek'], ARRAY['ALLVP'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Mexico City Logistics' LIMIT 1), 'Series B', 30000000, 125000000, 155000000, '2023-08-01', ARRAY['SoftBank LATAM'], ARRAY['Kaszek'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Mexico City Logistics' LIMIT 1), 'Series C', 60000000, 280000000, 340000000, '2025-12-10', ARRAY['General Atlantic'], ARRAY['SoftBank LATAM'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'UrbanMobility' LIMIT 1), 'Series A', 15000000, 50000000, 65000000, '2020-05-01', ARRAY['a16z'], ARRAY['Vy Capital'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'UrbanMobility' LIMIT 1), 'Series B', 40000000, 165000000, 205000000, '2022-10-01', ARRAY['T. Rowe Price'], ARRAY['a16z'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'UrbanMobility' LIMIT 1), 'Series C', 75000000, 350000000, 425000000, '2025-11-01', ARRAY['Fidelity'], ARRAY['T. Rowe Price'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Dubai PropTech' LIMIT 1), 'Series A', 10000000, 35000000, 45000000, '2020-09-01', ARRAY['BECO Capital'], ARRAY['Global Founders Capital'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Dubai PropTech' LIMIT 1), 'Series B', 30000000, 120000000, 150000000, '2025-10-22', ARRAY['ADQ'], ARRAY['BECO Capital'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Amsterdam LegalTech' LIMIT 1), 'Series A', 6000000, 22000000, 28000000, '2025-12-08', ARRAY['Northzone'], ARRAY['Atomico'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Helsinki Gaming' LIMIT 1), 'Series A', 8000000, 30000000, 38000000, '2021-08-01', ARRAY['EQT Ventures'], ARRAY['Index Ventures'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Helsinki Gaming' LIMIT 1), 'Series B', 25000000, 100000000, 125000000, '2025-09-28', ARRAY['Tencent'], ARRAY['EQT Ventures'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Copenhagen BioTech' LIMIT 1), 'Series B', 32000000, 130000000, 162000000, '2025-10-05', ARRAY['Novo Holdings'], ARRAY['Lundbeckfonden'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'DroneDelivery Co' LIMIT 1), 'Series A', 15000000, 50000000, 65000000, '2025-11-18', ARRAY['Lux Capital'], ARRAY['Wing (Alphabet)'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'FarmCredit' LIMIT 1), 'Series A', 10000000, 35000000, 45000000, '2025-12-22', ARRAY['Finistere Ventures'], ARRAY['S2G Ventures'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Nordic Clean Energy' LIMIT 1), 'Series A', 10000000, 35000000, 45000000, '2021-06-01', ARRAY['Norselab'], ARRAY['Investinor'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Nordic Clean Energy' LIMIT 1), 'Series B', 30000000, 120000000, 150000000, '2025-08-15', ARRAY['Statkraft Ventures'], ARRAY['Norselab'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Sydney ClimateTech' LIMIT 1), 'Series A', 8000000, 28000000, 36000000, '2025-11-05', ARRAY['Blackbird Ventures'], ARRAY['Main Sequence'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Zurich InsurTech' LIMIT 1), 'Series A', 10000000, 35000000, 45000000, '2026-01-20', ARRAY['Lakestar'], ARRAY['Swiss Re Ventures'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'AgroStar Platform' LIMIT 1), 'Series B', 25000000, 100000000, 125000000, '2022-04-01', ARRAY['Chiratae Ventures'], ARRAY['Accel India'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'AgroStar Platform' LIMIT 1), 'Series C', 55000000, 250000000, 305000000, '2025-11-12', ARRAY['Bertelsmann India'], ARRAY['Chiratae Ventures'], 'medium', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'TruckPark' LIMIT 1), 'Series A', 10000000, 35000000, 45000000, '2025-12-28', ARRAY['Trucks Venture Capital'], ARRAY['Dynamo Ventures'], 'medium', true, 'seeded');


-- ============================================================
-- 2. EXPAND FINANCIALS (fill remaining companies without data)
--    All marked is_synthetic = true, confidence_score = 'low'
-- ============================================================
INSERT INTO financials (company_id, period, period_type, revenue, arr, mrr, gross_margin, ebitda, burn_rate, runway_months, confidence_score, source, is_synthetic, source_type) VALUES
-- Biotech (R&D stage — pre-revenue or minimal revenue)
((SELECT id FROM companies WHERE name = 'Nuclera Therapeutics' LIMIT 1), '2025', 'annual', 2500000, NULL, NULL, 0.65, -18000000, 1800000, 18, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'OmniGenome' LIMIT 1), '2025', 'annual', 4200000, NULL, NULL, 0.70, -12000000, 1200000, 22, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'CellForge Bio' LIMIT 1), '2025', 'annual', 1500000, NULL, NULL, 0.55, -8000000, 900000, 16, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Proteon Dynamics' LIMIT 1), '2025', 'annual', 6000000, NULL, NULL, 0.72, -10000000, 1100000, 24, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'SynaptoRx' LIMIT 1), '2025', 'annual', 800000, NULL, NULL, 0.60, -9000000, 1000000, 14, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'MicrobiomX' LIMIT 1), '2025', 'annual', 5500000, NULL, NULL, 0.68, -14000000, 1500000, 20, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Epigenia Labs' LIMIT 1), '2025', 'annual', 200000, NULL, NULL, 0.50, -4000000, 500000, 12, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'PhageWorks' LIMIT 1), '2025', 'annual', 3000000, NULL, NULL, 0.62, -7000000, 800000, 18, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'NeuroPath AI' LIMIT 1), '2025', 'annual', 3800000, 4200000, 350000, 0.78, -5000000, 600000, 20, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'RiboTech Sciences' LIMIT 1), '2025', 'annual', 12000000, NULL, NULL, 0.72, -20000000, 2200000, 28, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Verdant Biosciences' LIMIT 1), '2025', 'annual', 45000000, NULL, NULL, 0.55, 2000000, 0, 36, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'NovaBiome' LIMIT 1), '2025', 'annual', 8000000, NULL, NULL, 0.65, -16000000, 1800000, 20, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'GeneStar Therapeutics' LIMIT 1), '2025', 'annual', 5000000, NULL, NULL, 0.68, -11000000, 1300000, 18, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'ImmunoPrecision' LIMIT 1), '2025', 'annual', 7000000, NULL, NULL, 0.70, -9000000, 1100000, 22, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'MetaVax' LIMIT 1), '2025', 'annual', 2000000, NULL, NULL, 0.60, -6500000, 750000, 16, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'NeuraMed' LIMIT 1), '2025', 'annual', 9000000, NULL, NULL, 0.72, -8000000, 900000, 24, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Copenhagen BioTech' LIMIT 1), '2025', 'annual', 15000000, NULL, NULL, 0.58, -5000000, 600000, 30, 'low', 'Estimates', true, 'seeded'),

-- AgTech
((SELECT id FROM companies WHERE name = 'CropMind' LIMIT 1), '2025', 'annual', 18000000, 20000000, 1670000, 0.72, -4000000, 500000, 24, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'AquaFarm Technologies' LIMIT 1), '2025', 'annual', 22000000, 24000000, 2000000, 0.65, -2000000, 300000, 30, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'SoilSense' LIMIT 1), '2025', 'annual', 5000000, 5500000, 460000, 0.70, -3500000, 450000, 18, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'VertiFresh' LIMIT 1), '2025', 'annual', 35000000, NULL, NULL, 0.42, -8000000, 1200000, 22, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'GrainChain' LIMIT 1), '2025', 'annual', 14000000, 15000000, 1250000, 0.75, -1000000, 200000, 36, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'LivestockIQ' LIMIT 1), '2025', 'annual', 6000000, 6500000, 540000, 0.68, -4000000, 500000, 16, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'BioHarvest' LIMIT 1), '2025', 'annual', 12000000, NULL, NULL, 0.55, -5000000, 700000, 20, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'PhytoGen Crop Science' LIMIT 1), '2025', 'annual', 28000000, NULL, NULL, 0.60, 2000000, 0, 36, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'AgroStar Platform' LIMIT 1), '2025', 'annual', 42000000, NULL, NULL, 0.35, -3000000, 600000, 24, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'FarmCredit' LIMIT 1), '2025', 'annual', 3000000, 3200000, 270000, 0.80, -5000000, 600000, 14, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Cape Town AgTech' LIMIT 1), '2025', 'annual', 4000000, 4500000, 375000, 0.65, -3000000, 400000, 16, 'low', 'Estimates', true, 'seeded'),

-- CleanTech
((SELECT id FROM companies WHERE name = 'SolarVault Energy' LIMIT 1), '2025', 'annual', 55000000, NULL, NULL, 0.38, -15000000, 2500000, 24, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'CarbonCapture Inc' LIMIT 1), '2025', 'annual', 8000000, NULL, NULL, 0.30, -25000000, 3000000, 20, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'HydroPure Tech' LIMIT 1), '2025', 'annual', 12000000, NULL, NULL, 0.52, -6000000, 800000, 22, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'WindForge Energy' LIMIT 1), '2025', 'annual', 85000000, NULL, NULL, 0.35, 5000000, 0, 36, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'GreenH2 Systems' LIMIT 1), '2025', 'annual', 18000000, NULL, NULL, 0.28, -12000000, 1800000, 18, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'CircularChem' LIMIT 1), '2025', 'annual', 15000000, NULL, NULL, 0.45, -4000000, 600000, 24, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'ThermalEdge' LIMIT 1), '2025', 'annual', 6000000, NULL, NULL, 0.40, -8000000, 1000000, 14, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'EcoGrid Solutions' LIMIT 1), '2025', 'annual', 20000000, 22000000, 1830000, 0.72, -3000000, 400000, 28, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'NuclearMicro' LIMIT 1), '2025', 'annual', 3000000, NULL, NULL, 0.25, -30000000, 4000000, 24, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Nordic Clean Energy' LIMIT 1), '2025', 'annual', 16000000, NULL, NULL, 0.42, -2000000, 350000, 30, 'low', 'Estimates', true, 'seeded'),

-- FinTech
((SELECT id FROM companies WHERE name = 'NeoBank Asia' LIMIT 1), '2025', 'annual', 65000000, NULL, NULL, 0.55, -10000000, 1500000, 24, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'PayStream Global' LIMIT 1), '2025', 'annual', 120000000, NULL, NULL, 0.48, 8000000, 0, 36, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'CreditPulse' LIMIT 1), '2025', 'annual', 18000000, NULL, NULL, 0.62, -8000000, 1000000, 20, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'BlockSettle' LIMIT 1), '2025', 'annual', 8000000, NULL, NULL, 0.70, -5000000, 650000, 16, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'MicroLend' LIMIT 1), '2025', 'annual', 25000000, NULL, NULL, 0.45, 2000000, 0, 36, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'ComplianceHub' LIMIT 1), '2025', 'annual', 14000000, 15500000, 1290000, 0.78, -3000000, 400000, 26, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'EmbedFinance' LIMIT 1), '2025', 'annual', 9000000, 10000000, 830000, 0.72, -6000000, 750000, 18, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Lagos Payments' LIMIT 1), '2025', 'annual', 32000000, NULL, NULL, 0.42, -4000000, 600000, 24, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Sao Paulo FinTech' LIMIT 1), '2025', 'annual', 95000000, NULL, NULL, 0.50, -5000000, 800000, 30, 'low', 'Estimates', true, 'seeded'),

-- Enterprise SaaS / Cybersecurity
((SELECT id FROM companies WHERE name = 'SecureID Cloud' LIMIT 1), '2025', 'annual', 48000000, 52000000, 4330000, 0.82, -5000000, 700000, 28, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'RetailOS' LIMIT 1), '2025', 'annual', 22000000, 24000000, 2000000, 0.75, -6000000, 800000, 22, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Bengaluru SaaS' LIMIT 1), '2025', 'annual', 28000000, 30000000, 2500000, 0.78, -4000000, 550000, 26, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Warsaw CyberSec' LIMIT 1), '2025', 'annual', 6000000, 6800000, 570000, 0.80, -4000000, 500000, 14, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Seoul AI Labs' LIMIT 1), '2025', 'annual', 15000000, 16000000, 1330000, 0.74, -5000000, 650000, 20, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'EnergyOS' LIMIT 1), '2025', 'annual', 16000000, 18000000, 1500000, 0.76, -4000000, 550000, 22, 'low', 'Estimates', true, 'seeded'),

-- Robotics / Hardware / Logistics
((SELECT id FROM companies WHERE name = 'Sakura Robotics' LIMIT 1), '2025', 'annual', 45000000, NULL, NULL, 0.48, 3000000, 0, 36, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Taipei Semiconductor' LIMIT 1), '2025', 'annual', 180000000, NULL, NULL, 0.52, 25000000, 0, 36, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Forge Materials' LIMIT 1), '2025', 'annual', 22000000, NULL, NULL, 0.45, -3000000, 500000, 24, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Mexico City Logistics' LIMIT 1), '2025', 'annual', 55000000, NULL, NULL, 0.32, -8000000, 1200000, 20, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'UrbanMobility' LIMIT 1), '2025', 'annual', 40000000, NULL, NULL, 0.38, -10000000, 1500000, 22, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Dubai PropTech' LIMIT 1), '2025', 'annual', 12000000, 13000000, 1080000, 0.70, -4000000, 550000, 20, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Amsterdam LegalTech' LIMIT 1), '2025', 'annual', 3500000, 4000000, 333000, 0.82, -3500000, 450000, 12, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Helsinki Gaming' LIMIT 1), '2025', 'annual', 18000000, NULL, NULL, 0.85, 2000000, 0, 36, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'DroneDelivery Co' LIMIT 1), '2025', 'annual', 5000000, NULL, NULL, 0.35, -8000000, 1000000, 14, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'TruckPark' LIMIT 1), '2025', 'annual', 4500000, 5000000, 420000, 0.72, -4000000, 500000, 16, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Sydney ClimateTech' LIMIT 1), '2025', 'annual', 3000000, 3200000, 270000, 0.68, -3500000, 450000, 14, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Zurich InsurTech' LIMIT 1), '2025', 'annual', 5000000, 5500000, 460000, 0.75, -5000000, 600000, 12, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Riyadh EdTech' LIMIT 1), '2025', 'annual', 4000000, 4200000, 350000, 0.80, -4500000, 550000, 14, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'Bogota HealthTech' LIMIT 1), '2025', 'annual', 3500000, 3800000, 317000, 0.72, -3000000, 400000, 14, 'low', 'Estimates', true, 'seeded'),
((SELECT id FROM companies WHERE name = 'PetHealth AI' LIMIT 1), '2025', 'annual', 5500000, 6000000, 500000, 0.78, -4000000, 500000, 16, 'low', 'Estimates', true, 'seeded')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 3. ACTIVITY EVENTS (~80 rows across diverse event types)
--    Published dates in last 3 months for freshness
-- ============================================================
INSERT INTO activity_events (company_id, event_type, headline, detail, published_at, is_synthetic, source_type, confidence_score) VALUES
-- Funding events
((SELECT id FROM companies WHERE name = 'RiboTech Sciences' LIMIT 1), 'funding', 'RiboTech Sciences Closes $110M Series C', 'Self-amplifying RNA platform company raises oversubscribed round led by Fidelity Biosciences to advance clinical trials for two lead candidates.', '2026-01-18 09:00:00+00', true, 'seeded', 'high'),
((SELECT id FROM companies WHERE name = 'SolarVault Energy' LIMIT 1), 'funding', 'SolarVault Energy Raises $120M for Grid-Scale Storage', 'Iron-air battery startup secures Series C from Goldman Sachs to build 500MWh manufacturing facility in Nevada.', '2026-01-10 08:30:00+00', true, 'seeded', 'high'),
((SELECT id FROM companies WHERE name = 'NuclearMicro' LIMIT 1), 'funding', 'NuclearMicro Raises $140M Series C for Microreactor Deployment', 'Nuclear microreactor company closes largest round in advanced nuclear sector, backed by Samsung and Bill Gates.', '2026-01-25 10:00:00+00', true, 'seeded', 'high'),
((SELECT id FROM companies WHERE name = 'Sakura Robotics' LIMIT 1), 'funding', 'Sakura Robotics Secures $80M Series C Led by Toyota Ventures', 'Japanese collaborative robotics company raises to expand into automotive and semiconductor assembly.', '2026-01-08 07:00:00+00', true, 'seeded', 'high'),
((SELECT id FROM companies WHERE name = 'VertiFresh' LIMIT 1), 'funding', 'VertiFresh Closes $80M Series C from Abu Dhabi Fund', 'Vertical farming operator secures funding to build 10 new facilities across GCC region.', '2026-02-01 08:00:00+00', true, 'seeded', 'high'),
((SELECT id FROM companies WHERE name = 'Bengaluru SaaS' LIMIT 1), 'funding', 'Bengaluru SaaS Raises $65M Series C at $365M Valuation', 'Indian CRM platform raises Tiger Global-led round as ARR crosses $30M milestone.', '2026-01-15 06:30:00+00', true, 'seeded', 'high'),
((SELECT id FROM companies WHERE name = 'Zurich InsurTech' LIMIT 1), 'funding', 'Zurich InsurTech Raises $10M Series A', 'Parametric climate insurance startup secures seed extension to expand across European markets.', '2026-01-20 09:00:00+00', true, 'seeded', 'medium'),
((SELECT id FROM companies WHERE name = 'Mexico City Logistics' LIMIT 1), 'funding', 'Mexico City Logistics Closes $60M Series C', 'General Atlantic leads round for Latin Americas largest last-mile delivery network.', '2025-12-10 10:00:00+00', true, 'seeded', 'high'),
((SELECT id FROM companies WHERE name = 'NeoBank Asia' LIMIT 1), 'funding', 'NeoBank Asia Closes $90M Series C Led by Warburg Pincus', 'Southeast Asian digital bank surpasses 2M SME customers as it pushes toward profitability.', '2025-12-15 08:00:00+00', true, 'seeded', 'high'),
((SELECT id FROM companies WHERE name = 'CreditPulse' LIMIT 1), 'funding', 'CreditPulse Raises $40M Series B for AI Underwriting', 'Alternative credit scoring platform backed by Insight Partners to expand into auto and mortgage lending.', '2025-10-30 09:00:00+00', true, 'seeded', 'medium'),

-- Partnership events
((SELECT id FROM companies WHERE name = 'SolarVault Energy' LIMIT 1), 'partnership', 'SolarVault Partners with NextEra Energy for 2GWh Deployment', 'Long-duration iron-air storage to be deployed across NextEra renewable energy sites in Texas and California.', '2026-02-05 14:30:00+00', true, 'seeded', 'high'),
((SELECT id FROM companies WHERE name = 'GreenH2 Systems' LIMIT 1), 'partnership', 'GreenH2 Signs MOU with Siemens Energy for Electrolyzer Scale-Up', 'Joint development agreement to produce 500MW annual electrolyzer capacity at Hamburg facility.', '2026-01-28 11:00:00+00', true, 'seeded', 'medium'),
((SELECT id FROM companies WHERE name = 'CropMind' LIMIT 1), 'partnership', 'CropMind Partners with John Deere for Precision Ag Integration', 'AI crop management platform to be integrated into John Deere Operations Center for 100K+ farms.', '2026-02-10 08:00:00+00', true, 'seeded', 'high'),
((SELECT id FROM companies WHERE name = 'EnergyOS' LIMIT 1), 'partnership', 'EnergyOS Wins Brookfield Properties Contract for 200 Buildings', 'Building energy optimization platform selected for Brookfield entire US commercial portfolio.', '2025-12-18 10:00:00+00', true, 'seeded', 'high'),
((SELECT id FROM companies WHERE name = 'SecureID Cloud' LIMIT 1), 'partnership', 'SecureID Cloud Partners with JPMorgan for Identity Verification', 'Decentralized identity platform selected for JPMorgan consumer banking KYC process.', '2025-11-20 09:00:00+00', true, 'seeded', 'medium'),
((SELECT id FROM companies WHERE name = 'RetailOS' LIMIT 1), 'partnership', 'RetailOS Signs Enterprise Deal with Target for 1,900 Stores', 'Unified commerce platform to power Target in-store and online operations.', '2026-01-22 10:30:00+00', true, 'seeded', 'medium'),

-- Expansion events
((SELECT id FROM companies WHERE name = 'PayStream Global' LIMIT 1), 'expansion', 'PayStream Global Launches in 12 New African Markets', 'Cross-border payments infrastructure expands coverage to 35 African nations.', '2025-12-01 08:00:00+00', true, 'seeded', 'medium'),
((SELECT id FROM companies WHERE name = 'Taipei Semiconductor' LIMIT 1), 'expansion', 'Taipei Semiconductor Opens Arizona R&D Center', 'Advanced chiplet packaging company establishes US presence near TSMC Arizona fab.', '2026-02-08 10:00:00+00', true, 'seeded', 'medium'),
((SELECT id FROM companies WHERE name = 'NeoBank Asia' LIMIT 1), 'expansion', 'NeoBank Asia Launches in Vietnam and Philippines', 'Digital bank expands to two new Southeast Asian markets targeting 5M new SME customers.', '2026-01-05 07:00:00+00', true, 'seeded', 'medium'),
((SELECT id FROM companies WHERE name = 'AgroStar Platform' LIMIT 1), 'expansion', 'AgroStar Platform Expands to Bangladesh and Myanmar', 'Agricultural marketplace reaches 500K farmers across South Asia.', '2025-12-20 06:00:00+00', true, 'seeded', 'medium'),
((SELECT id FROM companies WHERE name = 'Lagos Payments' LIMIT 1), 'expansion', 'Lagos Payments Goes Live in East Africa', 'Pan-African payment processor expands to Kenya, Tanzania, and Uganda.', '2025-11-15 08:00:00+00', true, 'seeded', 'medium'),

-- Leadership events
((SELECT id FROM companies WHERE name = 'CarbonCapture Inc' LIMIT 1), 'leadership', 'CarbonCapture Inc Appoints Former DOE Secretary as Chairman', 'Direct air capture company bolsters government relations with high-profile appointment.', '2026-01-12 09:00:00+00', true, 'seeded', 'medium'),
((SELECT id FROM companies WHERE name = 'WindForge Energy' LIMIT 1), 'leadership', 'WindForge Hires Vestas VP as Chief Technology Officer', 'Floating wind startup recruits senior turbine engineering leader for offshore expansion.', '2025-12-22 10:00:00+00', true, 'seeded', 'medium'),
((SELECT id FROM companies WHERE name = 'SecureID Cloud' LIMIT 1), 'leadership', 'SecureID Cloud Hires Former Okta CRO as President', 'Identity verification company accelerates enterprise go-to-market with seasoned SaaS executive.', '2026-02-03 09:30:00+00', true, 'seeded', 'medium'),

-- Product events
((SELECT id FROM companies WHERE name = 'OmniGenome' LIMIT 1), 'product', 'OmniGenome Launches AI Drug Target Discovery Platform v3.0', 'New version identifies 5x more actionable drug targets using multimodal genomic data.', '2026-02-12 08:00:00+00', true, 'seeded', 'medium'),
((SELECT id FROM companies WHERE name = 'Seoul AI Labs' LIMIT 1), 'product', 'Seoul AI Labs Unveils Real-Time Defect Detection System', 'Computer vision platform achieves 99.97% accuracy in semiconductor wafer inspection.', '2026-01-30 07:00:00+00', true, 'seeded', 'medium'),
((SELECT id FROM companies WHERE name = 'EcoGrid Solutions' LIMIT 1), 'product', 'EcoGrid Launches Vehicle-to-Grid Integration Module', 'Smart grid platform adds bidirectional EV charging support for grid balancing.', '2025-12-08 10:00:00+00', true, 'seeded', 'medium'),
((SELECT id FROM companies WHERE name = 'Helsinki Gaming' LIMIT 1), 'product', 'Helsinki Gaming Hits 50M Monthly Active Players', 'Casual gaming studio surpasses milestone with new AI-generated game mechanics.', '2026-02-14 07:00:00+00', true, 'seeded', 'medium'),
((SELECT id FROM companies WHERE name = 'ComplianceHub' LIMIT 1), 'product', 'ComplianceHub Launches Real-Time AML Monitoring', 'RegTech platform adds continuous transaction monitoring for crypto exchanges.', '2025-11-28 09:00:00+00', true, 'seeded', 'medium'),

-- Acquisition events
((SELECT id FROM companies WHERE name = 'Verdant Biosciences' LIMIT 1), 'acquisition', 'Verdant Biosciences Acquires Australian AgBio Startup for $45M', 'Biological crop protection company expands into APAC with strategic acquisition.', '2025-12-15 10:00:00+00', true, 'seeded', 'medium'),
((SELECT id FROM companies WHERE name = 'BioVault Sciences' LIMIT 1), 'acquisition', 'BioVault Sciences Acquires German Biobank Network', 'Automated biobanking company expands European footprint with 12-facility acquisition.', '2026-01-05 09:00:00+00', true, 'seeded', 'medium'),

-- Regulatory events
((SELECT id FROM companies WHERE name = 'NuclearMicro' LIMIT 1), 'regulatory', 'NuclearMicro Receives NRC Design Approval for Microreactor', 'First commercial microreactor design receives Nuclear Regulatory Commission certification.', '2026-02-10 14:00:00+00', true, 'seeded', 'high'),
((SELECT id FROM companies WHERE name = 'DroneDelivery Co' LIMIT 1), 'regulatory', 'DroneDelivery Co Receives FAA Beyond-Visual-Line-of-Sight Waiver', 'Drone delivery service cleared for autonomous operations across 15 US states.', '2025-12-28 10:00:00+00', true, 'seeded', 'medium'),

-- IPO rumor events
((SELECT id FROM companies WHERE name = 'PayStream Global' LIMIT 1), 'ipo_rumor', 'PayStream Global Reportedly Exploring 2026 London IPO', 'Cross-border payments company said to be in discussions with Morgan Stanley and Goldman Sachs for H2 2026 listing.', '2026-02-08 06:00:00+00', true, 'seeded', 'low'),
((SELECT id FROM companies WHERE name = 'Taipei Semiconductor' LIMIT 1), 'ipo_rumor', 'Taipei Semiconductor Weighing Dual Listing in Taipei and NASDAQ', 'Chiplet packaging company exploring dual listing as revenue exceeds $150M.', '2026-01-18 07:00:00+00', true, 'seeded', 'low'),
((SELECT id FROM companies WHERE name = 'SolarVault Energy' LIMIT 1), 'ipo_rumor', 'SolarVault Energy Hires IPO Advisors Ahead of Potential 2027 Listing', 'Battery storage company engages Goldman Sachs and Evercore for pre-IPO advisory.', '2026-02-12 08:00:00+00', true, 'seeded', 'low'),

-- General market events (no specific company)
(NULL, 'funding', 'Global VC Funding Rebounds to $85B in Q4 2025', 'Venture capital investment recovers to pre-2022 levels as AI infrastructure continues to attract mega-rounds.', '2026-01-02 08:00:00+00', true, 'seeded', 'high'),
(NULL, 'regulatory', 'EU AI Act Enforcement Begins with First Compliance Deadline', 'High-risk AI system providers must register by February 2026 under new European regulations.', '2026-02-01 06:00:00+00', true, 'seeded', 'high'),
(NULL, 'funding', 'Private Credit AUM Surpasses $2.1 Trillion', 'Institutional investors continue rotating from public credit to private lending strategies.', '2026-01-15 09:00:00+00', true, 'seeded', 'medium'),
(NULL, 'regulatory', 'SEC Proposes New Private Fund Transparency Rules', 'Proposed rules would require quarterly performance reporting for private funds over $500M.', '2025-12-05 10:00:00+00', true, 'seeded', 'medium'),
(NULL, 'funding', 'Family Offices Allocate Record 35% to Alternatives', 'Average family office portfolio now holds 35% in PE, VC, real estate, and hedge funds.', '2026-02-06 08:00:00+00', true, 'seeded', 'medium');
