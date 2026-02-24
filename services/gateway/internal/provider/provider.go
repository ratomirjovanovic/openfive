package provider

import (
	"context"
	"io"

	"github.com/openfive/gateway/internal/model"
)

// Provider is the abstraction over LLM API backends.
type Provider interface {
	Name() string
	Send(ctx context.Context, req *model.ChatCompletionRequest, cfg ProviderConfig) (*model.ChatCompletionResponse, error)
	SendStream(ctx context.Context, req *model.ChatCompletionRequest, cfg ProviderConfig) (StreamReader, error)
}

// ProviderConfig holds per-request provider configuration.
type ProviderConfig struct {
	BaseURL   string
	APIKey    string
	ModelID   string
	Headers   map[string]string
	TimeoutMs int
}

// StreamReader reads SSE chunks from a provider.
type StreamReader interface {
	Next() (*model.ChatCompletionChunk, error)
	Close() error
}

// Registry maps provider type names to implementations.
type Registry struct {
	providers map[string]Provider
}

func NewRegistry() *Registry {
	return &Registry{providers: make(map[string]Provider)}
}

func (r *Registry) Register(p Provider) {
	r.providers[p.Name()] = p
}

func (r *Registry) Get(name string) (Provider, bool) {
	p, ok := r.providers[name]
	return p, ok
}

// Ensure unused import is used
var _ = io.EOF
