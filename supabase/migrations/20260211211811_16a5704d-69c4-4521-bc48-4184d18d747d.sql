
-- Create distressed_assets table
CREATE TABLE public.distressed_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_type TEXT NOT NULL DEFAULT 'business',
  name TEXT NOT NULL,
  description TEXT,
  sector TEXT,
  location_city TEXT,
  location_state TEXT,
  asking_price NUMERIC,
  estimated_value NUMERIC,
  discount_pct NUMERIC,
  distress_type TEXT NOT NULL DEFAULT 'voluntary_sale',
  status TEXT NOT NULL DEFAULT 'active',
  listed_date DATE DEFAULT CURRENT_DATE,
  source TEXT,
  contact_info TEXT,
  key_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.distressed_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Distressed assets are publicly readable"
ON public.distressed_assets FOR SELECT USING (true);

-- Create private_listings table
CREATE TABLE public.private_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_type TEXT NOT NULL DEFAULT 'off_market',
  property_type TEXT NOT NULL,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  asking_price NUMERIC,
  estimated_cap_rate NUMERIC,
  noi NUMERIC,
  size_sf INTEGER,
  units INTEGER,
  year_built INTEGER,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  source_network TEXT,
  listed_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.private_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Private listings are publicly readable"
ON public.private_listings FOR SELECT USING (true);
