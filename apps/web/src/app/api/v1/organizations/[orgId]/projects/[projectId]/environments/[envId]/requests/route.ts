import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/api/auth-guard";
import { jsonResponse, errorResponse } from "@/lib/api/response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; envId: string }> }
) {
  try {
    const { orgId, envId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const routeId = url.searchParams.get("route_id");
    const status = url.searchParams.get("status");

    let query = supabase
      .from("requests")
      .select("*", { count: "exact" })
      .eq("environment_id", envId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (routeId) query = query.eq("route_id", routeId);
    if (status) query = query.eq("status", status);

    const { data, error, count } = await query;

    if (error) throw error;
    return jsonResponse({ data, total: count });
  } catch (error) {
    return errorResponse(error);
  }
}
