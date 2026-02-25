import { createClient } from "@/lib/supabase/server";
import { requireOrgMember, requireOrgAdmin } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, createdResponse, errorResponse } from "@/lib/api/response";
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

const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  secret: z.string().optional(),
  events: z.array(z.enum(EVENT_TYPES)).min(1),
  is_active: z.boolean().optional().default(true),
  headers: z.record(z.string(), z.string()).optional().default({}),
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
      .from("webhooks")
      .select("id, organization_id, name, url, events, is_active, headers, created_by, created_at, updated_at")
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
    const auth = await requireOrgAdmin(orgId);
    const body = await validateBody(request, createWebhookSchema);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("webhooks")
      .insert({
        ...body,
        organization_id: orgId,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (error) throw error;
    return createdResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
