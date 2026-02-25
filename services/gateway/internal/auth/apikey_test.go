package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"testing"
)

func TestHashKey_ConsistentHashes(t *testing.T) {
	key := "sk-test-key-abc123"
	hash1 := HashKey(key)
	hash2 := HashKey(key)

	if hash1 != hash2 {
		t.Errorf("HashKey produced inconsistent results: %q vs %q", hash1, hash2)
	}
}

func TestHashKey_ProducesSHA256(t *testing.T) {
	key := "sk-test-key-abc123"
	got := HashKey(key)

	// Compute expected SHA-256 hash manually
	h := sha256.Sum256([]byte(key))
	want := hex.EncodeToString(h[:])

	if got != want {
		t.Errorf("HashKey(%q) = %q, want %q", key, got, want)
	}
}

func TestHashKey_HexEncoded(t *testing.T) {
	key := "my-secret-key"
	hash := HashKey(key)

	// SHA-256 produces 32 bytes = 64 hex characters
	if len(hash) != 64 {
		t.Errorf("HashKey output length = %d, want 64 hex characters", len(hash))
	}

	// Verify it is valid hex
	_, err := hex.DecodeString(hash)
	if err != nil {
		t.Errorf("HashKey output is not valid hex: %v", err)
	}
}

func TestHashKey_DifferentKeysProduceDifferentHashes(t *testing.T) {
	key1 := "sk-key-one"
	key2 := "sk-key-two"

	hash1 := HashKey(key1)
	hash2 := HashKey(key2)

	if hash1 == hash2 {
		t.Errorf("HashKey produced same hash for different keys: %q and %q both gave %q", key1, key2, hash1)
	}
}

func TestHashKey_EmptyKey(t *testing.T) {
	hash := HashKey("")

	// SHA-256 of empty string is a well-known value
	h := sha256.Sum256([]byte(""))
	want := hex.EncodeToString(h[:])

	if hash != want {
		t.Errorf("HashKey(\"\") = %q, want %q", hash, want)
	}
}
