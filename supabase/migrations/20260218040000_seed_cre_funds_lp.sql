-- Migration 4: Seed CRE transactions/market data, funds, LP entities, fund commitments
-- CRE tables and funds/lps are standalone; fund_commitments FKs to funds + lp_entities

-- ============================================================
-- 1. CRE TRANSACTIONS (~50 rows across top US metros)
-- ============================================================
INSERT INTO cre_transactions (property_name, property_type, city, state, submarket, size_sf, sale_price, price_per_sf, cap_rate, buyer, seller, transaction_date, is_synthetic, source_type) VALUES
-- Chicago
('Parkview Tower', 'Office', 'Chicago', 'IL', 'West Loop', 280000, 95000000, 339, 0.062, 'Brookfield Asset Management', 'Hines', '2025-12-15', true, 'seeded'),
('Lincoln Park Apartments', 'Multifamily', 'Chicago', 'IL', 'Lincoln Park', 185000, 68000000, 368, 0.048, 'Equity Residential', 'Aimco', '2025-11-20', true, 'seeded'),
('Fulton Market Distribution', 'Industrial', 'Chicago', 'IL', 'West Loop', 320000, 52000000, 163, 0.055, 'Prologis', 'Bridge Industrial', '2025-10-28', true, 'seeded'),
('Michigan Ave Retail Center', 'Retail', 'Chicago', 'IL', 'Loop', 45000, 28000000, 622, 0.058, 'Macerich', 'Simon Property Group', '2025-09-15', true, 'seeded'),
('River North Mixed-Use', 'Mixed-Use', 'Chicago', 'IL', 'River North', 120000, 42000000, 350, 0.052, 'Related Midwest', 'Sterling Bay', '2026-01-10', true, 'seeded'),

-- New York
('Hudson Yards Office Tower', 'Office', 'New York', 'NY', 'Midtown West', 450000, 380000000, 844, 0.045, 'SL Green Realty', 'Brookfield', '2025-11-15', true, 'seeded'),
('Brooklyn Heights Apartments', 'Multifamily', 'New York', 'NY', 'Brooklyn', 210000, 145000000, 690, 0.038, 'Blackstone Real Estate', 'Tishman Speyer', '2025-12-20', true, 'seeded'),
('Queens Industrial Park', 'Industrial', 'New York', 'NY', 'Queens', 180000, 72000000, 400, 0.048, 'Link Logistics', 'Industrial Logistics Properties', '2025-10-05', true, 'seeded'),
('SoHo Retail Portfolio', 'Retail', 'New York', 'NY', 'SoHo', 35000, 65000000, 1857, 0.042, 'Vornado Realty', 'Thor Equities', '2025-11-30', true, 'seeded'),

-- Los Angeles
('Arts District Creative Office', 'Office', 'Los Angeles', 'CA', 'Downtown', 165000, 78000000, 473, 0.055, 'Hudson Pacific Properties', 'Kilroy Realty', '2025-12-08', true, 'seeded'),
('Harbor Industrial Complex', 'Industrial', 'Los Angeles', 'CA', 'Inland Empire', 450000, 78000000, 173, 0.048, 'Rexford Industrial', 'LBA Logistics', '2025-11-22', true, 'seeded'),
('Santa Monica Multifamily', 'Multifamily', 'Los Angeles', 'CA', 'Westside', 95000, 58000000, 611, 0.040, 'Essex Property Trust', 'AvalonBay', '2025-10-18', true, 'seeded'),
('Pasadena Medical Office', 'Medical Office', 'Los Angeles', 'CA', 'San Gabriel Valley', 85000, 32000000, 376, 0.058, 'Healthcare Trust', 'Physicians Realty', '2026-01-15', true, 'seeded'),

-- Dallas
('Legacy West Office Complex', 'Office', 'Dallas', 'TX', 'Plano', 350000, 125000000, 357, 0.058, 'Lone Star Funds', 'Gaedeke Group', '2025-11-10', true, 'seeded'),
('Alliance Industrial Park', 'Industrial', 'Dallas', 'TX', 'Alliance', 520000, 68000000, 131, 0.052, 'Hillwood', 'Duke Realty', '2025-12-05', true, 'seeded'),
('Uptown Dallas Apartments', 'Multifamily', 'Dallas', 'TX', 'Uptown', 250000, 82000000, 328, 0.048, 'Greystar', 'Lincoln Property', '2025-10-22', true, 'seeded'),

-- Atlanta
('Midtown Atlanta Office', 'Office', 'Atlanta', 'GA', 'Midtown', 280000, 95000000, 339, 0.060, 'Cousins Properties', 'Tishman Speyer', '2025-11-28', true, 'seeded'),
('Perimeter Industrial', 'Industrial', 'Atlanta', 'GA', 'North Perimeter', 380000, 55000000, 145, 0.055, 'Prologis', 'Childress Klein', '2025-12-18', true, 'seeded'),
('Buckhead Luxury Apartments', 'Multifamily', 'Atlanta', 'GA', 'Buckhead', 180000, 72000000, 400, 0.045, 'MAA', 'Post Properties', '2026-01-05', true, 'seeded'),

