-- OpenFive LLM Margin Gateway - Initial Schema
-- ================================================

-- Custom Enums
CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE project_role AS ENUM ('admin', 'editor', 'viewer');
CREATE TYPE environment_tier AS ENUM ('development', 'staging', 'production');
CREATE TYPE provider_status AS ENUM ('active', 'degraded', 'down');
CREATE TYPE budget_mode AS ENUM ('soft', 'hard');
CREATE TYPE incident_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE incident_status AS ENUM ('open', 'acknowledged', 'resolved');
CREATE TYPE request_status AS ENUM ('success', 'error', 'timeout', 'budget_blocked', 'killed');

-- ================================================
-- 1. Organizations
-- ================================================
CREATE TABLE organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  logo_url      text,
  billing_email text,
  metadata      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_organizations_slug ON organizations (slug);

-- ================================================
-- 2. Memberships
-- ================================================
CREATE TABLE memberships (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            membership_role NOT NULL DEFAULT 'member',
  invited_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_memberships_user ON memberships (user_id);
CREATE INDEX idx_memberships_org  ON memberships (organization_id);

-- ================================================
-- 3. Projects
-- ================================================
CREATE TABLE projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  slug            text NOT NULL,
  description     text,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE INDEX idx_projects_org ON projects (organization_id);

-- ================================================
-- 4. Project Memberships
-- ================================================
CREATE TABLE project_memberships (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       project_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_memberships_project ON project_memberships (project_id);
CREATE INDEX idx_project_memberships_user    ON project_memberships (user_id);

-- ================================================
-- 5. Environments
-- ================================================
CREATE TABLE environments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name              text NOT NULL,
  slug              text NOT NULL,
  tier              environment_tier NOT NULL DEFAULT 'development',
  budget_mode       budget_mode NOT NULL DEFAULT 'soft',
  budget_limit_usd  numeric(12,6),
  budget_window     interval NOT NULL DEFAULT '1 month',
  budget_used_usd   numeric(12,6) NOT NULL DEFAULT 0,
  budget_reset_at   timestamptz,
  killswitch_active boolean NOT NULL DEFAULT false,
  killswitch_reason text,
  killswitch_at     timestamptz,
  anomaly_multiplier numeric(4,2) NOT NULL DEFAULT 3.0,
  anomaly_window     interval NOT NULL DEFAULT '5 minutes',
  metadata          jsonb NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, slug)
);

CREATE INDEX idx_environments_project ON environments (project_id);

-- ================================================
-- 6. Providers
-- ================================================
CREATE TABLE providers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  display_name    text NOT NULL,
  provider_type   text NOT NULL,
  base_url        text NOT NULL,
  api_key_enc     text,
  status          provider_status NOT NULL DEFAULT 'active',
  health_check_url text,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX idx_providers_org    ON providers (organization_id);
CREATE INDEX idx_providers_status ON providers (status);

-- ================================================
-- 7. Models
-- ================================================
CREATE TABLE models (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id       uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  model_id          text NOT NULL,
  display_name      text NOT NULL,
  context_window    integer NOT NULL,
  max_output_tokens integer,
  input_price_per_m  numeric(10,6) NOT NULL DEFAULT 0,
  output_price_per_m numeric(10,6) NOT NULL DEFAULT 0,
  supports_streaming boolean NOT NULL DEFAULT true,
  supports_tools     boolean NOT NULL DEFAULT false,
  supports_vision    boolean NOT NULL DEFAULT false,
  supports_json_mode boolean NOT NULL DEFAULT false,
  avg_latency_ms     integer,
  p99_latency_ms     integer,
  reliability_pct    numeric(5,2) DEFAULT 99.0,
  is_active          boolean NOT NULL DEFAULT true,
  metadata           jsonb NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, model_id)
);

CREATE INDEX idx_models_provider ON models (provider_id);
CREATE INDEX idx_models_active   ON models (is_active) WHERE is_active = true;

-- ================================================
-- 8. Routes
-- ================================================
CREATE TABLE routes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id   uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  name             text NOT NULL,
  slug             text NOT NULL,
  description      text,
  is_active        boolean NOT NULL DEFAULT true,
  allowed_models   uuid[] NOT NULL DEFAULT '{}',
  preferred_model  uuid REFERENCES models(id),
  fallback_chain   uuid[] NOT NULL DEFAULT '{}',
  constraints      jsonb NOT NULL DEFAULT '{}',
  weight_cost       numeric(3,2) NOT NULL DEFAULT 0.40,
  weight_latency    numeric(3,2) NOT NULL DEFAULT 0.30,
  weight_reliability numeric(3,2) NOT NULL DEFAULT 0.30,
  output_schema    jsonb,
  schema_strict    boolean NOT NULL DEFAULT false,
  max_tokens_per_request integer,
  max_requests_per_min   integer,
  guardrail_settings     jsonb NOT NULL DEFAULT '{}',
  budget_limit_usd numeric(12,6),
  metadata         jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (environment_id, slug)
);

