package anomaly

import (
	"sync"
	"time"
)

// CostSample is a single cost observation.
type CostSample struct {
	Timestamp time.Time
	CostUSD   float64
}

// SlidingWindow accumulates cost over a time window.
type SlidingWindow struct {
	samples  []CostSample
	duration time.Duration
}

func NewSlidingWindow(duration time.Duration) *SlidingWindow {
	return &SlidingWindow{
		samples:  make([]CostSample, 0, 100),
		duration: duration,
	}
}

func (sw *SlidingWindow) Add(s CostSample) {
	sw.evict()
	sw.samples = append(sw.samples, s)
}

func (sw *SlidingWindow) Total() float64 {
	sw.evict()
	total := 0.0
	for _, s := range sw.samples {
		total += s.CostUSD
	}
	return total
}

func (sw *SlidingWindow) evict() {
	cutoff := time.Now().Add(-sw.duration)
	i := 0
	for i < len(sw.samples) && sw.samples[i].Timestamp.Before(cutoff) {
		i++
	}
	if i > 0 {
		sw.samples = sw.samples[i:]
	}
}

// Detector monitors cost per environment and fires anomaly alerts.
type Detector struct {
	mu        sync.RWMutex
	windows   map[string]*SlidingWindow
	baselines map[string]float64
}

func NewDetector() *Detector {
	return &Detector{
		windows:   make(map[string]*SlidingWindow),
		baselines: make(map[string]float64),
	}
}

// SetBaseline sets the expected cost per window for an environment.
func (d *Detector) SetBaseline(envID string, baselineCost float64) {
	d.mu.Lock()
	d.baselines[envID] = baselineCost
	d.mu.Unlock()
}

// Observe records a cost sample and returns true if an anomaly is detected.
func (d *Detector) Observe(
	envID string,
	costUSD float64,
	multiplier float64,
	windowDuration time.Duration,
) (anomalyDetected bool, windowTotal float64) {
	d.mu.Lock()
	defer d.mu.Unlock()

	window, ok := d.windows[envID]
	if !ok {
		window = NewSlidingWindow(windowDuration)
		d.windows[envID] = window
	}

	window.Add(CostSample{
		Timestamp: time.Now(),
		CostUSD:   costUSD,
	})

	windowTotal = window.Total()
	baseline, hasBaseline := d.baselines[envID]

	if !hasBaseline {
		// Auto-calculate baseline from first window's data
		// For now, use the window total as a starting baseline
		return false, windowTotal
	}

	// Check if the current window total exceeds the baseline * multiplier
	if baseline > 0 && windowTotal > baseline*multiplier {
		return true, windowTotal
	}

	return false, windowTotal
}
