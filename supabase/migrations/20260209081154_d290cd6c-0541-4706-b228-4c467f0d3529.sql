
-- Enable realtime on shared_notes for live collaborative updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_notes;

-- Create API keys table for programmatic data access
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{"read"}',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API keys" ON public.api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own API keys" ON public.api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own API keys" ON public.api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own API keys" ON public.api_keys FOR DELETE USING (auth.uid() = user_id);

-- Create index for API key lookup (used by edge function)
CREATE INDEX idx_api_keys_key_hash ON public.api_keys (key_hash) WHERE is_active = true;
