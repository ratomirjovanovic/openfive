"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/providers/context-provider";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TruncatedId } from "@/components/shared/truncated-id";
import { RelativeTime } from "@/components/shared/relative-time";
import { RequestDetailDrawer } from "@/components/observability/request-detail-drawer";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollText, Search, RefreshCw } from "lucide-react";
import { formatCurrency, formatLatency, formatTokens } from "@/lib/formatters";
import type { ColumnDef } from "@tanstack/react-table";

interface RequestRow {
  id: string;
  request_id: string;
  model_identifier: string;
  provider_id?: string;
  input_tokens: number;
  output_tokens: number;
  total_cost_usd: number;
  input_cost_usd: number;
  output_cost_usd: number;
  duration_ms: number;
  status: string;
  action_taken: string;
  is_streaming: boolean;
  attempt_number: number;
  fallback_reason?: string;
  schema_valid?: boolean;
  schema_repair_attempts: number;
  tool_call_count: number;
  estimated_tokens: boolean;
  error_code?: string;
  error_message?: string;
  prompt_hash?: string;
  metadata: Record<string, unknown>;
  started_at: string;
  completed_at?: string;
  created_at: string;
}

const columns: ColumnDef<RequestRow>[] = [
  {
    accessorKey: "created_at",
    header: "Time",
    cell: ({ row }) => <RelativeTime date={row.original.created_at} />,
  },
  {
    accessorKey: "request_id",
    header: "Trace ID",
    cell: ({ row }) => <TruncatedId id={row.original.request_id} />,
  },
  {
    accessorKey: "model_identifier",
    header: "Model",
    cell: ({ row }) => (
      <span className="text-sm font-medium">{row.original.model_identifier}</span>
    ),
  },
  {
    accessorKey: "input_tokens",
    header: "Tokens (in/out)",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-neutral-600">
        {formatTokens(row.original.input_tokens)} / {formatTokens(row.original.output_tokens)}
      </span>
    ),
  },
  {
    accessorKey: "total_cost_usd",
    header: "Cost",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">
        {formatCurrency(row.original.total_cost_usd, { decimals: 6 })}
      </span>
    ),
  },
  {
    accessorKey: "duration_ms",
    header: "Latency",
    cell: ({ row }) => (
      <span className="text-sm text-neutral-600">
        {row.original.duration_ms ? formatLatency(row.original.duration_ms) : "—"}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "action_taken",
    header: "Action",
    cell: ({ row }) =>
      row.original.action_taken !== "none" ? (
        <StatusBadge status={row.original.action_taken} />
      ) : (
        <span className="text-sm text-neutral-400">—</span>
      ),
  },
];

export default function RequestsPage() {
  const { currentOrg, currentProject, currentEnv } = useAppContext();
  const [selectedRequest, setSelectedRequest] = useState<RequestRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const apiPath =
    currentOrg && currentProject && currentEnv
      ? `/api/v1/organizations/${currentOrg.id}/projects/${currentProject.id}/environments/${currentEnv.id}/requests`
      : null;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["requests", apiPath, statusFilter, page],
    queryFn: async () => {
      if (!apiPath) return { data: [], total: 0 };
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`${apiPath}?${params}`);
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json() as Promise<{ data: RequestRow[]; total: number }>;
    },
    enabled: !!apiPath,
  });

  const requests = data?.data || [];
  const total = data?.total || 0;

  const filteredRequests = searchQuery
    ? requests.filter(
        (r) =>
          r.request_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.model_identifier.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : requests;

  const handleRowClick = useCallback((row: RequestRow) => {
    setSelectedRequest(row);
    setDrawerOpen(true);
  }, []);

  const hasEnv = !!(currentOrg && currentProject && currentEnv);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests"
        description="View and search all inference requests with full trace details."
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
          icon={<ScrollText className="h-10 w-10" />}
          title="Select an environment"
          description="Choose an organization, project, and environment from the top bar to view requests."
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      ) : requests.length === 0 && statusFilter === "all" ? (
        <EmptyState
          icon={<ScrollText className="h-10 w-10" />}
          title="No requests yet"
          description="Send your first inference request through the gateway to see it here."
        />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder="Search by trace ID or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="timeout">Timeout</SelectItem>
              </SelectContent>
            </Select>
            {total > 0 && (
              <span className="text-sm text-neutral-500">
                {total.toLocaleString()} total
              </span>
            )}
          </div>

          <DataTable
            columns={columns}
            data={filteredRequests}
            onRowClick={handleRowClick}
            pageSize={pageSize}
          />

          {total > pageSize && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-500">
                Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * pageSize >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <RequestDetailDrawer
        request={selectedRequest}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
