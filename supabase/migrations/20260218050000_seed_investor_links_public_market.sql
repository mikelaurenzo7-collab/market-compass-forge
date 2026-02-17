-- Migration 5: Seed investor_company links, public companies, and public_market_data
-- Depends on: companies, investors (exist), funding_rounds (from Migration 2)

-- ============================================================
-- 1. PUBLIC COMPANIES (15 comps for benchmarking)
-- ============================================================
INSERT INTO companies (name, domain, sector, sub_sector, hq_country, hq_city, founded_year, employee_count, stage, description, market_type, is_synthetic) VALUES
('Veeva Systems', 'veeva.com', 'Enterprise SaaS', 'Life Sciences', 'US', 'Pleasanton', 2007, 6000, 'Public', 'Cloud-based software for life sciences industry regulatory and commercial.', 'public', true),
('CrowdStrike Holdings', 'crowdstrike.com', 'Cybersecurity', 'Endpoint Security', 'US', 'Austin', 2011, 8500, 'Public', 'AI-native cybersecurity platform providing cloud-delivered endpoint protection.', 'public', true),
('Snowflake Inc', 'snowflake.com', 'Enterprise SaaS', 'Data Cloud', 'US', 'Bozeman', 2012, 7000, 'Public', 'Cloud-based data warehousing and analytics platform.', 'public', true),
('Palantir Technologies', 'palantir.com', 'Enterprise SaaS', 'Data Analytics', 'US', 'Denver', 2003, 3800, 'Public', 'Data integration and AI analytics platform for government and commercial.', 'public', true),
('Datadog Inc', 'datadoghq.com', 'Enterprise SaaS', 'Observability', 'US', 'New York', 2010, 5500, 'Public', 'Monitoring and security platform for cloud applications.', 'public', true),
('Zscaler Inc', 'zscaler.com', 'Cybersecurity', 'Zero Trust', 'US', 'San Jose', 2007, 6200, 'Public', 'Cloud security platform enabling zero trust architecture.', 'public', true),
('Cloudflare Inc', 'cloudflare.com', 'Cybersecurity', 'Edge Security', 'US', 'San Francisco', 2009, 4000, 'Public', 'Cloud platform for web performance, security, and networking.', 'public', true),
('MongoDB Inc', 'mongodb.com', 'Enterprise SaaS', 'Database', 'US', 'New York', 2007, 5200, 'Public', 'Developer data platform based on document-oriented database.', 'public', true),
('HubSpot Inc', 'hubspot.com', 'Enterprise SaaS', 'CRM', 'US', 'Cambridge', 2006, 7400, 'Public', 'Customer relationship management platform for scaling companies.', 'public', true),
('Bill Holdings', 'bill.com', 'FinTech', 'Payments', 'US', 'San Jose', 2006, 2500, 'Public', 'Financial operations platform for small and mid-size businesses.', 'public', true),
('Toast Inc', 'toasttab.com', 'FinTech', 'Restaurant Tech', 'US', 'Boston', 2012, 5000, 'Public', 'Cloud-based restaurant technology platform.', 'public', true),
('Enphase Energy', 'enphase.com', 'CleanTech', 'Solar', 'US', 'Fremont', 2006, 3200, 'Public', 'Semiconductor-based microinverter systems for solar energy.', 'public', true),
('Exact Sciences', 'exactsciences.com', 'Digital Health', 'Diagnostics', 'US', 'Madison', 2009, 6500, 'Public', 'Cancer screening and diagnostics company.', 'public', true),
('Celsius Holdings', 'celsiusholdingsllc.com', 'FoodTech', 'Beverages', 'US', 'Boca Raton', 2004, 800, 'Public', 'Functional fitness beverage company.', 'public', true),
('Samsara Inc', 'samsara.com', 'Enterprise SaaS', 'IoT', 'US', 'San Francisco', 2015, 3000, 'Public', 'Connected operations platform for physical operations.', 'public', true)
ON CONFLICT DO NOTHING;