-- Miami
('Brickell Office Tower', 'Office', 'Miami', 'FL', 'Brickell', 220000, 135000000, 614, 0.050, 'Swire Properties', 'Brookfield', '2025-12-10', true, 'seeded'),
('Wynwood Mixed-Use', 'Mixed-Use', 'Miami', 'FL', 'Wynwood', 95000, 48000000, 505, 0.048, 'Related Group', 'East End Capital', '2025-11-15', true, 'seeded'),
('Doral Industrial Center', 'Industrial', 'Miami', 'FL', 'Doral', 280000, 42000000, 150, 0.055, 'Duke Realty', 'Stag Industrial', '2025-10-30', true, 'seeded'),

-- Denver
('RiNo Creative Office', 'Office', 'Denver', 'CO', 'RiNo', 120000, 52000000, 433, 0.055, 'Hines', 'Unico Properties', '2025-11-05', true, 'seeded'),
('DIA Industrial Park', 'Industrial', 'Denver', 'CO', 'DIA Corridor', 350000, 48000000, 137, 0.052, 'VanTrust Real Estate', 'McWhinney', '2025-12-22', true, 'seeded'),
('LoHi Apartments', 'Multifamily', 'Denver', 'CO', 'LoHi', 140000, 55000000, 393, 0.045, 'UDR', 'Holland Partner Group', '2026-01-12', true, 'seeded'),

-- Seattle
('South Lake Union Office', 'Office', 'Seattle', 'WA', 'South Lake Union', 200000, 120000000, 600, 0.048, 'Alexandria Real Estate', 'Vulcan Real Estate', '2025-11-18', true, 'seeded'),
('Kent Valley Industrial', 'Industrial', 'Seattle', 'WA', 'Kent Valley', 400000, 62000000, 155, 0.050, 'GLP Capital Partners', 'Panattoni', '2025-12-28', true, 'seeded'),
('Capitol Hill Apartments', 'Multifamily', 'Seattle', 'WA', 'Capitol Hill', 110000, 48000000, 436, 0.042, 'Essex Property Trust', 'Security Properties', '2025-10-15', true, 'seeded'),

-- Phoenix
('Scottsdale Airpark Office', 'Office', 'Phoenix', 'AZ', 'Scottsdale', 180000, 58000000, 322, 0.060, 'Cousins Properties', 'ViaWest Group', '2025-12-01', true, 'seeded'),
('Sky Harbor Industrial', 'Industrial', 'Phoenix', 'AZ', 'Sky Harbor', 320000, 45000000, 141, 0.055, 'Link Logistics', 'Conor Commercial', '2025-11-08', true, 'seeded'),
('Tempe Multifamily', 'Multifamily', 'Phoenix', 'AZ', 'Tempe', 200000, 62000000, 310, 0.050, 'Greystar', 'Alliance Residential', '2026-01-18', true, 'seeded'),

-- Boston
('Seaport Office Complex', 'Office', 'Boston', 'MA', 'Seaport', 250000, 175000000, 700, 0.050, 'Boston Properties', 'WS Development', '2025-11-25', true, 'seeded'),
('Cambridge Life Science', 'Office', 'Boston', 'MA', 'Cambridge', 150000, 195000000, 1300, 0.040, 'Alexandria Real Estate', 'BioMed Realty', '2025-12-15', true, 'seeded'),
('Brighton Apartments', 'Multifamily', 'Boston', 'MA', 'Brighton', 120000, 55000000, 458, 0.042, 'AvalonBay', 'National Development', '2026-01-08', true, 'seeded'),

-- Austin / Nashville
('Domain Office Tower', 'Office', 'Austin', 'TX', 'Domain', 200000, 88000000, 440, 0.055, 'Kilroy Realty', 'Brandywine Realty', '2025-12-02', true, 'seeded'),
('East Austin Industrial', 'Industrial', 'Austin', 'TX', 'East Austin', 180000, 32000000, 178, 0.052, 'Prologis', 'Endeavor Real Estate', '2025-11-12', true, 'seeded'),
('Gulch Mixed-Use Nashville', 'Mixed-Use', 'Nashville', 'TN', 'The Gulch', 160000, 72000000, 450, 0.048, 'AEW Capital', 'Giarratana Development', '2025-12-20', true, 'seeded'),
('Nashville Industrial Portfolio', 'Industrial', 'Nashville', 'TN', 'Southeast Nashville', 280000, 38000000, 136, 0.055, 'Duke Realty', 'Industrial Developments Intl', '2025-10-25', true, 'seeded'),

-- Self-Storage / Medical (specialty)
('StorageMart Portfolio NE', 'Self-Storage', 'Boston', 'MA', 'Greater Boston', 120000, 18000000, 150, 0.062, 'Extra Space Storage', 'CubeSmart', '2025-11-30', true, 'seeded'),
('Medical Park Dallas', 'Medical Office', 'Dallas', 'TX', 'Medical District', 95000, 28000000, 295, 0.058, 'Healthcare Trust Inc', 'NexCore Group', '2025-12-12', true, 'seeded');


