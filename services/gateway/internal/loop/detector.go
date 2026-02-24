package loop

import (
	"sync"
	"time"
)

// Detector identifies agentic loops via repeated prompt hashes.
type Detector struct {
	mu      sync.RWMutex
	history map[string]map[string][]time.Time // key: envID+routeID -> promptHash -> timestamps
}

func NewDetector() *Detector {
	return &Detector{
		history: make(map[string]map[string][]time.Time),
	}
}

// CheckPrompt returns true if this prompt hash is repeated too many times.
func (d *Detector) CheckPrompt(
	envID, routeID string,
	promptHash string,
	maxIdentical int,
	windowSeconds int,
) bool {
	if maxIdentical <= 0 || promptHash == "" {
		return false
	}

	key := envID + ":" + routeID
	cutoff := time.Now().Add(-time.Duration(windowSeconds) * time.Second)

	d.mu.Lock()
	defer d.mu.Unlock()

	if d.history[key] == nil {
		d.history[key] = make(map[string][]time.Time)
	}

	// Evict old entries
	timestamps := d.history[key][promptHash]
	var recent []time.Time
	for _, t := range timestamps {
		if t.After(cutoff) {
			recent = append(recent, t)
		}
	}

	// Add current
	recent = append(recent, time.Now())
	d.history[key][promptHash] = recent

	return len(recent) > maxIdentical
}

// CheckToolCalls returns true if the tool call count exceeds the limit.
func (d *Detector) CheckToolCalls(count int, max int) bool {
	if max <= 0 {
		return false
	}
	return count > max
}

// Cleanup removes stale entries older than the given duration.
func (d *Detector) Cleanup(maxAge time.Duration) {
	d.mu.Lock()
	defer d.mu.Unlock()

	cutoff := time.Now().Add(-maxAge)
	for key, hashes := range d.history {
		for hash, timestamps := range hashes {
			var recent []time.Time
			for _, t := range timestamps {
				if t.After(cutoff) {
					recent = append(recent, t)
				}
			}
			if len(recent) == 0 {
				delete(hashes, hash)
			} else {
				hashes[hash] = recent
			}
		}
		if len(hashes) == 0 {
			delete(d.history, key)
		}
	}
}
