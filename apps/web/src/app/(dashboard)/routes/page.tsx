"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Route as RouteIcon, Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

interface RouteRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  allowed_models: string[];
  schema_strict: boolean;
}

const columns: ColumnDef<RouteRow>[] = [
  {
    accessorKey: "slug",
    header: "Route Key",
    cell: ({ row }) => (
      <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">
        {row.original.slug}
      </code>
    ),
  },
  { accessorKey: "name", header: "Name" },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.original.is_active ? "active" : "blocked"} />
    ),
  },
  {
    accessorKey: "allowed_models",
    header: "Models",
    cell: ({ row }) => (
      <span className="text-sm text-neutral-500">
        {row.original.allowed_models.length || "All"}
      </span>
    ),
  },
  {
    accessorKey: "schema_strict",
    header: "Schema",
    cell: ({ row }) => (
      <span className="text-sm text-neutral-500">
        {row.original.schema_strict ? "Strict" : "None"}
      </span>
    ),
  },
];

export default function RoutesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const routes: RouteRow[] = [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Routes"
        description="Define inference routes with model selection, constraints, and guardrails."
        action={
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create route
          </Button>
        }
      />

      {routes.length === 0 ? (
        <EmptyState
          icon={<RouteIcon className="h-10 w-10" />}
          title="No routes yet"
          description="Create your first route to start routing inference requests through the gateway."
          actionLabel="Create route"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <DataTable columns={columns} data={routes} />
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create a route</DialogTitle>
            <DialogDescription>
              Routes define how inference requests are handled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="Support Summarizer" />
            </div>
            <div className="space-y-2">
              <Label>Route key (slug)</Label>
              <Input placeholder="support_summarize" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="What this route is used for..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button>Create route</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
