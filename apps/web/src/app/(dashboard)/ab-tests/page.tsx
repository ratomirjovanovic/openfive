"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/providers/context-provider";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { RelativeTime } from "@/components/shared/relative-time";
import { KpiCard } from "@/components/shared/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FlaskConical,
  Plus,
  Play,
  Pause,
  CheckCircle,
  Trash2,
  RefreshCw,
  Trophy,
  ArrowLeft,
  X,
  DollarSign,
  Clock,
  Target,
  ShieldCheck,
} from "lucide-react";
import {
  formatCurrency,
  formatLatency,
  formatPercentage,
} from "@/lib/formatters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Variant {
  name: string;
  model_id: string;
  weight: number;
  description?: string;
}

interface AbTest {
  id: string;
  environment_id: string;
  route_id: string;
  name: string;
  description?: string;
  status: string;
  variants: Variant[];
  metrics: Record<string, unknown>;
  sample_size_target: number;
  started_at?: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface VariantResult {
  variant_index: number;
  variant_name: string;
  model_id: string;
  weight: number;
  sample_count: number;
  avg_cost: number;
  avg_latency: number;
  success_rate: number;
  schema_pass_rate: number;
}

interface Winner {
  variant_index: number;
  variant_name: string;
  reason: string;
  confidence: number;
  cost_savings_per_1000?: number;
}

interface TestResults {
  test_id: string;
  status: string;
  sample_size_target: number;
  total_samples: number;
  progress: number;
  variants: VariantResult[];
  winner: Winner | null;
  recent_assignments: Array<{
    id: string;
    variant_index: number;
    trace_id: string;
    request_id?: string;
    assigned_at: string;
  }>;
}

interface RouteOption {
  id: string;
  name: string;
  slug: string;
}

interface ModelOption {
  id: string;
  model_name: string;
  provider_name: string;
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<AbTest>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="text-sm font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "variants",
    header: "Variants",
    cell: ({ row }) => (
      <span className="text-sm text-neutral-600">
        {row.original.variants.length} variants
      </span>
    ),
  },
  {
    accessorKey: "sample_size_target",
    header: "Target",
    cell: ({ row }) => (
      <span className="text-sm text-neutral-600">
        {row.original.sample_size_target.toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => <RelativeTime date={row.original.created_at} />,
  },
];

// ---------------------------------------------------------------------------
// Chart colors
// ---------------------------------------------------------------------------

const CHART_COLORS = [
  "#171717",
  "#525252",
  "#737373",
  "#a3a3a3",
  "#d4d4d4",
  "#404040",
];

const tooltipStyle = {
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  fontSize: "13px",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AbTestsPage() {
  const { currentOrg, currentProject, currentEnv } = useAppContext();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<AbTest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRouteId, setFormRouteId] = useState("");
  const [formSampleSize, setFormSampleSize] = useState("1000");
  const [formVariants, setFormVariants] = useState<
    Array<{ name: string; model_id: string; weight: string; description: string }>
  >([
    { name: "Control", model_id: "", weight: "50", description: "" },
    { name: "Variant B", model_id: "", weight: "50", description: "" },
  ]);

  const hasEnv = !!(currentOrg && currentProject && currentEnv);

  const apiPath =
    currentOrg && currentProject && currentEnv
      ? `/api/v1/organizations/${currentOrg.id}/projects/${currentProject.id}/environments/${currentEnv.id}/ab-tests`
      : null;

  const routesApiPath =
    currentOrg && currentProject && currentEnv
      ? `/api/v1/organizations/${currentOrg.id}/projects/${currentProject.id}/environments/${currentEnv.id}/routes`
      : null;

  const modelsApiPath = currentOrg
    ? `/api/v1/organizations/${currentOrg.id}/models`
    : null;

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  const {
    data: tests = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["ab-tests", apiPath, statusFilter],
    queryFn: async () => {
      if (!apiPath) return [];
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const url = params.toString() ? `${apiPath}?${params}` : apiPath;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch A/B tests");
      return res.json() as Promise<AbTest[]>;
    },
    enabled: !!apiPath,
  });

  const { data: routes = [] } = useQuery({
    queryKey: ["routes-for-ab", routesApiPath],
    queryFn: async () => {
      if (!routesApiPath) return [];
      const res = await fetch(routesApiPath);
      if (!res.ok) return [];
      return res.json() as Promise<RouteOption[]>;
    },
    enabled: !!routesApiPath,
  });

  const { data: models = [] } = useQuery({
    queryKey: ["models-for-ab", modelsApiPath],
    queryFn: async () => {
      if (!modelsApiPath) return [];
      const res = await fetch(modelsApiPath);
      if (!res.ok) return [];
      return res.json() as Promise<ModelOption[]>;
    },
    enabled: !!modelsApiPath,
  });

  const { data: testResults, isLoading: resultsLoading } =
    useQuery<TestResults>({
      queryKey: ["ab-test-results", apiPath, selectedTest?.id],
      queryFn: async () => {
        if (!apiPath || !selectedTest) throw new Error("No test selected");
        const res = await fetch(`${apiPath}/${selectedTest.id}/results`);
        if (!res.ok) throw new Error("Failed to fetch results");
        return res.json();
      },
      enabled: !!apiPath && !!selectedTest,
      refetchInterval: selectedTest?.status === "running" ? 10000 : false,
    });

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const createMutation = useMutation({
    mutationFn: async (body: {
      name: string;
      description?: string;
      route_id: string;
      variants: Variant[];
      sample_size_target: number;
    }) => {
      const res = await fetch(apiPath!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || "Failed to create test");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ab-tests"] });
      toast.success("A/B test created");
      resetForm();
      setCreateOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      testId,
      status,
    }: {
      testId: string;
      status: string;
    }) => {
      const res = await fetch(`${apiPath}/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ab-tests"] });
      queryClient.invalidateQueries({ queryKey: ["ab-test-results"] });
      setSelectedTest(data);
      toast.success("Test status updated");
    },
    onError: () => {
      toast.error("Failed to update test status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (testId: string) => {
      const res = await fetch(`${apiPath}/${testId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete test");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ab-tests"] });
      setSelectedTest(null);
      toast.success("A/B test deleted");
    },
    onError: () => {
      toast.error("Failed to delete test");
    },
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const resetForm = useCallback(() => {
    setFormName("");
    setFormDescription("");
    setFormRouteId("");
    setFormSampleSize("1000");
    setFormVariants([
      { name: "Control", model_id: "", weight: "50", description: "" },
      { name: "Variant B", model_id: "", weight: "50", description: "" },
    ]);
  }, []);

  const handleCreate = useCallback(() => {
    const variants: Variant[] = formVariants.map((v) => ({
      name: v.name,
      model_id: v.model_id,
      weight: parseFloat(v.weight) || 0,
      description: v.description || undefined,
    }));

    createMutation.mutate({
      name: formName,
      description: formDescription || undefined,
      route_id: formRouteId,
      variants,
      sample_size_target: parseInt(formSampleSize) || 1000,
    });
  }, [formName, formDescription, formRouteId, formSampleSize, formVariants, createMutation]);

  const handleAddVariant = useCallback(() => {
    const label = String.fromCharCode(65 + formVariants.length); // C, D, E...
    setFormVariants((prev) => [
      ...prev,
      { name: `Variant ${label}`, model_id: "", weight: "0", description: "" },
    ]);
  }, [formVariants.length]);

  const handleRemoveVariant = useCallback(
    (index: number) => {
      if (formVariants.length <= 2) return;
      setFormVariants((prev) => prev.filter((_, i) => i !== index));
    },
    [formVariants.length]
  );

  const updateVariant = useCallback(
    (index: number, field: string, value: string) => {
      setFormVariants((prev) =>
        prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
      );
    },
    []
  );

  const handleRowClick = useCallback((row: AbTest) => {
    setSelectedTest(row);
  }, []);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const runningCount = tests.filter((t) => t.status === "running").length;
  const completedCount = tests.filter((t) => t.status === "completed").length;
  const draftCount = tests.filter((t) => t.status === "draft").length;

  const totalWeightValid = useMemo(() => {
    const total = formVariants.reduce(
      (sum, v) => sum + (parseFloat(v.weight) || 0),
      0
    );
    return Math.abs(total - 100) < 0.01;
  }, [formVariants]);

  const canCreate =
    formName.trim() &&
    formRouteId &&
    formVariants.every((v) => v.name.trim() && v.model_id) &&
    totalWeightValid;

  // Chart data for results comparison
  const comparisonData = useMemo(() => {
    if (!testResults) return [];
    return testResults.variants.map((v) => ({
      name: v.variant_name,
      "Avg Cost ($)": Math.round(v.avg_cost * 10000) / 10000,
      "Avg Latency (ms)": Math.round(v.avg_latency),
      "Success Rate (%)": Math.round(v.success_rate * 10) / 10,
      "Schema Pass (%)": Math.round(v.schema_pass_rate * 10) / 10,
    }));
  }, [testResults]);

  // ---------------------------------------------------------------------------
  // Render: detail view
  // ---------------------------------------------------------------------------

  if (selectedTest) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTest(null)}
            className="gap-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          <h1 className="text-lg font-semibold">{selectedTest.name}</h1>
          <StatusBadge status={selectedTest.status} />
        </div>

