package schema

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/openfive/gateway/internal/model"
	"github.com/openfive/gateway/internal/provider"
)

// Repairer attempts to fix invalid JSON output by re-calling a model.
type Repairer struct {
	registry *provider.Registry
}

func NewRepairer(registry *provider.Registry) *Repairer {
	return &Repairer{registry: registry}
}

// Repair sends a repair prompt to fix invalid output.
func (r *Repairer) Repair(
	ctx context.Context,
	originalOutput string,
	validationErrors []string,
	outputSchema interface{},
	repairModel *model.ModelInfo,
	repairProvider *model.Provider,
) (string, error) {
	prov, ok := r.registry.Get(repairProvider.ProviderType)
	if !ok {
		return "", fmt.Errorf("repair provider type %q not found", repairProvider.ProviderType)
	}

	schemaJSON, _ := json.MarshalIndent(outputSchema, "", "  ")
	errorsStr := strings.Join(validationErrors, "\n- ")

	repairPrompt := fmt.Sprintf(`The following JSON output does not match the required schema.

Output:
%s

Validation errors:
- %s

Required schema:
%s

Return ONLY the corrected JSON. No explanations, no markdown, just valid JSON.`,
		originalOutput, errorsStr, string(schemaJSON))

	req := &model.ChatCompletionRequest{
		Model: repairModel.ModelID,
		Messages: []model.Message{
			{Role: "user", Content: repairPrompt},
		},
	}

	apiKey := ""
	if repairProvider.APIKeyEnc != nil {
		apiKey = *repairProvider.APIKeyEnc // TODO: decrypt
	}

	resp, err := prov.Send(ctx, req, provider.ProviderConfig{
		BaseURL: repairProvider.BaseURL,
		APIKey:  apiKey,
		ModelID: repairModel.ModelID,
	})
	if err != nil {
		return "", fmt.Errorf("repair call failed: %w", err)
	}

	if len(resp.Choices) == 0 || resp.Choices[0].Message == nil {
		return "", fmt.Errorf("repair response has no content")
	}

	content, ok := resp.Choices[0].Message.Content.(string)
	if !ok {
		return "", fmt.Errorf("repair response content is not a string")
	}

	return strings.TrimSpace(content), nil
}
