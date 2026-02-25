"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ReplayComparison,
  type ReplayComparisonData,
} from "@/components/observability/replay-comparison";
import { useAppContext } from "@/providers/context-provider";
import { Play, RefreshCw, Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReplayButtonProps {
  requestId: string;
  originalModel: string;
  environmentId: string;
  routeId?: string;
  className?: string;
  /** Called when a replay completes with comparison data */
  onReplayComplete?: (comparison: ReplayComparisonData) => void;
}

type ReplayMode = "same_model" | "different_model" | "different_route";

interface ModelOption {
  id: string;
  model_id: string;
  display_name: string;
  providers: {
    id: string;
    name: string;
    display_name: string;
    provider_type: string;
  };
}

interface RouteOption {
  id: string;
  name: string;
  slug: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReplayButton({
  requestId,
  originalModel,
  environmentId,
  routeId,
  className,
  onReplayComplete,
}: ReplayButtonProps) {
  const { currentOrg, currentProject, currentEnv } = useAppContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [replayMode, setReplayMode] = useState<ReplayMode>("same_model");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedRoute, setSelectedRoute] = useState<string>("");
  const [comparisonData, setComparisonData] =
    useState<ReplayComparisonData | null>(null);

  const orgId = currentOrg?.id;
  const projectId = currentProject?.id;
  const envId = currentEnv?.id ?? environmentId;

  // ------------------------------------------------------------------
  // Fetch available models
  // ------------------------------------------------------------------
  const { data: modelsData } = useQuery<{ data: ModelOption[] }>({
    queryKey: ["models", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/organizations/${orgId}/models`);
      if (!res.ok) throw new Error("Failed to fetch models");
      return res.json();
    },
    enabled: dialogOpen && !!orgId,
  });

  const models = modelsData?.data ?? (modelsData as unknown as ModelOption[]) ?? [];

  // ------------------------------------------------------------------
  // Fetch available routes
  // ------------------------------------------------------------------
  const { data: routesData } = useQuery<{ data: RouteOption[] }>({
    queryKey: ["routes", orgId, projectId, envId],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/organizations/${orgId}/projects/${projectId}/environments/${envId}/routes`
      );
      if (!res.ok) throw new Error("Failed to fetch routes");
      return res.json();
    },
    enabled: dialogOpen && !!orgId && !!projectId && !!envId,
  });

  const routes = routesData?.data ?? (routesData as unknown as RouteOption[]) ?? [];

  // ------------------------------------------------------------------
  // Replay mutation
  // ------------------------------------------------------------------
  const replayMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {};

      if (replayMode === "different_model" && selectedModel) {
        body.model_override = selectedModel;
      }
      if (replayMode === "different_route" && selectedRoute) {
        body.route_id_override = selectedRoute;
      }

      const res = await fetch(
        `/api/v1/organizations/${orgId}/projects/${projectId}/environments/${envId}/requests/${requestId}/replay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(
          err?.error?.message || "Failed to replay request"
        );
      }

      return res.json();
    },
    onSuccess: (data) => {
      const comparison = data.comparison as ReplayComparisonData;
      setComparisonData(comparison);
      onReplayComplete?.(comparison);
    },
  });

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------
  const handleOpenDialog = () => {
    setComparisonData(null);
    setReplayMode("same_model");
    setSelectedModel("");
    setSelectedRoute("");
    replayMutation.reset();
    setDialogOpen(true);
  };

  const handleReplay = () => {
    replayMutation.mutate();
  };

  const handleClose = () => {
    setDialogOpen(false);
  };

  const isLoading = replayMutation.isPending;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={handleOpenDialog}
      >
        <Play className="size-4" />
        Replay
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Replay Request</DialogTitle>
            <DialogDescription>
              Re-send this request to compare results. The replay will be
              recorded as a new request.
            </DialogDescription>
          </DialogHeader>

          {/* Configuration (hidden after replay completes) */}
          {!comparisonData && (
            <div className="space-y-4">
              {/* Replay mode selector */}
              <div className="space-y-2">
                <Label>Replay Mode</Label>
                <Select
                  value={replayMode}
                  onValueChange={(v) => setReplayMode(v as ReplayMode)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="same_model">
                      Same model ({originalModel})
                    </SelectItem>
                    <SelectItem value="different_model">
                      Different model
                    </SelectItem>
                    <SelectItem value="different_route">
                      Different route
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Model selector (shown when "different model" is selected) */}
              {replayMode === "different_model" && (
                <div className="space-y-2">
                  <Label>Target Model</Label>
                  <Select
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(models) ? models : []).map(
                        (model) => (
                          <SelectItem
                            key={model.id}
                            value={model.model_id}
                          >
                            {model.display_name} ({model.providers?.display_name})
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Route selector (shown when "different route" is selected) */}
              {replayMode === "different_route" && (
                <div className="space-y-2">
                  <Label>Target Route</Label>
                  <Select
                    value={selectedRoute}
                    onValueChange={setSelectedRoute}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a route..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(routes) ? routes : []).map(
                        (route) => (
                          <SelectItem key={route.id} value={route.id}>
                            {route.name} ({route.slug})
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Error display */}
              {replayMutation.isError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-700">
                    {replayMutation.error?.message || "Replay failed"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Comparison results (shown after replay completes) */}
          {comparisonData && (
            <>
              <Separator />
              <ReplayComparison comparison={comparisonData} />
            </>
          )}

          {/* Footer */}
          <DialogFooter>
            {!comparisonData ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReplay}
                  disabled={
                    isLoading ||
                    (replayMode === "different_model" && !selectedModel) ||
                    (replayMode === "different_route" && !selectedRoute)
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Replaying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="size-4" />
                      Replay Request
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setComparisonData(null);
                    replayMutation.reset();
                  }}
                >
                  <RefreshCw className="size-4" />
                  Replay Again
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
