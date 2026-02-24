package model

import (
	"time"
)

// ChatCompletionRequest is the OpenAI-compatible request body.
type ChatCompletionRequest struct {
	Model          string          `json:"model"`
	Messages       []Message       `json:"messages"`
	Stream         bool            `json:"stream,omitempty"`
	Temperature    *float64        `json:"temperature,omitempty"`
	MaxTokens      *int            `json:"max_tokens,omitempty"`
	Tools          []Tool          `json:"tools,omitempty"`
	ToolChoice     interface{}     `json:"tool_choice,omitempty"`
	ResponseFormat *ResponseFormat `json:"response_format,omitempty"`
	Stop           interface{}     `json:"stop,omitempty"`
	TopP           *float64        `json:"top_p,omitempty"`
	N              *int            `json:"n,omitempty"`
	User           string          `json:"user,omitempty"`
}

type Message struct {
	Role       string      `json:"role"`
	Content    interface{} `json:"content"`
	Name       string      `json:"name,omitempty"`
	ToolCalls  []ToolCall  `json:"tool_calls,omitempty"`
	ToolCallID string      `json:"tool_call_id,omitempty"`
}

type Tool struct {
	Type     string      `json:"type"`
	Function FunctionDef `json:"function"`
}

type FunctionDef struct {
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
	Parameters  interface{} `json:"parameters,omitempty"`
}

type ToolCall struct {
	ID       string       `json:"id"`
	Type     string       `json:"type"`
	Function FunctionCall `json:"function"`
}

type FunctionCall struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type ResponseFormat struct {
	Type       string      `json:"type"`
	JSONSchema interface{} `json:"json_schema,omitempty"`
}

// ChatCompletionResponse is the OpenAI-compatible response.
type ChatCompletionResponse struct {
	ID      string   `json:"id"`
	Object  string   `json:"object"`
	Created int64    `json:"created"`
	Model   string   `json:"model"`
	Choices []Choice `json:"choices"`
	Usage   *Usage   `json:"usage,omitempty"`
}

type Choice struct {
	Index        int      `json:"index"`
	Message      *Message `json:"message,omitempty"`
	Delta        *Message `json:"delta,omitempty"`
	FinishReason *string  `json:"finish_reason,omitempty"`
}

type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// ChatCompletionChunk is an SSE streaming chunk.
type ChatCompletionChunk struct {
	ID      string   `json:"id"`
	Object  string   `json:"object"`
	Created int64    `json:"created"`
	Model   string   `json:"model"`
	Choices []Choice `json:"choices"`
	Usage   *Usage   `json:"usage,omitempty"`
}

// ErrorResponse is the OpenAI-compatible error format.
type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Message string `json:"message"`
	Type    string `json:"type"`
	Code    string `json:"code,omitempty"`
}

// --- Internal domain types ---

type Environment struct {
	ID                string
	ProjectID         string
	OrganizationID    string
	Tier              string
	BudgetMode        string
	BudgetLimitUSD    *float64
	BudgetUsedUSD     float64
	KillswitchActive  bool
	KillswitchReason  *string
	AnomalyMultiplier float64
	AnomalyWindow     time.Duration
}

type Route struct {
	ID                  string
	EnvironmentID       string
	Slug                string
	Name                string
	IsActive            bool
	AllowedModels       []string
	PreferredModel      *string
	FallbackChain       []string
	Constraints         map[string]interface{}
	WeightCost          float64
	WeightLatency       float64
	WeightReliability   float64
	OutputSchema        interface{}
	SchemaStrict        bool
	MaxTokensPerRequest *int
	MaxRequestsPerMin   *int
	GuardrailSettings   map[string]interface{}
	BudgetLimitUSD      *float64
}

type ModelInfo struct {
	ID               string
	ProviderID       string
	ModelID          string
	DisplayName      string
	ContextWindow    int
	MaxOutputTokens  *int
	InputPricePerM   float64
	OutputPricePerM  float64
	SupportsStreaming bool
	SupportsTools    bool
	SupportsVision   bool
	SupportsJSONMode bool
	AvgLatencyMs     *int
	P99LatencyMs     *int
	ReliabilityPct   float64
	IsActive         bool
}

type Provider struct {
	ID           string
	Name         string
	ProviderType string
	BaseURL      string
	APIKeyEnc    *string
	Status       string
}

type APIKey struct {
	ID            string
	EnvironmentID string
	RouteID       *string
	KeyHash       string
	PreviousHash  *string
	Scopes        []string
	RateLimitRPM  *int
	IsActive      bool
}

type RequestRecord struct {
	ID                   string
	EnvironmentID        string
	RouteID              *string
	APIKeyID             string
	RequestID            string
	StartedAt            time.Time
	CompletedAt          *time.Time
	DurationMs           *int
	Status               string
	ModelID              *string
	ProviderID           *string
	ModelIdentifier      string
	InputTokens          int
	OutputTokens         int
	EstimatedTokens      bool
	InputCostUSD         float64
	OutputCostUSD        float64
	TotalCostUSD         float64
	PromptHash           *string
	IsStreaming          bool
	ToolCallCount        int
	AttemptNumber        int
	FallbackReason       *string
	SchemaValid          *bool
	SchemaRepairAttempts int
	ErrorCode            *string
	ErrorMessage         *string
	ActionTaken          string
}

// RequestContext carries state through the pipeline.
type RequestContext struct {
	TraceID         string
	APIKey          *APIKey
	Environment     *Environment
	Route           *Route
	SelectedModel   *ModelInfo
	Provider        *Provider
	StartedAt       time.Time
	EstInputTokens  int
	EstOutputTokens int
	EstCostUSD      float64
	ActionTaken     string
	AttemptNumber   int
	FallbackReason  *string
}
