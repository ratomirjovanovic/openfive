import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/api/auth-guard";
import { jsonResponse, errorResponse } from "@/lib/api/response";

interface EvaluationRow {
  model_identifier: string;
  scores: Record<string, number>;
  overall_score: number | null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    // Get all evaluations for this org
    const { data: evaluations, error } = await supabase
      .from("evaluations")
      .select("model_identifier, scores, overall_score")
      .eq("organization_id", orgId);

    if (error) throw error;

    // Aggregate scores by model
    const modelMap: Record<
      string,
      {
        model: string;
        count: number;
        overall_scores: number[];
        dimension_scores: Record<string, number[]>;
      }
    > = {};

    for (const row of (evaluations || []) as EvaluationRow[]) {
      const model = row.model_identifier;
      if (!modelMap[model]) {
        modelMap[model] = {
          model,
          count: 0,
          overall_scores: [],
          dimension_scores: {},
        };
      }

      modelMap[model].count += 1;

      if (row.overall_score != null) {
        modelMap[model].overall_scores.push(row.overall_score);
      }

      if (row.scores && typeof row.scores === "object") {
        for (const [dim, score] of Object.entries(row.scores)) {
          if (typeof score === "number") {
            if (!modelMap[model].dimension_scores[dim]) {
              modelMap[model].dimension_scores[dim] = [];
            }
            modelMap[model].dimension_scores[dim].push(score);
          }
        }
      }
    }

    const avg = (arr: number[]) =>
      arr.length > 0
        ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
        : 0;

    const summaries = Object.values(modelMap).map((entry) => {
      const dimensionAverages: Record<string, number> = {};
      for (const [dim, scores] of Object.entries(entry.dimension_scores)) {
        dimensionAverages[dim] = avg(scores);
      }

      return {
        model: entry.model,
        evaluation_count: entry.count,
        avg_overall_score: avg(entry.overall_scores),
        dimension_averages: dimensionAverages,
      };
    });

    // Sort by overall score descending
    summaries.sort((a, b) => b.avg_overall_score - a.avg_overall_score);

    // Compute global stats
    const totalEvaluations = (evaluations || []).length;
    const allOverall = (evaluations || [])
      .filter((e: EvaluationRow) => e.overall_score != null)
      .map((e: EvaluationRow) => e.overall_score as number);
    const avgOverall = avg(allOverall);
    const modelsEvaluated = summaries.length;
    const topModel = summaries.length > 0 ? summaries[0].model : null;

    return jsonResponse({
      total_evaluations: totalEvaluations,
      avg_overall_score: avgOverall,
      models_evaluated: modelsEvaluated,
      top_model: topModel,
      by_model: summaries,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