-- ============================================================
-- 2. CRE MARKET DATA (4 property types x 5 submarkets x 3 quarters = 60 rows)
-- ============================================================
INSERT INTO cre_market_data (property_type, city, state, submarket, vacancy_rate, asking_rent, cap_rate, period, is_synthetic, source_type) VALUES
-- Office — Chicago West Loop
('Office', 'Chicago', 'IL', 'West Loop', 0.185, 42.00, 0.068, 'Q2 2025', true, 'seeded'),
('Office', 'Chicago', 'IL', 'West Loop', 0.178, 42.50, 0.065, 'Q3 2025', true, 'seeded'),
('Office', 'Chicago', 'IL', 'West Loop', 0.172, 43.25, 0.062, 'Q4 2025', true, 'seeded'),
-- Office — New York Midtown
('Office', 'New York', 'NY', 'Midtown West', 0.142, 78.00, 0.048, 'Q2 2025', true, 'seeded'),
('Office', 'New York', 'NY', 'Midtown West', 0.138, 79.50, 0.046, 'Q3 2025', true, 'seeded'),
('Office', 'New York', 'NY', 'Midtown West', 0.135, 80.00, 0.045, 'Q4 2025', true, 'seeded'),
-- Office — Boston Seaport
('Office', 'Boston', 'MA', 'Seaport', 0.115, 65.00, 0.052, 'Q2 2025', true, 'seeded'),
('Office', 'Boston', 'MA', 'Seaport', 0.110, 66.50, 0.050, 'Q3 2025', true, 'seeded'),
('Office', 'Boston', 'MA', 'Seaport', 0.108, 67.00, 0.050, 'Q4 2025', true, 'seeded'),
-- Office — Austin Domain
('Office', 'Austin', 'TX', 'Domain', 0.165, 48.00, 0.058, 'Q2 2025', true, 'seeded'),
('Office', 'Austin', 'TX', 'Domain', 0.155, 49.00, 0.056, 'Q3 2025', true, 'seeded'),
('Office', 'Austin', 'TX', 'Domain', 0.148, 50.00, 0.055, 'Q4 2025', true, 'seeded'),
-- Office — Miami Brickell
('Office', 'Miami', 'FL', 'Brickell', 0.095, 62.00, 0.052, 'Q2 2025', true, 'seeded'),
('Office', 'Miami', 'FL', 'Brickell', 0.088, 64.00, 0.050, 'Q3 2025', true, 'seeded'),
('Office', 'Miami', 'FL', 'Brickell', 0.082, 65.50, 0.050, 'Q4 2025', true, 'seeded'),

-- Industrial — Inland Empire LA
('Industrial', 'Los Angeles', 'CA', 'Inland Empire', 0.042, 14.50, 0.050, 'Q2 2025', true, 'seeded'),
('Industrial', 'Los Angeles', 'CA', 'Inland Empire', 0.045, 14.25, 0.049, 'Q3 2025', true, 'seeded'),
('Industrial', 'Los Angeles', 'CA', 'Inland Empire', 0.048, 14.00, 0.048, 'Q4 2025', true, 'seeded'),
-- Industrial — Dallas Alliance
('Industrial', 'Dallas', 'TX', 'Alliance', 0.065, 8.50, 0.055, 'Q2 2025', true, 'seeded'),
('Industrial', 'Dallas', 'TX', 'Alliance', 0.060, 8.75, 0.053, 'Q3 2025', true, 'seeded'),
('Industrial', 'Dallas', 'TX', 'Alliance', 0.058, 9.00, 0.052, 'Q4 2025', true, 'seeded'),
-- Industrial — Chicago Fulton Market
('Industrial', 'Chicago', 'IL', 'West Loop', 0.055, 10.50, 0.058, 'Q2 2025', true, 'seeded'),
('Industrial', 'Chicago', 'IL', 'West Loop', 0.052, 10.75, 0.056, 'Q3 2025', true, 'seeded'),
('Industrial', 'Chicago', 'IL', 'West Loop', 0.050, 11.00, 0.055, 'Q4 2025', true, 'seeded'),
-- Industrial — Atlanta
('Industrial', 'Atlanta', 'GA', 'North Perimeter', 0.058, 7.50, 0.058, 'Q2 2025', true, 'seeded'),
('Industrial', 'Atlanta', 'GA', 'North Perimeter', 0.055, 7.75, 0.056, 'Q3 2025', true, 'seeded'),
('Industrial', 'Atlanta', 'GA', 'North Perimeter', 0.052, 8.00, 0.055, 'Q4 2025', true, 'seeded'),
-- Industrial — Phoenix
('Industrial', 'Phoenix', 'AZ', 'Sky Harbor', 0.072, 9.00, 0.058, 'Q2 2025', true, 'seeded'),
('Industrial', 'Phoenix', 'AZ', 'Sky Harbor', 0.068, 9.25, 0.056, 'Q3 2025', true, 'seeded'),
('Industrial', 'Phoenix', 'AZ', 'Sky Harbor', 0.065, 9.50, 0.055, 'Q4 2025', true, 'seeded'),

