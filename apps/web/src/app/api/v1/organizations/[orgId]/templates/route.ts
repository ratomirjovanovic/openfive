import { createClient } from "@/lib/supabase/server";
import { requireOrgMember, requireOrgAdmin } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, createdResponse, errorResponse } from "@/lib/api/response";
import { z } from "zod/v4";

const variableSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "json"]).default("string"),
  default: z.string().optional(),
  required: z.boolean().default(true),
  description: z.string().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/, "Slug must be lowercase alphanumeric with hyphens or underscores"),
  description: z.string().max(1000).optional(),
  content: z.string().min(1),
  variables: z.array(variableSchema).default([]),
  model_hint: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).optional(),
  tags: z.array(z.string()).default([]),
  is_published: z.boolean().default(false),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const tag = url.searchParams.get("tag") || "";
    const publishedOnly = url.searchParams.get("published") === "true";

    let query = supabase
      .from("prompt_templates")
      .select("*")
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    if (tag) {
      query = query.contains("tags", [tag]);
    }

    if (publishedOnly) {
      query = query.eq("is_published", true);
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
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const auth = await requireOrgAdmin(orgId);
    const body = await validateBody(request, createTemplateSchema);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("prompt_templates")
      .insert({
        ...body,
        organization_id: orgId,
        created_by: auth.userId,
        version: 1,
      })
      .select()
      .single();

    if (error) throw error;

    // Create initial version entry
    await supabase.from("prompt_template_versions").insert({
      template_id: data.id,
      version: 1,
      content: body.content,
      variables: body.variables,
      change_note: "Initial version",
      created_by: auth.userId,
    });

    return createdResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
