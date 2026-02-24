import OpenAI from "openai";
import type { FinalRequestOptions, Headers } from "openai/core";
import type { OpenFiveOptions, OpenFiveHeaders } from "./types.js";

const DEFAULT_BASE_URL = "http://localhost:8787";

/**
 * Build the gateway-specific headers from the provided options.
 * Only headers with defined values are included.
 */
function buildGatewayHeaders(opts: OpenFiveOptions): OpenFiveHeaders {
  const headers: OpenFiveHeaders = {};

  if (opts.routeId) {
    headers["x-route-id"] = opts.routeId;
  }
  if (opts.agentId) {
    headers["x-agent-id"] = opts.agentId;
  }
  if (opts.orgId) {
    headers["x-org-id"] = opts.orgId;
  }
  if (opts.maxCostCents !== undefined) {
    headers["x-max-cost-cents"] = String(opts.maxCostCents);
  }

  return headers;
}

/**
 * OpenFiveClient — a thin wrapper around the OpenAI SDK that injects
 * OpenFive gateway headers into every request.
 *
 * All standard OpenAI methods (chat.completions, embeddings, etc.) are
 * available directly on the client instance because it extends `OpenAI`.
 *
 * @example
 * ```ts
 * import { OpenFiveClient } from "@openfive/sdk";
 *
 * const client = new OpenFiveClient({
 *   apiKey: "sk-of_...",
 *   baseURL: "http://localhost:8787",
 *   routeId: "support_summarize",
 *   agentId: "my-agent",
 * });
 *
 * const res = await client.chat.completions.create({
 *   messages: [{ role: "user", content: "Hello" }],
 * });
 * ```
 */
export class OpenFiveClient extends OpenAI {
  /** The resolved options used to construct this client. */
  private readonly _ofOptions: OpenFiveOptions;

  /** The gateway-specific headers attached to every outgoing request. */
  private readonly _gatewayHeaders: OpenFiveHeaders;

  constructor(opts: OpenFiveOptions) {
    const gatewayHeaders = buildGatewayHeaders(opts);

    super({
      apiKey: opts.apiKey,
      baseURL: opts.baseURL ?? DEFAULT_BASE_URL,
      timeout: opts.timeout,
      defaultHeaders: gatewayHeaders as Record<string, string>,
    });

    this._ofOptions = { ...opts };
    this._gatewayHeaders = gatewayHeaders;
  }

  // -----------------------------------------------------------------------
  // Override defaultHeaders so our gateway headers are merged into every
  // request even when the OpenAI SDK builds its own default header set.
  // -----------------------------------------------------------------------

  protected override defaultHeaders(opts: FinalRequestOptions): Headers {
    return {
      ...super.defaultHeaders(opts),
      ...(this._gatewayHeaders as Record<string, string>),
    };
  }

  // -----------------------------------------------------------------------
  // Convenience: derive a new client with a different route
  // -----------------------------------------------------------------------

  /**
   * Return a *new* `OpenFiveClient` that targets a different route.
   * All other options are inherited from the current client.
   *
   * ```ts
   * const summaryClient = client.withRoute("support_summarize");
   * ```
   */
  withRoute(routeId: string): OpenFiveClient {
    return new OpenFiveClient({
      ...this._ofOptions,
      routeId,
    });
  }

  // -----------------------------------------------------------------------
  // Convenience: derive a new client with a different agent ID
  // -----------------------------------------------------------------------

  /**
   * Return a *new* `OpenFiveClient` that uses a different agent identifier.
   * All other options are inherited from the current client.
   *
   * ```ts
   * const tracedClient = client.withAgent("billing-agent");
   * ```
   */
  withAgent(agentId: string): OpenFiveClient {
    return new OpenFiveClient({
      ...this._ofOptions,
      agentId,
    });
  }
}
