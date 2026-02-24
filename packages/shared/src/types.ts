// Organization roles
export type MembershipRole = "owner" | "admin" | "member" | "viewer";
export type ProjectRole = "admin" | "editor" | "viewer";

// Environment
export type EnvironmentTier = "development" | "staging" | "production";
export type BudgetMode = "soft" | "hard";

// Provider
export type ProviderType = "openrouter" | "ollama" | "openai_compatible";
export type ProviderStatus = "active" | "degraded" | "down";

// Request
export type RequestStatus =
  | "success"
  | "error"
  | "timeout"
  | "budget_blocked"
  | "killed";

export type ActionTaken =
  | "none"
  | "downgrade"
  | "throttle"
  | "block"
  | "fallback"
  | "repair";

// Incident
export type IncidentSeverity = "info" | "warning" | "critical";
export type IncidentStatus = "open" | "acknowledged" | "resolved";
export type IncidentType =
  | "cost_spike"
  | "killswitch_activated"
  | "budget_exceeded"
  | "provider_down"
  | "loop_detected"
  | "schema_fail_storm";

// Entities
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  billing_email: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  organization_id: string;
  user_id: string;
  role: MembershipRole;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProjectMembership {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  created_at: string;
}

export interface Environment {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  tier: EnvironmentTier;
  budget_mode: BudgetMode;
  budget_limit_usd: number | null;
  budget_window: string;
  budget_used_usd: number;
  budget_reset_at: string | null;
  killswitch_active: boolean;
  killswitch_reason: string | null;
  killswitch_at: string | null;
  anomaly_multiplier: number;
  anomaly_window: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Provider {
  id: string;
  organization_id: string | null;
  name: string;
  display_name: string;
  provider_type: ProviderType;
  base_url: string;
  status: ProviderStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Model {
  id: string;
  provider_id: string;
  model_id: string;
  display_name: string;
  context_window: number;
  max_output_tokens: number | null;
  input_price_per_m: number;
  output_price_per_m: number;
  supports_streaming: boolean;
  supports_tools: boolean;
  supports_vision: boolean;
  supports_json_mode: boolean;
  avg_latency_ms: number | null;
  p99_latency_ms: number | null;
  reliability_pct: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RouteConstraints {
  min_context_window?: number;
  requires_streaming?: boolean;
  requires_tools?: boolean;
  requires_vision?: boolean;
  requires_json_mode?: boolean;
  max_input_price_per_m?: number;
  max_output_price_per_m?: number;
  max_latency_ms?: number;
}

export interface GuardrailSettings {
  loop_detection?: {
    enabled: boolean;
    max_identical_prompts: number;
    window_seconds: number;
    max_tool_calls_per_request: number;
  };
  auto_repair?: {
    enabled: boolean;
    max_attempts: number;
    repair_model: string;
  };
}

export interface Route {
  id: string;
  environment_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  allowed_models: string[];
  preferred_model: string | null;
  fallback_chain: string[];
  constraints: RouteConstraints;
  weight_cost: number;
  weight_latency: number;
  weight_reliability: number;
  output_schema: Record<string, unknown> | null;
  schema_strict: boolean;
  max_tokens_per_request: number | null;
  max_requests_per_min: number | null;
  guardrail_settings: GuardrailSettings;
  budget_limit_usd: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  environment_id: string;
  route_id: string | null;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_rpm: number | null;
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_by: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestRecord {
  id: string;
  environment_id: string;
  route_id: string | null;
  api_key_id: string | null;
  request_id: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  status: RequestStatus;
  model_id: string | null;
  provider_id: string | null;
  model_identifier: string;
  input_tokens: number;
  output_tokens: number;
  estimated_tokens: boolean;
  input_cost_usd: number;
  output_cost_usd: number;
  total_cost_usd: number;
  prompt_hash: string | null;
  is_streaming: boolean;
  tool_call_count: number;
  attempt_number: number;
  fallback_reason: string | null;
  schema_valid: boolean | null;
  schema_repair_attempts: number;
  error_code: string | null;
  error_message: string | null;
  action_taken: ActionTaken;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Incident {
  id: string;
  environment_id: string;
  route_id: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  incident_type: IncidentType;
  title: string;
  description: string | null;
  trigger_data: Record<string, unknown>;
  killswitch_activated: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
