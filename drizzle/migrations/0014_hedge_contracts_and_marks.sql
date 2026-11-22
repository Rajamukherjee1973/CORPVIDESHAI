CREATE TABLE public.hedge_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  ref text NOT NULL,
  code text NOT NULL CHECK (code ~ '^[A-Z]{3}$'),
  side text NOT NULL CHECK (side IN ('buy','sell')),
  notional numeric NOT NULL CHECK (notional > 0 AND notional <= 1000000000000),
  trade_date date NOT NULL,
  maturity_date date NOT NULL,
  margin_bp numeric NOT NULL CHECK (margin_bp >= 0 AND margin_bp <= 1000),
  rate numeric NOT NULL CHECK (rate > 0),
  fair_at_trade numeric NOT NULL CHECK (fair_at_trade > 0),
  spot_at_trade numeric NOT NULL CHECK (spot_at_trade > 0),
  rate_overridden boolean NOT NULL DEFAULT false,
  booked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ref),
  CHECK (maturity_date > trade_date AND maturity_date <= trade_date + 1095)
);
CREATE INDEX hedge_contracts_user_idx ON public.hedge_contracts (user_id, booked_at DESC);
GRANT SELECT, INSERT, DELETE ON public.hedge_contracts TO authenticated;
GRANT ALL ON public.hedge_contracts TO service_role;
ALTER TABLE public.hedge_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own hedge contracts" ON public.hedge_contracts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owners save own hedge contracts" ON public.hedge_contracts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners remove own hedge contracts" ON public.hedge_contracts FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.hedge_contract_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.hedge_contracts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  marked_on date NOT NULL,
  spot numeric NOT NULL,
  current_forward numeric NOT NULL,
  pnl_inr numeric NOT NULL,
  matured boolean NOT NULL DEFAULT false,
  proxy boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, marked_on)
);
CREATE INDEX hedge_marks_user_idx ON public.hedge_contract_marks (user_id, marked_on);
GRANT SELECT ON public.hedge_contract_marks TO authenticated;
GRANT ALL ON public.hedge_contract_marks TO service_role;
ALTER TABLE public.hedge_contract_marks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own hedge marks" ON public.hedge_contract_marks FOR SELECT TO authenticated USING (user_id = auth.uid());