package budget

import (
	"testing"

	"github.com/openfive/gateway/internal/model"
)

func ptrFloat64(v float64) *float64 {
	return &v
}

func TestEnforcer_NoBudget_Allows(t *testing.T) {
	e := NewEnforcer()
	env := &model.Environment{
		BudgetLimitUSD: nil,
	}

	decision := e.Evaluate(env, nil, 1.0)
	if decision.Action != ActionAllow {
		t.Errorf("expected ActionAllow, got %v", decision.Action)
	}
}

func TestEnforcer_HardBudget_BlocksWhenExceeded(t *testing.T) {
	e := NewEnforcer()
	env := &model.Environment{
		BudgetMode:     "hard",
		BudgetLimitUSD: ptrFloat64(100.0),
		BudgetUsedUSD:  100.0, // exactly at limit, remaining = 0
	}

	decision := e.Evaluate(env, nil, 1.0)
	if decision.Action != ActionBlock {
		t.Errorf("expected ActionBlock when hard budget exceeded, got %v", decision.Action)
	}
	if decision.Reason == "" {
		t.Error("expected a reason for block decision")
	}
}

func TestEnforcer_HardBudget_BlocksWhenOverLimit(t *testing.T) {
	e := NewEnforcer()
	env := &model.Environment{
		BudgetMode:     "hard",
		BudgetLimitUSD: ptrFloat64(100.0),
		BudgetUsedUSD:  110.0, // over limit
	}

	decision := e.Evaluate(env, nil, 1.0)
	if decision.Action != ActionBlock {
		t.Errorf("expected ActionBlock when over hard budget, got %v", decision.Action)
	}
	if decision.RemainingUSD >= 0 {
		t.Errorf("expected negative remaining, got %f", decision.RemainingUSD)
	}
}

func TestEnforcer_HardBudget_BlocksWhenEstimatedCostExceedsRemaining(t *testing.T) {
	e := NewEnforcer()
	env := &model.Environment{
		BudgetMode:     "hard",
		BudgetLimitUSD: ptrFloat64(100.0),
		BudgetUsedUSD:  99.0, // remaining = 1.0
	}

	decision := e.Evaluate(env, nil, 5.0) // estimated cost exceeds remaining
	if decision.Action != ActionBlock {
		t.Errorf("expected ActionBlock when estimated cost exceeds remaining, got %v", decision.Action)
	}
}

func TestEnforcer_HardBudget_AllowsWhenUnderBudget(t *testing.T) {
	e := NewEnforcer()
	env := &model.Environment{
		BudgetMode:     "hard",
		BudgetLimitUSD: ptrFloat64(100.0),
		BudgetUsedUSD:  50.0,
	}

	decision := e.Evaluate(env, nil, 5.0)
	if decision.Action != ActionAllow {
		t.Errorf("expected ActionAllow when under hard budget, got %v", decision.Action)
	}
	if decision.RemainingUSD != 50.0 {
		t.Errorf("expected remaining 50.0, got %f", decision.RemainingUSD)
	}
}

func TestEnforcer_SoftBudget_ThrottlesWhenExceeded(t *testing.T) {
	e := NewEnforcer()
	env := &model.Environment{
		BudgetMode:     "soft",
		BudgetLimitUSD: ptrFloat64(100.0),
		BudgetUsedUSD:  100.0, // remaining = 0
	}

	decision := e.Evaluate(env, nil, 1.0)
	if decision.Action != ActionThrottle {
		t.Errorf("expected ActionThrottle when soft budget exceeded, got %v", decision.Action)
	}
}

func TestEnforcer_SoftBudget_DowngradesWhenLowBudget(t *testing.T) {
	e := NewEnforcer()
	env := &model.Environment{
		BudgetMode:     "soft",
		BudgetLimitUSD: ptrFloat64(100.0),
		BudgetUsedUSD:  95.0, // remaining/limit = 5/100 = 0.05, which is < 0.1
	}

	decision := e.Evaluate(env, nil, 1.0)
	if decision.Action != ActionDowngrade {
		t.Errorf("expected ActionDowngrade when less than 10%% budget remaining, got %v", decision.Action)
	}
}

func TestEnforcer_SoftBudget_AllowsWhenAbove10Percent(t *testing.T) {
	e := NewEnforcer()
	env := &model.Environment{
		BudgetMode:     "soft",
		BudgetLimitUSD: ptrFloat64(100.0),
		BudgetUsedUSD:  50.0, // remaining/limit = 50/100 = 0.5
	}

	decision := e.Evaluate(env, nil, 1.0)
	if decision.Action != ActionAllow {
		t.Errorf("expected ActionAllow when soft budget above 10%%, got %v", decision.Action)
	}
}

func TestEnforcer_DecisionFields(t *testing.T) {
	e := NewEnforcer()
	env := &model.Environment{
		BudgetMode:     "hard",
		BudgetLimitUSD: ptrFloat64(200.0),
		BudgetUsedUSD:  75.0,
	}

	decision := e.Evaluate(env, nil, 5.0)
	if decision.LimitUSD != 200.0 {
		t.Errorf("expected LimitUSD 200.0, got %f", decision.LimitUSD)
	}
	if decision.UsedUSD != 75.0 {
		t.Errorf("expected UsedUSD 75.0, got %f", decision.UsedUSD)
	}
	if decision.RemainingUSD != 125.0 {
		t.Errorf("expected RemainingUSD 125.0, got %f", decision.RemainingUSD)
	}
}

func TestAction_String(t *testing.T) {
	tests := []struct {
		action Action
		want   string
	}{
		{ActionAllow, "none"},
		{ActionDowngrade, "downgrade"},
		{ActionThrottle, "throttle"},
		{ActionBlock, "block"},
	}
	for _, tc := range tests {
		got := tc.action.String()
		if got != tc.want {
			t.Errorf("Action(%d).String() = %q, want %q", tc.action, got, tc.want)
		}
	}
}
