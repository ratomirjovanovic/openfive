import { createClient } from "@/lib/supabase/server";
import { requireOrgMember, requireOrgAdmin } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, createdResponse, errorResponse } from "@/lib/api/response";
import { z } from "zod/v4";

const CONDITION_TYPES = [
  "budget_threshold",
  "cost_spike",
  "error_rate",
  "latency_p95",
  "incident_created",
] as const;

const CHANNELS = ["webhook", "email"] as const;

const createAlertSchema = z.object({
  name: z.string().min(1).max(100),
  environment_id: z.string().uuid().optional(),
  condition_type: z.enum(CONDITION_TYPES),
  threshold_value: z.number().optional(),
  window_minutes: z.number().int().min(1).max(1440).optional().default(5),
  channels: z.array(z.enum(CHANNELS)).min(1),
  webhook_id: z.string().uuid().optional(),
  is_active: z.boolean().optional().default(true),
  cooldown_minutes: z.number().int().min(1).max(1440).optional().default(15),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("alert_rules")
      .select("*, webhooks(id, name, url)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    await requireOrgAdmin(orgId);
    const body = await validateBody(request, createAlertSchema);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("alert_rules")
      .insert({
        ...body,
        organization_id: orgId,
      })
      .select("*, webhooks(id, name, url)")
      .single();

    if (error) throw error;
    return createdResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
