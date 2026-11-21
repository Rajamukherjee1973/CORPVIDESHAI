CREATE OR REPLACE FUNCTION public.gift_chain_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE last_hash text; last_seq integer; last_verify integer; stage text; latest_action text; bank_action text; queried boolean; cleared_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.case_id::text));
  IF auth.uid() IS NULL OR NEW.actor <> auth.uid() OR NEW.party IS DISTINCT FROM public.gift_party_of(auth.uid()) THEN
    RAISE EXCEPTION 'Portal actor does not match the assigned desk';
  END IF;
  SELECT hash, seq INTO last_hash, last_seq FROM public.gift_case_events WHERE case_id = NEW.case_id ORDER BY seq DESC LIMIT 1;
  SELECT COALESCE(MAX(seq),0) INTO last_verify FROM public.gift_case_events WHERE case_id = NEW.case_id AND party = 'ad_bank' AND action = 'verified';
  SELECT action INTO bank_action FROM public.gift_case_events WHERE case_id = NEW.case_id AND party = 'ad_bank' ORDER BY seq DESC LIMIT 1;
  SELECT EXISTS(SELECT 1 FROM (SELECT DISTINCT ON (party) party, action FROM public.gift_case_events WHERE case_id = NEW.case_id AND (party IN ('treasury','ad_bank') OR seq > last_verify) ORDER BY party, seq DESC) latest WHERE action = 'queried') INTO queried;
  SELECT COUNT(*) INTO cleared_count FROM (SELECT DISTINCT ON (party) party, action FROM public.gift_case_events WHERE case_id = NEW.case_id AND seq > last_verify AND party IN ('rbi','ifsca','mof','fiu_ind','dpiit','cbdt') ORDER BY party, seq DESC) latest WHERE action = 'cleared';
  SELECT action INTO latest_action FROM public.gift_case_events WHERE case_id = NEW.case_id AND party = NEW.party AND seq > last_verify ORDER BY seq DESC LIMIT 1;
  stage := CASE WHEN queried THEN 'queried' WHEN EXISTS(SELECT 1 FROM public.gift_case_events WHERE case_id = NEW.case_id AND party = 'ibu' AND action = 'released' AND seq > last_verify) THEN 'released' WHEN bank_action IS DISTINCT FROM 'verified' THEN 'awaiting_bank' WHEN cleared_count = 6 THEN 'awaiting_release' ELSE 'with_regulators' END;
  IF NEW.party = 'treasury' THEN
    IF NEW.action <> 'filed' OR last_seq IS NOT NULL OR NOT EXISTS(SELECT 1 FROM public.gift_cases WHERE id = NEW.case_id AND created_by = auth.uid()) THEN RAISE EXCEPTION 'Only the case owner can append the initial filing'; END IF;
  ELSIF last_seq IS NULL THEN RAISE EXCEPTION 'The case needs an initial filing';
  ELSIF NEW.party = 'ad_bank' THEN
    IF stage NOT IN ('awaiting_bank','queried') OR NEW.action NOT IN ('verified','queried') THEN RAISE EXCEPTION 'Case is not awaiting bank review'; END IF;
  ELSIF NEW.party = 'ibu' THEN
    IF stage <> 'awaiting_release' OR NEW.action NOT IN ('released','queried') THEN RAISE EXCEPTION 'Case is not awaiting IBU release'; END IF;
  ELSE
    IF stage <> 'with_regulators' OR latest_action = 'cleared' OR NEW.action NOT IN ('cleared','queried') THEN RAISE EXCEPTION 'Case is not awaiting this regulator'; END IF;
  END IF;
  IF NEW.action = 'queried' AND btrim(NEW.note) = '' THEN RAISE EXCEPTION 'A query needs a note'; END IF;
  NEW.seq := COALESCE(last_seq, 0) + 1;
  NEW.prev_hash := COALESCE(last_hash, 'genesis');
  NEW.created_at := now();
  NEW.actor_org := COALESCE((SELECT org_name FROM public.gift_portal_roles WHERE user_id = NEW.actor), '');
  NEW.hash := encode(extensions.digest(NEW.prev_hash || '|' || NEW.case_id || '|' || NEW.seq || '|' || NEW.party || '|' || NEW.action || '|' || NEW.note || '|' || array_to_string(NEW.documents, ',') || '|' || NEW.created_at::text, 'sha256'), 'hex');
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.open_gift_case(p_case jsonb, p_documents text[]) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL OR public.gift_party_of(auth.uid()) IS DISTINCT FROM 'treasury'::public.gift_party THEN RAISE EXCEPTION 'Only assigned treasury accounts can open cases'; END IF;
  IF length(btrim(p_case->>'company')) NOT BETWEEN 2 AND 160 OR length(btrim(p_case->>'hub')) NOT BETWEEN 2 AND 80 OR (p_case->>'currency') !~ '^[A-Z]{3}$' OR (p_case->>'amount_crore')::numeric > 1000000 OR cardinality(p_documents) > 12 THEN RAISE EXCEPTION 'Invalid case inputs'; END IF;
  INSERT INTO public.gift_cases(created_by,company,hub,currency,amount_crore,route,purpose,ad_bank,fx_rate,fx_source)
  VALUES(auth.uid(),btrim(p_case->>'company'),btrim(p_case->>'hub'),p_case->>'currency',(p_case->>'amount_crore')::numeric,p_case->>'route',COALESCE(p_case->>'purpose',''),p_case->>'ad_bank',(p_case->>'fx_rate')::numeric,p_case->>'fx_source') RETURNING id INTO new_id;
  INSERT INTO public.gift_case_events(case_id,party,actor,action,note,documents)
  VALUES(new_id,'treasury',auth.uid(),'filed','Filing pack submitted to ' || (p_case->>'ad_bank'),COALESCE(p_documents,'{}'));
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.open_gift_case(jsonb,text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_gift_case(jsonb,text[]) TO authenticated;
REVOKE INSERT ON public.gift_cases FROM authenticated;
CREATE OR REPLACE FUNCTION public.open_gift_case(p_case jsonb, p_documents text[]) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL OR public.gift_party_of(auth.uid()) IS DISTINCT FROM 'treasury'::public.gift_party THEN RAISE EXCEPTION 'Only assigned treasury accounts can open cases'; END IF;
  IF p_case->>'company' IS NULL OR length(btrim(p_case->>'company')) NOT BETWEEN 2 AND 160 OR p_case->>'hub' IS NULL OR length(btrim(p_case->>'hub')) NOT BETWEEN 2 AND 80 OR p_case->>'currency' IS NULL OR (p_case->>'currency') !~ '^[A-Z]{3}$' OR p_case->>'amount_crore' IS NULL OR (p_case->>'amount_crore')::numeric > 1000000 OR cardinality(p_documents) > 12 THEN RAISE EXCEPTION 'Invalid case inputs'; END IF;
  INSERT INTO public.gift_cases(created_by,company,hub,currency,amount_crore,route,purpose,ad_bank,fx_rate,fx_source)
  VALUES(auth.uid(),btrim(p_case->>'company'),btrim(p_case->>'hub'),p_case->>'currency',(p_case->>'amount_crore')::numeric,p_case->>'route',COALESCE(p_case->>'purpose',''),p_case->>'ad_bank',(p_case->>'fx_rate')::numeric,p_case->>'fx_source') RETURNING id INTO new_id;
  INSERT INTO public.gift_case_events(case_id,party,actor,action,note,documents)
  VALUES(new_id,'treasury',auth.uid(),'filed','Filing pack submitted to ' || (p_case->>'ad_bank'),COALESCE(p_documents,'{}'));
  RETURN new_id;
END $$;