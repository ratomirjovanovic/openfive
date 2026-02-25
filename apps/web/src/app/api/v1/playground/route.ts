import { getAuthContext } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { errorResponse } from "@/lib/api/response";
import { BadRequestError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const playgroundSchema = z.object({
  model: z.string().min(1),
  messages: z.array(messageSchema).min(1),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  max_tokens: z.number().int().min(1).max(128000).optional().default(2048),
  top_p: z.number().min(0).max(1).optional().default(1),
  route_id: z.string().uuid().optional(),
  stream: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  try {
    await getAuthContext();
    const body = await validateBody(request, playgroundSchema);
    const supabase = await createClient();

    let baseUrl = "";
    let apiKey = "";
    let modelId = body.model;

    if (body.route_id) {
      // Look up the route to get model and provider info
      const { data: route, error: routeErr } = await supabase
        .from("routes")
        .select("*, environments!inner(*, projects!inner(*, organizations!inner(*)))")
        .eq("id", body.route_id)
        .single();

      if (routeErr || !route) {
        throw new BadRequestError("Route not found");
      }

      // Use the first allowed model on the route, or the requested model
      if (route.allowed_models?.length > 0) {
        modelId = route.allowed_models[0];
      }
    }

    // Look up the model and its provider
    const { data: model, error: modelErr } = await supabase
      .from("models")
      .select("*, providers!inner(*)")
      .eq("model_id", modelId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (modelErr || !model) {
      // Fallback: try to find any active provider to proxy through
      const { data: providers } = await supabase
        .from("providers")
        .select("*")
        .eq("status", "active")
        .limit(1);

      if (!providers || providers.length === 0) {
        throw new BadRequestError(
          "No active provider found. Please configure a provider first."
        );
      }

      const provider = providers[0];
      baseUrl = provider.base_url;
      apiKey = provider.api_key_enc || "";
    } else {
      const provider = model.providers as Record<string, unknown>;
      baseUrl = provider.base_url as string;
      apiKey = (provider.api_key_enc as string) || "";
    }

    // Build the OpenAI-compatible request
    const upstreamUrl = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const upstreamHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      upstreamHeaders["Authorization"] = `Bearer ${apiKey}`;
    }

    const upstreamBody = {
      model: modelId,
      messages: body.messages,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      top_p: body.top_p,
      stream: body.stream,
    };

    const startTime = Date.now();

    const upstreamRes = await fetch(upstreamUrl, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify(upstreamBody),
      signal: AbortSignal.timeout(120000),
    });

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text().catch(() => "Unknown provider error");
      throw new BadRequestError(`Provider error (${upstreamRes.status}): ${errText}`);
    }

    // Stream mode: forward the SSE stream
    if (body.stream && upstreamRes.body) {
      const latencyMs = Date.now() - startTime;

      const transformStream = new TransformStream({
        start(controller) {
          // Send a metadata event first
          const meta = JSON.stringify({
            type: "meta",
            model: modelId,
            latency_first_token_ms: latencyMs,
          });
          controller.enqueue(
            new TextEncoder().encode(`data: ${meta}\n\n`)
          );
        },
        transform(chunk, controller) {
          controller.enqueue(chunk);
        },
      });

      const readable = upstreamRes.body.pipeThrough(transformStream);

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-stream mode: return the full response
    const data = await upstreamRes.json();
    const latencyMs = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        ...data,
        _playground_meta: {
          model: modelId,
          latency_ms: latencyMs,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
