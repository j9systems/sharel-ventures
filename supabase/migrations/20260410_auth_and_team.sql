-- team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Payroll', 'Ops')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id),
  UNIQUE (email)
);

-- Seed two admin records (Ben and Mari are already in auth.users)
INSERT INTO public.team_members (user_id, name, email, role)
SELECT id, 'Ben Bliss', 'ben@j9systems.com', 'Admin'
FROM auth.users WHERE email = 'ben@j9systems.com'
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.team_members (user_id, name, email, role)
SELECT id, 'Mari Potter', 'mari.potter@partners.mcd.com', 'Admin'
FROM auth.users WHERE email = 'mari.potter@partners.mcd.com'
ON CONFLICT (email) DO NOTHING;

-- Enable RLS on all existing tables
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_prior_year_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS policies — authenticated users can do everything on all tables except team_members
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'entities', 'stores', 'reconciliation_sessions',
    'reconciliation_results',
    'report_card_months', 'report_card_uploads',
    'report_card_metrics', 'report_card_prior_year_overrides'
  ]
  LOOP
    EXECUTE format('CREATE POLICY "authenticated_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

-- team_members: authenticated users can read, only admins can write
CREATE POLICY "team_members_read" ON public.team_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "team_members_write" ON public.team_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'Admin'
    )
  );
