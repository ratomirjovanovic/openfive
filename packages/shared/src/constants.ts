export const MEMBERSHIP_ROLES = ["owner", "admin", "member", "viewer"] as const;
export const PROJECT_ROLES = ["admin", "editor", "viewer"] as const;
export const ENVIRONMENT_TIERS = ["development", "staging", "production"] as const;
export const PROVIDER_TYPES = ["openrouter", "ollama", "openai_compatible"] as const;

export const STATUS_VARIANTS = {
  ok: { label: "OK", color: "green" },
  degraded: { label: "Degraded", color: "yellow" },
  blocked: { label: "Blocked", color: "red" },
  throttled: { label: "Throttled", color: "orange" },
  fallback: { label: "Fallback", color: "blue" },
  repair: { label: "Repair", color: "purple" },
} as const;

export const DEFAULT_BUDGET_WINDOW = "1 month";
export const DEFAULT_ANOMALY_MULTIPLIER = 3.0;
export const DEFAULT_ANOMALY_WINDOW_MINUTES = 5;
export const DEFAULT_SCORING_WEIGHTS = {
  cost: 0.4,
  latency: 0.3,
  reliability: 0.3,
};
