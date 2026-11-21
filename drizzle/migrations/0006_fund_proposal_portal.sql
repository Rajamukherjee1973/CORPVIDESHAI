CREATE TABLE public.fund_portal_roles (user_id uuid PRIMARY KEY, fund_name text NOT NULL);
GRANT SELECT ON public.fund_portal_roles TO authenticated;
GRANT ALL ON public.fund_portal_roles TO service_role;
ALTER TABLE public.fund_portal_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fund accounts read own assignment" ON public.fund_portal_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TABLE public.fund_proposals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_by uuid NOT NULL DEFAULT auth.uid(), fund_name text NOT NULL DEFAULT '', title text NOT NULL, hub text NOT NULL, currency text NOT NULL, amount_crore numeric NOT NULL CHECK (amount_crore > 0 AND amount_crore <= 1000000), investment_type text NOT NULL CHECK (investment_type IN ('ODI equity','OPI securities','Overseas fund units')), route text NOT NULL CHECK (route IN ('Automatic','Approval','Assessment required')), purpose text NOT NULL, ad_bank text NOT NULL, documents text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.fund_proposals TO authenticated;
GRANT ALL ON public.fund_proposals TO service_role;
ALTER TABLE public.fund_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fund owners and reviewer desks read proposals" ON public.fund_proposals FOR SELECT TO authenticated USING (created_by = auth.uid() OR public.gift_party_of(auth.uid()) IN ('ad_bank','rbi','ifsca','mof','fiu_ind','dpiit','cbdt','ibu'));
CREATE POLICY "Assigned fund accounts submit" ON public.fund_proposals FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.fund_portal_roles WHERE user_id = auth.uid()));
CREATE FUNCTION public.can_read_fund(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.fund_proposals WHERE id = _id AND created_by = auth.uid()) OR public.gift_party_of(auth.uid()) IN ('ad_bank','rbi','ifsca','mof','fiu_ind','dpiit','cbdt','ibu') $$;
CREATE TABLE public.fund_proposal_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), proposal_id uuid NOT NULL REFERENCES public.fund_proposals(id), seq integer NOT NULL DEFAULT 0, actor uuid NOT NULL DEFAULT auth.uid(), actor_org text NOT NULL DEFAULT '', party text NOT NULL, action text NOT NULL, note text NOT NULL DEFAULT '', documents text[] NOT NULL DEFAULT '{}', prev_hash text NOT NULL DEFAULT '', hash text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(proposal_id, seq));
GRANT SELECT, INSERT ON public.fund_proposal_events TO authenticated;
GRANT ALL ON public.fund_proposal_events TO service_role;
ALTER TABLE public.fund_proposal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authorized parties read fund events" ON public.fund_proposal_events FOR SELECT TO authenticated USING (public.can_read_fund(proposal_id));
CREATE POLICY "Authorized parties append fund events" ON public.fund_proposal_events FOR INSERT TO authenticated WITH CHECK (actor = auth.uid() AND public.can_read_fund(proposal_id));
CREATE FUNCTION public.chain_fund_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE owner_id uuid; desk text; org text; last_seq integer; last_hash text; response_seq integer; bank_ok boolean; has_query boolean; released boolean; clears integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('fund:' || NEW.proposal_id::text));
 SELECT created_by INTO owner_id FROM public.fund_proposals WHERE id = NEW.proposal_id;
 IF NEW.actor IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Actor mismatch'; END IF;
 IF owner_id = auth.uid() THEN SELECT 'investor', fund_name INTO desk, org FROM public.fund_portal_roles WHERE user_id = auth.uid();
 ELSE SELECT party::text, org_name INTO desk, org FROM public.gift_portal_roles WHERE user_id = auth.uid(); END IF;
 IF desk IS NULL OR desk = 'treasury' THEN RAISE EXCEPTION 'No fund portal access'; END IF;
 NEW.party := desk; NEW.actor_org := org;
 SELECT seq, hash INTO last_seq, last_hash FROM public.fund_proposal_events WHERE proposal_id = NEW.proposal_id ORDER BY seq DESC LIMIT 1;
 SELECT COALESCE(max(seq),0) INTO response_seq FROM public.fund_proposal_events WHERE proposal_id = NEW.proposal_id AND action = 'resubmitted';
 SELECT COALESCE(bool_or(party = 'ad_bank' AND action = 'verified'),false), COALESCE(bool_or(action = 'queried'),false), COALESCE(bool_or(action = 'released'),false), count(DISTINCT party) FILTER (WHERE action = 'cleared' AND party IN ('rbi','ifsca','mof','fiu_ind','dpiit','cbdt')) INTO bank_ok, has_query, released, clears FROM public.fund_proposal_events WHERE proposal_id = NEW.proposal_id AND seq > response_seq;
 IF released THEN RAISE EXCEPTION 'Completed proposal is immutable'; END IF;
 IF desk = 'investor' THEN
   IF NOT ((NEW.action = 'filed' AND last_seq IS NULL) OR (NEW.action = 'resubmitted' AND has_query)) THEN RAISE EXCEPTION 'Investor action unavailable'; END IF;
 ELSIF desk = 'ad_bank' THEN
   IF bank_ok OR has_query OR NEW.action NOT IN ('verified','queried') THEN RAISE EXCEPTION 'Bank review unavailable'; END IF;
 ELSIF desk = 'ibu' THEN
   IF clears <> 6 OR has_query OR NEW.action NOT IN ('released','queried') THEN RAISE EXCEPTION 'Release unavailable'; END IF;
 ELSE
   IF NOT bank_ok OR has_query OR NEW.action NOT IN ('cleared','queried') OR EXISTS (SELECT 1 FROM public.fund_proposal_events WHERE proposal_id = NEW.proposal_id AND seq > response_seq AND party = desk AND action = 'cleared') THEN RAISE EXCEPTION 'Reviewer action unavailable'; END IF;
 END IF;
 IF NEW.action <> 'filed' AND length(trim(NEW.note)) < 3 THEN RAISE EXCEPTION 'Review note required'; END IF;
 NEW.seq := COALESCE(last_seq,0)+1; NEW.prev_hash := COALESCE(last_hash,'genesis'); NEW.created_at := now();
 NEW.hash := encode(extensions.digest(NEW.prev_hash || '|' || NEW.proposal_id || '|' || NEW.seq || '|' || NEW.actor || '|' || NEW.party || '|' || NEW.action || '|' || NEW.note || '|' || array_to_string(NEW.documents,',') || '|' || NEW.created_at::text,'sha256'),'hex');
 RETURN NEW;
END $$;
CREATE TRIGGER chain_fund_event BEFORE INSERT ON public.fund_proposal_events FOR EACH ROW EXECUTE FUNCTION public.chain_fund_event();
CREATE FUNCTION public.record_fund_submission() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
 SELECT fund_name INTO NEW.fund_name FROM public.fund_portal_roles WHERE user_id = NEW.created_by;
 IF NEW.fund_name IS NULL OR NEW.created_by IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Fund assignment required'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER name_fund_submission BEFORE INSERT ON public.fund_proposals FOR EACH ROW EXECUTE FUNCTION public.record_fund_submission();
CREATE FUNCTION public.start_fund_record() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
 INSERT INTO public.fund_proposal_events(proposal_id,actor,party,action,note,documents) VALUES (NEW.id,NEW.created_by,'investor','filed','Proposal submitted to ' || NEW.ad_bank,NEW.documents);
 RETURN NEW;
END $$;
CREATE TRIGGER start_fund_record AFTER INSERT ON public.fund_proposals FOR EACH ROW EXECUTE FUNCTION public.start_fund_record();
CREATE INDEX fund_events_proposal ON public.fund_proposal_events(proposal_id,seq);