CREATE INDEX idx_routes_env    ON routes (environment_id);
CREATE INDEX idx_routes_active ON routes (is_active) WHERE is_active = true;

-- ================================================
-- 9. API Keys
-- ================================================
CREATE TABLE api_keys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id  uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  route_id        uuid REFERENCES routes(id) ON DELETE SET NULL,
  name            text NOT NULL,
  key_prefix      text NOT NULL,
  key_hash        text NOT NULL,
  previous_key_hash text,
  rotated_at        timestamptz,
  grace_period      interval DEFAULT '24 hours',
  scopes            text[] NOT NULL DEFAULT '{chat.completions}',
  rate_limit_rpm    integer,
  is_active         boolean NOT NULL DEFAULT true,
  expires_at        timestamptz,
  last_used_at      timestamptz,
  created_by        uuid REFERENCES auth.users(id),
  revoked_at        timestamptz,
  revoked_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_apikeys_env       ON api_keys (environment_id);
CREATE INDEX idx_apikeys_hash      ON api_keys (key_hash);
CREATE INDEX idx_apikeys_prefix    ON api_keys (key_prefix);
CREATE INDEX idx_apikeys_prev_hash ON api_keys (previous_key_hash) WHERE previous_key_hash IS NOT NULL;
CREATE INDEX idx_apikeys_active    ON api_keys (is_active) WHERE is_active = true;

-- ================================================
-- 10. Requests (metering)
-- ================================================
CREATE TABLE requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id    uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  route_id          uuid REFERENCES routes(id) ON DELETE SET NULL,
  api_key_id        uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  request_id        text NOT NULL UNIQUE,
  started_at        timestamptz NOT NULL,
  completed_at      timestamptz,
  duration_ms       integer,
  status            request_status NOT NULL,
  model_id          uuid REFERENCES models(id),
  provider_id       uuid REFERENCES providers(id),
  model_identifier  text NOT NULL,
  input_tokens      integer NOT NULL DEFAULT 0,
  output_tokens     integer NOT NULL DEFAULT 0,
  estimated_tokens  boolean NOT NULL DEFAULT false,
  input_cost_usd    numeric(12,8) NOT NULL DEFAULT 0,
  output_cost_usd   numeric(12,8) NOT NULL DEFAULT 0,
  total_cost_usd    numeric(12,8) NOT NULL DEFAULT 0,
  prompt_hash       text,
  is_streaming      boolean NOT NULL DEFAULT false,
  tool_call_count   integer NOT NULL DEFAULT 0,
  attempt_number    integer NOT NULL DEFAULT 1,
  fallback_reason   text,
  schema_valid      boolean,
  schema_repair_attempts integer NOT NULL DEFAULT 0,
  error_code        text,
  error_message     text,
  action_taken      text NOT NULL DEFAULT 'none',
  metadata          jsonb NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_requests_env        ON requests (environment_id, created_at DESC);
CREATE INDEX idx_requests_route      ON requests (route_id, created_at DESC);
CREATE INDEX idx_requests_apikey     ON requests (api_key_id, created_at DESC);
CREATE INDEX idx_requests_created    ON requests (created_at DESC);
CREATE INDEX idx_requests_status     ON requests (status);
CREATE INDEX idx_requests_prompt     ON requests (environment_id, prompt_hash, created_at DESC);
CREATE INDEX idx_requests_cost_window ON requests (environment_id, created_at DESC, total_cost_usd);

-- ================================================
-- 11. Incidents
-- ================================================
CREATE TABLE incidents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id  uuid NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
  route_id        uuid REFERENCES routes(id) ON DELETE SET NULL,
  severity        incident_severity NOT NULL,
  status          incident_status NOT NULL DEFAULT 'open',
  incident_type   text NOT NULL,
  title           text NOT NULL,
  description     text,
  trigger_data    jsonb NOT NULL DEFAULT '{}',
  killswitch_activated boolean NOT NULL DEFAULT false,
  resolved_at     timestamptz,
  resolved_by     uuid REFERENCES auth.users(id),
  resolution_note text,
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_env      ON incidents (environment_id, created_at DESC);
CREATE INDEX idx_incidents_status   ON incidents (status) WHERE status = 'open';
CREATE INDEX idx_incidents_type     ON incidents (incident_type);

