"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/providers/context-provider";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Database,
  Zap,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Trash2,
  Clock,
  Target,
} from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { useState } from "react";

interface CacheStats {
  hits: number;
  misses: number;
  hit_rate: number;
  saved_cost_usd: number;
  total_requests: number;
  unique_cached_prompts: number;
  period: string;
}

export default function CachePage() {
  const { currentOrg, currentProject, currentEnv } = useAppContext();
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [ttlMinutes, setTtlMinutes] = useState(30);
  const [maxEntries, setMaxEntries] = useState(10000);

  const apiPath =
    currentOrg && currentProject && currentEnv
      ? `/api/v1/organizations/${currentOrg.id}/projects/${currentProject.id}/environments/${currentEnv.id}/cache`
      : null;

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["cache-stats", apiPath],
    queryFn: async () => {
      if (!apiPath) return null;
      const res = await fetch(apiPath);
      if (!res.ok) throw new Error("Failed to fetch cache stats");
      return res.json() as Promise<CacheStats>;
    },
    enabled: !!apiPath,
    refetchInterval: 30000,
  });

  const hasEnv = !!(currentOrg && currentProject && currentEnv);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prompt Cache"
        description="Semantic caching reduces costs by serving identical requests from cache instead of calling the provider."
        action={
          hasEnv ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          ) : undefined
        }
      />

      {!hasEnv ? (
        <EmptyState
          icon={<Database className="h-10 w-10" />}
          title="Select an environment"
          description="Choose an organization, project, and environment to view cache statistics."
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      ) : (
        <>
          {/* KPI Strip */}
          <div className="grid gap-4 md:grid-cols-5">
            <KpiCard
              label="Hit Rate"
              value={stats ? formatPercentage(stats.hit_rate) : "—"}
              icon={<Target className="h-4 w-4" />}
            />
            <KpiCard
              label="Cache Hits"
              value={stats?.hits.toLocaleString() || "0"}
              icon={<Zap className="h-4 w-4" />}
            />
            <KpiCard
              label="Cache Misses"
              value={stats?.misses.toLocaleString() || "0"}
              icon={<Database className="h-4 w-4" />}
            />
            <KpiCard
              label="Cost Saved (24h)"
              value={stats ? formatCurrency(stats.saved_cost_usd) : "$0.00"}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KpiCard
              label="Cached Prompts"
              value={stats?.unique_cached_prompts.toLocaleString() || "0"}
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </div>

          {/* Cache Config */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cache Configuration</CardTitle>
                <CardDescription>
                  Configure how the gateway caches prompt responses.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Enable Cache</Label>
                    <p className="text-xs text-neutral-500">
                      Cache identical prompts to reduce provider calls
                    </p>
                  </div>
                  <Switch
                    checked={cacheEnabled}
                    onCheckedChange={setCacheEnabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    TTL (minutes)
                  </Label>
                  <Input
                    type="number"
                    value={ttlMinutes}
                    onChange={(e) => setTtlMinutes(Number(e.target.value))}
                    min={1}
                    max={1440}
                  />
                  <p className="text-xs text-neutral-500">
                    How long cached responses remain valid (1–1440 min)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Max Cache Entries
                  </Label>
                  <Input
                    type="number"
                    value={maxEntries}
                    onChange={(e) => setMaxEntries(Number(e.target.value))}
                    min={100}
                    max={100000}
                  />
                  <p className="text-xs text-neutral-500">
                    Maximum number of cached responses per gateway instance
                  </p>
                </div>

                <Button size="sm" className="w-full">
                  Save Configuration
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">How Caching Works</CardTitle>
                <CardDescription>
                  Understanding semantic prompt caching
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-600">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium">Hash Generation</p>
                    <p className="text-xs text-neutral-500">
                      Each request is hashed using model + messages + temperature + max_tokens + tools
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-600">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium">Cache Lookup</p>
                    <p className="text-xs text-neutral-500">
                      If a matching hash exists and hasn&apos;t expired, the cached response is returned instantly
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-600">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium">Cost Savings</p>
                    <p className="text-xs text-neutral-500">
                      Cached responses cost $0, saving the full inference cost for repeated prompts
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-600">
                    4
                  </div>
                  <div>
                    <p className="text-sm font-medium">LRU Eviction</p>
                    <p className="text-xs text-neutral-500">
                      When the cache is full, least recently used entries are evicted first
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-md bg-neutral-50 p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-neutral-500" />
                    <span className="text-xs font-medium text-neutral-600">
                      Cache headers
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    Cached responses include{" "}
                    <Badge variant="secondary" className="text-xs">
                      x-cache: HIT
                    </Badge>{" "}
                    header. Use{" "}
                    <Badge variant="secondary" className="text-xs">
                      x-no-cache: true
                    </Badge>{" "}
                    to bypass.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cache Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cache Management</CardTitle>
              <CardDescription>
                Manage the gateway&apos;s prompt cache
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="gap-2">
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear All Cache
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Warm Cache
                </Button>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Clearing the cache forces all subsequent requests to call the provider. Use &quot;Warm Cache&quot; to
                pre-populate with recent successful requests.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
