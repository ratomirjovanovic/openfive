import { createClient } from "@/lib/supabase/server";
import { requireOrgMember, requireOrgAdmin } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, errorResponse, noContentResponse } from "@/lib/api/response";
import { NotFoundError } from "@/lib/api/errors";
import { z } from "zod/v4";

const variableSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "json"]).default("string"),
  default: z.string().optional(),
  required: z.boolean().default(true),
  description: z.string().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  content: z.string().min(1).optional(),
  variables: z.array(variableSchema).optional(),
  model_hint: z.string().nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  max_tokens: z.number().int().min(1).nullable().optional(),
  tags: z.array(z.string()).optional(),
  is_published: z.boolean().optional(),
  change_note: z.string().max(500).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; templateId: string }> }
) {
  try {
    const { orgId, templateId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("prompt_templates")
      .select("*")
      .eq("id", templateId)
      .eq("organization_id", orgId)
      .single();

    if (error || !data) throw new NotFoundError("Template");
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string; templateId: string }> }
) {
  try {
    const { orgId, templateId } = await params;
    const auth = await requireOrgAdmin(orgId);
    const body = await validateBody(request, updateTemplateSchema);
    const supabase = await createClient();

    // Get current template to check version
    const { data: current, error: fetchError } = await supabase
      .from("prompt_templates")
      .select("*")
      .eq("id", templateId)
      .eq("organization_id", orgId)
      .single();

    if (fetchError || !current) throw new NotFoundError("Template");

    const { change_note, ...updateData } = body;

    // If content or variables changed, bump version
    const contentChanged = body.content && body.content !== current.content;
    const varsChanged = body.variables && JSON.stringify(body.variables) !== JSON.stringify(current.variables);

    if (contentChanged || varsChanged) {
      const newVersion = (current.version || 1) + 1;
      (updateData as Record<string, unknown>).version = newVersion;

      // Create version snapshot
      await supabase.from("prompt_template_versions").insert({
        template_id: templateId,
        version: newVersion,
        content: body.content || current.content,
        variables: body.variables || current.variables,
        change_note: change_note || null,
        created_by: auth.userId,
      });
    }

    const { data, error } = await supabase
      .from("prompt_templates")
      .update(updateData)
      .eq("id", templateId)
      .eq("organization_id", orgId)
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
  { params }: { params: Promise<{ orgId: string; templateId: string }> }
) {
  try {
    const { orgId, templateId } = await params;
    await requireOrgAdmin(orgId);
    const supabase = await createClient();

    const { error } = await supabase
      .from("prompt_templates")
      .delete()
      .eq("id", templateId)
      .eq("organization_id", orgId);

    if (error) throw error;
    return noContentResponse();
  } catch (error) {
    return errorResponse(error);
  }
}
