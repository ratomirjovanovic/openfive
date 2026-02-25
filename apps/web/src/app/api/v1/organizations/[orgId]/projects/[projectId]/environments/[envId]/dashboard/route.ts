import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/api/auth-guard";
import { jsonResponse, errorResponse } from "@/lib/api/response";

function getStartOfDay(): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}

function get24hAgo(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

function get7dAgo(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; envId: string }> }
) {
  try {
    const { orgId, envId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    const todayStart = getStartOfDay();
    const twentyFourHoursAgo = get24hAgo();
    const sevenDaysAgo = get7dAgo();

    // Fetch requests from last 7 days (covers all needed time ranges)
    const { data: requests, error: requestsError } = await supabase
      .from("requests")
      .select(
        "id, model_identifier, route_id, total_cost_usd, duration_ms, status, created_at"
      )
      .eq("environment_id", envId)
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: true });

    if (requestsError) throw requestsError;

    // Fetch open incidents
    const { data: openIncidents, error: incidentsError } = await supabase
      .from("incidents")
      .select("*")
      .eq("environment_id", envId)
      .in("status", ["open", "acknowledged"])
      .order("created_at", { ascending: false });

    if (incidentsError) throw incidentsError;

    // Fetch recent incidents (last 3)
    const { data: recentIncidents, error: recentIncidentsError } = await supabase
      .from("incidents")
      .select("id, title, severity, status, created_at")
      .eq("environment_id", envId)
      .order("created_at", { ascending: false })
      .limit(3);

    if (recentIncidentsError) throw recentIncidentsError;

    const rows = requests || [];

    // spend_today: sum of total_cost_usd from requests today
    const spendToday = rows
      .filter((r) => r.created_at >= todayStart)
      .reduce((sum, r) => sum + (r.total_cost_usd || 0), 0);

    // spend_7d: sum of total_cost_usd from requests last 7 days
    const spend7d = rows.reduce((sum, r) => sum + (r.total_cost_usd || 0), 0);

    // Requests in last 24h
    const last24hRows = rows.filter((r) => r.created_at >= twentyFourHoursAgo);

    // request_count_24h
    const requestCount24h = last24hRows.length;

    // p95_latency: 95th percentile of duration_ms from last 24h
    const latencies = last24hRows
      .filter((r) => r.duration_ms != null)
      .map((r) => r.duration_ms as number)
      .sort((a, b) => a - b);

    let p95Latency = 0;
    if (latencies.length > 0) {
      const index = Math.ceil(latencies.length * 0.95) - 1;
      p95Latency = latencies[Math.min(index, latencies.length - 1)];
    }

    // incident_count: count of open incidents
    const incidentCount = (openIncidents || []).length;

    // success_rate: percentage of successful requests (last 24h)
    const successCount = last24hRows.filter(
      (r) => r.status === "success"
    ).length;
    const successRate =
      requestCount24h > 0 ? (successCount / requestCount24h) * 100 : 0;

    // spend_by_day: array of {date, spend} for last 7 days
    const spendByDayMap: Record<string, number> = {};
    // Initialize all 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      spendByDayMap[key] = 0;
    }
    for (const r of rows) {
      const d = new Date(r.created_at);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      if (key in spendByDayMap) {
        spendByDayMap[key] += r.total_cost_usd || 0;
      }
    }
    const spendByDay = Object.entries(spendByDayMap).map(([date, spend]) => ({
      date,
      spend,
    }));

    // top_models: top 5 models by request count (last 24h)
    const modelCounts: Record<
      string,
      { requests: number; cost: number }
    > = {};
    for (const r of last24hRows) {
      const key = r.model_identifier || "unknown";
      if (!modelCounts[key]) {
        modelCounts[key] = { requests: 0, cost: 0 };
      }
      modelCounts[key].requests += 1;
      modelCounts[key].cost += r.total_cost_usd || 0;
    }
    const topModels = Object.entries(modelCounts)
      .map(([model, data]) => ({
        model,
        requests: data.requests,
        cost: data.cost,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5);

    // top_routes: top 5 routes by spend (last 24h)
    const routeSpend: Record<
      string,
      { requests: number; cost: number }
    > = {};
    for (const r of last24hRows) {
      const key = r.route_id || "unrouted";
      if (!routeSpend[key]) {
        routeSpend[key] = { requests: 0, cost: 0 };
      }
      routeSpend[key].requests += 1;
      routeSpend[key].cost += r.total_cost_usd || 0;
    }
    const topRoutes = Object.entries(routeSpend)
      .map(([route, data]) => ({
        route,
        requests: data.requests,
        cost: data.cost,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    return jsonResponse({
      spend_today: spendToday,
      spend_7d: spend7d,
      p95_latency: p95Latency,
      incident_count: incidentCount,
      request_count_24h: requestCount24h,
      success_rate: successRate,
      spend_by_day: spendByDay,
      top_models: topModels,
      top_routes: topRoutes,
      recent_incidents: recentIncidents || [],
    });
  } catch (error) {
    return errorResponse(error);
  }
}
