import { createClient } from "@/lib/supabase/server";
import { requireOrgAdmin } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, errorResponse, noContentResponse } from "@/lib/api/response";
import { NotFoundError } from "@/lib/api/errors";
import { encrypt } from "@/lib/crypto";
import { z } from "zod/v4";

const updateProviderSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  base_url: z.string().url().optional(),
  api_key: z.string().optional(),
  status: z.enum(["active", "degraded", "down"]).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; providerId: string }> }
) {
  try {
    const { orgId, providerId } = await params;
    await requireOrgAdmin(orgId);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("providers")
      .select("id, organization_id, name, display_name, provider_type, base_url, status, metadata, created_at, updated_at")
      .eq("id", providerId)
      .single();

    if (error || !data) throw new NotFoundError("Provider");
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string; providerId: string }> }
) {
  try {
    const { orgId, providerId } = await params;
    await requireOrgAdmin(orgId);
    const body = await validateBody(request, updateProviderSchema);
    const supabase = await createClient();

    // Encrypt new API key if provided
    const { api_key, ...updateData } = body;
    if (api_key) {
      (updateData as Record<string, unknown>).api_key_enc = await encrypt(api_key);
    }

    const { data, error } = await supabase
      .from("providers")
      .update(updateData)
      .eq("id", providerId)
      // Never return api_key_enc
      .select("id, organization_id, name, display_name, provider_type, base_url, status, metadata, created_at, updated_at")
      .single();

    if (error) throw error;
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; providerId: string }> }
) {
  try {
    const { orgId, providerId } = await params;
    await requireOrgAdmin(orgId);
    const supabase = await createClient();

    const { error } = await supabase
      .from("providers")
      .delete()
      .eq("id", providerId);

    if (error) throw error;
    return noContentResponse();
  } catch (error) {
    return errorResponse(error);
  }
}