-- ============================================================
-- 2. PUBLIC MARKET DATA (15 rows, one per public company)
-- ============================================================
INSERT INTO public_market_data (company_id, ticker, exchange, price, market_cap, pe_ratio, eps, dividend_yield, ev_revenue, ev_ebitda, enterprise_value, revenue, ebitda, beta, volume_avg, fifty_two_week_high, fifty_two_week_low, price_change_pct, source_type) VALUES
((SELECT id FROM companies WHERE name = 'Veeva Systems' LIMIT 1), 'VEEV', 'NYSE', 215.50, 35000000000, 55.2, 3.90, 0, 14.5, 52.0, 29000000000, 2500000000, 700000000, 0.82, 1200000, 240.00, 165.00, 4.5, 'seeded'),
((SELECT id FROM companies WHERE name = 'CrowdStrike Holdings' LIMIT 1), 'CRWD', 'NASDAQ', 345.00, 85000000000, 95.0, 3.63, 0, 22.5, 85.0, 81000000000, 3600000000, 950000000, 1.15, 3500000, 390.00, 245.00, 12.3, 'seeded'),
((SELECT id FROM companies WHERE name = 'Snowflake Inc' LIMIT 1), 'SNOW', 'NYSE', 178.00, 58000000000, NULL, -0.52, 0, 17.8, NULL, 56000000000, 3200000000, -100000000, 1.35, 4200000, 220.00, 135.00, -5.2, 'seeded'),
((SELECT id FROM companies WHERE name = 'Palantir Technologies' LIMIT 1), 'PLTR', 'NYSE', 78.50, 175000000000, 200.0, 0.39, 0, 55.0, 250.0, 165000000000, 3000000000, 660000000, 1.80, 45000000, 85.00, 22.00, 35.0, 'seeded'),
((SELECT id FROM companies WHERE name = 'Datadog Inc' LIMIT 1), 'DDOG', 'NASDAQ', 135.00, 45000000000, 80.0, 1.69, 0, 18.5, 72.0, 42000000000, 2300000000, 580000000, 1.25, 5500000, 155.00, 100.00, 8.5, 'seeded'),
((SELECT id FROM companies WHERE name = 'Zscaler Inc' LIMIT 1), 'ZS', 'NASDAQ', 225.00, 35000000000, 110.0, 2.05, 0, 16.0, 75.0, 33000000000, 2100000000, 440000000, 1.20, 2000000, 260.00, 175.00, 6.2, 'seeded'),
((SELECT id FROM companies WHERE name = 'Cloudflare Inc' LIMIT 1), 'NET', 'NYSE', 112.00, 38000000000, NULL, -0.15, 0, 20.0, NULL, 36000000000, 1800000000, -50000000, 1.40, 6000000, 130.00, 65.00, 15.8, 'seeded'),
((SELECT id FROM companies WHERE name = 'MongoDB Inc' LIMIT 1), 'MDB', 'NASDAQ', 285.00, 22000000000, 120.0, 2.38, 0, 12.0, 55.0, 21000000000, 1800000000, 380000000, 1.30, 1500000, 320.00, 210.00, -2.5, 'seeded'),
((SELECT id FROM companies WHERE name = 'HubSpot Inc' LIMIT 1), 'HUBS', 'NYSE', 680.00, 35000000000, 85.0, 8.00, 0, 14.0, 60.0, 33500000000, 2400000000, 560000000, 1.15, 800000, 750.00, 480.00, 10.2, 'seeded'),
((SELECT id FROM companies WHERE name = 'Bill Holdings' LIMIT 1), 'BILL', 'NYSE', 82.00, 8500000000, NULL, -1.20, 0, 5.5, NULL, 7800000000, 1400000000, -200000000, 1.50, 3000000, 105.00, 50.00, -8.5, 'seeded'),
((SELECT id FROM companies WHERE name = 'Toast Inc' LIMIT 1), 'TOST', 'NYSE', 42.00, 25000000000, 120.0, 0.35, 0, 5.2, 80.0, 22000000000, 4200000000, 275000000, 1.65, 8000000, 48.00, 15.00, 28.5, 'seeded'),
((SELECT id FROM companies WHERE name = 'Enphase Energy' LIMIT 1), 'ENPH', 'NASDAQ', 85.00, 11500000000, 25.0, 3.40, 0, 5.8, 15.0, 10000000000, 1700000000, 670000000, 1.55, 4000000, 140.00, 75.00, -18.5, 'seeded'),
((SELECT id FROM companies WHERE name = 'Exact Sciences' LIMIT 1), 'EXAS', 'NASDAQ', 72.00, 13000000000, NULL, -1.50, 0, 5.0, NULL, 12500000000, 2500000000, -250000000, 0.95, 2500000, 85.00, 52.00, -5.8, 'seeded'),
((SELECT id FROM companies WHERE name = 'Celsius Holdings' LIMIT 1), 'CELH', 'NASDAQ', 28.00, 6500000000, 35.0, 0.80, 0, 4.2, 22.0, 5800000000, 1400000000, 260000000, 1.70, 5000000, 95.00, 22.00, -40.0, 'seeded'),
((SELECT id FROM companies WHERE name = 'Samsara Inc' LIMIT 1), 'IOT', 'NYSE', 48.00, 27000000000, NULL, -0.30, 0, 25.0, NULL, 25000000000, 1000000000, -80000000, 1.45, 6500000, 55.00, 25.00, 22.0, 'seeded')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 3. INVESTOR-COMPANY LINKS (~80 rows)
--    Links existing investors to companies via funding rounds
-- ============================================================
INSERT INTO investor_company (investor_id, company_id, round_id, ownership_pct_est) VALUES
-- Meridian Capital Partners → companies
((SELECT id FROM investors WHERE name = 'Meridian Capital Partners' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'SecureID Cloud' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'SecureID Cloud' LIMIT 1) AND round_type = 'Series C' LIMIT 1),
 8.5),
