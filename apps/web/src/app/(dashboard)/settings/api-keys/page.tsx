"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { CopyButton } from "@/components/shared/copy-button";
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
import { Key, Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

const columns: ColumnDef<ApiKeyRow>[] = [
  { accessorKey: "name", header: "Name" },
  {
    accessorKey: "key_prefix",
    header: "Key",
    cell: ({ row }) => (
      <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">
        {row.original.key_prefix}...
      </code>
    ),
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.original.is_active ? "active" : "blocked"} />
    ),
  },
  {
    accessorKey: "last_used_at",
    header: "Last used",
    cell: ({ row }) => (
      <span className="text-sm text-neutral-500">
        {row.original.last_used_at
          ? new Date(row.original.last_used_at).toLocaleDateString()
          : "Never"}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => (
      <span className="text-sm text-neutral-500">
        {new Date(row.original.created_at).toLocaleDateString()}
      </span>
    ),
  },
];

export default function ApiKeysPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const apiKeys: ApiKeyRow[] = [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        description="Manage API keys for gateway access."
        action={
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create key
          </Button>
        }
      />

      {apiKeys.length === 0 ? (
        <EmptyState
          icon={<Key className="h-10 w-10" />}
          title="No API keys"
          description="Generate an API key to authenticate requests to the gateway."
          actionLabel="Create key"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <DataTable columns={columns} data={apiKeys} />
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {newKey ? "API key created" : "Create an API key"}
            </DialogTitle>
            <DialogDescription>
              {newKey
                ? "Copy your key now. You won't be able to see it again."
                : "This key will be used to authenticate requests to the gateway."}
            </DialogDescription>
          </DialogHeader>
          {newKey ? (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <code className="flex-1 break-all font-mono text-sm">
                  {newKey}
                </code>
                <CopyButton value={newKey} />
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Key name</Label>
                <Input placeholder="production-agent" />
              </div>
            </div>
          )}
          <DialogFooter>
            {newKey ? (
              <Button
                onClick={() => {
                  setNewKey(null);
                  setShowCreate(false);
                }}
              >
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button>Create key</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
