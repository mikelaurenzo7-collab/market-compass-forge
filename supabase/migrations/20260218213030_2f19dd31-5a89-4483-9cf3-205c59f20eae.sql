-- Storage bucket for property inspection photos
INSERT INTO storage.buckets (id, name, public) VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for property-photos bucket
CREATE POLICY "Authenticated users can upload property photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'property-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view property photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-photos');

CREATE POLICY "Users can delete their own property photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'property-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Deal room mode tracking (enterprise vs asset)
ALTER TABLE public.deal_pipeline ADD COLUMN IF NOT EXISTS deal_mode TEXT NOT NULL DEFAULT 'enterprise';

-- Property inspection photos table
CREATE TABLE IF NOT EXISTS public.property_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deal_pipeline(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  photo_type TEXT NOT NULL DEFAULT 'exterior',
  caption TEXT,
  uploaded_by UUID,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view property photos" ON public.property_photos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert photos" ON public.property_photos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete their own photos" ON public.property_photos FOR DELETE USING (auth.uid() = uploaded_by);

-- Sales comparison adjustments table
CREATE TABLE IF NOT EXISTS public.sales_comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deal_pipeline(id) ON DELETE CASCADE,
  comp_name TEXT NOT NULL,
  sale_price NUMERIC,
  sale_date DATE,
  sqft NUMERIC,
  price_per_sqft NUMERIC,
  adj_location NUMERIC DEFAULT 0,
  adj_age NUMERIC DEFAULT 0,
  adj_condition NUMERIC DEFAULT 0,
  adj_size NUMERIC DEFAULT 0,
  adj_amenities NUMERIC DEFAULT 0,
  adjusted_price_per_sqft NUMERIC GENERATED ALWAYS AS (
    COALESCE(price_per_sqft, 0) + COALESCE(adj_location, 0) + COALESCE(adj_age, 0) + COALESCE(adj_condition, 0) + COALESCE(adj_size, 0) + COALESCE(adj_amenities, 0)
  ) STORED,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sales comparisons" ON public.sales_comparisons FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert comparisons" ON public.sales_comparisons FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own comparisons" ON public.sales_comparisons FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own comparisons" ON public.sales_comparisons FOR DELETE USING (auth.uid() = created_by);