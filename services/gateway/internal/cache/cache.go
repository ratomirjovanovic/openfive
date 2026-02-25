package cache

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"sync"
	"time"
)

// Entry represents a cached response.
type Entry struct {
	Key           string
	Response      []byte
	Model         string
	InputTokens   int
	OutputTokens  int
	CostUSD       float64
	CreatedAt     time.Time
	ExpiresAt     time.Time
	HitCount      int64
	LastAccessedAt time.Time
}

// Stats tracks cache performance metrics.
type Stats struct {
	Hits       int64
	Misses     int64
	Evictions  int64
	Entries    int64
	SavedCost  float64
	mu         sync.RWMutex
}

func (s *Stats) recordHit(savedCost float64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Hits++
	s.SavedCost += savedCost
}

func (s *Stats) recordMiss() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Misses++
}

func (s *Stats) Snapshot() map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()
	total := s.Hits + s.Misses
	hitRate := 0.0
	if total > 0 {
		hitRate = float64(s.Hits) / float64(total) * 100
	}
	return map[string]interface{}{
		"hits":       s.Hits,
		"misses":     s.Misses,
		"evictions":  s.Evictions,
		"entries":    s.Entries,
		"saved_cost": s.SavedCost,
		"hit_rate":   hitRate,
	}
}

// Config holds cache configuration.
type Config struct {
	MaxEntries int
	TTL        time.Duration
	Enabled    bool
}

// DefaultConfig returns sensible defaults.
func DefaultConfig() Config {
	return Config{
		MaxEntries: 10000,
		TTL:        30 * time.Minute,
		Enabled:    true,
	}
}

// Cache provides an in-memory semantic prompt cache.
// It uses a normalized hash of the messages, model, and parameters
// to identify duplicate requests and return cached responses.
type Cache struct {
	mu      sync.RWMutex
	entries map[string]*Entry
	config  Config
	stats   Stats
}

// New creates a new Cache.
func New(cfg Config) *Cache {
	c := &Cache{
		entries: make(map[string]*Entry, cfg.MaxEntries),
		config:  cfg,
	}
	if cfg.Enabled {
		go c.evictionLoop()
	}
	return c
}

// CacheKey generates a deterministic cache key from the request parameters.
// It normalizes messages, model, temperature, and other params to create
// a semantic hash that matches equivalent requests.
func CacheKey(model string, messages interface{}, temperature *float64, maxTokens *int, tools interface{}) string {
	h := sha256.New()

	// Model
	h.Write([]byte(model))
	h.Write([]byte{0})

	// Messages - normalize to JSON
	if msgs, err := json.Marshal(messages); err == nil {
		h.Write(msgs)
	}
	h.Write([]byte{0})

	// Temperature
	if temperature != nil {
		h.Write([]byte(fmt.Sprintf("%.4f", *temperature)))
	} else {
		h.Write([]byte("default"))
	}
	h.Write([]byte{0})

	// Max tokens
	if maxTokens != nil {
		h.Write([]byte(fmt.Sprintf("%d", *maxTokens)))
	} else {
		h.Write([]byte("default"))
	}
	h.Write([]byte{0})

	// Tools
	if tools != nil {
		if t, err := json.Marshal(tools); err == nil {
			h.Write(t)
		}
	}

	return hex.EncodeToString(h.Sum(nil))
}

// Get looks up a cached response.
func (c *Cache) Get(key string) (*Entry, bool) {
	if !c.config.Enabled {
		c.stats.recordMiss()
		return nil, false
	}

	c.mu.RLock()
	entry, exists := c.entries[key]
	c.mu.RUnlock()

	if !exists {
		c.stats.recordMiss()
		return nil, false
	}

	if time.Now().After(entry.ExpiresAt) {
		c.mu.Lock()
		delete(c.entries, key)
		c.stats.Evictions++
		c.stats.Entries--
		c.mu.Unlock()
		c.stats.recordMiss()
		return nil, false
	}

	// Update access stats
	c.mu.Lock()
	entry.HitCount++
	entry.LastAccessedAt = time.Now()
	c.mu.Unlock()

	c.stats.recordHit(entry.CostUSD)
	return entry, true
}

// Set stores a response in the cache.
func (c *Cache) Set(key string, response []byte, model string, inputTokens, outputTokens int, costUSD float64) {
	if !c.config.Enabled {
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	// Evict if at capacity
	if len(c.entries) >= c.config.MaxEntries {
		c.evictLRU()
	}

	now := time.Now()
	c.entries[key] = &Entry{
		Key:            key,
		Response:       response,
		Model:          model,
		InputTokens:    inputTokens,
		OutputTokens:   outputTokens,
		CostUSD:        costUSD,
		CreatedAt:      now,
		ExpiresAt:      now.Add(c.config.TTL),
		HitCount:       0,
		LastAccessedAt: now,
	}
	c.stats.Entries = int64(len(c.entries))
}

// Invalidate removes a specific entry.
func (c *Cache) Invalidate(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if _, exists := c.entries[key]; exists {
		delete(c.entries, key)
		c.stats.Entries--
	}
}

// Clear removes all entries.
func (c *Cache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries = make(map[string]*Entry, c.config.MaxEntries)
	c.stats.Entries = 0
}

// GetStats returns cache performance metrics.
func (c *Cache) GetStats() map[string]interface{} {
	return c.stats.Snapshot()
}

// evictLRU removes the least recently used entry.
// Must be called with mu held.
func (c *Cache) evictLRU() {
	if len(c.entries) == 0 {
		return
	}

	type kv struct {
		key        string
		accessedAt time.Time
	}
	items := make([]kv, 0, len(c.entries))
	for k, v := range c.entries {
		items = append(items, kv{key: k, accessedAt: v.LastAccessedAt})
	}
	sort.Slice(items, func(i, j int) bool {
		return items[i].accessedAt.Before(items[j].accessedAt)
	})

	// Remove oldest 10%
	removeCount := len(items) / 10
	if removeCount < 1 {
		removeCount = 1
	}
	for i := 0; i < removeCount && i < len(items); i++ {
		delete(c.entries, items[i].key)
		c.stats.Evictions++
	}
	c.stats.Entries = int64(len(c.entries))
}

// evictionLoop periodically removes expired entries.
func (c *Cache) evictionLoop() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for key, entry := range c.entries {
			if now.After(entry.ExpiresAt) {
				delete(c.entries, key)
				c.stats.Evictions++
			}
		}
		c.stats.Entries = int64(len(c.entries))
		c.mu.Unlock()
	}
}
