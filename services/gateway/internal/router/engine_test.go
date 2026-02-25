package router

import (
	"testing"

	"github.com/openfive/gateway/internal/model"
)

func TestNewEngine(t *testing.T) {
	e := NewEngine()
	if e == nil {
		t.Fatal("NewEngine() returned nil")
	}
}

func TestEngine_Select_NoCandidates(t *testing.T) {
	e := NewEngine()
	req := &model.ChatCompletionRequest{}
	route := &model.Route{}
	env := &model.Environment{}

	_, err := e.Select(req, route, env, nil, 100)
	if err == nil {
		t.Fatal("expected error when no candidates, got nil")
	}
}

func TestEngine_Select_SingleCandidate(t *testing.T) {
	e := NewEngine()
	req := &model.ChatCompletionRequest{}
	route := &model.Route{
		WeightCost:        0.33,
		WeightLatency:     0.33,
		WeightReliability: 0.34,
	}
	env := &model.Environment{}
	candidates := []model.ModelInfo{
		{
			ID:               "model-1",
			InputPricePerM:   3.0,
			OutputPricePerM:  15.0,
			ReliabilityPct:   99.5,
			SupportsStreaming: true,
			SupportsTools:    true,
		},
	}

	result, err := e.Select(req, route, env, candidates, 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].ID != "model-1" {
		t.Errorf("expected model-1, got %s", result[0].ID)
	}
}

func TestEngine_Select_FiltersByStreaming(t *testing.T) {
	e := NewEngine()
	req := &model.ChatCompletionRequest{Stream: true}
	route := &model.Route{
		WeightCost:        0.33,
		WeightLatency:     0.33,
		WeightReliability: 0.34,
	}
	env := &model.Environment{}
	candidates := []model.ModelInfo{
		{ID: "no-stream", SupportsStreaming: false, ReliabilityPct: 99.0},
		{ID: "has-stream", SupportsStreaming: true, ReliabilityPct: 99.0},
	}

	result, err := e.Select(req, route, env, candidates, 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].ID != "has-stream" {
		t.Errorf("expected has-stream, got %s", result[0].ID)
	}
}

func TestEngine_Select_FiltersByTools(t *testing.T) {
	e := NewEngine()
	req := &model.ChatCompletionRequest{
		Tools: []model.Tool{{Type: "function"}},
	}
	route := &model.Route{
		WeightCost:        0.33,
		WeightLatency:     0.33,
		WeightReliability: 0.34,
	}
	env := &model.Environment{}
	candidates := []model.ModelInfo{
		{ID: "no-tools", SupportsTools: false, ReliabilityPct: 99.0},
		{ID: "has-tools", SupportsTools: true, ReliabilityPct: 99.0},
	}

	result, err := e.Select(req, route, env, candidates, 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].ID != "has-tools" {
		t.Errorf("expected has-tools, got %s", result[0].ID)
	}
}

func TestEngine_Select_AllowedModels(t *testing.T) {
	e := NewEngine()
	req := &model.ChatCompletionRequest{}
	route := &model.Route{
		AllowedModels:     []string{"model-b"},
		WeightCost:        0.33,
		WeightLatency:     0.33,
		WeightReliability: 0.34,
	}
	env := &model.Environment{}
	candidates := []model.ModelInfo{
		{ID: "model-a", ReliabilityPct: 99.0},
		{ID: "model-b", ReliabilityPct: 99.0},
		{ID: "model-c", ReliabilityPct: 99.0},
	}

	result, err := e.Select(req, route, env, candidates, 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 result, got %d", len(result))
	}
	if result[0].ID != "model-b" {
		t.Errorf("expected model-b, got %s", result[0].ID)
	}
}

func TestEngine_Select_FallbackChain(t *testing.T) {
	e := NewEngine()
	req := &model.ChatCompletionRequest{}
	route := &model.Route{
		FallbackChain: []string{"model-b", "model-a"},
	}
	env := &model.Environment{}
	candidates := []model.ModelInfo{
		{ID: "model-a", ReliabilityPct: 99.0},
		{ID: "model-b", ReliabilityPct: 99.0},
	}

	result, err := e.Select(req, route, env, candidates, 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Fatalf("expected 2 results, got %d", len(result))
	}
	if result[0].ID != "model-b" {
		t.Errorf("expected first model-b, got %s", result[0].ID)
	}
	if result[1].ID != "model-a" {
		t.Errorf("expected second model-a, got %s", result[1].ID)
	}
}

