
CREATE TABLE public.waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  firm text,
  title text,
  interest text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Allow anyone (even anonymous) to insert
CREATE POLICY "Anyone can submit waitlist signup"
ON public.waitlist_signups
FOR INSERT
WITH CHECK (true);

-- Only admins can view signups
CREATE POLICY "Admins can view waitlist signups"
ON public.waitlist_signups
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
