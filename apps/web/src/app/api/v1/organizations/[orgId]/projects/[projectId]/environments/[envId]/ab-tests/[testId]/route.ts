import { createClient } from "@/lib/supabase/server";
import { requireOrgMember, requireOrgAdmin } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, errorResponse, noContentResponse } from "@/lib/api/response";
import { NotFoundError } from "@/lib/api/errors";
import { z } from "zod/v4";

const variantSchema = z.object({
  name: z.string().min(1).max(100),
  model_id: z.string().uuid(),
  weight: z.number().min(0).max(100),
  description: z.string().max(500).optional(),
});

const updateAbTestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["draft", "running", "paused", "completed"]).optional(),
  variants: z.array(variantSchema).min(2).optional(),
  sample_size_target: z.number().int().min(10).max(1000000).optional(),
  metrics: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ orgId: string; envId: string; testId: string }> }
) {
  try {
    const { orgId, testId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("ab_tests")
      .select("*")
      .eq("id", testId)
      .single();

    if (error || !data) throw new NotFoundError("A/B Test");
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ orgId: string; envId: string; testId: string }> }
) {
  try {
    const { orgId, testId } = await params;
    await requireOrgAdmin(orgId);
    const body = await validateBody(request, updateAbTestSchema);
    const supabase = await createClient();

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.variants !== undefined) updates.variants = body.variants;
    if (body.sample_size_target !== undefined)
      updates.sample_size_target = body.sample_size_target;
    if (body.metrics !== undefined) updates.metrics = body.metrics;

    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === "running") {
        updates.started_at = new Date().toISOString();
      } else if (body.status === "completed") {
        updates.completed_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from("ab_tests")
      .update(updates)
      .eq("id", testId)
      .select()
      .single();

    if (error) throw error;
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: { params: Promise<{ orgId: string; envId: string; testId: string }> }
) {
  try {
    const { orgId, testId } = await params;
    await requireOrgAdmin(orgId);
    const supabase = await createClient();

    const { error } = await supabase
      .from("ab_tests")
      .delete()
      .eq("id", testId);

    if (error) throw error;
    return noContentResponse();
  } catch (error) {
    return errorResponse(error);
  }
}
