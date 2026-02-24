// ---------------------------------------------------------------------------
// @openfive/sdk — barrel export
// ---------------------------------------------------------------------------

export { OpenFiveClient } from "./client.js";

// Re-export as default for `import OpenFive from "@openfive/sdk"` usage
export { OpenFiveClient as default } from "./client.js";

// Types
export type {
  OpenFiveOptions,
  OpenFiveHeaders,
  ChatCompletionCreateParams,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionMessageParam,
} from "./types.js";

// ---------------------------------------------------------------------------
// Convenience factory
// ---------------------------------------------------------------------------

import type { OpenFiveOptions } from "./types.js";
import { OpenFiveClient } from "./client.js";

/**
 * Convenience function to create a new `OpenFiveClient` instance.
 *
 * @example
 * ```ts
 * import { createClient } from "@openfive/sdk";
 *
 * const client = createClient({
 *   apiKey: "sk-of_...",
 *   routeId: "support_summarize",
 * });
 * ```
 */
export function createClient(opts: OpenFiveOptions): OpenFiveClient {
  return new OpenFiveClient(opts);
}
