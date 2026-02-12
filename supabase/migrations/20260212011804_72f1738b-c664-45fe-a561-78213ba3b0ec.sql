
-- Team invites table for invite flow
CREATE TABLE public.team_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invited_by uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'analyst',
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone,
  CONSTRAINT valid_role CHECK (role IN ('analyst', 'associate', 'partner', 'admin')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'expired'))
);

-- Enable RLS
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Admins/partners can manage invites they created
CREATE POLICY "Users can view invites they created"
  ON public.team_invites FOR SELECT
  USING (auth.uid() = invited_by);

CREATE POLICY "Users can create invites"
  ON public.team_invites FOR INSERT
  WITH CHECK (auth.uid() = invited_by AND public.has_role(auth.uid(), 'partner'));

CREATE POLICY "Users can delete own invites"
  ON public.team_invites FOR DELETE
  USING (auth.uid() = invited_by);

-- Invited users can view their invite by token (handled in edge function, not client)
-- Allow anyone to read invites for acceptance (token-based security in app logic)
CREATE POLICY "Anyone can view invites by token"
  ON public.team_invites FOR SELECT
  USING (true);

CREATE POLICY "Service can update invites"
  ON public.team_invites FOR UPDATE
  USING (true);

-- Index for fast token lookups
CREATE INDEX idx_team_invites_token ON public.team_invites(token);
CREATE INDEX idx_team_invites_email ON public.team_invites(email);
