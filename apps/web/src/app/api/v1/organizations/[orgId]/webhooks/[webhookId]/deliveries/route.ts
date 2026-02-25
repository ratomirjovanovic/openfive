import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/api/auth-guard";
import { jsonResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError } from "@/lib/api/errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; webhookId: string }> }
) {
  try {
    const { orgId, webhookId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    // Verify the webhook belongs to this org
    const { data: webhook, error: webhookErr } = await supabase
      .from("webhooks")
      .select("id")
      .eq("id", webhookId)
      .eq("organization_id", orgId)
      .single();

    if (webhookErr || !webhook) throw new NotFoundError("Webhook");

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const { data, error, count } = await supabase
      .from("webhook_deliveries")
      .select("*", { count: "exact" })
      .eq("webhook_id", webhookId)
      .order("attempted_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return jsonResponse({ deliveries: data, total: count });
  } catch (error) {
    return errorResponse(error);
  }
}
