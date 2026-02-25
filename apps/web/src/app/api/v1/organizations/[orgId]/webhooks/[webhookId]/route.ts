import { createClient } from "@/lib/supabase/server";
import { requireOrgMember, requireOrgAdmin } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, errorResponse, noContentResponse } from "@/lib/api/response";
import { NotFoundError } from "@/lib/api/errors";
import { z } from "zod/v4";

const EVENT_TYPES = [
  "budget_warning",
  "budget_exceeded",
  "incident_created",
  "incident_resolved",
  "killswitch_activated",
  "cost_spike",
  "error_rate_spike",
] as const;

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  secret: z.string().optional(),
  events: z.array(z.enum(EVENT_TYPES)).min(1).optional(),
  is_active: z.boolean().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; webhookId: string }> }
) {
  try {
    const { orgId, webhookId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("webhooks")
      .select("id, organization_id, name, url, events, is_active, headers, created_by, created_at, updated_at")
      .eq("id", webhookId)
      .eq("organization_id", orgId)
      .single();

    if (error || !data) throw new NotFoundError("Webhook");
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string; webhookId: string }> }
) {
  try {
    const { orgId, webhookId } = await params;
    await requireOrgAdmin(orgId);
    const body = await validateBody(request, updateWebhookSchema);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("webhooks")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", webhookId)
      .eq("organization_id", orgId)
      .select()
      .single();

    if (error || !data) throw new NotFoundError("Webhook");
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; webhookId: string }> }
) {
  try {
    const { orgId, webhookId } = await params;
    await requireOrgAdmin(orgId);
    const supabase = await createClient();

    const { error } = await supabase
      .from("webhooks")
      .delete()
      .eq("id", webhookId)
      .eq("organization_id", orgId);

    if (error) throw error;
    return noContentResponse();
  } catch (error) {
    return errorResponse(error);
  }
}
