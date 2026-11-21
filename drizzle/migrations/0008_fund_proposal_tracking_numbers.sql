CREATE SEQUENCE public.fund_tracking_seq;
ALTER TABLE public.fund_proposals ADD COLUMN tracking_number text;
UPDATE public.fund_proposals SET tracking_number = 'CVF-' || lpad(nextval('public.fund_tracking_seq')::text, 8, '0') WHERE tracking_number IS NULL;
ALTER TABLE public.fund_proposals ADD CONSTRAINT fund_tracking_unique UNIQUE (tracking_number);
CREATE FUNCTION public.assign_fund_tracking() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 NEW.tracking_number := 'CVF-' || lpad(nextval('public.fund_tracking_seq')::text, 8, '0');
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.assign_fund_tracking() FROM PUBLIC;
CREATE TRIGGER assign_fund_tracking BEFORE INSERT ON public.fund_proposals FOR EACH ROW EXECUTE FUNCTION public.assign_fund_tracking();
COMMENT ON COLUMN public.fund_proposals.tracking_number IS 'Server-issued unique internal proposal reference, not an RBI/IFSCA filing number. Sequence gaps are normal.';