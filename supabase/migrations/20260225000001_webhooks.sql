-- Webhook endpoints table
CREATE TABLE IF NOT EXISTS webhooks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  secret text, -- HMAC signing secret
  events text[] NOT NULL DEFAULT '{}', -- event types to subscribe to
  is_active boolean DEFAULT true,
  headers jsonb DEFAULT '{}', -- custom headers
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Webhook delivery log
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  duration_ms integer,
  success boolean DEFAULT false,
  attempted_at timestamptz DEFAULT now()
);

-- Alert rules table
CREATE TABLE IF NOT EXISTS alert_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  environment_id uuid REFERENCES environments(id) ON DELETE CASCADE,
  name text NOT NULL,
  condition_type text NOT NULL, -- 'budget_threshold', 'cost_spike', 'error_rate', 'latency_p95', 'incident_created'
  threshold_value numeric,
  window_minutes integer DEFAULT 5,
  channels text[] NOT NULL DEFAULT '{}', -- 'webhook', 'email'
  webhook_id uuid REFERENCES webhooks(id),
  is_active boolean DEFAULT true,
  last_triggered_at timestamptz,
  cooldown_minutes integer DEFAULT 15,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view webhooks" ON webhooks FOR SELECT USING (
  EXISTS (SELECT 1 FROM memberships WHERE organization_id = webhooks.organization_id AND user_id = auth.uid())
);
CREATE POLICY "Org admins can manage webhooks" ON webhooks FOR ALL USING (
  EXISTS (SELECT 1 FROM memberships WHERE organization_id = webhooks.organization_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
);

CREATE POLICY "Org members can view deliveries" ON webhook_deliveries FOR SELECT USING (
  EXISTS (SELECT 1 FROM webhooks w JOIN memberships m ON m.organization_id = w.organization_id WHERE w.id = webhook_deliveries.webhook_id AND m.user_id = auth.uid())
);

CREATE POLICY "Org members can view alert rules" ON alert_rules FOR SELECT USING (
  EXISTS (SELECT 1 FROM memberships WHERE organization_id = alert_rules.organization_id AND user_id = auth.uid())
);
CREATE POLICY "Org admins can manage alert rules" ON alert_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM memberships WHERE organization_id = alert_rules.organization_id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
);
