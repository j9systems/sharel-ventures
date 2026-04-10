-- Enable RLS on reconciliation tables that were missed in the initial auth migration
ALTER TABLE public.rti_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rti_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Authenticated users get full access (same pattern as other tables)
CREATE POLICY "authenticated_all" ON public.rti_uploads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.bank_uploads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.rti_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.bank_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.bank_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
