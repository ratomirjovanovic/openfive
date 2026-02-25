import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/api/auth-guard";
import { jsonResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError } from "@/lib/api/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; templateId: string }> }
) {
  try {
    const { orgId, templateId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    // Verify the template belongs to this org
    const { data: template, error: templateError } = await supabase
      .from("prompt_templates")
      .select("id")
      .eq("id", templateId)
      .eq("organization_id", orgId)
      .single();

    if (templateError || !template) throw new NotFoundError("Template");

    const { data, error } = await supabase
      .from("prompt_template_versions")
      .select("*")
      .eq("template_id", templateId)
      .order("version", { ascending: false });

    if (error) throw error;
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
