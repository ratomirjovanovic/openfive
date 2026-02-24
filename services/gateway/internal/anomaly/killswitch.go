package anomaly

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// KillSwitch manages the kill-switch state for environments.
type KillSwitch struct {
	pool *pgxpool.Pool
}

func NewKillSwitch(pool *pgxpool.Pool) *KillSwitch {
	return &KillSwitch{pool: pool}
}

// Activate turns on the kill switch for an environment.
func (ks *KillSwitch) Activate(ctx context.Context, envID, reason string, triggerData map[string]interface{}) error {
	tx, err := ks.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Update environment
	_, err = tx.Exec(ctx, `
		UPDATE environments
		SET killswitch_active = true,
		    killswitch_reason = $2,
		    killswitch_at = now()
		WHERE id = $1
	`, envID, reason)
	if err != nil {
		return fmt.Errorf("update environment: %w", err)
	}

	// Create incident
	_, err = tx.Exec(ctx, `
		INSERT INTO incidents (environment_id, severity, status, incident_type,
		                       title, description, trigger_data, killswitch_activated)
		VALUES ($1, 'critical', 'open', 'killswitch_activated',
		        $2, $3, $4, true)
	`, envID, "Kill switch activated: "+reason, reason, triggerData)
	if err != nil {
		return fmt.Errorf("create incident: %w", err)
	}

	return tx.Commit(ctx)
}

// Deactivate turns off the kill switch for an environment.
func (ks *KillSwitch) Deactivate(ctx context.Context, envID string) error {
	_, err := ks.pool.Exec(ctx, `
		UPDATE environments
		SET killswitch_active = false,
		    killswitch_reason = NULL,
		    killswitch_at = NULL
		WHERE id = $1
	`, envID)
	return err
}

// ensure time is used
var _ = time.Now
