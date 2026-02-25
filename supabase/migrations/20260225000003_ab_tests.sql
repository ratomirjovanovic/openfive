CREATE TABLE IF NOT EXISTS ab_tests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  environment_id uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft', -- draft, running, paused, completed
  variants jsonb NOT NULL DEFAULT '[]', -- [{name, model_id, weight, description}]
  metrics jsonb DEFAULT '{}', -- aggregated results
  sample_size_target integer DEFAULT 1000,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ab_test_id uuid NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  request_id uuid REFERENCES requests(id),
  variant_index integer NOT NULL,
  trace_id text NOT NULL,
  assigned_at timestamptz DEFAULT now()
);

ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view ab_tests" ON ab_tests FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM environments e
    JOIN projects p ON p.id = e.project_id
    JOIN memberships m ON m.organization_id = p.organization_id
    WHERE e.id = ab_tests.environment_id AND m.user_id = auth.uid()
  )
);
CREATE POLICY "Org admins can manage ab_tests" ON ab_tests FOR ALL USING (
  EXISTS (
    SELECT 1 FROM environments e
    JOIN projects p ON p.id = e.project_id
    JOIN memberships m ON m.organization_id = p.organization_id
    WHERE e.id = ab_tests.environment_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
  )
);
CREATE POLICY "Org members can view assignments" ON ab_test_assignments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM ab_tests t
    JOIN environments e ON e.id = t.environment_id
    JOIN projects p ON p.id = e.project_id
    JOIN memberships m ON m.organization_id = p.organization_id
    WHERE t.id = ab_test_assignments.ab_test_id AND m.user_id = auth.uid()
  )
);
CREATE POLICY "Service can insert assignments" ON ab_test_assignments FOR INSERT WITH CHECK (true);

-- Evaluations table for LLM quality scoring
CREATE TABLE IF NOT EXISTS evaluations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  request_id uuid REFERENCES requests(id),
  model_identifier text NOT NULL,
  scores jsonb NOT NULL DEFAULT '{}', -- {relevance, factuality, coherence, toxicity, helpfulness}
  overall_score numeric,
  evaluator text NOT NULL DEFAULT 'auto', -- 'auto', 'human', 'llm-judge'
  evaluator_model text, -- which model judged (for llm-judge)
  feedback text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view evaluations" ON evaluations FOR SELECT USING (
  EXISTS (SELECT 1 FROM memberships WHERE organization_id = evaluations.organization_id AND user_id = auth.uid())
);
CREATE POLICY "Org members can create evaluations" ON evaluations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM memberships WHERE organization_id = evaluations.organization_id AND user_id = auth.uid())
);
