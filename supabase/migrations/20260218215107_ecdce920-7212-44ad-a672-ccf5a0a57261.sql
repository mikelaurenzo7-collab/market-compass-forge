
-- Secure invite links for external data room contributors
CREATE TABLE public.data_room_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deal_pipeline(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_email TEXT,
  invited_name TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  revoked_at TIMESTAMP WITH TIME ZONE,
  max_uploads INTEGER DEFAULT 20,
  upload_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.data_room_invites ENABLE ROW LEVEL SECURITY;

-- Only authenticated users who created the invite (or deal owner) can read
CREATE POLICY "Deal members can read invites"
  ON public.data_room_invites FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_deal_owner(auth.uid(), deal_id)
    OR public.get_deal_role(auth.uid(), deal_id) IS NOT NULL
  );

-- Only authenticated users can create invites for their deals
CREATE POLICY "Deal members can create invites"
  ON public.data_room_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.is_deal_owner(auth.uid(), deal_id)
      OR public.get_deal_role(auth.uid(), deal_id) IS NOT NULL
    )
  );

-- Only creators can revoke
CREATE POLICY "Creators can update invites"
  ON public.data_room_invites FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- No deletes
CREATE POLICY "No deletes on invites"
  ON public.data_room_invites FOR DELETE
  USING (false);

-- Indexes
CREATE INDEX idx_data_room_invites_token ON public.data_room_invites (token);
CREATE INDEX idx_data_room_invites_deal ON public.data_room_invites (deal_id);

-- Anon read for token validation (external portal needs this)
CREATE POLICY "Anon can read by token"
  ON public.data_room_invites FOR SELECT
  TO anon
  USING (true);
