"use client";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TruncatedId } from "@/components/shared/truncated-id";
import { ScrollText } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

interface RequestRow {
  id: string;
  request_id: string;
  model_identifier: string;
  input_tokens: number;
  output_tokens: number;
  total_cost_usd: number;
  duration_ms: number;
  status: string;
  action_taken: string;
  created_at: string;
}

const columns: ColumnDef<RequestRow>[] = [
  {
    accessorKey: "created_at",
    header: "Time",
    cell: ({ row }) => (
      <span className="text-sm text-neutral-600">
        {new Date(row.original.created_at).toLocaleTimeString()}
      </span>
    ),
  },
  {
    accessorKey: "request_id",
    header: "Trace ID",
    cell: ({ row }) => <TruncatedId id={row.original.request_id} />,
  },
  { accessorKey: "model_identifier", header: "Model" },
  {
    accessorKey: "input_tokens",
    header: "Tokens",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.input_tokens} / {row.original.output_tokens}
      </span>
    ),
  },
  {
    accessorKey: "total_cost_usd",
    header: "Cost",
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        ${row.original.total_cost_usd.toFixed(4)}
      </span>
    ),
  },
  {
    accessorKey: "duration_ms",
    header: "Latency",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.duration_ms}ms</span>
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
  const requests: RequestRow[] = [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests"
        description="View and search all inference requests with full trace details."
      />

      {requests.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-10 w-10" />}
          title="No requests yet"
          description="Send your first inference request through the gateway to see it here."
        />
      ) : (
        <DataTable columns={columns} data={requests} />
      )}
    </div>
  );
}
