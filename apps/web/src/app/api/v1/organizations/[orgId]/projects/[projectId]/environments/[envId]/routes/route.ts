import { createClient } from "@/lib/supabase/server";
import { requireOrgMember, requireOrgAdmin } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, createdResponse, errorResponse } from "@/lib/api/response";
import { z } from "zod/v4";

const createRouteSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/),
  description: z.string().max(500).optional(),
  allowed_models: z.array(z.string().uuid()).default([]),
  preferred_model: z.string().uuid().nullable().optional(),
  fallback_chain: z.array(z.string().uuid()).default([]),
  constraints: z.record(z.string(), z.unknown()).default({}),
  weight_cost: z.number().min(0).max(1).default(0.4),
  weight_latency: z.number().min(0).max(1).default(0.3),
  weight_reliability: z.number().min(0).max(1).default(0.3),
  output_schema: z.record(z.string(), z.unknown()).nullable().optional(),
  schema_strict: z.boolean().default(false),
  max_tokens_per_request: z.number().int().positive().nullable().optional(),
  max_requests_per_min: z.number().int().positive().nullable().optional(),
  guardrail_settings: z.record(z.string(), z.unknown()).default({}),
  budget_limit_usd: z.number().positive().nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; envId: string }> }
) {
  try {
    const { orgId, envId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("routes")
      .select("*")
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
    await requireOrgAdmin(orgId);
    const body = await validateBody(request, createRouteSchema);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("routes")
      .insert({ ...body, environment_id: envId })
      .select()
      .single();

    if (error) throw error;
    return createdResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
