import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError, BadRequestError } from "@/lib/api/errors";
import { z } from "zod/v4";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const replaySchema = z.object({
  model_override: z.string().optional(),
  route_id_override: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// POST /api/v1/organizations/[orgId]/projects/[projectId]/environments/[envId]/requests/[requestId]/replay
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      orgId: string;
      projectId: string;
      envId: string;
      requestId: string;
    }>;
  }
) {
  try {
    const { orgId, envId, requestId } = await params;
    await requireOrgMember(orgId);
    const body = await validateBody(request, replaySchema);
    const supabase = await createClient();

    // ------------------------------------------------------------------
    // 1. Load the original request
    // ------------------------------------------------------------------
    const { data: original, error: fetchError } = await supabase
      .from("requests")
      .select("*")
      .eq("id", requestId)
      .eq("environment_id", envId)
      .single();

    if (fetchError || !original) {
      throw new NotFoundError("Request");
    }

    // ------------------------------------------------------------------
    // 2. Determine model to use for replay
    // ------------------------------------------------------------------
    const replayModel = body.model_override || original.model_identifier;

    // Look up the model record and its provider for pricing + base_url
    const { data: modelRecord } = await supabase
      .from("models")
      .select(
        "*, providers!inner(id, name, base_url, api_key_enc, provider_type)"
      )
      .eq("model_id", replayModel)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!modelRecord) {
      throw new BadRequestError(
        `Model "${replayModel}" not found or is not active`
      );
    }

    const provider = modelRecord.providers as unknown as {
      id: string;
      name: string;
      base_url: string;
      api_key_enc: string;
      provider_type: string;
    };

    // ------------------------------------------------------------------
    // 3. Reconstruct the chat completion request payload
    // ------------------------------------------------------------------
    const originalMetadata = (original.metadata ?? {}) as Record<
      string,
      unknown
    >;
    const messages = (originalMetadata.messages as unknown[]) ?? [
      {
        role: "user",
        content: "Hello",
      },
    ];

    const chatPayload: Record<string, unknown> = {
      model: modelRecord.model_id,
      messages,
      stream: false,
    };

    // Carry over optional fields from original metadata
    if (originalMetadata.temperature !== undefined) {
      chatPayload.temperature = originalMetadata.temperature;
    }
    if (originalMetadata.max_tokens !== undefined) {
      chatPayload.max_tokens = originalMetadata.max_tokens;
    }
    if (originalMetadata.top_p !== undefined) {
      chatPayload.top_p = originalMetadata.top_p;
    }
    if (originalMetadata.tools !== undefined) {
      chatPayload.tools = originalMetadata.tools;
    }
    if (originalMetadata.tool_choice !== undefined) {
      chatPayload.tool_choice = originalMetadata.tool_choice;
    }
    if (originalMetadata.response_format !== undefined) {
      chatPayload.response_format = originalMetadata.response_format;
    }

    // ------------------------------------------------------------------
    // 4. Send the request to the provider
    // ------------------------------------------------------------------
    const replayRequestId = `replay_${randomUUID()}`;
    const startedAt = new Date();
    let replayResponse: Record<string, unknown> | null = null;
    let replayError: { code: string; message: string } | null = null;
    let replayStatus: string = "success";
    let durationMs = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let replayContent = "";

    try {
      const providerUrl = `${provider.base_url.replace(/\/$/, "")}/chat/completions`;
      const providerResponse = await fetch(providerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.api_key_enc}`,
        },
        body: JSON.stringify(chatPayload),
      });

      const completedAt = new Date();
      durationMs = completedAt.getTime() - startedAt.getTime();

      if (!providerResponse.ok) {
        const errorBody = await providerResponse.text();
        replayError = {
          code: `provider_error_${providerResponse.status}`,
          message: errorBody,
        };
        replayStatus = "error";
      } else {
        replayResponse = (await providerResponse.json()) as Record<
          string,
          unknown
        >;

        // Extract token usage from the provider response
        const usage = replayResponse.usage as
          | {
              prompt_tokens?: number;
              completion_tokens?: number;
            }
          | undefined;
        inputTokens = usage?.prompt_tokens ?? 0;
        outputTokens = usage?.completion_tokens ?? 0;

        // Extract response content
        const choices = replayResponse.choices as
          | Array<{
              message?: { content?: string };
            }>
          | undefined;
        replayContent = choices?.[0]?.message?.content ?? "";
      }
    } catch (err) {
      const completedAt = new Date();
      durationMs = completedAt.getTime() - startedAt.getTime();
      replayError = {
        code: "network_error",
        message: err instanceof Error ? err.message : "Unknown error",
      };
      replayStatus = "error";
    }

    // ------------------------------------------------------------------
    // 5. Calculate costs
    // ------------------------------------------------------------------
    const inputPricePerM = Number(modelRecord.input_price_per_m) || 0;
    const outputPricePerM = Number(modelRecord.output_price_per_m) || 0;
    const inputCostUsd = (inputTokens / 1_000_000) * inputPricePerM;
    const outputCostUsd = (outputTokens / 1_000_000) * outputPricePerM;
    const totalCostUsd = inputCostUsd + outputCostUsd;

    // ------------------------------------------------------------------
    // 6. Record the replay as a new request
    // ------------------------------------------------------------------
    const completedAt = new Date(startedAt.getTime() + durationMs);

    const { data: replayRecord, error: insertError } = await supabase
      .from("requests")
      .insert({
        environment_id: envId,
        route_id: body.route_id_override || original.route_id,
        request_id: replayRequestId,
        started_at: startedAt.toISOString(),
        completed_at: completedAt.toISOString(),
        duration_ms: durationMs,
        status: replayStatus,
        model_id: modelRecord.id,
        provider_id: provider.id,
        model_identifier: replayModel,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_tokens: false,
        input_cost_usd: inputCostUsd,
        output_cost_usd: outputCostUsd,
        total_cost_usd: totalCostUsd,
        is_streaming: false,
        tool_call_count: 0,
        attempt_number: 1,
        schema_repair_attempts: 0,
        action_taken: "none",
        error_code: replayError?.code ?? null,
        error_message: replayError?.message ?? null,
        metadata: {
          replay_of: original.id,
          replay_of_request_id: original.request_id,
          messages: chatPayload.messages,
          response_content: replayContent,
          ...(body.model_override
            ? { model_override: body.model_override }
            : {}),
          ...(body.route_id_override
            ? { route_id_override: body.route_id_override }
            : {}),
        },
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // ------------------------------------------------------------------
    // 7. Build comparison data
    // ------------------------------------------------------------------
    const originalContent =
      ((original.metadata as Record<string, unknown>)
        ?.response_content as string) ?? null;

    const comparison = {
      original: {
        id: original.id,
        request_id: original.request_id,
        model: original.model_identifier,
        input_tokens: original.input_tokens,
        output_tokens: original.output_tokens,
        total_cost_usd: Number(original.total_cost_usd),
        duration_ms: original.duration_ms,
        status: original.status,
        response_content: originalContent,
      },
      replay: {
        id: replayRecord.id,
        request_id: replayRecord.request_id,
        model: replayRecord.model_identifier,
        input_tokens: replayRecord.input_tokens,
        output_tokens: replayRecord.output_tokens,
        total_cost_usd: Number(replayRecord.total_cost_usd),
        duration_ms: replayRecord.duration_ms,
        status: replayRecord.status,
        response_content: replayContent,
      },
      deltas: {
        cost_usd: Number(replayRecord.total_cost_usd) - Number(original.total_cost_usd),
        duration_ms: (replayRecord.duration_ms ?? 0) - (original.duration_ms ?? 0),
        input_tokens: replayRecord.input_tokens - original.input_tokens,
        output_tokens: replayRecord.output_tokens - original.output_tokens,
      },
    };

    return jsonResponse({ data: replayRecord, comparison });
  } catch (error) {
    return errorResponse(error);
  }
}
