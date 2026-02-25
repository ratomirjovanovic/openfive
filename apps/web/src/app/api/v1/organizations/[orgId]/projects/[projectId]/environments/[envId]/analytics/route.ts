import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/api/auth-guard";
import { jsonResponse, errorResponse } from "@/lib/api/response";
import { BadRequestError } from "@/lib/api/errors";

type Period = "24h" | "7d" | "30d" | "90d";
type GroupBy = "model" | "route" | "day" | "hour";

const periodToInterval: Record<Period, string> = {
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

function getPeriodStart(period: Period): string {
  const now = new Date();
  const ms: Record<Period, number> = {
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
  };
  return new Date(now.getTime() - ms[period]).toISOString();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; envId: string }> }
) {
  try {
    const { orgId, envId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    const url = new URL(request.url);
    const period = (url.searchParams.get("period") || "7d") as Period;
    const groupBy = (url.searchParams.get("group_by") || "model") as GroupBy;

    if (!periodToInterval[period]) {
      throw new BadRequestError(
        "Invalid period. Must be one of: 24h, 7d, 30d, 90d"
      );
    }

    if (!["model", "route", "day", "hour"].includes(groupBy)) {
      throw new BadRequestError(
        "Invalid group_by. Must be one of: model, route, day, hour"
      );
    }

    const periodStart = getPeriodStart(period);

    // Fetch all requests within the period
    const { data: requests, error } = await supabase
      .from("requests")
      .select(
        "id, model_identifier, route_id, total_cost_usd, duration_ms, status, created_at"
      )
      .eq("environment_id", envId)
      .gte("created_at", periodStart)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const rows = requests || [];

    // Calculate aggregate KPIs
    const totalCost = rows.reduce((sum, r) => sum + (r.total_cost_usd || 0), 0);
    const totalRequests = rows.length;
    const validLatencies = rows
      .filter((r) => r.duration_ms != null)
      .map((r) => r.duration_ms as number);
    const avgLatency =
      validLatencies.length > 0
        ? validLatencies.reduce((sum, l) => sum + l, 0) / validLatencies.length
        : 0;
    const successCount = rows.filter((r) => r.status === "success").length;
    const successRate =
      totalRequests > 0 ? (successCount / totalRequests) * 100 : 0;
    const costPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;

    // Group by model
    const costByModel: Record<string, number> = {};
    const requestsByModel: Record<string, number> = {};
    for (const r of rows) {
      const key = r.model_identifier || "unknown";
      costByModel[key] = (costByModel[key] || 0) + (r.total_cost_usd || 0);
      requestsByModel[key] = (requestsByModel[key] || 0) + 1;
    }

    // Group by route
    const costByRoute: Record<string, number> = {};
    const requestsByRoute: Record<string, number> = {};
    for (const r of rows) {
      const key = r.route_id || "unrouted";
      costByRoute[key] = (costByRoute[key] || 0) + (r.total_cost_usd || 0);
      requestsByRoute[key] = (requestsByRoute[key] || 0) + 1;
    }

    // Group by time (day or hour)
    const costOverTime: Record<string, { cost: number; requests: number }> = {};
    for (const r of rows) {
      const date = new Date(r.created_at);
      let key: string;
      if (groupBy === "hour" || period === "24h") {
        key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")} ${String(date.getUTCHours()).padStart(2, "0")}:00`;
      } else {
        key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
      }
      if (!costOverTime[key]) {
        costOverTime[key] = { cost: 0, requests: 0 };
      }
      costOverTime[key].cost += r.total_cost_usd || 0;
      costOverTime[key].requests += 1;
    }

    // Top 10 routes by spend
    const topRoutes = Object.entries(costByRoute)
      .map(([routeId, cost]) => ({
        route_id: routeId,
        total_cost: cost,
        request_count: requestsByRoute[routeId] || 0,
      }))
      .sort((a, b) => b.total_cost - a.total_cost)
      .slice(0, 10);

    // Format cost_over_time as sorted array
    const costOverTimeArray = Object.entries(costOverTime)
      .map(([period, data]) => ({
        period,
        cost: data.cost,
        requests: data.requests,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Format cost_by_model as sorted array
    const costByModelArray = Object.entries(costByModel)
      .map(([model, cost]) => ({
        model,
        cost,
        requests: requestsByModel[model] || 0,
      }))
      .sort((a, b) => b.cost - a.cost);

    // Format requests_by_model as array for pie chart
    const requestsByModelArray = Object.entries(requestsByModel)
      .map(([model, count]) => ({
        model,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return jsonResponse({
      total_cost: totalCost,
      total_requests: totalRequests,
      avg_latency: avgLatency,
      success_rate: successRate,
      cost_per_request: costPerRequest,
      cost_by_model: costByModelArray,
      requests_by_model: requestsByModelArray,
      cost_over_time: costOverTimeArray,
      top_routes: topRoutes,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
