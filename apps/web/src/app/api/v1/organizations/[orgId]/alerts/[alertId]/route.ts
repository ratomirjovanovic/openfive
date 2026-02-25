import { createClient } from "@/lib/supabase/server";
import { requireOrgMember, requireOrgAdmin } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, errorResponse, noContentResponse } from "@/lib/api/response";
import { NotFoundError } from "@/lib/api/errors";
import { z } from "zod/v4";

const CONDITION_TYPES = [
  "budget_threshold",
  "cost_spike",
  "error_rate",
  "latency_p95",
  "incident_created",
] as const;

const CHANNELS = ["webhook", "email"] as const;

const updateAlertSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  environment_id: z.string().uuid().nullable().optional(),
  condition_type: z.enum(CONDITION_TYPES).optional(),
  threshold_value: z.number().nullable().optional(),
  window_minutes: z.number().int().min(1).max(1440).optional(),
  channels: z.array(z.enum(CHANNELS)).min(1).optional(),
  webhook_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
  cooldown_minutes: z.number().int().min(1).max(1440).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; alertId: string }> }
) {
  try {
    const { orgId, alertId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("alert_rules")
      .select("*, webhooks(id, name, url)")
      .eq("id", alertId)
      .eq("organization_id", orgId)
      .single();

    if (error || !data) throw new NotFoundError("Alert rule");
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string; alertId: string }> }
) {
  try {
    const { orgId, alertId } = await params;
    await requireOrgAdmin(orgId);
    const body = await validateBody(request, updateAlertSchema);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("alert_rules")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", alertId)
      .eq("organization_id", orgId)
      .select("*, webhooks(id, name, url)")
      .single();

    if (error || !data) throw new NotFoundError("Alert rule");
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; alertId: string }> }
) {
  try {
    const { orgId, alertId } = await params;
    await requireOrgAdmin(orgId);
    const supabase = await createClient();

    const { error } = await supabase
      .from("alert_rules")
      .delete()
      .eq("id", alertId)
      .eq("organization_id", orgId);

    if (error) throw error;
    return noContentResponse();
  } catch (error) {
    return errorResponse(error);
  }
}