((SELECT id FROM investors WHERE name = 'Meridian Capital Partners' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'RetailOS' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'RetailOS' LIMIT 1) AND round_type = 'Series B' LIMIT 1),
 12.0),

-- Atlas Growth Equity
((SELECT id FROM investors WHERE name = 'Atlas Growth Equity' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'EnergyOS' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'EnergyOS' LIMIT 1) AND round_type = 'Series B' LIMIT 1),
 10.0),
((SELECT id FROM investors WHERE name = 'Atlas Growth Equity' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'CreditPulse' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'CreditPulse' LIMIT 1) AND round_type = 'Series B' LIMIT 1),
 7.5),

-- Nordic Ventures
((SELECT id FROM investors WHERE name = 'Nordic Ventures' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'EcoGrid Solutions' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'EcoGrid Solutions' LIMIT 1) AND round_type = 'Series B' LIMIT 1),
 15.0),
((SELECT id FROM investors WHERE name = 'Nordic Ventures' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'Nordic Clean Energy' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'Nordic Clean Energy' LIMIT 1) AND round_type = 'Series B' LIMIT 1),
 12.0),

-- Pacific Bridge Capital
((SELECT id FROM investors WHERE name = 'Pacific Bridge Capital' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'NeoBank Asia' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'NeoBank Asia' LIMIT 1) AND round_type = 'Series C' LIMIT 1),
 6.0),
((SELECT id FROM investors WHERE name = 'Pacific Bridge Capital' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'Taipei Semiconductor' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'Taipei Semiconductor' LIMIT 1) AND round_type = 'Growth' LIMIT 1),
 4.0),

-- Tokyo Growth Partners
((SELECT id FROM investors WHERE name = 'Tokyo Growth Partners' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'Sakura Robotics' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'Sakura Robotics' LIMIT 1) AND round_type = 'Series C' LIMIT 1),
 8.0),
((SELECT id FROM investors WHERE name = 'Tokyo Growth Partners' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'Seoul AI Labs' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'Seoul AI Labs' LIMIT 1) AND round_type = 'Series B' LIMIT 1),
 5.5),

-- Berlin Ventures
((SELECT id FROM investors WHERE name = 'Berlin Ventures' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'GreenH2 Systems' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'GreenH2 Systems' LIMIT 1) AND round_type = 'Series B' LIMIT 1),
 10.0),
((SELECT id FROM investors WHERE name = 'Berlin Ventures' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'Amsterdam LegalTech' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'Amsterdam LegalTech' LIMIT 1) AND round_type = 'Series A' LIMIT 1),
 14.0),

-- Copenhagen Climate Fund
((SELECT id FROM investors WHERE name = 'Copenhagen Climate Fund' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'CarbonCapture Inc' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'CarbonCapture Inc' LIMIT 1) AND round_type = 'Series B' LIMIT 1),
 8.0),
((SELECT id FROM investors WHERE name = 'Copenhagen Climate Fund' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'Copenhagen BioTech' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'Copenhagen BioTech' LIMIT 1) AND round_type = 'Series B' LIMIT 1),
 10.0),

-- Breakthrough Energy
((SELECT id FROM investors WHERE name = 'Breakthrough Energy' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'SolarVault Energy' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'SolarVault Energy' LIMIT 1) AND round_type = 'Series C' LIMIT 1),
 5.0),
((SELECT id FROM investors WHERE name = 'Breakthrough Energy' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'CropMind' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'CropMind' LIMIT 1) AND round_type = 'Series B' LIMIT 1),
 9.0),

-- KKR Growth
((SELECT id FROM investors WHERE name = 'KKR Growth' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'PayStream Global' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'PayStream Global' LIMIT 1) AND round_type = 'Growth' LIMIT 1),
 7.0),

-- General Atlantic
((SELECT id FROM investors WHERE name = 'General Atlantic Next' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'Mexico City Logistics' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'Mexico City Logistics' LIMIT 1) AND round_type = 'Series C' LIMIT 1),
 10.0),
((SELECT id FROM investors WHERE name = 'General Atlantic Next' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'Sao Paulo FinTech' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'Sao Paulo FinTech' LIMIT 1) AND round_type = 'Growth' LIMIT 1),
 6.0),

