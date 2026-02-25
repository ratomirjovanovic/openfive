package token

import (
	"math"
	"testing"

	"github.com/openfive/gateway/internal/model"
)

func TestEstimator_countTokens_EmptyString(t *testing.T) {
	e := NewEstimator()
	got := e.countTokens("")
	if got != 0 {
		t.Errorf("countTokens(\"\") = %d, want 0", got)
	}
}

func TestEstimator_countTokens_ShortString(t *testing.T) {
	e := NewEstimator()
	// "hi" is 2 chars -> 2/4 = 0 (integer division)
	got := e.countTokens("hi")
	if got != 0 {
		t.Errorf("countTokens(\"hi\") = %d, want 0", got)
	}
}

func TestEstimator_countTokens_FourChars(t *testing.T) {
	e := NewEstimator()
	// "test" is 4 chars -> 4/4 = 1
	got := e.countTokens("test")
	if got != 1 {
		t.Errorf("countTokens(\"test\") = %d, want 1", got)
	}
}

func TestEstimator_countTokens_LongString(t *testing.T) {
	e := NewEstimator()
	// 100 chars -> 100/4 = 25
	input := make([]byte, 100)
	for i := range input {
		input[i] = 'a'
	}
	got := e.countTokens(string(input))
	if got != 25 {
		t.Errorf("countTokens(100 chars) = %d, want 25", got)
	}
}

func TestEstimator_countTokens_VariousLengths(t *testing.T) {
	e := NewEstimator()
	tests := []struct {
		length int
		want   int
	}{
		{0, 0},
		{1, 0},
		{3, 0},
		{4, 1},
		{7, 1},
		{8, 2},
		{16, 4},
		{400, 100},
	}
	for _, tc := range tests {
		input := make([]byte, tc.length)
		for i := range input {
			input[i] = 'x'
		}
		got := e.countTokens(string(input))
		if got != tc.want {
			t.Errorf("countTokens(%d chars) = %d, want %d", tc.length, got, tc.want)
		}
	}
}

func TestEstimator_EstimateInput_EmptyMessages(t *testing.T) {
	e := NewEstimator()
	got := e.EstimateInput(nil)
	// Only the assistant reply priming overhead: 2
	if got != 2 {
		t.Errorf("EstimateInput(nil) = %d, want 2", got)
	}
}

func TestEstimator_EstimateInput_SingleMessage(t *testing.T) {
	e := NewEstimator()
	messages := []model.Message{
		{
			Role:    "user",
			Content: "Hello, world!", // 13 chars -> 13/4 = 3 tokens
		},
	}
	got := e.EstimateInput(messages)
	// 4 (overhead) + 3 (content tokens) + 2 (priming) = 9
	want := 4 + 3 + 2
	if got != want {
		t.Errorf("EstimateInput = %d, want %d", got, want)
	}
}

func TestEstimator_EstimateInput_WithToolCalls(t *testing.T) {
	e := NewEstimator()
	messages := []model.Message{
		{
			Role:    "assistant",
			Content: "test", // 4 chars -> 1 token
			ToolCalls: []model.ToolCall{
				{
					Function: model.FunctionCall{
						Name:      "get_weather",  // 11 chars -> 2 tokens
						Arguments: `{"city":"NY"}`, // 13 chars -> 3 tokens
					},
				},
			},
		},
	}
	got := e.EstimateInput(messages)
	// 4 (overhead) + 1 (content) + 2 (name) + 3 (args) + 2 (priming) = 12
	want := 4 + 1 + 2 + 3 + 2
	if got != want {
		t.Errorf("EstimateInput with tool calls = %d, want %d", got, want)
	}
}

func TestEstimator_EstimateCost(t *testing.T) {
	e := NewEstimator()
	// 1000 input tokens at $3/M, 500 output tokens at $15/M
	got := e.EstimateCost(1000, 500, 3.0, 15.0)
	// inputCost = 1000/1_000_000 * 3.0 = 0.003
	// outputCost = 500/1_000_000 * 15.0 = 0.0075
	// total = 0.0105
	want := 0.0105
	if math.Abs(got-want) > 1e-10 {
		t.Errorf("EstimateCost = %f, want %f", got, want)
	}
}

func TestEstimator_EstimateCost_Zero(t *testing.T) {
	e := NewEstimator()
	got := e.EstimateCost(0, 0, 3.0, 15.0)
	if got != 0 {
		t.Errorf("EstimateCost(0, 0, ...) = %f, want 0", got)
	}
}

func TestEstimator_EstimateOutput_WithMaxTokens(t *testing.T) {
	e := NewEstimator()
	maxTokens := 500
	req := &model.ChatCompletionRequest{
		MaxTokens: &maxTokens,
	}
	got := e.EstimateOutput(req, nil, 1000)
	if got != 500 {
		t.Errorf("EstimateOutput with MaxTokens = %d, want 500", got)
	}
}

func TestEstimator_EstimateOutput_Heuristic(t *testing.T) {
	e := NewEstimator()
	req := &model.ChatCompletionRequest{}
	got := e.EstimateOutput(req, nil, 800)
	// 800 / 4 = 200
	if got != 200 {
		t.Errorf("EstimateOutput heuristic = %d, want 200", got)
	}
}

func TestEstimator_EstimateOutput_MinimumFloor(t *testing.T) {
	e := NewEstimator()
	req := &model.ChatCompletionRequest{}
	got := e.EstimateOutput(req, nil, 100)
	// 100 / 4 = 25, which is < 100, so should return 100
	if got != 100 {
		t.Errorf("EstimateOutput minimum floor = %d, want 100", got)
	}
}

func TestEstimator_EstimateOutput_CappedByModelMax(t *testing.T) {
	e := NewEstimator()
	req := &model.ChatCompletionRequest{}
	modelMax := 50
	got := e.EstimateOutput(req, &modelMax, 10000)
	// 10000 / 4 = 2500, but modelMax is 50
	if got != 50 {
		t.Errorf("EstimateOutput capped by model max = %d, want 50", got)
	}
}

func TestContentToString_Nil(t *testing.T) {
	got := contentToString(nil)
	if got != "" {
		t.Errorf("contentToString(nil) = %q, want \"\"", got)
	}
}

func TestContentToString_String(t *testing.T) {
	got := contentToString("hello world")
	if got != "hello world" {
		t.Errorf("contentToString(\"hello world\") = %q, want \"hello world\"", got)
	}
}
