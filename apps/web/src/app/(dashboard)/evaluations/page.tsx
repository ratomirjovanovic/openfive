"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/providers/context-provider";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
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
  Star,
  Plus,
  RefreshCw,
  Award,
  BarChart3,
  Brain,
  Info,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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
import { RelativeTime } from "@/components/shared/relative-time";
import type { ColumnDef } from "@tanstack/react-table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Evaluation {
  id: string;
  organization_id: string;
  request_id?: string;
  model_identifier: string;
  scores: Record<string, number>;
  overall_score: number | null;
  evaluator: string;
  evaluator_model?: string;
  feedback?: string;
  created_by?: string;
  created_at: string;
}

interface ModelSummary {
  model: string;
  evaluation_count: number;
  avg_overall_score: number;
  dimension_averages: Record<string, number>;
}

interface SummaryData {
  total_evaluations: number;
  avg_overall_score: number;
  models_evaluated: number;
  top_model: string | null;
  by_model: ModelSummary[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIMENSIONS = [
  "relevance",
  "factuality",
  "coherence",
  "helpfulness",
] as const;

const ALL_DIMENSIONS = [
  "relevance",
  "factuality",
  "coherence",
  "toxicity",
  "helpfulness",
] as const;

const CHART_COLORS = [
  "#171717",
  "#525252",
  "#737373",
  "#a3a3a3",
  "#d4d4d4",
  "#404040",
  "#262626",
  "#0a0a0a",
];

const tooltipStyle = {
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  fontSize: "13px",
};

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

const columns: ColumnDef<Evaluation>[] = [
  {
    accessorKey: "created_at",
    header: "Time",
    cell: ({ row }) => <RelativeTime date={row.original.created_at} />,
  },
  {
    accessorKey: "model_identifier",
    header: "Model",
    cell: ({ row }) => (
      <span className="text-sm font-medium">
        {row.original.model_identifier.length > 25
          ? row.original.model_identifier.slice(0, 25) + "..."
          : row.original.model_identifier}
      </span>
    ),
  },
  {
    accessorKey: "request_id",
    header: "Request ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-neutral-500">
        {row.original.request_id
          ? row.original.request_id.slice(0, 8) + "..."
          : "\u2014"}
      </span>
    ),
  },
  {
    id: "relevance",
    header: "Relevance",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.scores?.relevance ?? "\u2014"}
      </span>
    ),
  },
  {
    id: "factuality",
    header: "Factuality",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.scores?.factuality ?? "\u2014"}
      </span>
    ),
  },
  {
    id: "coherence",
    header: "Coherence",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.scores?.coherence ?? "\u2014"}
      </span>
    ),
  },
  {
    id: "toxicity",
    header: "Toxicity",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.scores?.toxicity ?? "\u2014"}
      </span>
    ),
  },
  {
    id: "helpfulness",
    header: "Helpfulness",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.scores?.helpfulness ?? "\u2014"}
      </span>
    ),
  },
  {
    accessorKey: "overall_score",
    header: "Overall",
    cell: ({ row }) => (
      <span className="text-sm font-semibold">
        {row.original.overall_score ?? "\u2014"}
      </span>
    ),
  },
  {
    accessorKey: "evaluator",
    header: "Evaluator",
    cell: ({ row }) => (
      <span className="text-xs capitalize text-neutral-600">
        {row.original.evaluator}
      </span>
    ),
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EvaluationsPage() {
  const { currentOrg } = useAppContext();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEval, setSelectedEval] = useState<Evaluation | null>(null);
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [evaluatorFilter, setEvaluatorFilter] = useState<string>("all");

  // Form state
  const [formRequestId, setFormRequestId] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formFeedback, setFormFeedback] = useState("");
  const [formScores, setFormScores] = useState<Record<string, number>>({
    relevance: 5,
    factuality: 5,
    coherence: 5,
    toxicity: 1,
    helpfulness: 5,
  });

  const hasOrg = !!currentOrg;

  const evalsApiPath = currentOrg
    ? `/api/v1/organizations/${currentOrg.id}/evaluations`
    : null;

  const summaryApiPath = currentOrg
    ? `/api/v1/organizations/${currentOrg.id}/evaluations/summary`
    : null;

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  const {
    data: evalsResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["evaluations", evalsApiPath, modelFilter, evaluatorFilter],
    queryFn: async () => {
      if (!evalsApiPath) return { data: [], total: 0 };
      const params = new URLSearchParams();
      if (modelFilter !== "all") params.set("model", modelFilter);
      if (evaluatorFilter !== "all") params.set("evaluator", evaluatorFilter);
      const url = params.toString()
        ? `${evalsApiPath}?${params}`
        : evalsApiPath;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch evaluations");
      return res.json() as Promise<{ data: Evaluation[]; total: number }>;
    },
    enabled: !!evalsApiPath,
  });

  const evaluations = evalsResponse?.data || [];

  const { data: summary } = useQuery<SummaryData>({
    queryKey: ["evaluations-summary", summaryApiPath],
    queryFn: async () => {
      if (!summaryApiPath) throw new Error("No API path");
      const res = await fetch(summaryApiPath);
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
    enabled: !!summaryApiPath,
  });

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const createMutation = useMutation({
    mutationFn: async (body: {
      request_id?: string;
      model_identifier: string;
      scores: Record<string, number>;
      evaluator: string;
      feedback?: string;
    }) => {
      const res = await fetch(evalsApiPath!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || "Failed to create evaluation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      queryClient.invalidateQueries({ queryKey: ["evaluations-summary"] });
      toast.success("Evaluation submitted");
      resetForm();
      setCreateOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const resetForm = useCallback(() => {
    setFormRequestId("");
    setFormModel("");
    setFormFeedback("");
    setFormScores({
      relevance: 5,
      factuality: 5,
      coherence: 5,
      toxicity: 1,
      helpfulness: 5,
    });
  }, []);

  const handleCreate = useCallback(() => {
    createMutation.mutate({
      request_id: formRequestId || undefined,
      model_identifier: formModel,
      scores: formScores,
      evaluator: "human",
      feedback: formFeedback || undefined,
    });
  }, [formRequestId, formModel, formScores, formFeedback, createMutation]);

  const handleRowClick = useCallback((row: Evaluation) => {
    setSelectedEval(row);
    setDetailOpen(true);
  }, []);

  const handleScoreChange = useCallback(
    (dimension: string, value: number[]) => {
      setFormScores((prev) => ({ ...prev, [dimension]: value[0] }));
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Derived data for charts
  // ---------------------------------------------------------------------------

  // Radar chart data: one entry per dimension, each model is a field
  const radarData = useMemo(() => {
    if (!summary || summary.by_model.length === 0) return [];
    return DIMENSIONS.map((dim) => {
      const entry: Record<string, string | number> = {
        dimension: dim.charAt(0).toUpperCase() + dim.slice(1),
      };
      for (const m of summary.by_model.slice(0, 5)) {
        entry[m.model] = m.dimension_averages[dim] || 0;
      }
      return entry;
    });
  }, [summary]);

  // Bar chart data: overall score per model
  const overallBarData = useMemo(() => {
    if (!summary) return [];
    return summary.by_model.map((m) => ({
      model:
        m.model.length > 20 ? m.model.slice(0, 20) + "..." : m.model,
      "Overall Score": m.avg_overall_score,
      fullName: m.model,
    }));
  }, [summary]);

  // Unique models for filter
  const uniqueModels = useMemo(() => {
    if (!summary) return [];
    return summary.by_model.map((m) => m.model);
  }, [summary]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluations"
        description="Score and compare model output quality across dimensions."
        action={
          hasOrg ? (
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
                Manual Evaluation
              </Button>
            </div>
          ) : undefined
        }
      />

      {!hasOrg ? (
        <EmptyState
          icon={<Star className="h-10 w-10" />}
          title="Select an organization"
          description="Choose an organization from the top bar to view evaluations."
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      ) : evaluations.length === 0 &&
        modelFilter === "all" &&
        evaluatorFilter === "all" ? (
        <EmptyState
          icon={<Star className="h-10 w-10" />}
          title="No evaluations yet"
          description="Create a manual evaluation or enable automatic scoring to get started."
        />
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid gap-4 md:grid-cols-4">
            <KpiCard
              label="Avg Overall Score"
              value={
                summary?.avg_overall_score
                  ? `${summary.avg_overall_score}/10`
                  : "\u2014"
              }
              icon={<Star className="h-4 w-4" />}
            />
            <KpiCard
              label="Total Evaluations"
              value={summary?.total_evaluations ?? 0}
              icon={<ClipboardCheck className="h-4 w-4" />}
            />
            <KpiCard
              label="Models Evaluated"
              value={summary?.models_evaluated ?? 0}
              icon={<Brain className="h-4 w-4" />}
            />
            <KpiCard
              label="Top Model"
              value={
                summary?.top_model
                  ? summary.top_model.length > 20
                    ? summary.top_model.slice(0, 20) + "..."
                    : summary.top_model
                  : "\u2014"
              }
              icon={<Award className="h-4 w-4" />}
            />
          </div>

          {/* Charts */}
          {summary && summary.by_model.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Radar chart */}
              <Card className="border-neutral-200 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-700">
                    Model Quality Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    {radarData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#e5e7eb" />
                          <PolarAngleAxis
                            dataKey="dimension"
                            tick={{ fontSize: 11, fill: "#6b7280" }}
                          />
                          <PolarRadiusAxis
                            angle={90}
                            domain={[0, 10]}
                            tick={{ fontSize: 10, fill: "#a3a3a3" }}
                          />
                          {summary.by_model.slice(0, 5).map((m, i) => (
                            <Radar
                              key={m.model}
                              name={m.model}
                              dataKey={m.model}
                              stroke={CHART_COLORS[i % CHART_COLORS.length]}
                              fill={CHART_COLORS[i % CHART_COLORS.length]}
                              fillOpacity={0.1}
                              strokeWidth={2}
                            />
                          ))}
                          <Legend
                            formatter={(value: string) =>
                              value.length > 25
                                ? value.slice(0, 25) + "..."
                                : value
                            }
                          />
                          <Tooltip contentStyle={tooltipStyle} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                        Not enough data for radar chart
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Bar chart - overall score per model */}
              <Card className="border-neutral-200 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-700">
                    Overall Score by Model
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    {overallBarData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overallBarData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                          />
                          <XAxis
                            dataKey="model"
                            tick={{ fontSize: 11, fill: "#6b7280" }}
                            tickLine={false}
                            axisLine={{ stroke: "#e5e7eb" }}
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: "#6b7280" }}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 10]}
                          />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            formatter={(value, _name, props) => [
                              `${value}/10`,
                              props.payload.fullName,
                            ]}
                          />
                          <Bar
                            dataKey="Overall Score"
                            fill="#171717"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                        No score data
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Auto-evaluation info card */}
          <Card className="border-blue-200 bg-blue-50 shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Automatic Evaluation Scoring
                  </p>
                  <p className="mt-1 text-xs text-blue-800">
                    When enabled, the gateway automatically evaluates each model
                    response using an LLM judge. Scores are assigned across five
                    dimensions: relevance, factuality, coherence, toxicity, and
                    helpfulness. Each dimension is scored 1-10. The evaluator
                    model (e.g., GPT-4o) compares the prompt and response to
                    produce objective quality metrics. Automatic evaluations are
                    tagged with evaluator type &quot;auto&quot; or &quot;llm-judge&quot;.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Select
              value={modelFilter}
              onValueChange={(v) => setModelFilter(v)}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="All models" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All models</SelectItem>
                {uniqueModels.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.length > 30 ? m.slice(0, 30) + "..." : m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={evaluatorFilter}
              onValueChange={(v) => setEvaluatorFilter(v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All evaluators" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All evaluators</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="human">Human</SelectItem>
                <SelectItem value="llm-judge">LLM Judge</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-neutral-500">
              {evaluations.length} evaluation
              {evaluations.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Evaluation table */}
          <DataTable
            columns={columns}
            data={evaluations}
            onRowClick={handleRowClick}
          />
        </>
      )}

      {/* Evaluation detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Evaluation Detail</DialogTitle>
            <DialogDescription>
              {selectedEval?.model_identifier} &middot;{" "}
              {selectedEval?.evaluator}
            </DialogDescription>
          </DialogHeader>
          {selectedEval && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium uppercase text-neutral-500">
                    Overall Score
                  </p>
                  <p className="text-2xl font-bold">
                    {selectedEval.overall_score ?? "\u2014"}
                    <span className="text-sm font-normal text-neutral-400">
                      /10
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-neutral-500">
                    Evaluator
                  </p>
                  <p className="text-sm capitalize">
                    {selectedEval.evaluator}
                    {selectedEval.evaluator_model &&
                      ` (${selectedEval.evaluator_model})`}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase text-neutral-500">
                  Dimension Scores
                </p>
                <div className="space-y-2">
                  {ALL_DIMENSIONS.map((dim) => {
                    const score = selectedEval.scores?.[dim];
                    return (
                      <div key={dim} className="flex items-center gap-3">
                        <span className="w-24 text-xs capitalize text-neutral-600">
                          {dim}
                        </span>
                        <div className="flex-1">
                          <div className="h-2 w-full rounded-full bg-neutral-100">
                            <div
                              className="h-2 rounded-full bg-neutral-900 transition-all"
                              style={{
                                width: `${((score ?? 0) / 10) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="w-8 text-right text-xs font-medium">
                          {score ?? "\u2014"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedEval.request_id && (
                <div>
                  <p className="text-xs font-medium uppercase text-neutral-500">
                    Request ID
                  </p>
                  <p className="font-mono text-xs text-neutral-600">
                    {selectedEval.request_id}
                  </p>
                </div>
              )}

              {selectedEval.feedback && (
                <div>
                  <p className="text-xs font-medium uppercase text-neutral-500">
                    Feedback
                  </p>
                  <p className="mt-1 text-sm text-neutral-700">
                    {selectedEval.feedback}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium uppercase text-neutral-500">
                  Created
                </p>
                <RelativeTime date={selectedEval.created_at} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual evaluation dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manual Evaluation</DialogTitle>
            <DialogDescription>
              Score a model response across quality dimensions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Request ID (optional)</Label>
              <Input
                placeholder="Paste a request UUID"
                value={formRequestId}
                onChange={(e) => setFormRequestId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Model Identifier</Label>
              <Input
                placeholder="e.g. gpt-4o, claude-sonnet-4"
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <Label>Scores (1-10)</Label>
              {ALL_DIMENSIONS.map((dim) => (
                <div key={dim} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs capitalize text-neutral-600">
                      {dim}
                    </span>
                    <span className="text-xs font-semibold">
                      {formScores[dim]}
                    </span>
                  </div>
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[formScores[dim]]}
                    onValueChange={(v) => handleScoreChange(dim, v)}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Feedback (optional)</Label>
              <Textarea
                placeholder="Notes about the response quality..."
                value={formFeedback}
                onChange={(e) => setFormFeedback(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formModel.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Submitting..." : "Submit Evaluation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
