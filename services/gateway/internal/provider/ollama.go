package provider

import (
	"context"
	"net/http"

	"github.com/openfive/gateway/internal/model"
)

// OllamaProvider reuses the OpenRouter implementation since Ollama
// supports the OpenAI-compatible API at /v1/chat/completions.
type OllamaProvider struct {
	inner *OpenRouterProvider
}

func NewOllama(client *http.Client) *OllamaProvider {
	return &OllamaProvider{inner: NewOpenRouter(client)}
}

func (p *OllamaProvider) Name() string { return "ollama" }

func (p *OllamaProvider) Send(ctx context.Context, req *model.ChatCompletionRequest, cfg ProviderConfig) (*model.ChatCompletionResponse, error) {
	if cfg.APIKey == "" {
		cfg.APIKey = "ollama" // dummy key required by Ollama
	}
	return p.inner.Send(ctx, req, cfg)
}

func (p *OllamaProvider) SendStream(ctx context.Context, req *model.ChatCompletionRequest, cfg ProviderConfig) (StreamReader, error) {
	if cfg.APIKey == "" {
		cfg.APIKey = "ollama"
	}
	return p.inner.SendStream(ctx, req, cfg)
}
