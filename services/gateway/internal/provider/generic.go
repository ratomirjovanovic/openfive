package provider

import (
	"context"
	"net/http"

	"github.com/openfive/gateway/internal/model"
)

// GenericProvider handles any OpenAI-compatible API endpoint.
type GenericProvider struct {
	inner *OpenRouterProvider
}

func NewGeneric(client *http.Client) *GenericProvider {
	return &GenericProvider{inner: NewOpenRouter(client)}
}

func (p *GenericProvider) Name() string { return "openai_compatible" }

func (p *GenericProvider) Send(ctx context.Context, req *model.ChatCompletionRequest, cfg ProviderConfig) (*model.ChatCompletionResponse, error) {
	return p.inner.Send(ctx, req, cfg)
}

func (p *GenericProvider) SendStream(ctx context.Context, req *model.ChatCompletionRequest, cfg ProviderConfig) (StreamReader, error) {
	return p.inner.SendStream(ctx, req, cfg)
}
