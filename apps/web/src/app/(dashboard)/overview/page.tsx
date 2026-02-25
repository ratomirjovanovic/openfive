"use client";

import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/providers/context-provider";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SpendLineChart } from "@/components/charts/spend-line-chart";
import { SetupChecklist } from "@/components/onboarding/setup-checklist";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  Clock,
  AlertTriangle,
  Activity,
  CheckCircle,
  BarChart3,
  LayoutDashboard,
  RefreshCw,
} from "lucide-react";
import {
  formatCurrency,
  formatLatency,
  formatPercentage,
} from "@/lib/formatters";
import { Button } from "@/components/ui/button";

interface DashboardData {
  spend_today: number;
  spend_7d: number;
  p95_latency: number;
  incident_count: number;
  request_count_24h: number;
  success_rate: number;
  spend_by_day: { date: string; spend: number }[];
  top_models: { model: string; requests: number; cost: number }[];
  top_routes: { route: string; requests: number; cost: number }[];
  recent_incidents: {
    id: string;
    title: string;
    severity: string;
    status: string;
    created_at: string;
  }[];
}

function KpiSkeleton() {
  return (
    <Card className="border-neutral-200 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="mt-2 h-7 w-24" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card className="border-neutral-200 shadow-none">
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card className="border-neutral-200 shadow-none">
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function OverviewPage() {
  const { currentOrg, currentProject, currentEnv } = useAppContext();

  const hasEnv = !!(currentOrg && currentProject && currentEnv);

  const apiPath =
    currentOrg && currentProject && currentEnv
      ? `/api/v1/organizations/${currentOrg.id}/projects/${currentProject.id}/environments/${currentEnv.id}/dashboard`
      : null;

  const { data, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ["dashboard", apiPath],
    queryFn: async () => {
      if (!apiPath) throw new Error("No API path");
      const res = await fetch(apiPath);
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    },
    enabled: !!apiPath,
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Monitor your LLM inference costs, routes, and incidents."
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

      <SetupChecklist />

      {!hasEnv ? (
        <EmptyState
          icon={<LayoutDashboard className="h-10 w-10" />}
          title="Select an environment"
          description="Choose an organization, project, and environment from the top bar to view your dashboard."
        />
      ) : isLoading ? (
        <>
          {/* KPI skeletons */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <KpiSkeleton key={i} />
            ))}
          </div>
          {/* Chart skeleton */}
          <ChartSkeleton />
          {/* Table skeletons */}
          <div className="grid gap-6 lg:grid-cols-3">
            <TableSkeleton />
            <TableSkeleton />
            <TableSkeleton />
          </div>
        </>
      ) : !data ? (
        <EmptyState
          icon={<BarChart3 className="h-10 w-10" />}
          title="No data yet"
          description="Send your first inference request through the gateway to see your dashboard come to life."
        />
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <KpiCard
              label="Spend Today"
              value={formatCurrency(data.spend_today, { decimals: 2 })}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KpiCard
              label="Spend 7d"
              value={formatCurrency(data.spend_7d, { decimals: 2 })}
              icon={<Activity className="h-4 w-4" />}
            />
            <KpiCard
              label="p95 Latency"
              value={
                data.p95_latency > 0
                  ? formatLatency(data.p95_latency)
                  : "\u2014"
              }
              icon={<Clock className="h-4 w-4" />}
            />
            <KpiCard
              label="Incidents"
              value={data.incident_count}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <KpiCard
              label="Requests (24h)"
              value={data.request_count_24h.toLocaleString()}
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <KpiCard
              label="Success Rate"
              value={
                data.request_count_24h > 0
                  ? formatPercentage(data.success_rate)
                  : "\u2014"
              }
              icon={<CheckCircle className="h-4 w-4" />}
            />
          </div>

          {/* Spend chart */}
          <SpendLineChart data={data.spend_by_day} title="Spend (last 7 days)" />

          {/* Bottom row: Top Models, Top Routes, Recent Incidents */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Top Models */}
            <Card className="border-neutral-200 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-700">
                  Top Models (24h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.top_models.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                          Model
                        </th>
                        <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                          Reqs
                        </th>
                        <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                          Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {data.top_models.map((m) => (
                        <tr key={m.model}>
                          <td className="py-2 text-sm text-neutral-900">
                            <span className="font-mono text-xs">
                              {m.model.length > 24
                                ? m.model.slice(0, 24) + "..."
                                : m.model}
                            </span>
                          </td>
                          <td className="py-2 text-right text-sm text-neutral-600">
                            {m.requests.toLocaleString()}
                          </td>
                          <td className="py-2 text-right font-mono text-sm font-medium text-neutral-900">
                            {formatCurrency(m.cost, { decimals: 4 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-neutral-400">
                    No model data yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Routes */}
            <Card className="border-neutral-200 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-700">
                  Top Routes (24h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.top_routes.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                          Route
                        </th>
                        <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                          Reqs
                        </th>
                        <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                          Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {data.top_routes.map((r) => (
                        <tr key={r.route}>
                          <td className="py-2 text-sm text-neutral-900">
                            <span className="font-mono text-xs">
                              {r.route === "unrouted"
                                ? "Unrouted"
                                : r.route.length > 20
                                  ? r.route.slice(0, 20) + "..."
                                  : r.route}
                            </span>
                          </td>
                          <td className="py-2 text-right text-sm text-neutral-600">
                            {r.requests.toLocaleString()}
                          </td>
                          <td className="py-2 text-right font-mono text-sm font-medium text-neutral-900">
                            {formatCurrency(r.cost, { decimals: 4 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-neutral-400">
                    No route data yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Incidents */}
            <Card className="border-neutral-200 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-700">
                  Recent Incidents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.recent_incidents.length > 0 ? (
                  <div className="space-y-3">
                    {data.recent_incidents.map((incident) => (
                      <div
                        key={incident.id}
                        className="flex items-start justify-between gap-3 rounded-md border border-neutral-100 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-neutral-900">
                            {incident.title}
                          </p>
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {new Date(incident.created_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <StatusBadge status={incident.severity} />
                          <StatusBadge status={incident.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-neutral-400">
                    No incidents
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
