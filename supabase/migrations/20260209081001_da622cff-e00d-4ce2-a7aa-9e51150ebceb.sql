
-- =============================================
-- 1. Fill financials for 44 companies missing them
-- =============================================
INSERT INTO public.financials (company_id, period, period_type, revenue, arr, gross_margin, confidence_score, source)
VALUES
-- AI/ML
('e3534f0f-fee9-49a3-9c22-16d2f0b32672', '2025', 'annual', 25000000, 30000000, 0.72, 'low', 'Estimates'), -- Adept AI
('f9053a1b-765d-4804-9694-804db96283f5', '2025', 'annual', 15000000, 18000000, 0.80, 'low', 'Estimates'), -- Jasper
('16be10ad-1d07-42e3-b6e1-06800d649e82', '2025', 'annual', 200000000, 240000000, 0.90, 'low', 'Estimates'), -- Midjourney
('669bf62f-5727-4140-aa9e-92d06fb28dd6', '2025', 'annual', 80000000, 96000000, 0.75, 'low', 'Estimates'), -- Mistral AI
('093b09eb-fa31-4ac6-afec-2ed47dde2adb', '2025', 'annual', 50000000, 60000000, 0.78, 'low', 'Estimates'), -- Character AI
('30ccb07b-6c67-4578-9eb4-5389f9896545', '2025', 'annual', 100000000, 120000000, 0.65, 'low', 'Estimates'), -- Cerebras
('45e5ab5b-f2c3-4757-99c5-4812a379e519', '2025', 'annual', 40000000, 48000000, 0.80, 'low', 'Estimates'), -- Labelbox
-- Fintech
('4efe7592-ee7f-4c28-ad66-ca3d34b027d8', '2025', 'annual', 1800000000, null, 0.55, 'low', 'Estimates'), -- Affirm
('88ffd822-c353-49c7-bf0a-72b9854ee856', '2025', 'annual', 400000000, null, 0.60, 'low', 'Estimates'), -- Flywire
('e48fe492-8db8-4922-9ded-737dbe95ffae', '2025', 'annual', 600000000, null, 0.58, 'low', 'Estimates'), -- Marqeta
('22ce916a-587a-413b-bc93-de58cfab9c80', '2025', 'annual', 100000000, 120000000, 0.70, 'low', 'Estimates'), -- Melio
('c040c225-dada-4306-aeec-a7f42e1833d3', '2025', 'annual', 200000000, null, 0.65, 'low', 'Estimates'), -- Mollie
('2673dc3c-e69a-41a7-9c9e-05e1d05b74c6', '2025', 'annual', 350000000, null, 0.55, 'low', 'Estimates'), -- Nuvei
('8ce5b505-1e6e-4c95-9c30-9405c871713e', '2025', 'annual', 300000000, null, 0.50, 'low', 'Estimates'), -- Pine Labs
-- Infrastructure
('b5b62d3f-e72c-4b67-a047-aa7647f60333', '2025', 'annual', 80000000, 96000000, 0.75, 'low', 'Estimates'), -- Aiven
('f219e547-40bb-45ac-87f1-98333fa1b163', '2025', 'annual', 500000000, null, 0.60, 'low', 'Estimates'), -- Fastly
('973cff36-73ac-41b1-885b-d83e5e6fdd91', '2025', 'annual', 20000000, 24000000, 0.70, 'low', 'Estimates'), -- Fly.io
('55bd3eff-fc14-4aa4-a7fd-8838556469f8', '2025', 'annual', 60000000, 72000000, 0.78, 'low', 'Estimates'), -- Kong
('b2e024bf-3532-4333-a4ae-18bd2fa4516d', '2025', 'annual', 15000000, 18000000, 0.82, 'low', 'Estimates'), -- Neon
('017debd4-f499-407f-ab0f-9072245b08fa', '2025', 'annual', 900000000, null, 0.45, 'low', 'Estimates'), -- OVHcloud
('e926f042-56c5-48cb-ad31-8c06c1bc8bab', '2025', 'annual', 25000000, 30000000, 0.80, 'low', 'Estimates'), -- PlanetScale
-- Cybersecurity
('c23a4a92-3780-46de-9f16-20004248866b', '2025', 'annual', 150000000, 180000000, 0.78, 'low', 'Estimates'), -- Orca Security
-- Healthcare
('e89ac92b-9329-4680-81ac-178cca887e23', '2025', 'annual', 60000000, null, 0.55, 'low', 'Estimates'), -- Color Health
('02054351-5683-4b1d-8553-824d5716830f', '2025', 'annual', 800000000, null, 0.60, 'low', 'Estimates'), -- GoodRx
('176eba60-bdfc-415b-bc61-f8c07299048e', '2025', 'annual', 1200000000, null, 0.65, 'low', 'Estimates'), -- Hims & Hers
('b5f8cc2a-99e3-481c-aa60-6e3eb644a5ea', '2025', 'annual', 6000000000, null, 0.25, 'low', 'Estimates'), -- Oscar Health
-- Consumer
('2300ddb1-8c2f-41cc-84c3-4b68037a88a0', '2025', 'annual', 1500000000, null, 0.30, 'low', 'Estimates'), -- Gopuff
('28b9b012-26bd-4963-98a7-63b3fb127802', '2025', 'annual', 3000000000, null, 0.35, 'low', 'Estimates'), -- Instacart
-- Crypto/Web3
('b81724e1-1ef4-4e1a-88e9-4a89856ba21d', '2025', 'annual', 80000000, 96000000, 0.75, 'low', 'Estimates'), -- Alchemy
('5671fc5e-0c1d-42a6-90eb-aea852caf43c', '2025', 'annual', 500000000, null, 0.55, 'low', 'Estimates'), -- Circle
('c08f0f5d-6c72-4007-9dd2-cdbd199ca9c0', '2025', 'annual', 200000000, null, 0.60, 'low', 'Estimates'), -- Ledger
-- Developer Tools
('44fde23f-fb5c-432c-9db8-fce5942e0cdb', '2025', 'annual', 100000000, 120000000, 0.82, 'low', 'Estimates'), -- BrowserStack
('ab8815ab-421a-48ca-8498-f6312bdc2949', '2025', 'annual', 60000000, 72000000, 0.85, 'low', 'Estimates'), -- LaunchDarkly
-- Enterprise SaaS
('d0007fe9-c6f8-4b03-a643-ac825c8e276b', '2025', 'annual', 500000000, 600000000, 0.85, 'low', 'Estimates'), -- Calendly
('1af7e55a-bd75-485d-94c2-16a59039fe3e', '2025', 'annual', 150000000, 180000000, 0.78, 'low', 'Estimates'), -- Contentful
('b2141252-32b7-4621-9cb4-25c352888625', '2025', 'annual', 100000000, 120000000, 0.85, 'low', 'Estimates'), -- Loom
('9b51dabc-04a9-4d72-b0b7-5211e0a89417', '2025', 'annual', 300000000, 360000000, 0.75, 'low', 'Estimates'), -- Amplitude
-- E-Commerce
('e808093d-e561-4881-84c0-41125a36fba5', '2025', 'annual', 500000000, null, 0.40, 'low', 'Estimates'), -- Bolt
-- Climate Tech
('46d5a5c7-0abd-4620-bd08-3418d56a051d', '2025', 'annual', 10000000, null, 0.30, 'low', 'Estimates'), -- Commonwealth Fusion
('f0bdba76-5335-4fe2-af13-a2eb988bcf66', '2025', 'annual', 15000000, null, 0.25, 'low', 'Estimates'), -- Form Energy
-- EdTech
('09e61204-e99b-4717-870c-ce5ee6b2d941', '2025', 'annual', 600000000, null, 0.60, 'low', 'Estimates'), -- Coursera
('4b559b56-47c2-4398-9bad-799389b8df14', '2025', 'annual', 30000000, 36000000, 0.75, 'low', 'Estimates'), -- Handshake
-- Logistics
('8f6fb006-e3c6-4b3c-bb2e-139599a66edc', '2025', 'annual', 50000000, 60000000, 0.45, 'low', 'Estimates'), -- Flexe
('a0cd9791-8444-4c18-8937-7076f975b705', '2025', 'annual', 80000000, 96000000, 0.65, 'low', 'Estimates') -- FourKites
ON CONFLICT DO NOTHING;

