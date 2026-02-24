import { createClient } from "@/lib/supabase/server";
import { requireOrgAdmin, getAuthContext } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, createdResponse, errorResponse } from "@/lib/api/response";
import { z } from "zod/v4";
import { randomBytes, createHash } from "crypto";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  route_id: z.string().uuid().nullable().optional(),
  scopes: z.array(z.string()).default(["chat.completions"]),
  rate_limit_rpm: z.number().int().positive().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
});

function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
  const bytes = randomBytes(32);
  const fullKey = `sk-of_${bytes.toString("hex")}`;
  const prefix = fullKey.slice(0, 12);
  const hash = createHash("sha256").update(fullKey).digest("hex");
  return { fullKey, prefix, hash };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; envId: string }> }
) {
  try {
    const { orgId, envId } = await params;
    await requireOrgAdmin(orgId);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("api_keys")
      .select("id, environment_id, route_id, name, key_prefix, scopes, rate_limit_rpm, is_active, expires_at, last_used_at, created_at")
      .eq("environment_id", envId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string; envId: string }> }
) {
  try {
    const { orgId, envId } = await params;
    const auth = await requireOrgAdmin(orgId);
    const body = await validateBody(request, createKeySchema);
    const supabase = await createClient();

    const { fullKey, prefix, hash } = generateApiKey();

    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        ...body,
        environment_id: envId,
        key_prefix: prefix,
        key_hash: hash,
        created_by: auth.userId,
      })
      .select("id, environment_id, route_id, name, key_prefix, scopes, rate_limit_rpm, is_active, expires_at, created_at")
      .single();

    if (error) throw error;
    return createdResponse({ ...data, key: fullKey });
  } catch (error) {
    return errorResponse(error);
  }
}
