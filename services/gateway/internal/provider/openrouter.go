package provider

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/openfive/gateway/internal/model"
)

type OpenRouterProvider struct {
	client *http.Client
}

func NewOpenRouter(client *http.Client) *OpenRouterProvider {
	return &OpenRouterProvider{client: client}
}

func (p *OpenRouterProvider) Name() string { return "openrouter" }

func (p *OpenRouterProvider) Send(ctx context.Context, req *model.ChatCompletionRequest, cfg ProviderConfig) (*model.ChatCompletionResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", cfg.BaseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+cfg.APIKey)
	httpReq.Header.Set("HTTP-Referer", "https://openfive.dev")
	httpReq.Header.Set("X-Title", "OpenFive Gateway")
	for k, v := range cfg.Headers {
		httpReq.Header.Set(k, v)
	}

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("provider error %d: %s", resp.StatusCode, string(respBody))
	}

	var result model.ChatCompletionResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &result, nil
}

func (p *OpenRouterProvider) SendStream(ctx context.Context, req *model.ChatCompletionRequest, cfg ProviderConfig) (StreamReader, error) {
	streamReq := *req
	streamReq.Stream = true

	body, err := json.Marshal(streamReq)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", cfg.BaseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+cfg.APIKey)
	httpReq.Header.Set("HTTP-Referer", "https://openfive.dev")
	httpReq.Header.Set("X-Title", "OpenFive Gateway")
	for k, v := range cfg.Headers {
		httpReq.Header.Set(k, v)
	}

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		defer resp.Body.Close()
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("provider error %d: %s", resp.StatusCode, string(respBody))
	}

	return &sseReader{
		scanner: bufio.NewScanner(resp.Body),
		body:    resp.Body,
	}, nil
}

type sseReader struct {
	scanner *bufio.Scanner
	body    io.ReadCloser
}

func (r *sseReader) Next() (*model.ChatCompletionChunk, error) {
	for r.scanner.Scan() {
		line := r.scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		data := strings.TrimPrefix(line, "data: ")
		if data == "[DONE]" {
			return nil, io.EOF
		}

		var chunk model.ChatCompletionChunk
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			continue // skip malformed chunks
		}
		return &chunk, nil
	}
	if err := r.scanner.Err(); err != nil {
		return nil, err
	}
	return nil, io.EOF
}

func (r *sseReader) Close() error {
	return r.body.Close()
}
