-- OpenFive - Prompt Template Management
-- ================================================

CREATE TABLE IF NOT EXISTS prompt_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  content text NOT NULL, -- template with {{variable}} placeholders
  variables jsonb DEFAULT '[]', -- [{name, type, default, required, description}]
  model_hint text, -- suggested model
  temperature numeric,
  max_tokens integer,
  tags text[] DEFAULT '{}',
  version integer DEFAULT 1,
  is_published boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, slug)
);

CREATE TABLE IF NOT EXISTS prompt_template_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE,
  version integer NOT NULL,
  content text NOT NULL,
  variables jsonb DEFAULT '[]',
  change_note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view templates" ON prompt_templates FOR SELECT USING (
  EXISTS (SELECT 1 FROM memberships WHERE organization_id = prompt_templates.organization_id AND user_id = auth.uid())
);
CREATE POLICY "Org admins can manage templates" ON prompt_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM memberships WHERE organization_id = prompt_templates.organization_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
);
CREATE POLICY "Org members can view template versions" ON prompt_template_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM prompt_templates pt JOIN memberships m ON m.organization_id = pt.organization_id WHERE pt.id = prompt_template_versions.template_id AND m.user_id = auth.uid())
);
CREATE POLICY "Org admins can manage template versions" ON prompt_template_versions FOR ALL USING (
  EXISTS (SELECT 1 FROM prompt_templates pt JOIN memberships m ON m.organization_id = pt.organization_id WHERE pt.id = prompt_template_versions.template_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin'))
);

-- Indexes
CREATE INDEX idx_prompt_templates_org ON prompt_templates (organization_id);
CREATE INDEX idx_prompt_templates_slug ON prompt_templates (organization_id, slug);
CREATE INDEX idx_prompt_templates_tags ON prompt_templates USING GIN (tags);
CREATE INDEX idx_prompt_templates_published ON prompt_templates (is_published) WHERE is_published = true;
CREATE INDEX idx_prompt_template_versions_template ON prompt_template_versions (template_id, version DESC);

-- Auto-update updated_at
CREATE TRIGGER trg_prompt_templates_updated BEFORE UPDATE ON prompt_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
