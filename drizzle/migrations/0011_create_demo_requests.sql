CREATE SEQUENCE IF NOT EXISTS public.demo_request_seq START 1001;

CREATE TABLE public.demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('CVD-DEMO-' || lpad(nextval('public.demo_request_seq')::text, 5, '0')),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  work_email text NOT NULL CHECK (char_length(work_email) BETWEEN 5 AND 255),
  organisation text NOT NULL CHECK (char_length(organisation) BETWEEN 2 AND 150),
  audience text NOT NULL CHECK (char_length(audience) <= 60),
  preferred_date date,
  time_slot text CHECK (time_slot IS NULL OR char_length(time_slot) <= 40),
  focus text[] NOT NULL DEFAULT '{}',
  message text CHECK (message IS NULL OR char_length(message) <= 1000),
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.demo_requests TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.demo_request_seq TO service_role;

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;
-- No policies: visitors cannot read or write directly; the validated server booking function inserts with server credentials.

CREATE INDEX demo_requests_email_created_idx ON public.demo_requests (work_email, created_at DESC);