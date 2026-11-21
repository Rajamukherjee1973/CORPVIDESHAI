CREATE TABLE public.rbi_odi_releases (
  period text PRIMARY KEY,
  released text,
  page_url text NOT NULL,
  file_url text,
  status text NOT NULL DEFAULT 'pending',
  note text,
  total_rows integer,
  total_usd_mn numeric,
  rows jsonb,
  checked_at timestamptz NOT NULL DEFAULT now(),
  loaded_at timestamptz
);
GRANT SELECT ON public.rbi_odi_releases TO anon, authenticated;
GRANT ALL ON public.rbi_odi_releases TO service_role;
ALTER TABLE public.rbi_odi_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RBI releases are public data" ON public.rbi_odi_releases FOR SELECT TO anon, authenticated USING (true);