        {selectedTest.description && (
          <p className="text-sm text-neutral-500">{selectedTest.description}</p>
        )}

        {/* Status controls */}
        <div className="flex items-center gap-2">
          {selectedTest.status === "draft" && (
            <Button
              size="sm"
              className="gap-2"
              onClick={() =>
                updateStatusMutation.mutate({
                  testId: selectedTest.id,
                  status: "running",
                })
              }
            >
              <Play className="h-3.5 w-3.5" />
              Start Test
            </Button>
          )}
          {selectedTest.status === "running" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  updateStatusMutation.mutate({
                    testId: selectedTest.id,
                    status: "paused",
                  })
                }
              >
                <Pause className="h-3.5 w-3.5" />
                Pause
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={() =>
                  updateStatusMutation.mutate({
                    testId: selectedTest.id,
                    status: "completed",
                  })
                }
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Complete
              </Button>
            </>
          )}
          {selectedTest.status === "paused" && (
            <>
              <Button
                size="sm"
                className="gap-2"
                onClick={() =>
                  updateStatusMutation.mutate({
                    testId: selectedTest.id,
                    status: "running",
                  })
                }
              >
                <Play className="h-3.5 w-3.5" />
                Resume
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={() =>
                  updateStatusMutation.mutate({
                    testId: selectedTest.id,
                    status: "completed",
                  })
                }
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Complete
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-red-600 hover:text-red-700"
            onClick={() => deleteMutation.mutate(selectedTest.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>

        {/* Results dashboard */}
        {resultsLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
          </div>
        ) : testResults ? (
          <>
            {/* Progress bar */}
            <Card className="border-neutral-200 shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700">
                    Sample Progress
                  </span>
                  <span className="text-sm text-neutral-500">
                    {testResults.total_samples.toLocaleString()} /{" "}
                    {testResults.sample_size_target.toLocaleString()} (
                    {testResults.progress}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-neutral-100">
                  <div
                    className="h-2 rounded-full bg-neutral-900 transition-all"
                    style={{ width: `${Math.min(testResults.progress, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Winner indicator */}
            {testResults.winner && (
              <Card className="border-green-200 bg-green-50 shadow-none">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-green-700" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">
                        Current Leader: {testResults.winner.variant_name}
                      </p>
                      <p className="text-xs text-green-700">
                        {testResults.winner.reason} &middot; Confidence:{" "}
                        {testResults.winner.confidence}%
                      </p>
                      {testResults.winner.cost_savings_per_1000 !== undefined &&
                        testResults.winner.cost_savings_per_1000 > 0 && (
                          <p className="mt-1 text-xs font-medium text-green-800">
                            Cost savings:{" "}
                            {formatCurrency(
                              testResults.winner.cost_savings_per_1000,
                              { decimals: 2 }
                            )}{" "}
                            per 1,000 requests
                          </p>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metrics per variant */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {testResults.variants.map((v, i) => (
                <Card
                  key={v.variant_index}
                  className={`border-neutral-200 shadow-none ${
                    testResults.winner?.variant_index === v.variant_index
                      ? "ring-2 ring-green-500"
                      : ""
                  }`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-neutral-700">
                      {v.variant_name}
                      {testResults.winner?.variant_index === v.variant_index && (
                        <Trophy className="ml-1.5 inline h-3.5 w-3.5 text-green-600" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Samples</span>
                      <span className="font-medium">
                        {v.sample_count.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Avg Cost</span>
                      <span className="font-mono font-medium">
                        {formatCurrency(v.avg_cost)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Avg Latency</span>
                      <span className="font-mono font-medium">
                        {formatLatency(v.avg_latency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Success Rate</span>
                      <span className="font-medium">
                        {formatPercentage(v.success_rate)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Schema Pass</span>
                      <span className="font-medium">
                        {formatPercentage(v.schema_pass_rate)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Side-by-side comparison chart */}
            {comparisonData.length > 0 && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-neutral-200 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-neutral-700">
                      Cost & Latency Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12, fill: "#6b7280" }}
                            tickLine={false}
                            axisLine={{ stroke: "#e5e7eb" }}
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: "#6b7280" }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend />
                          <Bar
                            dataKey="Avg Cost ($)"
                            fill={CHART_COLORS[0]}
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="Avg Latency (ms)"
                            fill={CHART_COLORS[1]}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-neutral-200 shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-neutral-700">
                      Quality Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12, fill: "#6b7280" }}
                            tickLine={false}
                            axisLine={{ stroke: "#e5e7eb" }}
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: "#6b7280" }}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 100]}
                          />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend />
                          <Bar
                            dataKey="Success Rate (%)"
                            fill={CHART_COLORS[2]}
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="Schema Pass (%)"
                            fill={CHART_COLORS[3]}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Assignment log */}
            <Card className="border-neutral-200 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-700">
                  Recent Assignments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testResults.recent_assignments.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-neutral-200">
                          <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Time
                          </th>
                          <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Variant
                          </th>
                          <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Trace ID
                          </th>
                          <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                            Request ID
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {testResults.recent_assignments.map((a) => {
                          const variantName =
                            selectedTest.variants[a.variant_index]?.name ||
                            `Variant ${a.variant_index}`;
                          return (
                            <tr key={a.id}>
                              <td className="py-2 text-xs text-neutral-600">
                                <RelativeTime date={a.assigned_at} />
                              </td>
                              <td className="py-2 text-xs font-medium">
                                {variantName}
                              </td>
                              <td className="py-2 font-mono text-xs text-neutral-500">
                                {a.trace_id.slice(0, 12)}...
                              </td>
                              <td className="py-2 font-mono text-xs text-neutral-500">
                                {a.request_id
                                  ? `${a.request_id.slice(0, 8)}...`
                                  : "\u2014"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-neutral-400">
                    No assignments yet. Start the test to begin routing traffic.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: list view
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <PageHeader
        title="A/B Tests"
        description="Compare model performance with controlled traffic splitting."
        action={
          hasEnv ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  resetForm();
                  setCreateOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="h-3.5 w-3.5" />
                New A/B Test
              </Button>
            </div>
          ) : undefined
        }
      />

      {!hasEnv ? (
        <EmptyState
          icon={<FlaskConical className="h-10 w-10" />}
          title="Select an environment"
          description="Choose an organization, project, and environment from the top bar to view A/B tests."
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      ) : tests.length === 0 && statusFilter === "all" ? (
        <EmptyState
          icon={<FlaskConical className="h-10 w-10" />}
          title="No A/B tests"
          description="Create your first A/B test to compare model performance on a route."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              label="Running"
              value={runningCount}
              icon={<Play className="h-4 w-4" />}
            />
            <KpiCard
              label="Completed"
              value={completedCount}
              icon={<CheckCircle className="h-4 w-4" />}
            />
            <KpiCard
              label="Drafts"
              value={draftCount}
              icon={<FlaskConical className="h-4 w-4" />}
            />
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-neutral-500">
              {tests.length} test{tests.length !== 1 ? "s" : ""}
            </span>
          </div>

          <DataTable
            columns={columns}
            data={tests}
            onRowClick={handleRowClick}
          />
        </>
      )}

      {/* Create test dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create A/B Test</DialogTitle>
            <DialogDescription>
              Set up a controlled experiment to compare model variants on a
              route.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g. GPT-4o vs Claude Sonnet latency test"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What are you testing?"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Route</Label>
              <Select value={formRouteId} onValueChange={setFormRouteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a route to test" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sample Size Target</Label>
              <Input
                type="number"
                min={10}
                max={1000000}
                value={formSampleSize}
                onChange={(e) => setFormSampleSize(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Variants</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddVariant}
                  className="gap-1.5"
                >
                  <Plus className="h-3 w-3" />
                  Add Variant
                </Button>
              </div>

              {!totalWeightValid && (
                <p className="text-xs text-red-600">
                  Weights must sum to 100% (currently{" "}
                  {formVariants
                    .reduce((s, v) => s + (parseFloat(v.weight) || 0), 0)
                    .toFixed(1)}
                  %)
                </p>
              )}

              {formVariants.map((variant, index) => (
                <Card
                  key={index}
                  className="border-neutral-200 shadow-none"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Variant Name</Label>
                            <Input
                              value={variant.name}
                              onChange={(e) =>
                                updateVariant(index, "name", e.target.value)
                              }
                              placeholder="Variant name"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">
                              Traffic Weight (%)
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={variant.weight}
                              onChange={(e) =>
                                updateVariant(index, "weight", e.target.value)
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Model</Label>
                          <Select
                            value={variant.model_id}
                            onValueChange={(v) =>
                              updateVariant(index, "model_id", v)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                              {models.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.model_name} ({m.provider_name})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={variant.description}
                            onChange={(e) =>
                              updateVariant(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder="Optional notes"
                          />
                        </div>
                      </div>
                      {formVariants.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVariant(index)}
                          className="mt-5 text-neutral-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!canCreate || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
