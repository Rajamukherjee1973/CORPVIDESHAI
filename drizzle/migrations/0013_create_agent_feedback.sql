CREATE TABLE public.agent_feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 agent text NOT NULL CHECK (agent IN ('statutory','copilot','document','currency')),
 rating smallint NOT NULL CHECK (rating IN (-1, 1)),
 question text NOT NULL CHECK (char_length(question) BETWEEN 3 AND 800),
 answer text NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 4000),
 correction text NOT NULL DEFAULT '' CHECK (char_length(correction) <= 2000),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.agent_feedback TO authenticated;
GRANT ALL ON public.agent_feedback TO service_role;
ALTER TABLE public.agent_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own agent feedback" ON public.agent_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Append own agent feedback" ON public.agent_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX agent_feedback_owner_agent_time ON public.agent_feedback (user_id, agent, created_at DESC);
COMMENT ON TABLE public.agent_feedback IS 'Owner-scoped append-only reviewer ratings used as worked examples for that owner''s agent runs and for training-set export; never shared across users.';