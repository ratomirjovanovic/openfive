import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError, BadRequestError } from "@/lib/api/errors";
import { z } from "zod/v4";

const renderSchema = z.object({
  variables: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string; templateId: string }> }
) {
  try {
    const { orgId, templateId } = await params;
    await requireOrgMember(orgId);
    const body = await validateBody(request, renderSchema);
    const supabase = await createClient();

    const { data: template, error } = await supabase
      .from("prompt_templates")
      .select("*")
      .eq("id", templateId)
      .eq("organization_id", orgId)
      .single();

    if (error || !template) throw new NotFoundError("Template");

    // Validate required variables are provided
    const templateVars = (template.variables as Array<{ name: string; required: boolean; default?: string }>) || [];
    const missingVars: string[] = [];

    for (const v of templateVars) {
      if (v.required && !(v.name in body.variables) && !v.default) {
        missingVars.push(v.name);
      }
    }

    if (missingVars.length > 0) {
      throw new BadRequestError(`Missing required variables: ${missingVars.join(", ")}`);
    }

    // Build the variable map with defaults filled in
    const resolvedVars: Record<string, string> = {};
    for (const v of templateVars) {
      if (v.name in body.variables) {
        resolvedVars[v.name] = String(body.variables[v.name]);
      } else if (v.default !== undefined) {
        resolvedVars[v.name] = v.default;
      }
    }

    // Render template by replacing {{variable}} placeholders
    let rendered = template.content as string;
    for (const [key, value] of Object.entries(resolvedVars)) {
      rendered = rendered.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value);
    }

    return jsonResponse({
      rendered,
      template_id: template.id,
      template_name: template.name,
      version: template.version,
      model_hint: template.model_hint,
      temperature: template.temperature,
      max_tokens: template.max_tokens,
      variables_used: resolvedVars,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
