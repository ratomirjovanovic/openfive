import { createClient } from "@/lib/supabase/server";
import { requireOrgMember, requireOrgAdmin } from "@/lib/api/auth-guard";
import { getAuthContext } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError } from "@/lib/api/errors";
import { z } from "zod/v4";

const updateIncidentSchema = z.object({
  status: z.enum(["acknowledged", "resolved"]).optional(),
  resolution_note: z.string().max(2000).optional(),
});

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ orgId: string; envId: string; incidentId: string }> }
) {
  try {
    const { orgId, incidentId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", incidentId)
      .single();

    if (error || !data) throw new NotFoundError("Incident");
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ orgId: string; envId: string; incidentId: string }> }
) {
  try {
    const { orgId, incidentId } = await params;
    await requireOrgAdmin(orgId);
    const { userId } = await getAuthContext();
    const body = await validateBody(request, updateIncidentSchema);
    const supabase = await createClient();

    const updates: Record<string, unknown> = {};

    if (body.status === "acknowledged") {
      updates.status = "acknowledged";
      updates.acknowledged_at = new Date().toISOString();
      updates.acknowledged_by = userId;
    } else if (body.status === "resolved") {
      updates.status = "resolved";
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by = userId;
      if (body.resolution_note) {
        updates.resolution_note = body.resolution_note;
      }
    }

    if (body.resolution_note && !body.status) {
      updates.resolution_note = body.resolution_note;
    }

    const { data, error } = await supabase
      .from("incidents")
      .update(updates)
      .eq("id", incidentId)
      .select()
      .single();

    if (error) throw error;
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