-- Multifamily — NYC Brooklyn
('Multifamily', 'New York', 'NY', 'Brooklyn', 0.032, 3200, 0.042, 'Q2 2025', true, 'seeded'),
('Multifamily', 'New York', 'NY', 'Brooklyn', 0.030, 3250, 0.040, 'Q3 2025', true, 'seeded'),
('Multifamily', 'New York', 'NY', 'Brooklyn', 0.028, 3300, 0.038, 'Q4 2025', true, 'seeded'),
-- Multifamily — Denver LoHi
('Multifamily', 'Denver', 'CO', 'LoHi', 0.050, 2100, 0.048, 'Q2 2025', true, 'seeded'),
('Multifamily', 'Denver', 'CO', 'LoHi', 0.048, 2150, 0.046, 'Q3 2025', true, 'seeded'),
('Multifamily', 'Denver', 'CO', 'LoHi', 0.045, 2200, 0.045, 'Q4 2025', true, 'seeded'),
-- Multifamily — Atlanta Buckhead
('Multifamily', 'Atlanta', 'GA', 'Buckhead', 0.055, 2000, 0.048, 'Q2 2025', true, 'seeded'),
('Multifamily', 'Atlanta', 'GA', 'Buckhead', 0.052, 2050, 0.046, 'Q3 2025', true, 'seeded'),
('Multifamily', 'Atlanta', 'GA', 'Buckhead', 0.048, 2100, 0.045, 'Q4 2025', true, 'seeded'),
-- Multifamily — Dallas Uptown
('Multifamily', 'Dallas', 'TX', 'Uptown', 0.062, 1850, 0.050, 'Q2 2025', true, 'seeded'),
('Multifamily', 'Dallas', 'TX', 'Uptown', 0.058, 1900, 0.049, 'Q3 2025', true, 'seeded'),
('Multifamily', 'Dallas', 'TX', 'Uptown', 0.055, 1950, 0.048, 'Q4 2025', true, 'seeded'),
-- Multifamily — Seattle Capitol Hill
('Multifamily', 'Seattle', 'WA', 'Capitol Hill', 0.045, 2400, 0.044, 'Q2 2025', true, 'seeded'),
('Multifamily', 'Seattle', 'WA', 'Capitol Hill', 0.042, 2450, 0.043, 'Q3 2025', true, 'seeded'),
('Multifamily', 'Seattle', 'WA', 'Capitol Hill', 0.040, 2500, 0.042, 'Q4 2025', true, 'seeded'),

-- Retail — Chicago Loop
('Retail', 'Chicago', 'IL', 'Loop', 0.088, 38.00, 0.062, 'Q2 2025', true, 'seeded'),
('Retail', 'Chicago', 'IL', 'Loop', 0.082, 39.00, 0.060, 'Q3 2025', true, 'seeded'),
('Retail', 'Chicago', 'IL', 'Loop', 0.078, 40.00, 0.058, 'Q4 2025', true, 'seeded'),
-- Retail — Miami Wynwood
('Retail', 'Miami', 'FL', 'Wynwood', 0.055, 52.00, 0.050, 'Q2 2025', true, 'seeded'),
('Retail', 'Miami', 'FL', 'Wynwood', 0.050, 54.00, 0.049, 'Q3 2025', true, 'seeded'),
('Retail', 'Miami', 'FL', 'Wynwood', 0.048, 55.00, 0.048, 'Q4 2025', true, 'seeded'),
-- Retail — NYC SoHo
('Retail', 'New York', 'NY', 'SoHo', 0.072, 120.00, 0.045, 'Q2 2025', true, 'seeded'),
('Retail', 'New York', 'NY', 'SoHo', 0.068, 125.00, 0.043, 'Q3 2025', true, 'seeded'),
('Retail', 'New York', 'NY', 'SoHo', 0.065, 128.00, 0.042, 'Q4 2025', true, 'seeded');


-- ============================================================
-- 3. FUNDS (40 rows across PE, VC, Growth, Distressed, RE)
-- ============================================================
INSERT INTO funds (name, gp_name, strategy, vintage_year, fund_size, net_irr, tvpi, dpi, quartile, is_synthetic, source_type) VALUES
-- Buyout (older vintages have higher DPI)
('Meridian Capital Fund VI', 'Meridian Capital Partners', 'Buyout', 2018, 2800000000, 22.5, 2.15, 1.45, 1, true, 'seeded'),
('Meridian Capital Fund VII', 'Meridian Capital Partners', 'Buyout', 2021, 3500000000, 18.2, 1.78, 0.55, 1, true, 'seeded'),
('Carlyle Digital Partners II', 'Carlyle Digital', 'Buyout', 2019, 4200000000, 19.8, 1.92, 1.10, 1, true, 'seeded'),
('Carlyle Digital Partners III', 'Carlyle Digital', 'Buyout', 2022, 5500000000, 15.5, 1.52, 0.20, 2, true, 'seeded'),
('KKR Americas Fund XIII', 'KKR Growth', 'Buyout', 2020, 6800000000, 20.1, 1.88, 0.85, 1, true, 'seeded'),
('Francisco Partners VII', 'Francisco Partners Tech', 'Buyout', 2021, 4000000000, 17.5, 1.68, 0.42, 1, true, 'seeded'),
('Hellman Friedman Capital X', 'Hellman Friedman Growth', 'Buyout', 2020, 5200000000, 16.8, 1.72, 0.65, 2, true, 'seeded'),
('EQT IX', 'EQT Partners', 'Buyout', 2019, 3800000000, 21.2, 2.05, 1.20, 1, true, 'seeded'),
('EQT X', 'EQT Partners', 'Buyout', 2022, 4500000000, 14.8, 1.45, 0.15, 2, true, 'seeded'),
('Apax Digital Fund II', 'Apax Partners', 'Buyout', 2021, 3200000000, 16.2, 1.62, 0.38, 2, true, 'seeded'),
('Bain Capital Tech Opp III', 'Bain Capital Tech', 'Buyout', 2022, 4800000000, 13.5, 1.35, 0.12, 2, true, 'seeded'),
('Clearlake Capital Partners VIII', 'Clearlake Capital', 'Buyout', 2023, 3500000000, 12.0, 1.22, 0.05, 3, true, 'seeded'),

