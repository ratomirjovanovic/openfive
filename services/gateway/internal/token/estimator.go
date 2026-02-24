package token

import (
	"encoding/json"
	"fmt"

	"github.com/openfive/gateway/internal/model"
)

// Estimator estimates token counts for requests before sending to providers.
// Uses a character-based heuristic (1 token ~ 4 chars) since tiktoken
// requires CGO or a WASM runtime. This is sufficient for budget pre-checks.
type Estimator struct{}

func NewEstimator() *Estimator {
	return &Estimator{}
}

// EstimateInput estimates the number of input tokens for a messages array.
func (e *Estimator) EstimateInput(messages []model.Message) int {
	total := 0
	for _, m := range messages {
		total += 4 // role + separators overhead
		total += e.countTokens(contentToString(m.Content))
		for _, tc := range m.ToolCalls {
			total += e.countTokens(tc.Function.Name)
			total += e.countTokens(tc.Function.Arguments)
		}
	}
	total += 2 // assistant reply priming
	return total
}

// EstimateOutput estimates output tokens using max_tokens or a heuristic.
func (e *Estimator) EstimateOutput(req *model.ChatCompletionRequest, modelMaxOutput *int, inputTokens int) int {
	if req.MaxTokens != nil {
		return *req.MaxTokens
	}
	est := inputTokens / 4
	if modelMaxOutput != nil && est > *modelMaxOutput {
		return *modelMaxOutput
	}
	if est < 100 {
		return 100
	}
	return est
}

// EstimateCost estimates the cost in USD for a request.
func (e *Estimator) EstimateCost(inputTokens, outputTokens int, inputPricePerM, outputPricePerM float64) float64 {
	inputCost := float64(inputTokens) / 1_000_000 * inputPricePerM
	outputCost := float64(outputTokens) / 1_000_000 * outputPricePerM
	return inputCost + outputCost
}

func (e *Estimator) countTokens(text string) int {
	if len(text) == 0 {
		return 0
	}
	return len(text) / 4
}

func contentToString(content interface{}) string {
	if content == nil {
		return ""
	}
	switch v := content.(type) {
	case string:
		return v
	default:
		b, err := json.Marshal(v)
		if err != nil {
			return fmt.Sprintf("%v", v)
		}
		return string(b)
	}
}
