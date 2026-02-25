import { createClient } from "@/lib/supabase/server";
import { requireOrgAdmin } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { createdResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError, BadRequestError } from "@/lib/api/errors";
import { z } from "zod/v4";

const cloneEnvSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  tier: z.enum(["development", "staging", "production"]).default("development"),
  clone_routes: z.boolean().default(true),
  clone_route_configs: z.boolean().default(true),
  clone_budget_settings: z.boolean().default(true),
});

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ orgId: string; projectId: string; envId: string }>;
  }
) {
  try {
    const { orgId, projectId, envId } = await params;
    await requireOrgAdmin(orgId);
    const body = await validateBody(request, cloneEnvSchema);
    const supabase = await createClient();

    // Fetch the source environment
    const { data: sourceEnv, error: envError } = await supabase
      .from("environments")
      .select("*")
      .eq("id", envId)
      .eq("project_id", projectId)
      .single();

    if (envError || !sourceEnv) {
      throw new NotFoundError("Environment");
    }

    // Check for slug uniqueness within the project
    const { data: existingEnv } = await supabase
      .from("environments")
      .select("id")
      .eq("project_id", projectId)
      .eq("slug", body.slug)
      .single();

    if (existingEnv) {
      throw new BadRequestError(
        `An environment with slug "${body.slug}" already exists in this project`
      );
    }

    // Create the new environment with cloned config
    const newEnvData: Record<string, unknown> = {
      project_id: projectId,
      name: body.name,
      slug: body.slug,
      tier: body.tier,
      killswitch_active: false,
      killswitch_reason: null,
      killswitch_at: null,
      anomaly_multiplier: sourceEnv.anomaly_multiplier,
      anomaly_window: sourceEnv.anomaly_window,
      metadata: sourceEnv.metadata || {},
    };

    // Clone budget settings if requested
    if (body.clone_budget_settings) {
      newEnvData.budget_mode = sourceEnv.budget_mode;
      newEnvData.budget_limit_usd = sourceEnv.budget_limit_usd;
      newEnvData.budget_window = sourceEnv.budget_window;
    }

    const { data: newEnv, error: createError } = await supabase
      .from("environments")
      .insert(newEnvData)
      .select()
      .single();

    if (createError) throw createError;

    let clonedRoutesCount = 0;

    // Clone routes if requested
    if (body.clone_routes) {
      const { data: sourceRoutes, error: routesError } = await supabase
        .from("routes")
        .select("*")
        .eq("environment_id", envId);

      if (routesError) throw routesError;

      if (sourceRoutes && sourceRoutes.length > 0) {
        const routesToInsert = sourceRoutes.map((route) => {
          const clonedRoute: Record<string, unknown> = {
            environment_id: newEnv.id,
            name: route.name,
            slug: route.slug,
            description: route.description,
            is_active: route.is_active,
            allowed_models: route.allowed_models,
            preferred_model: route.preferred_model,
            fallback_chain: route.fallback_chain,
            weight_cost: route.weight_cost,
            weight_latency: route.weight_latency,
            weight_reliability: route.weight_reliability,
            output_schema: route.output_schema,
            schema_strict: route.schema_strict,
            metadata: route.metadata || {},
          };

          // Clone rate limits and guardrails as part of route configs
          if (body.clone_route_configs) {
            clonedRoute.constraints = route.constraints;
            clonedRoute.max_tokens_per_request = route.max_tokens_per_request;
            clonedRoute.max_requests_per_min = route.max_requests_per_min;
            clonedRoute.guardrail_settings = route.guardrail_settings;
            clonedRoute.budget_limit_usd = route.budget_limit_usd;
          }

          return clonedRoute;
        });

        const { error: insertRoutesError } = await supabase
          .from("routes")
          .insert(routesToInsert);

        if (insertRoutesError) throw insertRoutesError;
        clonedRoutesCount = routesToInsert.length;
      }
    }

    return createdResponse({
      environment: newEnv,
      cloned: {
        routes: clonedRoutesCount,
        budget_settings: body.clone_budget_settings,
        route_configs: body.clone_route_configs,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