-- Growth Equity
('General Atlantic Next Fund', 'General Atlantic Next', 'Growth Equity', 2020, 3200000000, 24.5, 2.22, 0.75, 1, true, 'seeded'),
('Insight Partners XII', 'Insight Venture Partners', 'Growth Equity', 2021, 4500000000, 18.8, 1.72, 0.35, 1, true, 'seeded'),
('Warburg Pincus Global Growth 14', 'Warburg Pincus Tech', 'Growth Equity', 2019, 4100000000, 20.5, 1.95, 0.90, 1, true, 'seeded'),
('Summit Partners Growth Equity XII', 'Summit Partners Growth', 'Growth Equity', 2022, 2800000000, 15.2, 1.48, 0.18, 2, true, 'seeded'),
('TA Associates XIV', 'TA Associates Tech', 'Growth Equity', 2021, 3500000000, 17.8, 1.68, 0.40, 1, true, 'seeded'),
('Atlas Growth Equity Fund III', 'Atlas Growth Equity', 'Growth Equity', 2022, 1200000000, 14.5, 1.38, 0.12, 2, true, 'seeded'),

-- Venture Capital
('Lightspeed Growth Fund IV', 'Lightspeed Growth', 'Venture Capital', 2020, 1800000000, 32.5, 2.85, 0.45, 1, true, 'seeded'),
('Founders Fund VII', 'Founders Fund Next', 'Venture Capital', 2021, 1500000000, 28.0, 2.42, 0.25, 1, true, 'seeded'),
('Nordic Ventures Fund IV', 'Nordic Ventures', 'Venture Capital', 2020, 600000000, 22.0, 2.10, 0.55, 1, true, 'seeded'),
('Berlin Ventures Fund III', 'Berlin Ventures', 'Venture Capital', 2021, 450000000, 15.5, 1.55, 0.15, 2, true, 'seeded'),
('Tokyo Growth Partners Fund II', 'Tokyo Growth Partners', 'Venture Capital', 2022, 800000000, 12.0, 1.28, 0.08, 2, true, 'seeded'),
('Coatue Growth Fund III', 'Coatue Ventures', 'Venture Capital', 2021, 2500000000, 8.5, 1.15, 0.10, 3, true, 'seeded'),
('Tiger Global Private Investment XV', 'Tiger Global Growth', 'Venture Capital', 2021, 3800000000, 5.0, 0.95, 0.08, 4, true, 'seeded'),

-- Distressed / Special Situations
('Cerberus Institutional Partners VII', 'Cerberus Capital', 'Distressed', 2020, 2500000000, 18.5, 1.82, 1.15, 1, true, 'seeded'),
('Ares Special Opportunities Fund IV', 'Ares Management', 'Distressed', 2021, 3200000000, 16.2, 1.62, 0.55, 1, true, 'seeded'),
('Oaktree Opportunities Fund XII', 'Oaktree Capital', 'Distressed', 2022, 4000000000, 14.5, 1.42, 0.22, 2, true, 'seeded'),
('Riverstone Energy Partners VII', 'Riverstone Holdings', 'Distressed', 2020, 2800000000, 15.8, 1.68, 0.80, 2, true, 'seeded'),

-- Real Estate
('Blackstone RE Partners X', 'Blackstone Real Estate', 'Real Estate', 2019, 8000000000, 16.5, 1.72, 0.90, 1, true, 'seeded'),
('Brookfield RE Fund V', 'Brookfield Asset Mgmt PE', 'Real Estate', 2020, 5500000000, 14.8, 1.58, 0.65, 1, true, 'seeded'),
('Starwood Opportunity Fund XIII', 'Starwood Capital', 'Real Estate', 2021, 4200000000, 12.5, 1.42, 0.30, 2, true, 'seeded'),
('Hines US Property Fund', 'Hines Capital', 'Real Estate', 2022, 3000000000, 10.2, 1.28, 0.12, 2, true, 'seeded'),