-- ================================================
-- 12. Audit Log
-- ================================================
CREATE TABLE audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id),
  action          text NOT NULL,
  resource_type   text NOT NULL,
  resource_id     uuid NOT NULL,
  old_values      jsonb,
  new_values      jsonb,
  metadata        jsonb NOT NULL DEFAULT '{}',
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_org      ON audit_log (organization_id, created_at DESC);
CREATE INDEX idx_audit_user     ON audit_log (user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_log (resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_action   ON audit_log (action);

-- ================================================
-- Helper Functions
-- ================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_memberships_updated BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_environments_updated BEFORE UPDATE ON environments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_providers_updated BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_models_updated BEFORE UPDATE ON models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_routes_updated BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_apikeys_updated BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_incidents_updated BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create owner membership when org is created
CREATE OR REPLACE FUNCTION auto_create_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO memberships (organization_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_org_auto_owner AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION auto_create_owner_membership();

-- ================================================
-- RLS Helper Functions
-- ================================================

-- Check if current user is an org member (optionally with specific roles)
CREATE OR REPLACE FUNCTION is_org_member(org_id uuid, required_roles membership_role[] DEFAULT NULL)
RETURNS boolean AS $$
BEGIN
  IF required_roles IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM memberships
      WHERE organization_id = org_id AND user_id = auth.uid()
    );
  ELSE
    RETURN EXISTS (
      SELECT 1 FROM memberships
      WHERE organization_id = org_id AND user_id = auth.uid() AND role = ANY(required_roles)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get org_id for a project
CREATE OR REPLACE FUNCTION get_org_for_project(p_id uuid)
RETURNS uuid AS $$
  SELECT organization_id FROM projects WHERE id = p_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get org_id for an environment (via project)
CREATE OR REPLACE FUNCTION get_org_for_environment(env_id uuid)
RETURNS uuid AS $$
  SELECT p.organization_id
  FROM environments e JOIN projects p ON e.project_id = p.id
  WHERE e.id = env_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get org_id for a route (via environment -> project)
CREATE OR REPLACE FUNCTION get_org_for_route(r_id uuid)
RETURNS uuid AS $$
  SELECT p.organization_id
  FROM routes r
  JOIN environments e ON r.environment_id = e.id
  JOIN projects p ON e.project_id = p.id
  WHERE r.id = r_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ================================================
-- Enable RLS on all tables
-- ================================================
ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships         ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE environments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE models              ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys            ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS Policies
-- ================================================

-- Organizations
CREATE POLICY "org_select" ON organizations FOR SELECT
  USING (is_org_member(id));
CREATE POLICY "org_insert" ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "org_update" ON organizations FOR UPDATE
  USING (is_org_member(id, ARRAY['owner', 'admin']::membership_role[]));
CREATE POLICY "org_delete" ON organizations FOR DELETE
  USING (is_org_member(id, ARRAY['owner']::membership_role[]));

-- Memberships
CREATE POLICY "membership_select" ON memberships FOR SELECT
  USING (is_org_member(organization_id));
CREATE POLICY "membership_insert" ON memberships FOR INSERT
  WITH CHECK (is_org_member(organization_id, ARRAY['owner', 'admin']::membership_role[]));
CREATE POLICY "membership_update" ON memberships FOR UPDATE
  USING (is_org_member(organization_id, ARRAY['owner', 'admin']::membership_role[]));
CREATE POLICY "membership_delete" ON memberships FOR DELETE
  USING (is_org_member(organization_id, ARRAY['owner', 'admin']::membership_role[]));

-- Projects
CREATE POLICY "project_select" ON projects FOR SELECT
  USING (is_org_member(organization_id));
CREATE POLICY "project_insert" ON projects FOR INSERT
  WITH CHECK (is_org_member(organization_id, ARRAY['owner', 'admin', 'member']::membership_role[]));
CREATE POLICY "project_update" ON projects FOR UPDATE
  USING (is_org_member(organization_id, ARRAY['owner', 'admin']::membership_role[]));
CREATE POLICY "project_delete" ON projects FOR DELETE
  USING (is_org_member(organization_id, ARRAY['owner', 'admin']::membership_role[]));

-- Project Memberships
CREATE POLICY "proj_membership_select" ON project_memberships FOR SELECT
  USING (is_org_member(get_org_for_project(project_id)));
CREATE POLICY "proj_membership_insert" ON project_memberships FOR INSERT
  WITH CHECK (is_org_member(get_org_for_project(project_id), ARRAY['owner', 'admin']::membership_role[]));
CREATE POLICY "proj_membership_update" ON project_memberships FOR UPDATE
  USING (is_org_member(get_org_for_project(project_id), ARRAY['owner', 'admin']::membership_role[]));
CREATE POLICY "proj_membership_delete" ON project_memberships FOR DELETE
  USING (is_org_member(get_org_for_project(project_id), ARRAY['owner', 'admin']::membership_role[]));

-- Environments
CREATE POLICY "env_select" ON environments FOR SELECT
  USING (is_org_member(get_org_for_project(project_id)));
CREATE POLICY "env_insert" ON environments FOR INSERT
  WITH CHECK (is_org_member(get_org_for_project(project_id), ARRAY['owner', 'admin']::membership_role[]));
CREATE POLICY "env_update" ON environments FOR UPDATE
  USING (is_org_member(get_org_for_project(project_id), ARRAY['owner', 'admin']::membership_role[]));
CREATE POLICY "env_delete" ON environments FOR DELETE
  USING (is_org_member(get_org_for_project(project_id), ARRAY['owner', 'admin']::membership_role[]));

-- Providers
CREATE POLICY "provider_select" ON providers FOR SELECT
  USING (organization_id IS NULL OR is_org_member(organization_id));
CREATE POLICY "provider_insert" ON providers FOR INSERT
  WITH CHECK (is_org_member(organization_id, ARRAY['owner', 'admin']::membership_role[]));
CREATE POLICY "provider_update" ON providers FOR UPDATE
  USING (is_org_member(organization_id, ARRAY['owner', 'admin']::membership_role[]));
CREATE POLICY "provider_delete" ON providers FOR DELETE
  USING (is_org_member(organization_id, ARRAY['owner', 'admin']::membership_role[]));

-- Models
CREATE POLICY "model_select" ON models FOR SELECT
  USING (true); -- models are reference data, visible to all authenticated
CREATE POLICY "model_insert" ON models FOR INSERT
  WITH CHECK (true); -- managed via service role or admin
CREATE POLICY "model_update" ON models FOR UPDATE
  USING (true);

-- Routes
CREATE POLICY "route_select" ON routes FOR SELECT
  USING (is_org_member(get_org_for_environment(environment_id)));
CREATE POLICY "route_insert" ON routes FOR INSERT
  WITH CHECK (is_org_member(get_org_for_environment(environment_id), ARRAY['owner', 'admin']::membership_role[]));
CREATE POLICY "route_update" ON routes FOR UPDATE
  USING (is_org_member(get_org_for_environment(environment_id), ARRAY['owner', 'admin']::membership_role[]));
CREATE POLICY "route_delete" ON routes FOR DELETE
  USING (is_org_member(get_org_for_environment(environment_id), ARRAY['owner', 'admin']::membership_role[]));

-- API Keys
CREATE POLICY "apikey_select" ON api_keys FOR SELECT
  USING (is_org_member(get_org_for_environment(environment_id)));
CREATE POLICY "apikey_insert" ON api_keys FOR INSERT
  WITH CHECK (is_org_member(get_org_for_environment(environment_id), ARRAY['owner', 'admin']::membership_role[]));
CREATE POLICY "apikey_update" ON api_keys FOR UPDATE
  USING (is_org_member(get_org_for_environment(environment_id), ARRAY['owner', 'admin']::membership_role[]));
CREATE POLICY "apikey_delete" ON api_keys FOR DELETE
  USING (is_org_member(get_org_for_environment(environment_id), ARRAY['owner', 'admin']::membership_role[]));

-- Requests (append-only, read by org members)
CREATE POLICY "request_select" ON requests FOR SELECT
  USING (is_org_member(get_org_for_environment(environment_id)));
-- INSERT is done via service role (gateway), no user-facing insert policy needed

-- Incidents
CREATE POLICY "incident_select" ON incidents FOR SELECT
  USING (is_org_member(get_org_for_environment(environment_id)));
CREATE POLICY "incident_update" ON incidents FOR UPDATE
  USING (is_org_member(get_org_for_environment(environment_id), ARRAY['owner', 'admin']::membership_role[]));
-- INSERT is done via service role (gateway)

-- Audit Log
CREATE POLICY "audit_select" ON audit_log FOR SELECT
  USING (is_org_member(organization_id, ARRAY['owner', 'admin']::membership_role[]));
-- INSERT allowed for authenticated users and service role
CREATE POLICY "audit_insert" ON audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
