import { createClient } from "@/lib/supabase/server";
import { requireOrgAdmin } from "@/lib/api/auth-guard";
import { jsonResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError } from "@/lib/api/errors";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; webhookId: string }> }
) {
  try {
    const { orgId, webhookId } = await params;
    await requireOrgAdmin(orgId);
    const supabase = await createClient();

    const { data: webhook, error: fetchError } = await supabase
      .from("webhooks")
      .select("*")
      .eq("id", webhookId)
      .eq("organization_id", orgId)
      .single();

    if (fetchError || !webhook) throw new NotFoundError("Webhook");

    const testPayload = {
      event: "test",
      timestamp: new Date().toISOString(),
      organization_id: orgId,
      data: {
        message: "This is a test webhook delivery from OpenFive.",
      },
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "OpenFive-Webhook/1.0",
      ...(webhook.headers as Record<string, string>),
    };

    // Sign the payload with HMAC if a secret is set
    if (webhook.secret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(webhook.secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(JSON.stringify(testPayload))
      );
      const hexSignature = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      headers["X-OpenFive-Signature"] = `sha256=${hexSignature}`;
    }

    const startTime = Date.now();
    let responseStatus: number | null = null;
    let responseBody = "";
    let success = false;

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000),
      });
      responseStatus = response.status;
      responseBody = await response.text().catch(() => "");
      success = response.ok;
    } catch (fetchErr) {
      responseBody = fetchErr instanceof Error ? fetchErr.message : "Request failed";
    }

    const durationMs = Date.now() - startTime;

    // Log the delivery
    await supabase.from("webhook_deliveries").insert({
      webhook_id: webhookId,
      event_type: "test",
      payload: testPayload,
      response_status: responseStatus,
      response_body: responseBody.slice(0, 4000),
      duration_ms: durationMs,
      success,
    });

    return jsonResponse({
      success,
      response_status: responseStatus,
      response_body: responseBody.slice(0, 1000),
      duration_ms: durationMs,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