-- Infrastructure / Private Credit
('Brookfield Infrastructure Fund V', 'Brookfield Infrastructure', 'Infrastructure', 2020, 7000000000, 13.5, 1.55, 0.60, 1, true, 'seeded'),
('Global Infrastructure Partners V', 'GIP', 'Infrastructure', 2021, 5500000000, 12.8, 1.48, 0.35, 1, true, 'seeded'),
('Ares Capital Corp Senior Fund III', 'Ares Management', 'Private Credit', 2021, 4000000000, 11.5, 1.38, 0.55, 1, true, 'seeded'),
('Blue Owl BDC Fund II', 'Blue Owl Capital', 'Private Credit', 2022, 3500000000, 10.8, 1.28, 0.30, 2, true, 'seeded'),
-- Impact
('Breakthrough Energy Ventures II', 'Breakthrough Energy', 'Impact', 2021, 2000000000, 18.0, 1.65, 0.12, 1, true, 'seeded'),
('Rise Fund III', 'The Rise Fund', 'Impact', 2022, 2500000000, 12.5, 1.30, 0.08, 2, true, 'seeded');


-- ============================================================
-- 4. LP ENTITIES (25 rows)
-- ============================================================
INSERT INTO lp_entities (name, type, aum, strategies, hq_city, hq_country) VALUES
-- Pension Funds
('California Public Employees Retirement System', 'Pension Fund', 500000000000, ARRAY['Buyout', 'Growth Equity', 'Real Estate', 'Infrastructure'], 'Sacramento', 'US'),
('New York State Common Retirement Fund', 'Pension Fund', 280000000000, ARRAY['Buyout', 'Venture Capital', 'Real Estate'], 'Albany', 'US'),
('Canada Pension Plan Investment Board', 'Pension Fund', 575000000000, ARRAY['Buyout', 'Growth Equity', 'Infrastructure', 'Private Credit'], 'Toronto', 'CA'),
('Ontario Teachers Pension Plan', 'Pension Fund', 250000000000, ARRAY['Buyout', 'Infrastructure', 'Real Estate'], 'Toronto', 'CA'),
('ABP (Netherlands)', 'Pension Fund', 550000000000, ARRAY['Buyout', 'Infrastructure', 'Real Estate', 'Private Credit'], 'Heerlen', 'NL'),

-- Sovereign Wealth Funds
('GIC Private Limited', 'Sovereign Wealth', 770000000000, ARRAY['Buyout', 'Growth Equity', 'Real Estate', 'Infrastructure'], 'Singapore', 'SG'),
('Abu Dhabi Investment Authority', 'Sovereign Wealth', 990000000000, ARRAY['Buyout', 'Real Estate', 'Infrastructure', 'Private Credit'], 'Abu Dhabi', 'AE'),
('Public Investment Fund (Saudi Arabia)', 'Sovereign Wealth', 930000000000, ARRAY['Growth Equity', 'Infrastructure', 'Real Estate', 'Venture Capital'], 'Riyadh', 'SA'),
('Norwegian Government Pension Fund', 'Sovereign Wealth', 1600000000000, ARRAY['Real Estate', 'Infrastructure'], 'Oslo', 'NO'),
('Korea Investment Corporation', 'Sovereign Wealth', 200000000000, ARRAY['Buyout', 'Growth Equity', 'Real Estate'], 'Seoul', 'KR'),

-- Endowments
('Harvard Management Company', 'Endowment', 50000000000, ARRAY['Buyout', 'Venture Capital', 'Growth Equity', 'Real Estate'], 'Boston', 'US'),
('Yale Investments Office', 'Endowment', 41000000000, ARRAY['Buyout', 'Venture Capital', 'Real Estate', 'Distressed'], 'New Haven', 'US'),
('Stanford Management Company', 'Endowment', 37000000000, ARRAY['Venture Capital', 'Buyout', 'Growth Equity'], 'Stanford', 'US'),
('MIT Investment Management Company', 'Endowment', 27000000000, ARRAY['Venture Capital', 'Buyout', 'Real Estate'], 'Cambridge', 'US'),

-- Family Offices
('Cascade Investment (Bill Gates)', 'Family Office', 85000000000, ARRAY['Buyout', 'Real Estate', 'Infrastructure', 'Impact'], 'Kirkland', 'US'),
('Bezos Expeditions', 'Family Office', 45000000000, ARRAY['Venture Capital', 'Growth Equity', 'Real Estate'], 'Seattle', 'US'),
('Emerson Collective', 'Family Office', 30000000000, ARRAY['Venture Capital', 'Impact', 'Growth Equity'], 'Palo Alto', 'US'),
('Mousse Partners (Arnault Family)', 'Family Office', 25000000000, ARRAY['Buyout', 'Growth Equity', 'Real Estate'], 'Paris', 'FR'),

-- Insurance Companies
('MetLife Investment Management', 'Insurance', 600000000000, ARRAY['Private Credit', 'Real Estate', 'Infrastructure'], 'New York', 'US'),
('Prudential Private Capital', 'Insurance', 450000000000, ARRAY['Private Credit', 'Infrastructure', 'Real Estate'], 'Newark', 'US'),
('Allianz Capital Partners', 'Insurance', 380000000000, ARRAY['Buyout', 'Infrastructure', 'Private Credit'], 'Munich', 'DE'),

-- Foundations
('Ford Foundation', 'Foundation', 16000000000, ARRAY['Impact', 'Venture Capital', 'Growth Equity'], 'New York', 'US'),
('Wellcome Trust', 'Foundation', 40000000000, ARRAY['Buyout', 'Venture Capital', 'Real Estate'], 'London', 'GB'),

