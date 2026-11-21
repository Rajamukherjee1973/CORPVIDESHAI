CREATE TABLE public.agent_execution_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 agent text NOT NULL CHECK (agent IN ('statutory','copilot','document','currency','tool')),
 status text NOT NULL CHECK (status IN ('completed','failed','rejected')),
 input_summary text NOT NULL,
 context_summary text NOT NULL DEFAULT '',
 result jsonb NOT NULL DEFAULT '{}'::jsonb,
 error_message text,
 latency_ms integer NOT NULL DEFAULT 0 CHECK (latency_ms >= 0),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.agent_execution_records TO authenticated;
GRANT ALL ON public.agent_execution_records TO service_role;
ALTER TABLE public.agent_execution_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own agent records" ON public.agent_execution_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Append own agent records" ON public.agent_execution_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX agent_execution_owner_time ON public.agent_execution_records (user_id, created_at DESC);
COMMENT ON TABLE public.agent_execution_records IS 'Owner-scoped append-only POC agent outcomes; not official filing confirmations.';