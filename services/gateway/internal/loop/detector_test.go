package loop

import (
	"testing"
)

func TestDetector_CheckPrompt_NoRepeat(t *testing.T) {
	d := NewDetector()

	// First occurrence should not be detected as a loop
	detected := d.CheckPrompt("env1", "route1", "hash-abc", 3, 60)
	if detected {
		t.Error("expected no loop detection on first occurrence")
	}
}

func TestDetector_CheckPrompt_DetectsRepeatedHashes(t *testing.T) {
	d := NewDetector()

	// maxIdentical = 2, so the 3rd identical prompt should trigger detection
	d.CheckPrompt("env1", "route1", "hash-repeated", 2, 60)
	d.CheckPrompt("env1", "route1", "hash-repeated", 2, 60)
	detected := d.CheckPrompt("env1", "route1", "hash-repeated", 2, 60)

	if !detected {
		t.Error("expected loop detection after exceeding maxIdentical")
	}
}

func TestDetector_CheckPrompt_DifferentHashesNotDetected(t *testing.T) {
	d := NewDetector()

	d.CheckPrompt("env1", "route1", "hash-a", 2, 60)
	d.CheckPrompt("env1", "route1", "hash-b", 2, 60)
	detected := d.CheckPrompt("env1", "route1", "hash-c", 2, 60)

	if detected {
		t.Error("expected no loop detection for different hashes")
	}
}

func TestDetector_CheckPrompt_DifferentEnvRouteIsolated(t *testing.T) {
	d := NewDetector()

	// Same hash but different env/route should be independent
	d.CheckPrompt("env1", "route1", "hash-x", 1, 60)
	detected := d.CheckPrompt("env2", "route2", "hash-x", 1, 60)

	if detected {
		t.Error("expected no loop detection for different env/route combinations")
	}
}

func TestDetector_CheckPrompt_EmptyHashNeverDetects(t *testing.T) {
	d := NewDetector()

	detected := d.CheckPrompt("env1", "route1", "", 1, 60)
	if detected {
		t.Error("expected no loop detection for empty prompt hash")
	}
}

func TestDetector_CheckPrompt_ZeroMaxNeverDetects(t *testing.T) {
	d := NewDetector()

	detected := d.CheckPrompt("env1", "route1", "hash-abc", 0, 60)
	if detected {
		t.Error("expected no loop detection when maxIdentical is 0")
	}
}

func TestDetector_CheckPrompt_NegativeMaxNeverDetects(t *testing.T) {
	d := NewDetector()

	detected := d.CheckPrompt("env1", "route1", "hash-abc", -1, 60)
	if detected {
		t.Error("expected no loop detection when maxIdentical is negative")
	}
}

func TestDetector_CheckToolCalls_UnderLimit(t *testing.T) {
	d := NewDetector()

	exceeded := d.CheckToolCalls(5, 10)
	if exceeded {
		t.Error("expected no limit exceeded when count < max")
	}
}

func TestDetector_CheckToolCalls_AtLimit(t *testing.T) {
	d := NewDetector()

	exceeded := d.CheckToolCalls(10, 10)
	if exceeded {
		t.Error("expected no limit exceeded when count == max")
	}
}

func TestDetector_CheckToolCalls_OverLimit(t *testing.T) {
	d := NewDetector()

	exceeded := d.CheckToolCalls(11, 10)
	if !exceeded {
		t.Error("expected limit exceeded when count > max")
	}
}

func TestDetector_CheckToolCalls_ZeroMaxNeverExceeds(t *testing.T) {
	d := NewDetector()

	exceeded := d.CheckToolCalls(100, 0)
	if exceeded {
		t.Error("expected no limit exceeded when max is 0 (disabled)")
	}
}

func TestDetector_CheckToolCalls_NegativeMaxNeverExceeds(t *testing.T) {
	d := NewDetector()

	exceeded := d.CheckToolCalls(100, -1)
	if exceeded {
		t.Error("expected no limit exceeded when max is negative (disabled)")
	}
}

func TestDetector_Cleanup(t *testing.T) {
	d := NewDetector()

	// Add some entries
	d.CheckPrompt("env1", "route1", "hash-a", 10, 60)
	d.CheckPrompt("env1", "route1", "hash-b", 10, 60)

	// Cleanup with 0 duration should clear everything since entries are "now"
	// but since time.Now() - 0 = now, entries at Now are not After(now), so they get removed
	// Actually entries are at time.Now() which is not After(time.Now()), so they should be removed
	d.Cleanup(0)

	// After cleanup with 0 age, new checks should start fresh
	detected := d.CheckPrompt("env1", "route1", "hash-a", 1, 60)
	if detected {
		t.Error("expected fresh start after cleanup")
	}
}
