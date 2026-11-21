CREATE TABLE public.filing_company_memberships (
 user_id uuid NOT NULL,
 company text NOT NULL,
 assigned_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, company)
);
GRANT SELECT ON public.filing_company_memberships TO authenticated;
GRANT ALL ON public.filing_company_memberships TO service_role;
ALTER TABLE public.filing_company_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read assigned companies" ON public.filing_company_memberships FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION public.has_filing_company(_company text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.filing_company_memberships WHERE user_id = auth.uid() AND company = _company); $$;
CREATE OR REPLACE FUNCTION public.has_filing_company_assignment() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.filing_company_memberships WHERE user_id = auth.uid()); $$;
REVOKE ALL ON FUNCTION public.has_filing_company(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_filing_company_assignment() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_filing_company(text), public.has_filing_company_assignment() TO authenticated;
ALTER POLICY "Append signed in filing records" ON public.form_fc_records WITH CHECK (user_id = auth.uid() AND simulation = true AND (public.has_filing_company(company) OR public.is_filing_regulator() OR (NOT public.has_filing_company_assignment() AND EXISTS (SELECT 1 FROM public.filing_portal_roles WHERE user_id = auth.uid()))));
ALTER POLICY "Read own demos or shared regulator register" ON public.form_fc_records USING (public.is_filing_regulator() OR public.has_filing_company(company) OR (user_id = auth.uid() AND NOT public.has_filing_company_assignment()));