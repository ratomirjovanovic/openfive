package router

import (
	"fmt"
	"sort"

	"github.com/openfive/gateway/internal/model"
)

// Engine selects the best model for a request.
type Engine struct{}

func NewEngine() *Engine {
	return &Engine{}
}

// Select returns an ordered list of models to try (primary + fallbacks).
func (e *Engine) Select(
	req *model.ChatCompletionRequest,
	route *model.Route,
	env *model.Environment,
	candidates []model.ModelInfo,
	estimatedInputTokens int,
) ([]model.ModelInfo, error) {
	// Step 1: Filter by capabilities
	filtered := e.filterByCapabilities(candidates, route, req)
	if len(filtered) == 0 {
		return nil, fmt.Errorf("no models match the route constraints")
	}

	// Step 2: Filter by allowed models (if specified)
	if len(route.AllowedModels) > 0 {
		filtered = e.filterByAllowed(filtered, route.AllowedModels)
		if len(filtered) == 0 {
			return nil, fmt.Errorf("no allowed models are available")
		}
	}

	// Step 3: If route has a fallback chain, resolve it
	if len(route.FallbackChain) > 0 {
		return e.resolveChain(route.FallbackChain, filtered), nil
	}

	// Step 4: Score and rank
	scored := e.score(filtered, route)

	// Step 5: Apply preferred model preference
	if route.PreferredModel != nil {
		scored = e.applyPreference(scored, *route.PreferredModel)
	}

	// Return top 3
	if len(scored) > 3 {
		scored = scored[:3]
	}
	return scored, nil
}

func (e *Engine) filterByCapabilities(models []model.ModelInfo, route *model.Route, req *model.ChatCompletionRequest) []model.ModelInfo {
	var result []model.ModelInfo
	for _, m := range models {
		// Check streaming
		if req.Stream && !m.SupportsStreaming {
			continue
		}
		// Check tools
		if len(req.Tools) > 0 && !m.SupportsTools {
			continue
		}
		// Check JSON mode
		if req.ResponseFormat != nil && req.ResponseFormat.Type == "json_object" && !m.SupportsJSONMode {
			continue
		}
		result = append(result, m)
	}
	return result
}

func (e *Engine) filterByAllowed(models []model.ModelInfo, allowed []string) []model.ModelInfo {
	allowedSet := make(map[string]bool)
	for _, id := range allowed {
		allowedSet[id] = true
	}
	var result []model.ModelInfo
	for _, m := range models {
		if allowedSet[m.ID] {
			result = append(result, m)
		}
	}
	return result
}

func (e *Engine) resolveChain(chain []string, available []model.ModelInfo) []model.ModelInfo {
	idMap := make(map[string]model.ModelInfo)
	for _, m := range available {
		idMap[m.ID] = m
	}
	var result []model.ModelInfo
	for _, id := range chain {
		if m, ok := idMap[id]; ok {
			result = append(result, m)
		}
	}
	return result
}

func (e *Engine) score(models []model.ModelInfo, route *model.Route) []model.ModelInfo {
	type scored struct {
		model model.ModelInfo
		score float64
	}

	if len(models) == 0 {
		return nil
	}

	// Normalize values
	var minCost, maxCost, minLat, maxLat float64
	minCost = models[0].InputPricePerM + models[0].OutputPricePerM
	maxCost = minCost

	for _, m := range models {
		cost := m.InputPricePerM + m.OutputPricePerM
		if cost < minCost {
			minCost = cost
		}
		if cost > maxCost {
			maxCost = cost
		}
		lat := float64(0)
		if m.AvgLatencyMs != nil {
			lat = float64(*m.AvgLatencyMs)
		}
		if lat < minLat || minLat == 0 {
			minLat = lat
		}
		if lat > maxLat {
			maxLat = lat
		}
	}

	var items []scored
	for _, m := range models {
		cost := m.InputPricePerM + m.OutputPricePerM
		costNorm := 0.0
		if maxCost > minCost {
			costNorm = 1.0 - (cost-minCost)/(maxCost-minCost)
		} else {
			costNorm = 1.0
		}

		lat := float64(0)
		if m.AvgLatencyMs != nil {
			lat = float64(*m.AvgLatencyMs)
		}
		latNorm := 0.0
		if maxLat > minLat {
			latNorm = 1.0 - (lat-minLat)/(maxLat-minLat)
		} else {
			latNorm = 1.0
		}

		relNorm := m.ReliabilityPct / 100.0

		s := route.WeightCost*costNorm +
			route.WeightLatency*latNorm +
			route.WeightReliability*relNorm

		items = append(items, scored{model: m, score: s})
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].score > items[j].score
	})

	result := make([]model.ModelInfo, len(items))
	for i, item := range items {
		result[i] = item.model
	}
	return result
}

func (e *Engine) applyPreference(models []model.ModelInfo, preferredID string) []model.ModelInfo {
	for i, m := range models {
		if m.ID == preferredID {
			// Move to front
			result := make([]model.ModelInfo, 0, len(models))
			result = append(result, models[i])
			result = append(result, models[:i]...)
			result = append(result, models[i+1:]...)
			return result
		}
	}
	return models
}
