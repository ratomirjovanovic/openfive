package meter

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openfive/gateway/internal/model"
)

// Writer batches request records and flushes them to the database.
type Writer struct {
	pool      *pgxpool.Pool
	buffer    []model.RequestRecord
	mu        sync.Mutex
	batchSize int
	flushMs   int
	done      chan struct{}
}

func NewWriter(pool *pgxpool.Pool, batchSize, flushMs int) *Writer {
	w := &Writer{
		pool:      pool,
		buffer:    make([]model.RequestRecord, 0, batchSize),
		batchSize: batchSize,
		flushMs:   flushMs,
		done:      make(chan struct{}),
	}
	go w.flushLoop()
	return w
}

// Record adds a request record to the buffer.
func (w *Writer) Record(rec model.RequestRecord) {
	w.mu.Lock()
	w.buffer = append(w.buffer, rec)
	shouldFlush := len(w.buffer) >= w.batchSize
	w.mu.Unlock()

	if shouldFlush {
		w.Flush()
	}
}

// Flush writes all buffered records to the database.
func (w *Writer) Flush() {
	w.mu.Lock()
	if len(w.buffer) == 0 {
		w.mu.Unlock()
		return
	}
	batch := w.buffer
	w.buffer = make([]model.RequestRecord, 0, w.batchSize)
	w.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	for _, rec := range batch {
		_, err := w.pool.Exec(ctx, `
			INSERT INTO requests (
				environment_id, route_id, api_key_id, request_id,
				started_at, completed_at, duration_ms, status,
				model_id, provider_id, model_identifier,
				input_tokens, output_tokens, estimated_tokens,
				input_cost_usd, output_cost_usd, total_cost_usd,
				prompt_hash, is_streaming, tool_call_count,
				attempt_number, fallback_reason,
				schema_valid, schema_repair_attempts,
				error_code, error_message, action_taken
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
				$11, $12, $13, $14, $15, $16, $17, $18, $19,
				$20, $21, $22, $23, $24, $25, $26, $27
			)
		`,
			rec.EnvironmentID, rec.RouteID, rec.APIKeyID, rec.RequestID,
			rec.StartedAt, rec.CompletedAt, rec.DurationMs, rec.Status,
			rec.ModelID, rec.ProviderID, rec.ModelIdentifier,
			rec.InputTokens, rec.OutputTokens, rec.EstimatedTokens,
			rec.InputCostUSD, rec.OutputCostUSD, rec.TotalCostUSD,
			rec.PromptHash, rec.IsStreaming, rec.ToolCallCount,
			rec.AttemptNumber, rec.FallbackReason,
			rec.SchemaValid, rec.SchemaRepairAttempts,
			rec.ErrorCode, rec.ErrorMessage, rec.ActionTaken,
		)
		if err != nil {
			log.Printf("meter write error: %v", err)
		}
	}
}

func (w *Writer) flushLoop() {
	ticker := time.NewTicker(time.Duration(w.flushMs) * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			w.Flush()
		case <-w.done:
			w.Flush()
			return
		}
	}
}

// Close stops the flush loop and writes remaining records.
func (w *Writer) Close() {
	close(w.done)
}
