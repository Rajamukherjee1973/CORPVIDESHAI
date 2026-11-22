CREATE TABLE public.bank_quote_desk_members (
  user_id uuid PRIMARY KEY,
  granted_at timestamptz NOT NULL DEFAULT now(),
  note text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.bank_quote_desk_members TO authenticated;
GRANT ALL ON public.bank_quote_desk_members TO service_role;
ALTER TABLE public.bank_quote_desk_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own desk membership" ON public.bank_quote_desk_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_bank_quote_desk(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.bank_quote_desk_members WHERE user_id = _uid)
$$;

CREATE TABLE public.bank_forward_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL CHECK (char_length(bank_name) BETWEEN 2 AND 80),
  quote_date date NOT NULL,
  spot_date date NOT NULL,
  spot_bid numeric NOT NULL CHECK (spot_bid > 0),
  spot_ask numeric NOT NULL,
  points jsonb NOT NULL CHECK (jsonb_typeof(points) = 'array' AND jsonb_array_length(points) BETWEEN 1 AND 12),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 280),
  entered_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (spot_ask >= spot_bid),
  CHECK (spot_date >= quote_date)
);
CREATE INDEX bank_forward_sheets_latest ON public.bank_forward_sheets (quote_date DESC, created_at DESC);
GRANT SELECT, INSERT ON public.bank_forward_sheets TO authenticated;
GRANT ALL ON public.bank_forward_sheets TO service_role;
ALTER TABLE public.bank_forward_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in accounts read bank rate sheets" ON public.bank_forward_sheets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Rate desk members add sheets as themselves" ON public.bank_forward_sheets
  FOR INSERT TO authenticated WITH CHECK (entered_by = auth.uid() AND public.is_bank_quote_desk(auth.uid()));