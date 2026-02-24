import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, createdResponse, errorResponse } from "@/lib/api/response";
import { z } from "zod/v4";

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  billing_email: z.string().email().optional(),
});

export async function GET() {
  try {
    const auth = await getAuthContext();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("*, memberships!inner(role)")
      .eq("memberships.user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await getAuthContext();
    const body = await validateBody(request, createOrgSchema);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("organizations")
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return createdResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
