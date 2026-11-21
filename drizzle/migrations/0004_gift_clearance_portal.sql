CREATE TYPE public.gift_party AS ENUM ('treasury','ad_bank','rbi','ifsca','mof','fiu_ind','dpiit','cbdt','ibu');

CREATE TABLE public.gift_portal_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  party public.gift_party NOT NULL,
  org_name text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.gift_portal_roles TO authenticated;
GRANT ALL ON public.gift_portal_roles TO service_role;
ALTER TABLE public.gift_portal_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own gift role" ON public.gift_portal_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.gift_party_of(_uid uuid) RETURNS public.gift_party
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT party FROM public.gift_portal_roles WHERE user_id = _uid
$$;

CREATE TABLE public.gift_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  company text NOT NULL,
  hub text NOT NULL,
  currency text NOT NULL,
  amount_crore numeric NOT NULL CHECK (amount_crore > 0),
  route text NOT NULL CHECK (route IN ('Automatic','Approval')),
  purpose text NOT NULL DEFAULT '',
  ad_bank text NOT NULL,
  fx_rate numeric,
  fx_source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.gift_cases TO authenticated;
GRANT ALL ON public.gift_cases TO service_role;
ALTER TABLE public.gift_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portal parties read cases" ON public.gift_cases FOR SELECT TO authenticated USING (public.gift_party_of(auth.uid()) IS NOT NULL);
CREATE POLICY "Treasury opens cases" ON public.gift_cases FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.gift_party_of(auth.uid()) = 'treasury');

CREATE TABLE public.gift_case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.gift_cases(id) ON DELETE CASCADE,
  seq integer NOT NULL,
  party public.gift_party NOT NULL,
  actor uuid NOT NULL DEFAULT auth.uid(),
  actor_org text NOT NULL DEFAULT '',
  action text NOT NULL CHECK (action IN ('filed','verified','cleared','queried','released','recorded')),
  note text NOT NULL DEFAULT '',
  documents text[] NOT NULL DEFAULT '{}',
  prev_hash text NOT NULL DEFAULT '',
  hash text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, seq)
);
GRANT SELECT, INSERT ON public.gift_case_events TO authenticated;
GRANT ALL ON public.gift_case_events TO service_role;
ALTER TABLE public.gift_case_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portal parties read events" ON public.gift_case_events FOR SELECT TO authenticated USING (public.gift_party_of(auth.uid()) IS NOT NULL);
CREATE POLICY "Parties append own lane" ON public.gift_case_events FOR INSERT TO authenticated WITH CHECK (actor = auth.uid() AND party = public.gift_party_of(auth.uid()));

CREATE OR REPLACE FUNCTION public.gift_chain_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE last_hash text; last_seq integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.case_id::text));
  SELECT hash, seq INTO last_hash, last_seq FROM public.gift_case_events WHERE case_id = NEW.case_id ORDER BY seq DESC LIMIT 1;
  NEW.seq := COALESCE(last_seq, 0) + 1;
  NEW.prev_hash := COALESCE(last_hash, 'genesis');
  NEW.created_at := now();
  NEW.actor_org := COALESCE((SELECT org_name FROM public.gift_portal_roles WHERE user_id = NEW.actor), '');
  NEW.hash := encode(extensions.digest(NEW.prev_hash || '|' || NEW.case_id || '|' || NEW.seq || '|' || NEW.party || '|' || NEW.action || '|' || NEW.note || '|' || array_to_string(NEW.documents, ',') || '|' || NEW.created_at::text, 'sha256'), 'hex');
  RETURN NEW;
END $$;
CREATE TRIGGER gift_chain_event BEFORE INSERT ON public.gift_case_events FOR EACH ROW EXECUTE FUNCTION public.gift_chain_event();
CREATE INDEX gift_case_events_case ON public.gift_case_events(case_id, seq);