-- Fund-of-Funds
('HarbourVest Partners', 'Fund of Funds', 120000000000, ARRAY['Buyout', 'Venture Capital', 'Growth Equity', 'Distressed'], 'Boston', 'US'),
('Adams Street Partners', 'Fund of Funds', 55000000000, ARRAY['Buyout', 'Venture Capital', 'Growth Equity', 'Private Credit'], 'Chicago', 'US');


-- ============================================================
-- 5. FUND COMMITMENTS (60 rows linking LPs to funds)
-- ============================================================
INSERT INTO fund_commitments (fund_id, lp_id, amount, commitment_date) VALUES
-- CalPERS commits to large buyout and RE funds
((SELECT id FROM funds WHERE name = 'KKR Americas Fund XIII' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'California Public Employees Retirement System' LIMIT 1), 500000000, '2020-06-15'),
((SELECT id FROM funds WHERE name = 'Blackstone RE Partners X' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'California Public Employees Retirement System' LIMIT 1), 400000000, '2019-09-01'),
((SELECT id FROM funds WHERE name = 'Brookfield Infrastructure Fund V' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'California Public Employees Retirement System' LIMIT 1), 350000000, '2020-03-15'),
((SELECT id FROM funds WHERE name = 'Ares Capital Corp Senior Fund III' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'California Public Employees Retirement System' LIMIT 1), 250000000, '2021-06-01'),

