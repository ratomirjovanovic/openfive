import { createClient } from "@/lib/supabase/server";
import { requireOrgMember, requireOrgAdmin, getAuthContext } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, createdResponse, errorResponse } from "@/lib/api/response";
import { z } from "zod/v4";

const variantSchema = z.object({
  name: z.string().min(1).max(100),
  model_id: z.string().uuid(),
  weight: z.number().min(0).max(100),
  description: z.string().max(500).optional(),
});

const createAbTestSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  route_id: z.string().uuid(),
  variants: z.array(variantSchema).min(2),
  sample_size_target: z.number().int().min(10).max(1000000).default(1000),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; envId: string }> }
) {
  try {
    const { orgId, envId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    let query = supabase
      .from("ab_tests")
      .select("*")
      .eq("environment_id", envId)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

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
    const { userId } = await getAuthContext();
    const body = await validateBody(request, createAbTestSchema);
    const supabase = await createClient();

    // Validate that weights sum to 100
    const totalWeight = body.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      return errorResponse(
        new Error("Variant weights must sum to 100")
      );
    }

    const { data, error } = await supabase
      .from("ab_tests")
      .insert({
        name: body.name,
        description: body.description,
        route_id: body.route_id,
        environment_id: envId,
        variants: body.variants,
        sample_size_target: body.sample_size_target,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return createdResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
