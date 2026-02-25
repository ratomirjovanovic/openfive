import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/api/auth-guard";
import { jsonResponse, errorResponse } from "@/lib/api/response";
import { NotFoundError } from "@/lib/api/errors";

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

    // Get the test
    const { data: test, error: testError } = await supabase
      .from("ab_tests")
      .select("*")
      .eq("id", testId)
      .single();

    if (testError || !test) throw new NotFoundError("A/B Test");

    // Get assignments count per variant
    const { data: assignments, error: assignError } = await supabase
      .from("ab_test_assignments")
      .select("variant_index, request_id")
      .eq("ab_test_id", testId);

    if (assignError) throw assignError;

    const variants = (test.variants as Array<{
      name: string;
      model_id: string;
      weight: number;
      description?: string;
    }>) || [];

    // Group assignments by variant
    const variantAssignments: Record<number, string[]> = {};
    for (const a of assignments || []) {
      if (!variantAssignments[a.variant_index]) {
        variantAssignments[a.variant_index] = [];
      }
      if (a.request_id) {
        variantAssignments[a.variant_index].push(a.request_id);
      }
    }

    // Fetch request metrics for each variant
    const variantResults = await Promise.all(
      variants.map(async (variant, index) => {
        const requestIds = variantAssignments[index] || [];
        let avgCost = 0;
        let avgLatency = 0;
        let successRate = 0;
        let schemaPassRate = 0;
        let sampleCount = requestIds.length;

        if (requestIds.length > 0) {
          const { data: requests } = await supabase
            .from("requests")
            .select("total_cost_usd, duration_ms, status, schema_pass")
            .in("id", requestIds.slice(0, 1000));

          if (requests && requests.length > 0) {
            const totalCost = requests.reduce(
              (sum, r) => sum + (r.total_cost_usd || 0),
              0
            );
            const totalLatency = requests.reduce(
              (sum, r) => sum + (r.duration_ms || 0),
              0
            );
            const successCount = requests.filter(
              (r) => r.status === "success"
            ).length;
            const schemaPassCount = requests.filter(
              (r) => r.schema_pass === true
            ).length;

            avgCost = totalCost / requests.length;
            avgLatency = totalLatency / requests.length;
            successRate = (successCount / requests.length) * 100;
            schemaPassRate = (schemaPassCount / requests.length) * 100;
            sampleCount = requests.length;
          }
        }

        return {
          variant_index: index,
          variant_name: variant.name,
          model_id: variant.model_id,
          weight: variant.weight,
          sample_count: sampleCount,
          avg_cost: avgCost,
          avg_latency: avgLatency,
          success_rate: successRate,
          schema_pass_rate: schemaPassRate,
        };
      })
    );

    // Determine winner (lowest cost with acceptable success rate)
    const totalSamples = variantResults.reduce(
      (sum, v) => sum + v.sample_count,
      0
    );

    let winner: {
      variant_index: number;
      variant_name: string;
      reason: string;
      confidence: number;
      cost_savings_per_1000?: number;
    } | null = null;

    const eligibleVariants = variantResults.filter(
      (v) => v.sample_count >= 10
    );

    if (eligibleVariants.length >= 2) {
      // Score each variant: weighted combination of metrics
      const scored = eligibleVariants.map((v) => {
        const costScore = v.avg_cost > 0 ? 1 / v.avg_cost : 0;
        const latencyScore = v.avg_latency > 0 ? 1 / v.avg_latency : 0;
        const qualityScore = (v.success_rate + v.schema_pass_rate) / 200;
        return {
          ...v,
          score: costScore * 0.3 + latencyScore * 0.3 + qualityScore * 0.4,
        };
      });

      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];
      const second = scored[1];

      // Simple confidence based on sample size
      const minSamples = Math.min(best.sample_count, second.sample_count);
      const confidence = Math.min(
        95,
        Math.round(50 + (minSamples / (test.sample_size_target || 1000)) * 45)
      );

      const costSavings =
        second.avg_cost > best.avg_cost
          ? (second.avg_cost - best.avg_cost) * 1000
          : 0;

      winner = {
        variant_index: best.variant_index,
        variant_name: best.variant_name,
        reason: `Best combined score across cost, latency, and quality`,
        confidence,
        cost_savings_per_1000: Math.round(costSavings * 100) / 100,
      };
    }

    // Recent assignments for the log
    const { data: recentAssignments } = await supabase
      .from("ab_test_assignments")
      .select("*")
      .eq("ab_test_id", testId)
      .order("assigned_at", { ascending: false })
      .limit(50);

    return jsonResponse({
      test_id: testId,
      status: test.status,
      sample_size_target: test.sample_size_target,
      total_samples: totalSamples,
      progress: Math.min(
        100,
        Math.round((totalSamples / (test.sample_size_target || 1000)) * 100)
      ),
      variants: variantResults,
      winner,
      recent_assignments: recentAssignments || [],
    });
  } catch (error) {
    return errorResponse(error);
  }
}