-- Insight Partners
((SELECT id FROM investors WHERE name = 'Insight Venture Partners' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'SecureID Cloud' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'SecureID Cloud' LIMIT 1) AND round_type = 'Series A' LIMIT 1),
 18.0),
((SELECT id FROM investors WHERE name = 'Insight Venture Partners' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'Warsaw CyberSec' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'Warsaw CyberSec' LIMIT 1) AND round_type = 'Series A' LIMIT 1),
 15.0),

-- Tiger Global
((SELECT id FROM investors WHERE name = 'Tiger Global Growth' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'Bengaluru SaaS' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'Bengaluru SaaS' LIMIT 1) AND round_type = 'Series C' LIMIT 1),
 8.0),

-- Lightspeed
((SELECT id FROM investors WHERE name = 'Lightspeed Growth' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'OmniGenome' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'OmniGenome' LIMIT 1) AND round_type = 'Series A' LIMIT 1),
 12.0),

-- Founders Fund
((SELECT id FROM investors WHERE name = 'Founders Fund Next' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'NuclearMicro' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'NuclearMicro' LIMIT 1) AND round_type = 'Series C' LIMIT 1),
 6.0),

-- Tel Aviv Cyber Fund
((SELECT id FROM investors WHERE name = 'Tel Aviv Cyber Fund' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'SecureID Cloud' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'SecureID Cloud' LIMIT 1) AND round_type = 'Series B' LIMIT 1),
 5.0),
((SELECT id FROM investors WHERE name = 'Tel Aviv Cyber Fund' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'HydroPure Tech' LIMIT 1),
 NULL,
 8.0),

-- Sahara Ventures
((SELECT id FROM investors WHERE name = 'Sahara Ventures' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'Dubai PropTech' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'Dubai PropTech' LIMIT 1) AND round_type = 'Series B' LIMIT 1),
 10.0),

-- Seoul Innovation Fund
((SELECT id FROM investors WHERE name = 'Seoul Innovation Fund' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'Seoul AI Labs' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'Seoul AI Labs' LIMIT 1) AND round_type = 'Series A' LIMIT 1),
 12.0),

-- Helsinki Deep Tech Fund
((SELECT id FROM investors WHERE name = 'Helsinki Deep Tech Fund' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'Helsinki Gaming' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'Helsinki Gaming' LIMIT 1) AND round_type = 'Series B' LIMIT 1),
 10.0),

-- Sao Paulo Ventures
((SELECT id FROM investors WHERE name = 'Sao Paulo Ventures' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'Sao Paulo FinTech' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'Sao Paulo FinTech' LIMIT 1) AND round_type = 'Series B' LIMIT 1),
 12.0),

-- Mumbai Growth Capital
((SELECT id FROM investors WHERE name = 'Mumbai Growth Capital' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'Bengaluru SaaS' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'Bengaluru SaaS' LIMIT 1) AND round_type = 'Series B' LIMIT 1),
 8.0),
((SELECT id FROM investors WHERE name = 'Mumbai Growth Capital' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'AgroStar Platform' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'AgroStar Platform' LIMIT 1) AND round_type = 'Series C' LIMIT 1),
 6.0),

-- Amsterdam Tech Ventures
((SELECT id FROM investors WHERE name = 'Amsterdam Tech Ventures' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'Amsterdam LegalTech' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'Amsterdam LegalTech' LIMIT 1) AND round_type = 'Series A' LIMIT 1),
 10.0),
((SELECT id FROM investors WHERE name = 'Amsterdam Tech Ventures' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'CircularChem' LIMIT 1),
 NULL,
 7.0),

-- Khosla Impact
((SELECT id FROM investors WHERE name = 'Khosla Impact' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'CarbonCapture Inc' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'CarbonCapture Inc' LIMIT 1) AND round_type = 'Series A' LIMIT 1),
 12.0),
((SELECT id FROM investors WHERE name = 'Khosla Impact' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'MicroLend' LIMIT 1),
 NULL,
 10.0),

-- EQT Partners
((SELECT id FROM investors WHERE name = 'EQT Partners' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'EcoGrid Solutions' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'EcoGrid Solutions' LIMIT 1) AND round_type = 'Series B' LIMIT 1),
 8.0),

-- Warburg Pincus
((SELECT id FROM investors WHERE name = 'Warburg Pincus Tech' LIMIT 1),
 (SELECT id FROM companies WHERE name = 'NeoBank Asia' LIMIT 1),
 (SELECT id FROM funding_rounds WHERE company_id = (SELECT id FROM companies WHERE name = 'NeoBank Asia' LIMIT 1) AND round_type = 'Series C' LIMIT 1),
 10.0);