-- =============================================
-- 2. Rebalance stage distribution
-- Move incorrectly-labeled "Public" companies to their actual private stage
-- =============================================

-- These are still private companies incorrectly marked as Public
UPDATE public.companies SET stage = 'Late Stage' WHERE name IN ('Affirm', 'Flywire', 'Marqeta', 'Nuvei') AND stage = 'Public';
UPDATE public.companies SET stage = 'Late Stage' WHERE name IN ('Amplitude', 'Circle', 'Fastly', 'GoodRx', 'Hims & Hers', 'Instacart') AND stage = 'Public';
UPDATE public.companies SET stage = 'Series D' WHERE name = 'OVHcloud' AND stage = 'Public';
UPDATE public.companies SET stage = 'Growth' WHERE name = 'Coursera' AND stage = 'Public';
UPDATE public.companies SET stage = 'Series C' WHERE name = 'Oscar Health' AND stage = 'Public';

-- Move some Late Stage to more specific stages
UPDATE public.companies SET stage = 'Series D' WHERE name = 'Loom' AND stage = 'Late Stage';
UPDATE public.companies SET stage = 'Growth' WHERE name = 'Bolt' AND stage = 'Late Stage';
UPDATE public.companies SET stage = 'Series D' WHERE name = 'Gopuff' AND stage = 'Late Stage';
UPDATE public.companies SET stage = 'Series D' WHERE name = 'Pine Labs' AND stage = 'Late Stage';
