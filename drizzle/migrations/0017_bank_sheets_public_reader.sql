DROP POLICY IF EXISTS "Signed-in accounts read bank rate sheets" ON public.bank_forward_sheets;
DROP POLICY IF EXISTS "Visitors read bank rate sheets" ON public.bank_forward_sheets;
REVOKE SELECT ON public.bank_forward_sheets FROM anon;

CREATE POLICY "Rate desk members read the sheets they entered" ON public.bank_forward_sheets
  FOR SELECT TO authenticated USING (entered_by = auth.uid());

CREATE OR REPLACE FUNCTION public.recent_bank_forward_sheets(_limit integer DEFAULT 12)
RETURNS TABLE (
  id uuid, bank_name text, quote_date date, spot_date date,
  spot_bid numeric, spot_ask numeric, points jsonb, note text, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.bank_name, s.quote_date, s.spot_date, s.spot_bid, s.spot_ask, s.points, s.note, s.created_at
  FROM public.bank_forward_sheets s
  ORDER BY s.quote_date DESC, s.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 12), 1), 24)
$$;

REVOKE ALL ON FUNCTION public.recent_bank_forward_sheets(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recent_bank_forward_sheets(integer) TO anon, authenticated, service_role;