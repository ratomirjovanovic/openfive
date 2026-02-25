"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/providers/context-provider";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  DollarSign,
  Activity,
  Clock,
  Target,
  CheckCircle,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  formatCurrency,
  formatLatency,
  formatPercentage,
} from "@/lib/formatters";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface AnalyticsData {
  total_cost: number;
  total_requests: number;
  avg_latency: number;
  success_rate: number;
  cost_per_request: number;
  cost_by_model: { model: string; cost: number; requests: number }[];
  requests_by_model: { model: string; count: number }[];
  cost_over_time: { period: string; cost: number; requests: number }[];
  top_routes: {
    route_id: string;
    total_cost: number;
    request_count: number;
  }[];
}

type Period = "24h" | "7d" | "30d" | "90d";

const CHART_COLORS = [
  "#171717",
  "#525252",
  "#737373",
  "#a3a3a3",
  "#d4d4d4",
  "#404040",
  "#262626",
  "#0a0a0a",
  "#78716c",
  "#57534e",
];

const periodLabels: Record<Period, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

export default function AnalyticsPage() {
  const { currentOrg, currentProject, currentEnv } = useAppContext();
  const [period, setPeriod] = useState<Period>("7d");

  const hasEnv = !!(currentOrg && currentProject && currentEnv);

  const apiPath =
    currentOrg && currentProject && currentEnv
      ? `/api/v1/organizations/${currentOrg.id}/projects/${currentProject.id}/environments/${currentEnv.id}/analytics`
      : null;

  const { data, isLoading, refetch } = useQuery<AnalyticsData>({
    queryKey: ["analytics", apiPath, period],
    queryFn: async () => {
      if (!apiPath) throw new Error("No API path");
      const params = new URLSearchParams({
        period,
        group_by: period === "24h" ? "hour" : "day",
      });
      const res = await fetch(`${apiPath}?${params}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!apiPath,
  });

  const handleExportCSV = useCallback(async () => {
    if (!currentOrg || !currentProject || !currentEnv) return;

    const requestsPath = `/api/v1/organizations/${currentOrg.id}/projects/${currentProject.id}/environments/${currentEnv.id}/requests`;
    const params = new URLSearchParams({ limit: "1000", offset: "0" });
    const res = await fetch(`${requestsPath}?${params}`);
    if (!res.ok) return;

    const { data: requests } = await res.json();
    if (!requests || requests.length === 0) return;

    const headers = [
      "request_id",
      "model_identifier",
      "status",
      "input_tokens",
      "output_tokens",
      "total_cost_usd",
      "duration_ms",
      "action_taken",
      "is_streaming",
      "created_at",
    ];

    const csvRows = [headers.join(",")];
    for (const row of requests) {
      const values = headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return "";
        if (typeof val === "string" && val.includes(",")) {
          return `"${val}"`;
        }
        return String(val);
      });
      csvRows.push(values.join(","));
    }

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `openfive-requests-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [currentOrg, currentProject, currentEnv, period]);

  const tooltipStyle = {
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    fontSize: "13px",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Cost breakdown, usage trends, and performance insights."
        action={
          hasEnv ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="gap-2"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          ) : undefined
        }
      />

      {!hasEnv ? (
        <EmptyState
          icon={<BarChart3 className="h-10 w-10" />}
          title="Select an environment"
          description="Choose an organization, project, and environment from the top bar to view analytics."
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      ) : !data ? (
        <EmptyState
          icon={<BarChart3 className="h-10 w-10" />}
          title="No analytics data"
          description="Send inference requests through the gateway to see analytics here."
        />
      ) : (
        <>
          {/* Period selector */}
          <div className="flex items-center gap-3">
            <Select
              value={period}
              onValueChange={(v) => setPeriod(v as Period)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(periodLabels) as Period[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {periodLabels[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* KPI strip */}
          <div className="grid gap-4 md:grid-cols-5">
            <KpiCard
              label="Total Spend"
              value={formatCurrency(data.total_cost, { decimals: 2 })}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <KpiCard
              label="Total Requests"
              value={data.total_requests.toLocaleString()}
              icon={<Activity className="h-4 w-4" />}
            />
            <KpiCard
              label="Avg Latency"
              value={
                data.avg_latency > 0 ? formatLatency(data.avg_latency) : "\u2014"
              }
              icon={<Clock className="h-4 w-4" />}
            />
            <KpiCard
              label="Cost / Request"
              value={
                data.cost_per_request > 0
                  ? formatCurrency(data.cost_per_request, { decimals: 6 })
                  : "\u2014"
              }
              icon={<Target className="h-4 w-4" />}
            />
            <KpiCard
              label="Success Rate"
              value={
                data.total_requests > 0
                  ? formatPercentage(data.success_rate)
                  : "\u2014"
              }
              icon={<CheckCircle className="h-4 w-4" />}
            />
          </div>

          {/* Charts row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Cost over time - Area chart */}
            <Card className="border-neutral-200 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-700">
                  Cost over time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {data.cost_over_time.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.cost_over_time}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                        />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 11, fill: "#6b7280" }}
                          tickLine={false}
                          axisLine={{ stroke: "#e5e7eb" }}
                          tickFormatter={(v) => {
                            // Shorten the label
                            const parts = v.split(" ");
                            if (parts.length === 2) {
                              return parts[1]; // Show just time for hourly
                            }
                            return v.slice(5); // Remove year prefix
                          }}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value) => [
                            `$${Number(value).toFixed(4)}`,
                            "Cost",
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="cost"
                          stroke="#171717"
                          strokeWidth={2}
                          fill="#171717"
                          fillOpacity={0.08}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                      No data for this period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cost breakdown by model - Horizontal bar chart */}
            <Card className="border-neutral-200 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-700">
                  Cost by model
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {data.cost_by_model.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.cost_by_model.slice(0, 8)}
                        layout="vertical"
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#e5e7eb"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          tickLine={false}
                          axisLine={{ stroke: "#e5e7eb" }}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <YAxis
                          type="category"
                          dataKey="model"
                          tick={{ fontSize: 11, fill: "#6b7280" }}
                          tickLine={false}
                          axisLine={false}
                          width={120}
                          tickFormatter={(v: string) =>
                            v.length > 18 ? v.slice(0, 18) + "..." : v
                          }
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value) => [
                            `$${Number(value).toFixed(4)}`,
                            "Cost",
                          ]}
                        />
                        <Bar dataKey="cost" fill="#171717" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                      No data for this period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Second row of charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Requests by model - Pie chart */}
            <Card className="border-neutral-200 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-700">
                  Requests by model
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {data.requests_by_model.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.requests_by_model.slice(0, 8)}
                          dataKey="count"
                          nameKey="model"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={((props: { name?: string; percent?: number }) => {
                            const name = props.name || "";
                            const pct = props.percent || 0;
                            return `${name.length > 15 ? name.slice(0, 15) + "..." : name} (${(pct * 100).toFixed(0)}%)`;
                          }) as unknown as boolean}
                          labelLine={{ stroke: "#a3a3a3" }}
                        >
                          {data.requests_by_model
                            .slice(0, 8)
                            .map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value, name) => [
                            `${Number(value).toLocaleString()} requests`,
                            name,
                          ]}
                        />
                        <Legend
                          formatter={(value: string) =>
                            value.length > 20
                              ? value.slice(0, 20) + "..."
                              : value
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                      No data for this period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top routes by spend - Table */}
            <Card className="border-neutral-200 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-700">
                  Top 10 routes by spend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 overflow-y-auto">
                  {data.top_routes.length > 0 ? (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-neutral-200">
                          <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Route
                          </th>
                          <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Requests
                          </th>
                          <th className="pb-2 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Cost
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {data.top_routes.map((route, index) => (
                          <tr key={route.route_id}>
                            <td className="py-2 text-sm text-neutral-900">
                              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-600">
                                {index + 1}
                              </span>
                              <span className="font-mono text-xs">
                                {route.route_id === "unrouted"
                                  ? "Unrouted"
                                  : route.route_id.slice(0, 12) + "..."}
                              </span>
                            </td>
                            <td className="py-2 text-right text-sm text-neutral-600">
                              {route.request_count.toLocaleString()}
                            </td>
                            <td className="py-2 text-right font-mono text-sm font-medium text-neutral-900">
                              {formatCurrency(route.total_cost, {
                                decimals: 4,
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                      No route data for this period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
