
-- Create a secure table for API key secrets (never directly accessible to users)
CREATE TABLE public.api_key_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS but NO select policy for users - only service role can access
ALTER TABLE public.api_key_secrets ENABLE ROW LEVEL SECURITY;

-- Migrate existing data
INSERT INTO public.api_key_secrets (api_key_id, key_hash, key_prefix)
SELECT id, key_hash, key_prefix FROM public.api_keys;

-- Remove sensitive columns from api_keys
ALTER TABLE public.api_keys DROP COLUMN key_hash;
ALTER TABLE public.api_keys DROP COLUMN key_prefix;
