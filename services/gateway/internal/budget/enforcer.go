package budget

import (
	"github.com/openfive/gateway/internal/model"
)

// Action represents what the budget enforcer decided.
type Action int

const (
	ActionAllow     Action = iota
	ActionDowngrade
	ActionThrottle
	ActionBlock
)

func (a Action) String() string {
	switch a {
	case ActionAllow:
		return "none"
	case ActionDowngrade:
		return "downgrade"
	case ActionThrottle:
		return "throttle"
	case ActionBlock:
		return "block"
	}
	return "none"
}

// Decision is the result of budget evaluation.
type Decision struct {
	Action       Action
	Reason       string
	RemainingUSD float64
	UsedUSD      float64
	LimitUSD     float64
}

// Enforcer checks budgets at the environment and route level.
type Enforcer struct{}

func NewEnforcer() *Enforcer {
	return &Enforcer{}
}

// Evaluate checks the budget and returns a decision.
func (e *Enforcer) Evaluate(
	env *model.Environment,
	route *model.Route,
	estimatedCostUSD float64,
) *Decision {
	// Check environment budget
	if env.BudgetLimitUSD == nil {
		return &Decision{Action: ActionAllow}
	}

	limit := *env.BudgetLimitUSD
	used := env.BudgetUsedUSD
	remaining := limit - used

	// Hard budget: block if exceeded
	if env.BudgetMode == "hard" {
		if remaining <= 0 {
			return &Decision{
				Action:       ActionBlock,
				Reason:       "environment hard budget exceeded",
				RemainingUSD: remaining,
				UsedUSD:      used,
				LimitUSD:     limit,
			}
		}
		if remaining < estimatedCostUSD {
			return &Decision{
				Action:       ActionBlock,
				Reason:       "estimated cost exceeds remaining budget",
				RemainingUSD: remaining,
				UsedUSD:      used,
				LimitUSD:     limit,
			}
		}
	}

	// Soft budget
	if env.BudgetMode == "soft" {
		if remaining <= 0 {
			return &Decision{
				Action:       ActionThrottle,
				Reason:       "environment soft budget exceeded, throttling",
				RemainingUSD: remaining,
				UsedUSD:      used,
				LimitUSD:     limit,
			}
		}
		// Under 10% remaining: downgrade to cheaper model
		if remaining/limit < 0.1 {
			return &Decision{
				Action:       ActionDowngrade,
				Reason:       "less than 10% budget remaining, downgrading model",
				RemainingUSD: remaining,
				UsedUSD:      used,
				LimitUSD:     limit,
			}
		}
	}

	// Check route-level budget
	if route != nil && route.BudgetLimitUSD != nil {
		// Route budget is evaluated similarly but independently
		// For MVP, we only log it, not block
	}

	return &Decision{
		Action:       ActionAllow,
		RemainingUSD: remaining,
		UsedUSD:      used,
		LimitUSD:     limit,
	}
}
