import type OpenAI from "openai";

// ---------------------------------------------------------------------------
// SDK options
// ---------------------------------------------------------------------------

/**
 * Configuration options for the OpenFive client.
 */
export interface OpenFiveOptions {
  /** OpenFive API key (sk-of_...) */
  apiKey: string;

  /** Gateway URL. Defaults to http://localhost:8787 */
  baseURL?: string;

  /** Default route ID — selects which model / config the gateway should use */
  routeId?: string;

  /** Agent identifier used for tracing and analytics */
  agentId?: string;

  /** Organization ID */
  orgId?: string;

  /** Per-request cost cap in cents */
  maxCostCents?: number;

  /** Request timeout in milliseconds */
  timeout?: number;
}

// ---------------------------------------------------------------------------
// Gateway headers
// ---------------------------------------------------------------------------

/**
 * Custom headers sent to the OpenFive gateway on every request.
 */
export interface OpenFiveHeaders {
  "x-route-id"?: string;
  "x-agent-id"?: string;
  "x-org-id"?: string;
  "x-max-cost-cents"?: string;
}

// ---------------------------------------------------------------------------
// Re-exported OpenAI types (convenience)
// ---------------------------------------------------------------------------

export type ChatCompletionCreateParams =
  OpenAI.Chat.Completions.ChatCompletionCreateParams;

export type ChatCompletionCreateParamsNonStreaming =
  OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

export type ChatCompletionCreateParamsStreaming =
  OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming;

export type ChatCompletion = OpenAI.Chat.Completions.ChatCompletion;

export type ChatCompletionChunk = OpenAI.Chat.Completions.ChatCompletionChunk;

export type ChatCompletionMessageParam =
  OpenAI.Chat.Completions.ChatCompletionMessageParam;