func TestEngine_Score_CostWeighted(t *testing.T) {
	e := NewEngine()
	req := &model.ChatCompletionRequest{}
	route := &model.Route{
		WeightCost:        1.0,
		WeightLatency:     0.0,
		WeightReliability: 0.0,
	}
	env := &model.Environment{}

	// Cheaper model should rank first when cost weight is 1.0
	candidates := []model.ModelInfo{
		{ID: "expensive", InputPricePerM: 30.0, OutputPricePerM: 60.0, ReliabilityPct: 99.0},
		{ID: "cheap", InputPricePerM: 0.5, OutputPricePerM: 1.5, ReliabilityPct: 99.0},
	}

	result, err := e.Select(req, route, env, candidates, 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) < 2 {
		t.Fatalf("expected at least 2 results, got %d", len(result))
	}
	if result[0].ID != "cheap" {
		t.Errorf("expected cheap model first with cost weight 1.0, got %s", result[0].ID)
	}
}

func TestEngine_Score_LatencyWeighted(t *testing.T) {
	e := NewEngine()
	req := &model.ChatCompletionRequest{}
	route := &model.Route{
		WeightCost:        0.0,
		WeightLatency:     1.0,
		WeightReliability: 0.0,
	}
	env := &model.Environment{}

	fast := 50
	slow := 500
	candidates := []model.ModelInfo{
		{ID: "slow", AvgLatencyMs: &slow, ReliabilityPct: 99.0},
		{ID: "fast", AvgLatencyMs: &fast, ReliabilityPct: 99.0},
	}

	result, err := e.Select(req, route, env, candidates, 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) < 2 {
		t.Fatalf("expected at least 2 results, got %d", len(result))
	}
	if result[0].ID != "fast" {
		t.Errorf("expected fast model first with latency weight 1.0, got %s", result[0].ID)
	}
}

func TestEngine_Score_ReliabilityWeighted(t *testing.T) {
	e := NewEngine()
	req := &model.ChatCompletionRequest{}
	route := &model.Route{
		WeightCost:        0.0,
		WeightLatency:     0.0,
		WeightReliability: 1.0,
	}
	env := &model.Environment{}

	candidates := []model.ModelInfo{
		{ID: "unreliable", ReliabilityPct: 80.0},
		{ID: "reliable", ReliabilityPct: 99.9},
	}

	result, err := e.Select(req, route, env, candidates, 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) < 2 {
		t.Fatalf("expected at least 2 results, got %d", len(result))
	}
	if result[0].ID != "reliable" {
		t.Errorf("expected reliable model first with reliability weight 1.0, got %s", result[0].ID)
	}
}

func TestEngine_Select_PreferredModel(t *testing.T) {
	e := NewEngine()
	req := &model.ChatCompletionRequest{}
	preferred := "model-c"
	route := &model.Route{
		PreferredModel:    &preferred,
		WeightCost:        0.33,
		WeightLatency:     0.33,
		WeightReliability: 0.34,
	}
	env := &model.Environment{}
	candidates := []model.ModelInfo{
		{ID: "model-a", ReliabilityPct: 99.0, InputPricePerM: 1.0, OutputPricePerM: 2.0},
		{ID: "model-b", ReliabilityPct: 99.0, InputPricePerM: 1.0, OutputPricePerM: 2.0},
		{ID: "model-c", ReliabilityPct: 99.0, InputPricePerM: 1.0, OutputPricePerM: 2.0},
	}

	result, err := e.Select(req, route, env, candidates, 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result[0].ID != "model-c" {
		t.Errorf("expected preferred model-c first, got %s", result[0].ID)
	}
}

func TestEngine_Select_LimitsToThree(t *testing.T) {
	e := NewEngine()
	req := &model.ChatCompletionRequest{}
	route := &model.Route{
		WeightCost:        0.33,
		WeightLatency:     0.33,
		WeightReliability: 0.34,
	}
	env := &model.Environment{}
	candidates := []model.ModelInfo{
		{ID: "m1", ReliabilityPct: 99.0},
		{ID: "m2", ReliabilityPct: 98.0},
		{ID: "m3", ReliabilityPct: 97.0},
		{ID: "m4", ReliabilityPct: 96.0},
		{ID: "m5", ReliabilityPct: 95.0},
	}

	result, err := e.Select(req, route, env, candidates, 100)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 3 {
		t.Errorf("expected max 3 results, got %d", len(result))
	}
}
