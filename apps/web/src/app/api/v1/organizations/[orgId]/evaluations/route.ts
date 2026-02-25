import { createClient } from "@/lib/supabase/server";
import { requireOrgMember, getAuthContext } from "@/lib/api/auth-guard";
import { validateBody } from "@/lib/api/validate";
import { jsonResponse, createdResponse, errorResponse } from "@/lib/api/response";
import { z } from "zod/v4";

const scoresSchema = z.object({
  relevance: z.number().min(1).max(10).optional(),
  factuality: z.number().min(1).max(10).optional(),
  coherence: z.number().min(1).max(10).optional(),
  toxicity: z.number().min(1).max(10).optional(),
  helpfulness: z.number().min(1).max(10).optional(),
});

const createEvaluationSchema = z.object({
  request_id: z.string().uuid().optional(),
  model_identifier: z.string().min(1).max(200),
  scores: scoresSchema,
  overall_score: z.number().min(1).max(10).optional(),
  evaluator: z.enum(["auto", "human", "llm-judge"]).default("human"),
  evaluator_model: z.string().max(200).optional(),
  feedback: z.string().max(5000).optional(),
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
    const model = url.searchParams.get("model");
    const evaluator = url.searchParams.get("evaluator");
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = supabase
      .from("evaluations")
      .select("*", { count: "exact" })
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (model) {
      query = query.eq("model_identifier", model);
    }

    if (evaluator) {
      query = query.eq("evaluator", evaluator);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return jsonResponse({ data, total: count || 0 });
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
    await requireOrgMember(orgId);
    const { userId } = await getAuthContext();
    const body = await validateBody(request, createEvaluationSchema);
    const supabase = await createClient();

    // Calculate overall score if not provided
    let overallScore = body.overall_score;
    if (!overallScore && body.scores) {
      const scoreValues = Object.values(body.scores).filter(
        (v): v is number => typeof v === "number"
      );
      if (scoreValues.length > 0) {
        overallScore =
          Math.round(
            (scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) * 10
          ) / 10;
      }
    }

    const { data, error } = await supabase
      .from("evaluations")
      .insert({
        organization_id: orgId,
        request_id: body.request_id,
        model_identifier: body.model_identifier,
        scores: body.scores,
        overall_score: overallScore,
        evaluator: body.evaluator,
        evaluator_model: body.evaluator_model,
        feedback: body.feedback,
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
