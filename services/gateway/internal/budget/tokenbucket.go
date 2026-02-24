package budget

import (
	"sync"
	"time"
)

// TokenBucket implements a per-environment/route rate limiter.
type TokenBucket struct {
	mu       sync.Mutex
	tokens   float64
	capacity float64
	rate     float64
	lastTime time.Time
}

func NewTokenBucket(maxPerMinute int) *TokenBucket {
	cap := float64(maxPerMinute)
	return &TokenBucket{
		tokens:   cap,
		capacity: cap,
		rate:     cap / 60.0,
		lastTime: time.Now(),
	}
}

// Allow checks if a request is allowed and consumes a token if so.
func (tb *TokenBucket) Allow() bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(tb.lastTime).Seconds()
	tb.lastTime = now

	// Refill tokens
	tb.tokens += elapsed * tb.rate
	if tb.tokens > tb.capacity {
		tb.tokens = tb.capacity
	}

	if tb.tokens < 1 {
		return false
	}

	tb.tokens--
	return true
}

// RateLimiter manages token buckets per key.
type RateLimiter struct {
	mu      sync.RWMutex
	buckets map[string]*TokenBucket
}

func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		buckets: make(map[string]*TokenBucket),
	}
}

// Allow checks if a request for the given key is allowed.
func (rl *RateLimiter) Allow(key string, maxPerMinute int) bool {
	rl.mu.RLock()
	bucket, ok := rl.buckets[key]
	rl.mu.RUnlock()

	if !ok {
		rl.mu.Lock()
		bucket, ok = rl.buckets[key]
		if !ok {
			bucket = NewTokenBucket(maxPerMinute)
			rl.buckets[key] = bucket
		}
		rl.mu.Unlock()
	}

	return bucket.Allow()
}
