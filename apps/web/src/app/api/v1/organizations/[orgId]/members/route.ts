import { createClient } from "@/lib/supabase/server";
import { requireOrgMember, requireOrgAdmin } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, createdResponse, errorResponse } from "@/lib/api/response";
import { z } from "zod/v4";

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
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
      .from("memberships")
      .select("id, organization_id, user_id, role, created_at, updated_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });

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
    const body = await validateBody(request, inviteMemberSchema);
    const supabase = await createClient();

    // For MVP, we add by user_id directly. In production, send invite email.
    // Look up user by email (requires admin client)
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data: users } = await admin.auth.admin.listUsers();
    const user = users?.users?.find((u) => u.email === body.email);

    if (!user) {
      return errorResponse(new Error("User not found. They must sign up first."));
    }

    const { data, error } = await supabase
      .from("memberships")
      .insert({
        organization_id: orgId,
        user_id: user.id,
        role: body.role,
        invited_by: auth.userId,
      })
      .select()
      .single();

    if (error) throw error;
    return createdResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
