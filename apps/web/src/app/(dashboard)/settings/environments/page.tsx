"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/providers/context-provider";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { CloneEnvDialog } from "@/components/environments/clone-env-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Layers,
  Plus,
  Copy,
  Pencil,
  Trash2,
  RefreshCw,
  Server,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import type { Environment } from "@openfive/shared";

interface EnvironmentWithMeta extends Environment {
  route_count?: number;
}

interface RouteCountMap {
  [envId: string]: number;
}

export default function EnvironmentsPage() {
  const { currentOrg, currentProject } = useAppContext();
  const queryClient = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<EnvironmentWithMeta | null>(
    null
  );

  // Create form state
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newTier, setNewTier] = useState<string>("development");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editTier, setEditTier] = useState<string>("development");

  const envsApiPath =
    currentOrg && currentProject
      ? `/api/v1/organizations/${currentOrg.id}/projects/${currentProject.id}/environments`
      : null;

  const {
    data: environments = [],
    isLoading,
    refetch,
  } = useQuery<EnvironmentWithMeta[]>({
    queryKey: ["environments", envsApiPath],
    queryFn: async () => {
      if (!envsApiPath) return [];
      const res = await fetch(envsApiPath);
      if (!res.ok) throw new Error("Failed to fetch environments");
      return res.json();
    },
    enabled: !!envsApiPath,
  });

  // Fetch route counts for each environment
  const { data: routeCounts = {} } = useQuery<RouteCountMap>({
    queryKey: ["environment-route-counts", envsApiPath, environments.length],
    queryFn: async () => {
      if (!currentOrg || !currentProject || environments.length === 0)
        return {};
      const counts: RouteCountMap = {};
      await Promise.all(
        environments.map(async (env) => {
          try {
            const res = await fetch(
              `/api/v1/organizations/${currentOrg.id}/projects/${currentProject.id}/environments/${env.id}/routes`
            );
            if (res.ok) {
              const routes = await res.json();
              counts[env.id] = Array.isArray(routes) ? routes.length : 0;
            }
          } catch {
            counts[env.id] = 0;
          }
        })
      );
      return counts;
    },
    enabled: !!envsApiPath && environments.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!envsApiPath) throw new Error("No project selected");
      const res = await fetch(envsApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          slug: newSlug,
          tier: newTier,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data?.error?.message || "Failed to create environment"
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments"] });
      setCreateDialogOpen(false);
      setNewName("");
      setNewSlug("");
      setNewTier("development");
      toast.success("Environment created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (envId: string) => {
      if (!currentOrg || !currentProject)
        throw new Error("No project selected");
      const res = await fetch(
        `/api/v1/organizations/${currentOrg.id}/projects/${currentProject.id}/environments/${envId}`,
        { method: "DELETE" }
      );
      if (!res.ok && res.status !== 204) {
        throw new Error("Failed to delete environment");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments"] });
      setDeleteDialogOpen(false);
      setSelectedEnv(null);
      toast.success("Environment deleted");
    },
    onError: () => {
      toast.error("Failed to delete environment");
    },
  });

  const handleOpenCreate = useCallback(() => {
    setNewName("");
    setNewSlug("");
    setNewTier("development");
    setCreateDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((env: EnvironmentWithMeta) => {
    setSelectedEnv(env);
    setEditName(env.name);
    setEditTier(env.tier);
    setEditDialogOpen(true);
  }, []);

  const handleOpenDelete = useCallback((env: EnvironmentWithMeta) => {
    setSelectedEnv(env);
    setDeleteDialogOpen(true);
  }, []);

  const handleOpenClone = useCallback((env: EnvironmentWithMeta) => {
    setSelectedEnv(env);
    setCloneDialogOpen(true);
  }, []);

  const tierColors: Record<string, string> = {
    development: "bg-blue-50 text-blue-700 border-blue-200",
    staging: "bg-yellow-50 text-yellow-700 border-yellow-200",
    production: "bg-green-50 text-green-700 border-green-200",
  };

  const hasProject = !!(currentOrg && currentProject);

  if (!hasProject) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Environments"
          description="Manage environments for your project."
        />
        <EmptyState
          icon={<Server className="h-10 w-10" />}
          title="Select a project"
          description="Choose an organization and project from the top bar to manage environments."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Environments"
          description="Manage environments for your project."
        />
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Environments"
        description="Manage environments for your project."
        action={
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
            <Button size="sm" onClick={handleOpenCreate} className="gap-2">
              <Plus className="h-3.5 w-3.5" />
              New environment
            </Button>
          </div>
        }
      />

      {environments.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-10 w-10" />}
          title="No environments"
          description="Create your first environment to start configuring routes and API keys."
          actionLabel="Create environment"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-200 hover:bg-transparent">
                <TableHead className="h-10 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Name
                </TableHead>
                <TableHead className="h-10 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Tier
                </TableHead>
                <TableHead className="h-10 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Budget
                </TableHead>
                <TableHead className="h-10 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Routes
                </TableHead>
                <TableHead className="h-10 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Kill Switch
                </TableHead>
                <TableHead className="h-10 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {environments.map((env) => (
                <TableRow key={env.id} className="border-neutral-100">
                  <TableCell className="py-3">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {env.name}
                      </p>
                      <p className="text-xs text-neutral-400">{env.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className={`text-xs font-medium capitalize ${tierColors[env.tier] || ""}`}
                    >
                      {env.tier}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <div>
                      <p className="text-sm text-neutral-900">
                        {env.budget_limit_usd
                          ? formatCurrency(env.budget_limit_usd, {
                              decimals: 2,
                            })
                          : "No limit"}
                      </p>
                      {env.budget_limit_usd && (
                        <p className="text-xs text-neutral-400">
                          {env.budget_mode} / {env.budget_window}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="text-sm text-neutral-700">
                      {routeCounts[env.id] ?? "..."}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    {env.killswitch_active ? (
                      <StatusBadge status="critical" />
                    ) : (
                      <StatusBadge status="ok" />
                    )}
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenClone(env)}
                        className="h-7 w-7 p-0"
                        title="Clone environment"
                      >
                        <Copy className="h-3.5 w-3.5 text-neutral-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(env)}
                        className="h-7 w-7 p-0"
                        title="Edit environment"
                      >
                        <Pencil className="h-3.5 w-3.5 text-neutral-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDelete(env)}
                        className="h-7 w-7 p-0"
                        title="Delete environment"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Environment Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create environment</DialogTitle>
            <DialogDescription>
              Add a new environment to your project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setNewSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-+|-+$/g, "")
                  );
                }}
                placeholder="e.g. Production"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="e.g. production"
              />
              <p className="text-xs text-neutral-400">
                URL-safe identifier. Auto-generated from name.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Tier</Label>
              <Select value={newTier} onValueChange={setNewTier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                !newName.trim() ||
                !newSlug.trim() ||
                createMutation.isPending
              }
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Environment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit environment</DialogTitle>
            <DialogDescription>
              Update the environment settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tier</Label>
              <Select value={editTier} onValueChange={setEditTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success("Environment updated");
                setEditDialogOpen(false);
              }}
              disabled={!editName.trim()}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete environment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedEnv?.name}&quot;?
              This action cannot be undone. All routes, API keys, and data in
              this environment will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedEnv && deleteMutation.mutate(selectedEnv.id)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete environment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Environment Dialog */}
      <CloneEnvDialog
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
        sourceEnvironment={selectedEnv}
        routeCount={selectedEnv ? routeCounts[selectedEnv.id] ?? 0 : 0}
      />
    </div>
  );
}
