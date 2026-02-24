package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openfive/gateway/internal/model"
)

// Queries provides database operations for the gateway.
type Queries struct {
	pool *pgxpool.Pool
}

func NewQueries(pool *Pool) *Queries {
	return &Queries{pool: pool.Inner()}
}

// FindAPIKeyByHash looks up an active API key by its SHA-256 hash.
func (q *Queries) FindByHash(ctx context.Context, hash string) (*model.APIKey, error) {
	row := q.pool.QueryRow(ctx, `
		SELECT id, environment_id, route_id, key_hash, previous_key_hash,
		       scopes, rate_limit_rpm, is_active
		FROM api_keys
		WHERE key_hash = $1 AND is_active = true
	`, hash)

	var key model.APIKey
	err := row.Scan(
		&key.ID, &key.EnvironmentID, &key.RouteID, &key.KeyHash,
		&key.PreviousHash, &key.Scopes, &key.RateLimitRPM, &key.IsActive,
	)
	if err != nil {
		return nil, fmt.Errorf("key not found: %w", err)
	}
	return &key, nil
}

// FindByPreviousHash looks up a key by its previous hash (rotation grace period).
func (q *Queries) FindByPreviousHash(ctx context.Context, hash string) (*model.APIKey, error) {
	row := q.pool.QueryRow(ctx, `
		SELECT id, environment_id, route_id, key_hash, previous_key_hash,
		       scopes, rate_limit_rpm, is_active
		FROM api_keys
		WHERE previous_key_hash = $1 AND is_active = true
		  AND rotated_at + grace_period > now()
	`, hash)

	var key model.APIKey
	err := row.Scan(
		&key.ID, &key.EnvironmentID, &key.RouteID, &key.KeyHash,
		&key.PreviousHash, &key.Scopes, &key.RateLimitRPM, &key.IsActive,
	)
	if err != nil {
		return nil, fmt.Errorf("key not found: %w", err)
	}
	return &key, nil
}

// LoadEnvironment loads the environment for a given ID, joining through project to get org_id.
func (q *Queries) LoadEnvironment(ctx context.Context, envID string) (*model.Environment, error) {
	row := q.pool.QueryRow(ctx, `
		SELECT e.id, e.project_id, p.organization_id, e.tier,
		       e.budget_mode, e.budget_limit_usd, e.budget_used_usd,
		       e.killswitch_active, e.killswitch_reason,
		       e.anomaly_multiplier, e.anomaly_window
		FROM environments e
		JOIN projects p ON e.project_id = p.id
		WHERE e.id = $1
	`, envID)

	var env model.Environment
	var anomalyWindow time.Duration
	err := row.Scan(
		&env.ID, &env.ProjectID, &env.OrganizationID, &env.Tier,
		&env.BudgetMode, &env.BudgetLimitUSD, &env.BudgetUsedUSD,
		&env.KillswitchActive, &env.KillswitchReason,
		&env.AnomalyMultiplier, &anomalyWindow,
	)
	if err != nil {
		return nil, fmt.Errorf("environment not found: %w", err)
	}
	env.AnomalyWindow = anomalyWindow
	return &env, nil
}

// LoadRoute loads a route by environment ID and slug.
func (q *Queries) LoadRoute(ctx context.Context, envID, slug string) (*model.Route, error) {
	row := q.pool.QueryRow(ctx, `
		SELECT id, environment_id, slug, name, is_active,
		       allowed_models, preferred_model, fallback_chain,
		       constraints, weight_cost, weight_latency, weight_reliability,
		       output_schema, schema_strict,
		       max_tokens_per_request, max_requests_per_min,
		       guardrail_settings, budget_limit_usd
		FROM routes
		WHERE environment_id = $1 AND slug = $2 AND is_active = true
	`, envID, slug)

	var route model.Route
	err := row.Scan(
		&route.ID, &route.EnvironmentID, &route.Slug, &route.Name, &route.IsActive,
		&route.AllowedModels, &route.PreferredModel, &route.FallbackChain,
		&route.Constraints, &route.WeightCost, &route.WeightLatency, &route.WeightReliability,
		&route.OutputSchema, &route.SchemaStrict,
		&route.MaxTokensPerRequest, &route.MaxRequestsPerMin,
		&route.GuardrailSettings, &route.BudgetLimitUSD,
	)
	if err != nil {
		return nil, fmt.Errorf("route not found: %w", err)
	}
	return &route, nil
}

// LoadModelsForEnv loads all active models available for an environment's org.
func (q *Queries) LoadModelsForEnv(ctx context.Context, orgID string) ([]model.ModelInfo, error) {
	rows, err := q.pool.Query(ctx, `
		SELECT m.id, m.provider_id, m.model_id, m.display_name,
		       m.context_window, m.max_output_tokens,
		       m.input_price_per_m, m.output_price_per_m,
		       m.supports_streaming, m.supports_tools,
		       m.supports_vision, m.supports_json_mode,
		       m.avg_latency_ms, m.p99_latency_ms, m.reliability_pct
		FROM models m
		JOIN providers p ON m.provider_id = p.id
		WHERE m.is_active = true
		  AND (p.organization_id = $1 OR p.organization_id IS NULL)
		  AND p.status = 'active'
	`, orgID)
	if err != nil {
		return nil, fmt.Errorf("query models: %w", err)
	}
	defer rows.Close()

	var models []model.ModelInfo
	for rows.Next() {
		var m model.ModelInfo
		err := rows.Scan(
			&m.ID, &m.ProviderID, &m.ModelID, &m.DisplayName,
			&m.ContextWindow, &m.MaxOutputTokens,
			&m.InputPricePerM, &m.OutputPricePerM,
			&m.SupportsStreaming, &m.SupportsTools,
			&m.SupportsVision, &m.SupportsJSONMode,
			&m.AvgLatencyMs, &m.P99LatencyMs, &m.ReliabilityPct,
		)
		if err != nil {
			return nil, fmt.Errorf("scan model: %w", err)
		}
		m.IsActive = true
		models = append(models, m)
	}
	return models, nil
}

// LoadProvider loads a provider by ID.
func (q *Queries) LoadProvider(ctx context.Context, providerID string) (*model.Provider, error) {
	row := q.pool.QueryRow(ctx, `
		SELECT id, name, provider_type, base_url, api_key_enc, status
		FROM providers WHERE id = $1
	`, providerID)

	var p model.Provider
	err := row.Scan(&p.ID, &p.Name, &p.ProviderType, &p.BaseURL, &p.APIKeyEnc, &p.Status)
	if err != nil {
		return nil, fmt.Errorf("provider not found: %w", err)
	}
	return &p, nil
}

// UpdateLastUsed updates the last_used_at timestamp for an API key.
func (q *Queries) UpdateLastUsed(ctx context.Context, keyID string) error {
	_, err := q.pool.Exec(ctx, `
		UPDATE api_keys SET last_used_at = now() WHERE id = $1
	`, keyID)
	return err
}

// IncrementBudgetUsed adds cost to the environment's budget_used_usd.
func (q *Queries) IncrementBudgetUsed(ctx context.Context, envID string, costUSD float64) error {
	_, err := q.pool.Exec(ctx, `
		UPDATE environments
		SET budget_used_usd = budget_used_usd + $2
		WHERE id = $1
	`, envID, costUSD)
	return err
}