-- CPPIB
((SELECT id FROM funds WHERE name = 'EQT IX' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Canada Pension Plan Investment Board' LIMIT 1), 400000000, '2019-05-15'),
((SELECT id FROM funds WHERE name = 'General Atlantic Next Fund' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Canada Pension Plan Investment Board' LIMIT 1), 300000000, '2020-08-01'),
((SELECT id FROM funds WHERE name = 'Global Infrastructure Partners V' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Canada Pension Plan Investment Board' LIMIT 1), 500000000, '2021-04-01'),
((SELECT id FROM funds WHERE name = 'Carlyle Digital Partners III' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Canada Pension Plan Investment Board' LIMIT 1), 350000000, '2022-09-01'),

-- GIC
((SELECT id FROM funds WHERE name = 'Meridian Capital Fund VII' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'GIC Private Limited' LIMIT 1), 300000000, '2021-03-15'),
((SELECT id FROM funds WHERE name = 'Blackstone RE Partners X' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'GIC Private Limited' LIMIT 1), 600000000, '2019-09-01'),
((SELECT id FROM funds WHERE name = 'Warburg Pincus Global Growth 14' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'GIC Private Limited' LIMIT 1), 400000000, '2019-07-01'),
((SELECT id FROM funds WHERE name = 'Brookfield RE Fund V' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'GIC Private Limited' LIMIT 1), 450000000, '2020-06-01'),

-- ADIA
((SELECT id FROM funds WHERE name = 'KKR Americas Fund XIII' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Abu Dhabi Investment Authority' LIMIT 1), 600000000, '2020-06-15'),
((SELECT id FROM funds WHERE name = 'Brookfield Infrastructure Fund V' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Abu Dhabi Investment Authority' LIMIT 1), 500000000, '2020-03-15'),
((SELECT id FROM funds WHERE name = 'Starwood Opportunity Fund XIII' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Abu Dhabi Investment Authority' LIMIT 1), 350000000, '2021-08-01'),

-- Harvard Endowment
((SELECT id FROM funds WHERE name = 'Lightspeed Growth Fund IV' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Harvard Management Company' LIMIT 1), 150000000, '2020-04-01'),
((SELECT id FROM funds WHERE name = 'Meridian Capital Fund VI' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Harvard Management Company' LIMIT 1), 200000000, '2018-06-01'),
((SELECT id FROM funds WHERE name = 'Cerberus Institutional Partners VII' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Harvard Management Company' LIMIT 1), 100000000, '2020-09-01'),
((SELECT id FROM funds WHERE name = 'Founders Fund VII' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Harvard Management Company' LIMIT 1), 80000000, '2021-05-01'),

-- Yale Endowment
((SELECT id FROM funds WHERE name = 'Francisco Partners VII' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Yale Investments Office' LIMIT 1), 150000000, '2021-03-01'),
((SELECT id FROM funds WHERE name = 'Oaktree Opportunities Fund XII' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Yale Investments Office' LIMIT 1), 200000000, '2022-06-01'),
((SELECT id FROM funds WHERE name = 'Founders Fund VII' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Yale Investments Office' LIMIT 1), 100000000, '2021-05-01'),
((SELECT id FROM funds WHERE name = 'Brookfield RE Fund V' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Yale Investments Office' LIMIT 1), 175000000, '2020-06-01'),

-- PIF (Saudi)
((SELECT id FROM funds WHERE name = 'Insight Partners XII' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Public Investment Fund (Saudi Arabia)' LIMIT 1), 500000000, '2021-09-01'),
((SELECT id FROM funds WHERE name = 'Brookfield Infrastructure Fund V' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Public Investment Fund (Saudi Arabia)' LIMIT 1), 700000000, '2020-03-15'),
((SELECT id FROM funds WHERE name = 'Breakthrough Energy Ventures II' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Public Investment Fund (Saudi Arabia)' LIMIT 1), 300000000, '2021-10-01'),

-- Ontario Teachers
((SELECT id FROM funds WHERE name = 'EQT X' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Ontario Teachers Pension Plan' LIMIT 1), 350000000, '2022-04-01'),
((SELECT id FROM funds WHERE name = 'Hellman Friedman Capital X' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Ontario Teachers Pension Plan' LIMIT 1), 300000000, '2020-08-01'),
((SELECT id FROM funds WHERE name = 'Blackstone RE Partners X' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Ontario Teachers Pension Plan' LIMIT 1), 400000000, '2019-09-01'),

-- Cascade Investment (Gates)
((SELECT id FROM funds WHERE name = 'Breakthrough Energy Ventures II' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Cascade Investment (Bill Gates)' LIMIT 1), 500000000, '2021-10-01'),
((SELECT id FROM funds WHERE name = 'Brookfield RE Fund V' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Cascade Investment (Bill Gates)' LIMIT 1), 200000000, '2020-06-01'),
((SELECT id FROM funds WHERE name = 'Rise Fund III' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Cascade Investment (Bill Gates)' LIMIT 1), 150000000, '2022-03-01'),

-- MetLife
((SELECT id FROM funds WHERE name = 'Ares Capital Corp Senior Fund III' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'MetLife Investment Management' LIMIT 1), 350000000, '2021-06-01'),
((SELECT id FROM funds WHERE name = 'Blue Owl BDC Fund II' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'MetLife Investment Management' LIMIT 1), 250000000, '2022-08-01'),
((SELECT id FROM funds WHERE name = 'Brookfield Infrastructure Fund V' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'MetLife Investment Management' LIMIT 1), 300000000, '2020-03-15'),

-- Allianz
((SELECT id FROM funds WHERE name = 'EQT IX' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Allianz Capital Partners' LIMIT 1), 300000000, '2019-05-15'),
((SELECT id FROM funds WHERE name = 'Global Infrastructure Partners V' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Allianz Capital Partners' LIMIT 1), 400000000, '2021-04-01'),
((SELECT id FROM funds WHERE name = 'Ares Capital Corp Senior Fund III' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Allianz Capital Partners' LIMIT 1), 200000000, '2021-06-01'),

-- HarbourVest (Fund of Funds)
((SELECT id FROM funds WHERE name = 'Nordic Ventures Fund IV' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'HarbourVest Partners' LIMIT 1), 100000000, '2020-07-01'),
((SELECT id FROM funds WHERE name = 'Berlin Ventures Fund III' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'HarbourVest Partners' LIMIT 1), 75000000, '2021-05-01'),
((SELECT id FROM funds WHERE name = 'Apax Digital Fund II' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'HarbourVest Partners' LIMIT 1), 200000000, '2021-09-01'),
((SELECT id FROM funds WHERE name = 'Tokyo Growth Partners Fund II' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'HarbourVest Partners' LIMIT 1), 80000000, '2022-04-01'),
((SELECT id FROM funds WHERE name = 'Carlyle Digital Partners II' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'HarbourVest Partners' LIMIT 1), 250000000, '2019-06-01'),

-- Adams Street
((SELECT id FROM funds WHERE name = 'Lightspeed Growth Fund IV' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Adams Street Partners' LIMIT 1), 100000000, '2020-04-01'),
((SELECT id FROM funds WHERE name = 'TA Associates XIV' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Adams Street Partners' LIMIT 1), 150000000, '2021-07-01'),
((SELECT id FROM funds WHERE name = 'Clearlake Capital Partners VIII' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Adams Street Partners' LIMIT 1), 125000000, '2023-02-01'),
((SELECT id FROM funds WHERE name = 'Atlas Growth Equity Fund III' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Adams Street Partners' LIMIT 1), 100000000, '2022-06-01'),
((SELECT id FROM funds WHERE name = 'Blue Owl BDC Fund II' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Adams Street Partners' LIMIT 1), 150000000, '2022-08-01'),

-- Wellcome Trust
((SELECT id FROM funds WHERE name = 'Founders Fund VII' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Wellcome Trust' LIMIT 1), 120000000, '2021-05-01'),
((SELECT id FROM funds WHERE name = 'KKR Americas Fund XIII' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Wellcome Trust' LIMIT 1), 250000000, '2020-06-15'),
((SELECT id FROM funds WHERE name = 'Hines US Property Fund' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'Wellcome Trust' LIMIT 1), 200000000, '2022-09-01'),

-- ABP Netherlands
((SELECT id FROM funds WHERE name = 'Partners Group' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'ABP (Netherlands)' LIMIT 1), 400000000, '2020-05-01'),
((SELECT id FROM funds WHERE name = 'EQT IX' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'ABP (Netherlands)' LIMIT 1), 350000000, '2019-05-15'),
((SELECT id FROM funds WHERE name = 'Brookfield Infrastructure Fund V' LIMIT 1), (SELECT id FROM lp_entities WHERE name = 'ABP (Netherlands)' LIMIT 1), 450000000, '2020-03-15');
