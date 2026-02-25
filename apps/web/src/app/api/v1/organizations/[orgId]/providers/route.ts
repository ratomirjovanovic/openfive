import { createClient } from "@/lib/supabase/server";
import { requireOrgMember, requireOrgAdmin } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, createdResponse, errorResponse } from "@/lib/api/response";
import { encrypt } from "@/lib/crypto";
import { z } from "zod/v4";

const createProviderSchema = z.object({
  name: z.string().min(1).max(100),
  display_name: z.string().min(1).max(100),
  provider_type: z.enum(["openrouter", "ollama", "openai_compatible"]),
  base_url: z.string().url(),
  api_key: z.string().optional(),
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
      .from("providers")
      .select("id, organization_id, name, display_name, provider_type, base_url, status, metadata, created_at, updated_at")
      .or(`organization_id.eq.${orgId},organization_id.is.null`)
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
    const body = await validateBody(request, createProviderSchema);
    const supabase = await createClient();

    // Encrypt API key before storing - never store plaintext
    const { api_key, ...providerData } = body;
    let encryptedKey: string | null = null;
    if (api_key) {
      encryptedKey = await encrypt(api_key);
    }

    const { data, error } = await supabase
      .from("providers")
      .insert({
        ...providerData,
        organization_id: orgId,
        api_key_enc: encryptedKey,
      })
      // Never return api_key_enc in response
      .select("id, organization_id, name, display_name, provider_type, base_url, status, metadata, created_at, updated_at")
      .single();

    if (error) throw error;
    return createdResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
