"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/providers/context-provider";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { RelativeTime } from "@/components/shared/relative-time";
import { IncidentDetailDrawer } from "@/components/observability/incident-detail-drawer";
import { KpiCard } from "@/components/shared/kpi-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, ShieldAlert, Zap, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

interface IncidentRow {
  id: string;
  severity: string;
  incident_type: string;
  title: string;
  description?: string;
  status: string;
  killswitch_activated: boolean;
  trigger_data: Record<string, unknown>;
  route_id?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_note?: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  created_at: string;
  updated_at: string;
}

const severityOrder: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const columns: ColumnDef<IncidentRow>[] = [
  {
    accessorKey: "severity",
    header: "Severity",
    cell: ({ row }) => <StatusBadge status={row.original.severity} />,
    sortingFn: (a, b) =>
      (severityOrder[a.original.severity] ?? 4) -
      (severityOrder[b.original.severity] ?? 4),
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <span className="text-sm font-medium">{row.original.title}</span>
    ),
  },
  {
    accessorKey: "incident_type",
    header: "Type",
    cell: ({ row }) => (
      <span className="text-sm capitalize text-neutral-600">
        {row.original.incident_type.replace(/_/g, " ")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "killswitch_activated",
    header: "Kill Switch",
    cell: ({ row }) =>
      row.original.killswitch_activated ? (
        <span className="flex items-center gap-1.5 text-sm font-medium text-red-600">
          <Zap className="h-3.5 w-3.5" />
          Active
        </span>
      ) : (
        <span className="text-sm text-neutral-400">—</span>
      ),
  },
  {
    accessorKey: "created_at",
    header: "Started",
    cell: ({ row }) => <RelativeTime date={row.original.created_at} />,
  },
];

export default function IncidentsPage() {
  const { currentOrg, currentProject, currentEnv } = useAppContext();
  const queryClient = useQueryClient();
  const [selectedIncident, setSelectedIncident] = useState<IncidentRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const apiPath =
    currentOrg && currentProject && currentEnv
      ? `/api/v1/organizations/${currentOrg.id}/projects/${currentProject.id}/environments/${currentEnv.id}/incidents`
      : null;

  const { data: incidents = [], isLoading, refetch } = useQuery({
    queryKey: ["incidents", apiPath, statusFilter],
    queryFn: async () => {
      if (!apiPath) return [];
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const url = params.toString() ? `${apiPath}?${params}` : apiPath;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch incidents");
      return res.json() as Promise<IncidentRow[]>;
    },
    enabled: !!apiPath,
  });

  const incidentMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      note,
    }: {
      id: string;
      action: "acknowledge" | "resolve";
      note?: string;
    }) => {
      const body: Record<string, unknown> =
        action === "acknowledge"
          ? { status: "acknowledged" }
          : { status: "resolved", resolution_note: note };

      const res = await fetch(
        `/api/v1/organizations/${currentOrg!.id}/projects/${currentProject!.id}/environments/${currentEnv!.id}/incidents/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error("Failed to update incident");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      toast.success("Incident updated");
      setDrawerOpen(false);
    },
    onError: () => {
      toast.error("Failed to update incident");
    },
  });

  const handleRowClick = useCallback((row: IncidentRow) => {
    setSelectedIncident(row);
    setDrawerOpen(true);
  }, []);

  const handleAcknowledge = useCallback(
    (id: string) => {
      incidentMutation.mutate({ id, action: "acknowledge" });
    },
    [incidentMutation]
  );

  const handleResolve = useCallback(
    (id: string, note: string) => {
      incidentMutation.mutate({ id, action: "resolve", note });
    },
    [incidentMutation]
  );

  const hasEnv = !!(currentOrg && currentProject && currentEnv);

  const openCount = incidents.filter((i) => i.status === "open").length;
  const criticalCount = incidents.filter((i) => i.severity === "critical" && i.status !== "resolved").length;
  const killSwitchCount = incidents.filter((i) => i.killswitch_activated && i.status !== "resolved").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incidents"
        description="View anomaly events, kill switch activations, and budget breaches."
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
          icon={<AlertTriangle className="h-10 w-10" />}
          title="Select an environment"
          description="Choose an organization, project, and environment from the top bar to view incidents."
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      ) : incidents.length === 0 && statusFilter === "all" ? (
        <EmptyState
          icon={<AlertTriangle className="h-10 w-10" />}
          title="No incidents"
          description="No anomalies or budget breaches detected. This is a good thing!"
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <KpiCard
              label="Open Incidents"
              value={openCount}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <KpiCard
              label="Critical"
              value={criticalCount}
              icon={<ShieldAlert className="h-4 w-4" />}
            />
            <KpiCard
              label="Kill Switches Active"
              value={killSwitchCount}
              icon={<Zap className="h-4 w-4" />}
            />
          </div>

          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-neutral-500">
              {incidents.length} incident{incidents.length !== 1 ? "s" : ""}
            </span>
          </div>

          <DataTable
            columns={columns}
            data={incidents}
            onRowClick={handleRowClick}
          />
        </>
      )}

      <IncidentDetailDrawer
        incident={selectedIncident}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onAcknowledge={handleAcknowledge}
        onResolve={handleResolve}
      />
    </div>
  );
}
