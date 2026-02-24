"use client";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { ScrollText } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

interface AuditRow {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  user_id: string;
  created_at: string;
}

const columns: ColumnDef<AuditRow>[] = [
  {
    accessorKey: "created_at",
    header: "Time",
    cell: ({ row }) => (
      <span className="text-sm text-neutral-600">
        {new Date(row.original.created_at).toLocaleString()}
      </span>
    ),
  },
  { accessorKey: "action", header: "Action" },
  { accessorKey: "resource_type", header: "Resource" },
  {
    accessorKey: "user_id",
    header: "User",
    cell: ({ row }) => (
      <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">
        {row.original.user_id.slice(0, 8)}...
      </code>
    ),
  },
];

export default function AuditLogPage() {
  const entries: AuditRow[] = [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Track all changes made to your organization."
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-10 w-10" />}
          title="No audit entries"
          description="Actions performed in your organization will appear here."
        />
      ) : (
        <DataTable columns={columns} data={entries} />
      )}
    </div>
  );
}
