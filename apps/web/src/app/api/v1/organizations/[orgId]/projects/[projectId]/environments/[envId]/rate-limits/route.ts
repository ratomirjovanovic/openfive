import { createClient } from "@/lib/supabase/server";
import { requireOrgMember, requireOrgAdmin } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError } from "@/lib/api/errors";
import { z } from "zod/v4";

const bulkUpdateSchema = z.object({
  routes: z.array(
    z.object({
      id: z.string().uuid(),
      max_requests_per_min: z.number().int().positive().nullable().optional(),
      max_tokens_per_request: z.number().int().positive().nullable().optional(),
      is_active: z.boolean().optional(),
    })
  ),
  api_keys: z
    .array(
      z.object({
        id: z.string().uuid(),
        rate_limit_rpm: z.number().int().positive().nullable().optional(),
      })
    )
    .optional(),
});

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ orgId: string; projectId: string; envId: string }>;
  }
) {
  try {
    const { orgId, envId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    const { data: environment, error: envError } = await supabase
      .from("environments")
      .select("*")
      .eq("id", envId)
      .single();

    if (envError || !environment) {
      throw new NotFoundError("Environment");
    }

    const { data: routes, error: routesError } = await supabase
      .from("routes")
      .select(
        "id, name, slug, is_active, max_requests_per_min, max_tokens_per_request, budget_limit_usd"
      )
      .eq("environment_id", envId)
      .order("name", { ascending: true });

    if (routesError) throw routesError;

    const { data: apiKeys, error: keysError } = await supabase
      .from("api_keys")
      .select(
        "id, name, key_prefix, rate_limit_rpm, is_active, last_used_at"
      )
      .eq("environment_id", envId)
      .order("name", { ascending: true });

    if (keysError) throw keysError;

    return jsonResponse({
      environment: {
        id: environment.id,
        name: environment.name,
        tier: environment.tier,
      },
      routes: routes || [],
      api_keys: apiKeys || [],
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ orgId: string; projectId: string; envId: string }>;
  }
) {
  try {
    const { orgId, envId } = await params;
    await requireOrgAdmin(orgId);
    const body = await validateBody(request, bulkUpdateSchema);
    const supabase = await createClient();

    const { data: environment, error: envError } = await supabase
      .from("environments")
      .select("id")
      .eq("id", envId)
      .single();

    if (envError || !environment) {
      throw new NotFoundError("Environment");
    }

    const updatedRoutes = [];
    for (const route of body.routes) {
      const updateData: Record<string, unknown> = {};
      if (route.max_requests_per_min !== undefined) {
        updateData.max_requests_per_min = route.max_requests_per_min;
      }
      if (route.max_tokens_per_request !== undefined) {
        updateData.max_tokens_per_request = route.max_tokens_per_request;
      }
      if (route.is_active !== undefined) {
        updateData.is_active = route.is_active;
      }

      if (Object.keys(updateData).length > 0) {
        const { data, error } = await supabase
          .from("routes")
          .update(updateData)
          .eq("id", route.id)
          .eq("environment_id", envId)
          .select(
            "id, name, slug, is_active, max_requests_per_min, max_tokens_per_request, budget_limit_usd"
          )
          .single();

        if (error) throw error;
        if (data) updatedRoutes.push(data);
      }
    }

    const updatedKeys = [];
    if (body.api_keys) {
      for (const key of body.api_keys) {
        if (key.rate_limit_rpm !== undefined) {
          const { data, error } = await supabase
            .from("api_keys")
            .update({ rate_limit_rpm: key.rate_limit_rpm })
            .eq("id", key.id)
            .eq("environment_id", envId)
            .select(
              "id, name, key_prefix, rate_limit_rpm, is_active, last_used_at"
            )
            .single();

          if (error) throw error;
          if (data) updatedKeys.push(data);
        }
      }
    }

    return jsonResponse({
      routes: updatedRoutes,
      api_keys: updatedKeys,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
