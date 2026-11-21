ALTER TABLE public.filing_portal_roles ADD COLUMN IF NOT EXISTS public_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.filing_portal_roles ADD COLUMN IF NOT EXISTS desk text;

CREATE OR REPLACE FUNCTION public.is_public_filing_demo(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.filing_portal_roles WHERE user_id = _uid AND public_demo)
$$;
REVOKE ALL ON FUNCTION public.is_public_filing_demo(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_public_filing_demo(uuid) TO authenticated, service_role;

CREATE POLICY "Public filing demo workspace isolation" ON public.form_fc_records
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_public_filing_demo(auth.uid()) = public.is_public_filing_demo(user_id))
  WITH CHECK (public.is_public_filing_demo(auth.uid()) = public.is_public_filing_demo(user_id));

CREATE TYPE public.regulator_action_kind AS ENUM ('acknowledge','query','flag_risk','condition','clear','escalate');

CREATE TABLE public.filing_regulator_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.form_fc_records(id),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  desk text NOT NULL,
  action public.regulator_action_kind NOT NULL,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 600),
  simulation boolean NOT NULL DEFAULT true CHECK (simulation),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.filing_regulator_actions TO authenticated;
GRANT ALL ON public.filing_regulator_actions TO service_role;
ALTER TABLE public.filing_regulator_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Regulators read actions on visible records" ON public.filing_regulator_actions
  FOR SELECT TO authenticated
  USING (public.is_filing_regulator() AND EXISTS (SELECT 1 FROM public.form_fc_records r WHERE r.id = record_id));
CREATE POLICY "Regulators append own actions" ON public.filing_regulator_actions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_filing_regulator()
    AND desk = (SELECT p.desk FROM public.filing_portal_roles p WHERE p.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.form_fc_records r WHERE r.id = record_id));
CREATE POLICY "Public demo action isolation" ON public.filing_regulator_actions
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_public_filing_demo(auth.uid()) = public.is_public_filing_demo(user_id))
  WITH CHECK (public.is_public_filing_demo(auth.uid()) = public.is_public_filing_demo(user_id));
CREATE INDEX filing_regulator_actions_record_idx ON public.filing_regulator_actions(record_id, created_at);