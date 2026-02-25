import { createClient } from "@/lib/supabase/server";
import { requireOrgMember } from "@/lib/api/auth-guard";
import { jsonResponse, errorResponse } from "@/lib/api/response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; envId: string }> }
) {
  try {
    const { orgId, envId } = await params;
    await requireOrgMember(orgId);
    const supabase = await createClient();

    // Get cache statistics from requests table
    // Cached requests have metadata.cache_hit = true
    const { data: allRequests, error } = await supabase
      .from("requests")
      .select("total_cost_usd, metadata, created_at")
      .eq("environment_id", envId)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const requests = allRequests || [];
    let cacheHits = 0;
    let cacheMisses = 0;
    let savedCost = 0;

    for (const req of requests) {
      const meta = req.metadata as Record<string, unknown> | null;
      if (meta?.cache_hit) {
        cacheHits++;
        savedCost += req.total_cost_usd || 0;
      } else {
        cacheMisses++;
      }
    }

    const total = cacheHits + cacheMisses;
    const hitRate = total > 0 ? (cacheHits / total) * 100 : 0;

    // Get unique prompt hashes to estimate cache entries
    const uniquePrompts = new Set(
      requests
        .filter((r) => {
          const meta = r.metadata as Record<string, unknown> | null;
          return meta?.prompt_cache_key;
        })
        .map((r) => {
          const meta = r.metadata as Record<string, unknown>;
          return meta.prompt_cache_key as string;
        })
    );

    return jsonResponse({
      hits: cacheHits,
      misses: cacheMisses,
      hit_rate: Math.round(hitRate * 10) / 10,
      saved_cost_usd: Math.round(savedCost * 1000000) / 1000000,
      total_requests: total,
      unique_cached_prompts: uniquePrompts.size,
      period: "24h",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
