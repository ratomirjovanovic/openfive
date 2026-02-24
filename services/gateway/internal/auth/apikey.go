package auth

import (
	"context"
	"crypto/sha256"
	"fmt"
	"strings"

	"github.com/openfive/gateway/internal/model"
)

// KeyLookup defines the interface for looking up API keys.
type KeyLookup interface {
	FindByHash(ctx context.Context, hash string) (*model.APIKey, error)
	FindByPreviousHash(ctx context.Context, hash string) (*model.APIKey, error)
}

// Authenticator validates API keys from request headers.
type Authenticator struct {
	lookup KeyLookup
}

func NewAuthenticator(lookup KeyLookup) *Authenticator {
	return &Authenticator{lookup: lookup}
}

// Authenticate extracts and validates the API key from the Authorization header.
func (a *Authenticator) Authenticate(ctx context.Context, authHeader string) (*model.APIKey, error) {
	if authHeader == "" {
		return nil, fmt.Errorf("missing Authorization header")
	}

	token := strings.TrimPrefix(authHeader, "Bearer ")
	if token == authHeader {
		return nil, fmt.Errorf("invalid Authorization header format")
	}

	hash := HashKey(token)

	key, err := a.lookup.FindByHash(ctx, hash)
	if err != nil {
		// Try previous hash for key rotation grace period
		key, err = a.lookup.FindByPreviousHash(ctx, hash)
		if err != nil {
			return nil, fmt.Errorf("invalid API key")
		}
	}

	if !key.IsActive {
		return nil, fmt.Errorf("API key is revoked")
	}

	return key, nil
}

// HashKey computes the SHA-256 hash of an API key.
func HashKey(key string) string {
	h := sha256.Sum256([]byte(key))
	return fmt.Sprintf("%x", h)
}
