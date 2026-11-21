CREATE SEQUENCE IF NOT EXISTS public.contact_message_seq START 1001;

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('CVD-MSG-' || lpad(nextval('public.contact_message_seq')::text, 5, '0')),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  work_email text NOT NULL CHECK (char_length(work_email) BETWEEN 5 AND 255),
  organisation text CHECK (organisation IS NULL OR char_length(organisation) <= 150),
  audience text NOT NULL CHECK (char_length(audience) <= 60),
  topic text NOT NULL CHECK (char_length(topic) <= 80),
  message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.contact_messages TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.contact_message_seq TO service_role;

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
-- No policies: visitors cannot read or write directly; the validated server contact function inserts with server credentials.

CREATE INDEX contact_messages_email_created_idx ON public.contact_messages (work_email, created_at DESC);