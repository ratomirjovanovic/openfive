"use client";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { AlertTriangle } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

interface IncidentRow {
  id: string;
  severity: string;
  incident_type: string;
  title: string;
  status: string;
  killswitch_activated: boolean;
  created_at: string;
}

const columns: ColumnDef<IncidentRow>[] = [
  {
    accessorKey: "severity",
    header: "Severity",
    cell: ({ row }) => <StatusBadge status={row.original.severity} />,
  },
  { accessorKey: "incident_type", header: "Type" },
  { accessorKey: "title", header: "Title" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "killswitch_activated",
    header: "Kill Switch",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.killswitch_activated ? "Activated" : "—"}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Started",
    cell: ({ row }) => (
      <span className="text-sm text-neutral-600">
        {new Date(row.original.created_at).toLocaleString()}
      </span>
    ),
  },
];

export default function IncidentsPage() {
  const incidents: IncidentRow[] = [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incidents"
        description="View anomaly events, kill switch activations, and budget breaches."
      />

      {incidents.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-10 w-10" />}
          title="No incidents"
          description="No anomalies or budget breaches detected. This is a good thing!"
        />
      ) : (
        <DataTable columns={columns} data={incidents} />
      )}
    </div>
  );
}
