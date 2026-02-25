package cache

import (
	"testing"
	"time"
)

func TestCacheKey_Deterministic(t *testing.T) {
	temp := 0.7
	maxTok := 100

	key1 := CacheKey("gpt-4", []map[string]string{{"role": "user", "content": "hello"}}, &temp, &maxTok, nil)
	key2 := CacheKey("gpt-4", []map[string]string{{"role": "user", "content": "hello"}}, &temp, &maxTok, nil)

	if key1 != key2 {
		t.Errorf("Same inputs produced different keys: %s vs %s", key1, key2)
	}
}

func TestCacheKey_DifferentModel(t *testing.T) {
	temp := 0.7
	key1 := CacheKey("gpt-4", []map[string]string{{"role": "user", "content": "hello"}}, &temp, nil, nil)
	key2 := CacheKey("gpt-3.5", []map[string]string{{"role": "user", "content": "hello"}}, &temp, nil, nil)

	if key1 == key2 {
		t.Error("Different models should produce different keys")
	}
}

func TestCacheKey_DifferentMessages(t *testing.T) {
	temp := 0.7
	key1 := CacheKey("gpt-4", []map[string]string{{"role": "user", "content": "hello"}}, &temp, nil, nil)
	key2 := CacheKey("gpt-4", []map[string]string{{"role": "user", "content": "world"}}, &temp, nil, nil)

	if key1 == key2 {
		t.Error("Different messages should produce different keys")
	}
}

func TestCacheKey_NilParams(t *testing.T) {
	key1 := CacheKey("gpt-4", nil, nil, nil, nil)
	key2 := CacheKey("gpt-4", nil, nil, nil, nil)

	if key1 != key2 {
		t.Error("Same nil params should produce same keys")
	}
}

func TestCache_SetAndGet(t *testing.T) {
	c := New(Config{MaxEntries: 100, TTL: 5 * time.Minute, Enabled: true})

	key := "test-key"
	response := []byte(`{"choices":[]}`)

	c.Set(key, response, "gpt-4", 100, 50, 0.005)

	entry, ok := c.Get(key)
	if !ok {
		t.Fatal("Expected cache hit")
	}
	if string(entry.Response) != string(response) {
		t.Errorf("Response mismatch: got %s", entry.Response)
	}
	if entry.Model != "gpt-4" {
		t.Errorf("Model mismatch: got %s", entry.Model)
	}
	if entry.InputTokens != 100 {
		t.Errorf("InputTokens mismatch: got %d", entry.InputTokens)
	}
	if entry.CostUSD != 0.005 {
		t.Errorf("CostUSD mismatch: got %f", entry.CostUSD)
	}
}

func TestCache_Miss(t *testing.T) {
	c := New(Config{MaxEntries: 100, TTL: 5 * time.Minute, Enabled: true})

	_, ok := c.Get("nonexistent")
	if ok {
		t.Error("Expected cache miss")
	}

	stats := c.GetStats()
	if stats["misses"].(int64) != 1 {
		t.Errorf("Expected 1 miss, got %v", stats["misses"])
	}
}

func TestCache_TTLExpiry(t *testing.T) {
	c := New(Config{MaxEntries: 100, TTL: 1 * time.Millisecond, Enabled: true})

	c.Set("key", []byte("response"), "gpt-4", 10, 5, 0.001)
	time.Sleep(5 * time.Millisecond)

	_, ok := c.Get("key")
	if ok {
		t.Error("Expected cache miss after TTL expiry")
	}
}

func TestCache_Disabled(t *testing.T) {
	c := New(Config{MaxEntries: 100, TTL: 5 * time.Minute, Enabled: false})

	c.Set("key", []byte("response"), "gpt-4", 10, 5, 0.001)

	_, ok := c.Get("key")
	if ok {
		t.Error("Expected cache miss when disabled")
	}
}

func TestCache_Invalidate(t *testing.T) {
	c := New(Config{MaxEntries: 100, TTL: 5 * time.Minute, Enabled: true})

	c.Set("key", []byte("response"), "gpt-4", 10, 5, 0.001)
	c.Invalidate("key")

	_, ok := c.Get("key")
	if ok {
		t.Error("Expected cache miss after invalidation")
	}
}

func TestCache_Clear(t *testing.T) {
	c := New(Config{MaxEntries: 100, TTL: 5 * time.Minute, Enabled: true})

	c.Set("key1", []byte("r1"), "gpt-4", 10, 5, 0.001)
	c.Set("key2", []byte("r2"), "gpt-4", 10, 5, 0.001)
	c.Clear()

	_, ok1 := c.Get("key1")
	_, ok2 := c.Get("key2")
	if ok1 || ok2 {
		t.Error("Expected all entries cleared")
	}
}

func TestCache_Eviction(t *testing.T) {
	c := New(Config{MaxEntries: 5, TTL: 5 * time.Minute, Enabled: true})

	for i := 0; i < 10; i++ {
		c.Set(CacheKey("gpt-4", i, nil, nil, nil), []byte("r"), "gpt-4", 10, 5, 0.001)
	}

	c.mu.RLock()
	count := len(c.entries)
	c.mu.RUnlock()

	if count > 5 {
		t.Errorf("Expected max 5 entries after eviction, got %d", count)
	}
}

func TestCache_HitStats(t *testing.T) {
	c := New(Config{MaxEntries: 100, TTL: 5 * time.Minute, Enabled: true})

	c.Set("key", []byte("response"), "gpt-4", 10, 5, 0.005)

	c.Get("key")
	c.Get("key")
	c.Get("key")

	stats := c.GetStats()
	if stats["hits"].(int64) != 3 {
		t.Errorf("Expected 3 hits, got %v", stats["hits"])
	}
	if stats["saved_cost"].(float64) != 0.015 {
		t.Errorf("Expected saved_cost 0.015, got %v", stats["saved_cost"])
	}
	if stats["hit_rate"].(float64) != 100.0 {
		t.Errorf("Expected 100%% hit rate, got %v", stats["hit_rate"])
	}
}

func TestCache_AccessCountIncrements(t *testing.T) {
	c := New(Config{MaxEntries: 100, TTL: 5 * time.Minute, Enabled: true})

	c.Set("key", []byte("response"), "gpt-4", 10, 5, 0.001)
	c.Get("key")
	c.Get("key")

	entry, _ := c.Get("key")
	if entry.HitCount != 3 {
		t.Errorf("Expected hit count 3, got %d", entry.HitCount)
	}
}
