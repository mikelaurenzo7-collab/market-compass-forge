
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('analyst', 'associate', 'partner', 'admin');

-- Create user_roles table (separate from profiles per security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'analyst',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's role (returns highest role)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 4
    WHEN 'partner' THEN 3
    WHEN 'associate' THEN 2
    WHEN 'analyst' THEN 1
  END DESC
  LIMIT 1
$$;

-- RLS: Users can see their own roles, admins can see all
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Team activity log
CREATE TABLE public.team_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  detail TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.team_activity ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view team activity
CREATE POLICY "Authenticated users can view team activity" ON public.team_activity
  FOR SELECT TO authenticated USING (true);

-- Users can insert their own activity
CREATE POLICY "Users can insert own activity" ON public.team_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Shared notes (visible to all team members)
CREATE TABLE public.shared_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view shared notes
CREATE POLICY "Authenticated users can view shared notes" ON public.shared_notes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create shared notes" ON public.shared_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shared notes" ON public.shared_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shared notes" ON public.shared_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_shared_notes_updated_at
BEFORE UPDATE ON public.shared_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
