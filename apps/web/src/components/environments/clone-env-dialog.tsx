"use client";

import { useState, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/providers/context-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { StatusBadge } from "@/components/shared/status-badge";
import { Copy, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { Environment } from "@openfive/shared";

interface CloneEnvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceEnvironment: Environment | null;
  routeCount: number;
}

interface CloneResult {
  environment: Environment;
  cloned: {
    routes: number;
    budget_settings: boolean;
    route_configs: boolean;
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function CloneEnvDialog({
  open,
  onOpenChange,
  sourceEnvironment,
  routeCount,
}: CloneEnvDialogProps) {
  const { currentOrg, currentProject } = useAppContext();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [tier, setTier] = useState<string>("development");
  const [cloneRoutes, setCloneRoutes] = useState(true);
  const [cloneRouteConfigs, setCloneRouteConfigs] = useState(true);
  const [cloneBudgetSettings, setCloneBudgetSettings] = useState(true);
  const [result, setResult] = useState<CloneResult | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName(sourceEnvironment ? `${sourceEnvironment.name} (Copy)` : "");
      setSlug(
        sourceEnvironment ? slugify(`${sourceEnvironment.name}-copy`) : ""
      );
      setSlugManuallyEdited(false);
      setTier("development");
      setCloneRoutes(true);
      setCloneRouteConfigs(true);
      setCloneBudgetSettings(true);
      setResult(null);
    }
  }, [open, sourceEnvironment]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugManuallyEdited]);

  const cloneMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrg || !currentProject || !sourceEnvironment) {
        throw new Error("Missing context");
      }
      const res = await fetch(
        `/api/v1/organizations/${currentOrg.id}/projects/${currentProject.id}/environments/${sourceEnvironment.id}/clone`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            slug,
            tier,
            clone_routes: cloneRoutes,
            clone_route_configs: cloneRouteConfigs,
            clone_budget_settings: cloneBudgetSettings,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || "Failed to clone environment");
      }
      return res.json() as Promise<CloneResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["environments"] });
      toast.success(`Environment "${data.environment.name}" created`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleClone = useCallback(() => {
    cloneMutation.mutate();
  }, [cloneMutation]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!sourceEnvironment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            {result ? "Environment Cloned" : "Clone Environment"}
          </DialogTitle>
          <DialogDescription>
            {result
              ? "Your new environment is ready."
              : `Create a copy of "${sourceEnvironment.name}" with its configuration.`}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-green-800">
                    Successfully cloned
                  </p>
                  <ul className="space-y-0.5 text-sm text-green-700">
                    <li>
                      {result.cloned.routes} route
                      {result.cloned.routes !== 1 ? "s" : ""} cloned
                    </li>
                    {result.cloned.budget_settings && (
                      <li>Budget settings cloned</li>
                    )}
                    {result.cloned.route_configs && (
                      <li>Route configurations cloned</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {result.environment.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {result.environment.slug}
                </p>
              </div>
              <StatusBadge status={result.environment.tier} />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Source preview */}
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Cloning from
              </p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-900">
                  {sourceEnvironment.name}
                </p>
                <div className="flex items-center gap-2">
                  <StatusBadge status={sourceEnvironment.tier} />
                  <span className="text-xs text-neutral-500">
                    {routeCount} route{routeCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Form fields */}
            <div className="space-y-2">
              <Label>Environment name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Staging Copy"
              />
            </div>

            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugManuallyEdited(true);
                }}
                placeholder="e.g. staging-copy"
              />
              <p className="text-xs text-neutral-400">
                URL-safe identifier. Auto-generated from name.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tier</Label>
              <Select value={tier} onValueChange={setTier}>
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

            {/* Clone options */}
            <div className="space-y-3">
              <Label>What to clone</Label>
              <div className="space-y-3 rounded-lg border border-neutral-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      Routes
                    </p>
                    <p className="text-xs text-neutral-500">
                      {routeCount} route{routeCount !== 1 ? "s" : ""} will be
                      cloned
                    </p>
                  </div>
                  <Switch
                    checked={cloneRoutes}
                    onCheckedChange={setCloneRoutes}
                    size="sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      Route configurations
                    </p>
                    <p className="text-xs text-neutral-500">
                      Rate limits, guardrails, constraints
                    </p>
                  </div>
                  <Switch
                    checked={cloneRouteConfigs}
                    onCheckedChange={setCloneRouteConfigs}
                    disabled={!cloneRoutes}
                    size="sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      Budget settings
                    </p>
                    <p className="text-xs text-neutral-500">
                      Budget mode, limits, window
                    </p>
                  </div>
                  <Switch
                    checked={cloneBudgetSettings}
                    onCheckedChange={setCloneBudgetSettings}
                    size="sm"
                  />
                </div>
              </div>
              <p className="text-xs text-neutral-400">
                API keys, requests, and incidents are never cloned for security
                reasons.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleClone}
                disabled={
                  !name.trim() ||
                  !slug.trim() ||
                  cloneMutation.isPending
                }
                className="gap-2"
              >
                <Copy className="h-3.5 w-3.5" />
                {cloneMutation.isPending
                  ? "Cloning..."
                  : "Clone environment"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
