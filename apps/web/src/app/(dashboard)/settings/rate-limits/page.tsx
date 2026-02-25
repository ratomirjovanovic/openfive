"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/providers/context-provider";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Gauge,
  Save,
  RefreshCw,
  Pencil,
  Check,
  X,
  Shield,
  Key,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

interface RouteRateLimit {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  max_requests_per_min: number | null;
  max_tokens_per_request: number | null;
  budget_limit_usd: number | null;
}

interface ApiKeyRateLimit {
  id: string;
  name: string;
  key_prefix: string;
  rate_limit_rpm: number | null;
  is_active: boolean;
  last_used_at: string | null;
}

interface RateLimitsData {
  environment: {
    id: string;
    name: string;
    tier: string;
  };
  routes: RouteRateLimit[];
  api_keys: ApiKeyRateLimit[];
}

interface EditingRoute {
  id: string;
  max_requests_per_min: string;
  max_tokens_per_request: string;
}

interface EditingKey {
  id: string;
  rate_limit_rpm: string;
}

function UsageBar({
  current,
  limit,
}: {
  current: number;
  limit: number | null;
}) {
  if (!limit) {
    return (
      <span className="text-xs text-neutral-400">No limit</span>
    );
  }
  const pct = Math.min((current / limit) * 100, 100);
  const color =
    pct >= 90
      ? "bg-red-500"
      : pct >= 70
        ? "bg-yellow-500"
        : "bg-green-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-neutral-100">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-neutral-500">
        {current}/{limit}
      </span>
    </div>
  );
}

export default function RateLimitsPage() {
  const { currentOrg, currentProject, currentEnv } = useAppContext();
  const queryClient = useQueryClient();

  const [editingRoute, setEditingRoute] = useState<EditingRoute | null>(null);
  const [editingKey, setEditingKey] = useState<EditingKey | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkRpm, setBulkRpm] = useState("");
  const [bulkTokens, setBulkTokens] = useState("");
  const [pendingChanges, setPendingChanges] = useState<
    Map<string, Partial<RouteRateLimit>>
  >(new Map());
  const [pendingKeyChanges, setPendingKeyChanges] = useState<
    Map<string, Partial<ApiKeyRateLimit>>
  >(new Map());

  const apiPath =
    currentOrg && currentProject && currentEnv
      ? `/api/v1/organizations/${currentOrg.id}/projects/${currentProject.id}/environments/${currentEnv.id}/rate-limits`
      : null;

  const {
    data: rateLimits,
    isLoading,
    refetch,
  } = useQuery<RateLimitsData>({
    queryKey: ["rate-limits", apiPath],
    queryFn: async () => {
      if (!apiPath) throw new Error("No environment selected");
      const res = await fetch(apiPath);
      if (!res.ok) throw new Error("Failed to fetch rate limits");
      return res.json();
    },
    enabled: !!apiPath,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      routes: Array<{
        id: string;
        max_requests_per_min?: number | null;
        max_tokens_per_request?: number | null;
        is_active?: boolean;
      }>;
      api_keys?: Array<{
        id: string;
        rate_limit_rpm?: number | null;
      }>;
    }) => {
      if (!apiPath) throw new Error("No environment selected");
      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save rate limits");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate-limits"] });
      setPendingChanges(new Map());
      setPendingKeyChanges(new Map());
      toast.success("Rate limits saved");
    },
    onError: () => {
      toast.error("Failed to save rate limits");
    },
  });

  const handleRouteToggle = useCallback(
    (routeId: string, isActive: boolean) => {
      setPendingChanges((prev) => {
        const next = new Map(prev);
        const existing = next.get(routeId) || {};
        next.set(routeId, { ...existing, is_active: isActive });
        return next;
      });
    },
    []
  );

  const handleStartEditRoute = useCallback((route: RouteRateLimit) => {
    setEditingRoute({
      id: route.id,
      max_requests_per_min: route.max_requests_per_min?.toString() || "",
      max_tokens_per_request: route.max_tokens_per_request?.toString() || "",
    });
  }, []);

  const handleSaveEditRoute = useCallback(() => {
    if (!editingRoute) return;
    setPendingChanges((prev) => {
      const next = new Map(prev);
      const existing = next.get(editingRoute.id) || {};
      next.set(editingRoute.id, {
        ...existing,
        max_requests_per_min: editingRoute.max_requests_per_min
          ? parseInt(editingRoute.max_requests_per_min, 10)
          : null,
        max_tokens_per_request: editingRoute.max_tokens_per_request
          ? parseInt(editingRoute.max_tokens_per_request, 10)
          : null,
      });
      return next;
    });
    setEditingRoute(null);
  }, [editingRoute]);

  const handleStartEditKey = useCallback((key: ApiKeyRateLimit) => {
    setEditingKey({
      id: key.id,
      rate_limit_rpm: key.rate_limit_rpm?.toString() || "",
    });
  }, []);

  const handleSaveEditKey = useCallback(() => {
    if (!editingKey) return;
    setPendingKeyChanges((prev) => {
      const next = new Map(prev);
      next.set(editingKey.id, {
        rate_limit_rpm: editingKey.rate_limit_rpm
          ? parseInt(editingKey.rate_limit_rpm, 10)
          : null,
      });
      return next;
    });
    setEditingKey(null);
  }, [editingKey]);

  const handleBulkApply = useCallback(() => {
    if (!rateLimits) return;
    const changes = new Map<string, Partial<RouteRateLimit>>();
    for (const route of rateLimits.routes) {
      const update: Partial<RouteRateLimit> = {};
      if (bulkRpm) {
        update.max_requests_per_min = parseInt(bulkRpm, 10);
      }
      if (bulkTokens) {
        update.max_tokens_per_request = parseInt(bulkTokens, 10);
      }
      if (Object.keys(update).length > 0) {
        changes.set(route.id, { ...pendingChanges.get(route.id), ...update });
      }
    }
    setPendingChanges(changes);
    setBulkDialogOpen(false);
    setBulkRpm("");
    setBulkTokens("");
    toast.success("Bulk values applied. Save to persist changes.");
  }, [rateLimits, bulkRpm, bulkTokens, pendingChanges]);

  const handleSaveAll = useCallback(() => {
    const routeUpdates = Array.from(pendingChanges.entries()).map(
      ([id, changes]) => ({
        id,
        ...(changes.max_requests_per_min !== undefined && {
          max_requests_per_min: changes.max_requests_per_min,
        }),
        ...(changes.max_tokens_per_request !== undefined && {
          max_tokens_per_request: changes.max_tokens_per_request,
        }),
        ...(changes.is_active !== undefined && {
          is_active: changes.is_active,
        }),
      })
    );

    const keyUpdates = Array.from(pendingKeyChanges.entries()).map(
      ([id, changes]) => ({
        id,
        ...(changes.rate_limit_rpm !== undefined && {
          rate_limit_rpm: changes.rate_limit_rpm,
        }),
      })
    );

    saveMutation.mutate({
      routes: routeUpdates,
      ...(keyUpdates.length > 0 && { api_keys: keyUpdates }),
    });
  }, [pendingChanges, pendingKeyChanges, saveMutation]);

  const getEffectiveRoute = useCallback(
    (route: RouteRateLimit): RouteRateLimit => {
      const changes = pendingChanges.get(route.id);
      if (!changes) return route;
      return { ...route, ...changes };
    },
    [pendingChanges]
  );

  const getEffectiveKey = useCallback(
    (key: ApiKeyRateLimit): ApiKeyRateLimit => {
      const changes = pendingKeyChanges.get(key.id);
      if (!changes) return key;
      return { ...key, ...changes };
    },
    [pendingKeyChanges]
  );

  const hasChanges = pendingChanges.size > 0 || pendingKeyChanges.size > 0;
  const hasEnv = !!(currentOrg && currentProject && currentEnv);

  const envDefaults = useMemo(() => {
    if (!rateLimits || rateLimits.routes.length === 0) return null;
    const routes = rateLimits.routes;
    const rpms = routes
      .map((r) => r.max_requests_per_min)
      .filter((v): v is number => v !== null);
    const tokens = routes
      .map((r) => r.max_tokens_per_request)
      .filter((v): v is number => v !== null);

    return {
      avgRpm: rpms.length > 0 ? Math.round(rpms.reduce((a, b) => a + b, 0) / rpms.length) : null,
      avgTokens:
        tokens.length > 0
          ? Math.round(tokens.reduce((a, b) => a + b, 0) / tokens.length)
          : null,
      routesWithLimits: rpms.length,
      totalRoutes: routes.length,
      activeRoutes: routes.filter((r) => r.is_active).length,
    };
  }, [rateLimits]);

  if (!hasEnv) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Rate Limits"
          description="Configure rate limits per route and per API key."
        />
        <EmptyState
          icon={<Gauge className="h-10 w-10" />}
          title="Select an environment"
          description="Choose an organization, project, and environment from the top bar to configure rate limits."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Rate Limits"
          description="Configure rate limits per route and per API key."
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
        title="Rate Limits"
        description="Configure rate limits per route and per API key."
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
            {hasChanges && (
              <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={saveMutation.isPending}
                className="gap-2"
              >
                <Save className="h-3.5 w-3.5" />
                {saveMutation.isPending ? "Saving..." : "Save all changes"}
              </Button>
            )}
          </div>
        }
      />

      {/* Section 1: Environment-level defaults */}
      <Card className="border-neutral-200 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-neutral-500" />
            Environment Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {envDefaults ? (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div>
                <p className="text-sm text-neutral-500">Avg RPM Limit</p>
                <p className="text-lg font-semibold text-neutral-900">
                  {envDefaults.avgRpm !== null ? envDefaults.avgRpm : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Avg Token Limit</p>
                <p className="text-lg font-semibold text-neutral-900">
                  {envDefaults.avgTokens !== null
                    ? envDefaults.avgTokens.toLocaleString()
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Routes with Limits</p>
                <p className="text-lg font-semibold text-neutral-900">
                  {envDefaults.routesWithLimits}/{envDefaults.totalRoutes}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Active Routes</p>
                <p className="text-lg font-semibold text-neutral-900">
                  {envDefaults.activeRoutes}/{envDefaults.totalRoutes}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              No routes configured in this environment.
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="routes">
        <TabsList>
          <TabsTrigger value="routes" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Per-Route Limits
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-1.5">
            <Key className="h-3.5 w-3.5" />
            Per API Key Limits
          </TabsTrigger>
        </TabsList>

        {/* Section 2: Per-route overrides */}
        <TabsContent value="routes">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                {rateLimits?.routes.length || 0} route
                {(rateLimits?.routes.length || 0) !== 1 ? "s" : ""} configured
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkDialogOpen(true)}
                disabled={!rateLimits?.routes.length}
              >
                Apply to all
              </Button>
            </div>

            {!rateLimits?.routes.length ? (
              <EmptyState
                icon={<Layers className="h-10 w-10" />}
                title="No routes"
                description="Create routes in this environment to configure rate limits."
              />
            ) : (
              <div className="rounded-lg border border-neutral-200 bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="border-neutral-200 hover:bg-transparent">
                      <TableHead className="h-10 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Route
                      </TableHead>
                      <TableHead className="h-10 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                        RPM Limit
                      </TableHead>
                      <TableHead className="h-10 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Token Limit
                      </TableHead>
                      <TableHead className="h-10 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Usage
                      </TableHead>
                      <TableHead className="h-10 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Status
                      </TableHead>
                      <TableHead className="h-10 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateLimits.routes.map((route) => {
                      const effective = getEffectiveRoute(route);
                      const isEditing = editingRoute?.id === route.id;
                      const hasRouteChange = pendingChanges.has(route.id);

                      return (
                        <TableRow
                          key={route.id}
                          className={`border-neutral-100 ${hasRouteChange ? "bg-amber-50/50" : ""}`}
                        >
                          <TableCell className="py-3">
                            <div>
                              <p className="text-sm font-medium text-neutral-900">
                                {effective.name}
                              </p>
                              <p className="text-xs text-neutral-400">
                                {effective.slug}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editingRoute.max_requests_per_min}
                                onChange={(e) =>
                                  setEditingRoute({
                                    ...editingRoute,
                                    max_requests_per_min: e.target.value,
                                  })
                                }
                                placeholder="No limit"
                                className="h-8 w-24"
                              />
                            ) : (
                              <span className="text-sm">
                                {effective.max_requests_per_min ?? (
                                  <span className="text-neutral-400">
                                    No limit
                                  </span>
                                )}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editingRoute.max_tokens_per_request}
                                onChange={(e) =>
                                  setEditingRoute({
                                    ...editingRoute,
                                    max_tokens_per_request: e.target.value,
                                  })
                                }
                                placeholder="No limit"
                                className="h-8 w-24"
                              />
                            ) : (
                              <span className="text-sm">
                                {effective.max_tokens_per_request?.toLocaleString() ?? (
                                  <span className="text-neutral-400">
                                    No limit
                                  </span>
                                )}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            <UsageBar
                              current={0}
                              limit={effective.max_requests_per_min}
                            />
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={effective.is_active}
                                onCheckedChange={(checked) =>
                                  handleRouteToggle(route.id, checked)
                                }
                                size="sm"
                              />
                              <StatusBadge
                                status={
                                  effective.is_active ? "active" : "blocked"
                                }
                              />
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleSaveEditRoute}
                                  className="h-7 w-7 p-0"
                                >
                                  <Check className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingRoute(null)}
                                  className="h-7 w-7 p-0"
                                >
                                  <X className="h-3.5 w-3.5 text-neutral-500" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEditRoute(route)}
                                className="h-7 w-7 p-0"
                              >
                                <Pencil className="h-3.5 w-3.5 text-neutral-500" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Section 3: Per API Key limits */}
        <TabsContent value="api-keys">
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">
              {rateLimits?.api_keys.length || 0} API key
              {(rateLimits?.api_keys.length || 0) !== 1 ? "s" : ""} in this
              environment
            </p>

            {!rateLimits?.api_keys.length ? (
              <EmptyState
                icon={<Key className="h-10 w-10" />}
                title="No API keys"
                description="Create API keys in this environment to configure per-key rate limits."
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
                        Key
                      </TableHead>
                      <TableHead className="h-10 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                        RPM Limit
                      </TableHead>
                      <TableHead className="h-10 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Status
                      </TableHead>
                      <TableHead className="h-10 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Last Used
                      </TableHead>
                      <TableHead className="h-10 bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateLimits.api_keys.map((key) => {
                      const effective = getEffectiveKey(key);
                      const isEditing = editingKey?.id === key.id;
                      const hasKeyChange = pendingKeyChanges.has(key.id);

                      return (
                        <TableRow
                          key={key.id}
                          className={`border-neutral-100 ${hasKeyChange ? "bg-amber-50/50" : ""}`}
                        >
                          <TableCell className="py-3 text-sm font-medium text-neutral-900">
                            {effective.name}
                          </TableCell>
                          <TableCell className="py-3">
                            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">
                              {effective.key_prefix}...
                            </code>
                          </TableCell>
                          <TableCell className="py-3">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editingKey.rate_limit_rpm}
                                onChange={(e) =>
                                  setEditingKey({
                                    ...editingKey,
                                    rate_limit_rpm: e.target.value,
                                  })
                                }
                                placeholder="No limit"
                                className="h-8 w-24"
                              />
                            ) : (
                              <span className="text-sm">
                                {effective.rate_limit_rpm ?? (
                                  <span className="text-neutral-400">
                                    No limit
                                  </span>
                                )}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            <StatusBadge
                              status={
                                effective.is_active ? "active" : "blocked"
                              }
                            />
                          </TableCell>
                          <TableCell className="py-3 text-sm text-neutral-500">
                            {effective.last_used_at
                              ? new Date(
                                  effective.last_used_at
                                ).toLocaleDateString()
                              : "Never"}
                          </TableCell>
                          <TableCell className="py-3">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleSaveEditKey}
                                  className="h-7 w-7 p-0"
                                >
                                  <Check className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingKey(null)}
                                  className="h-7 w-7 p-0"
                                >
                                  <X className="h-3.5 w-3.5 text-neutral-500" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEditKey(key)}
                                className="h-7 w-7 p-0"
                              >
                                <Pencil className="h-3.5 w-3.5 text-neutral-500" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Bulk update dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply to all routes</DialogTitle>
            <DialogDescription>
              Set the same rate limits for all routes in this environment. Leave
              a field empty to keep existing values.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Max requests per minute (RPM)</Label>
              <Input
                type="number"
                value={bulkRpm}
                onChange={(e) => setBulkRpm(e.target.value)}
                placeholder="e.g. 60"
              />
            </div>
            <div className="space-y-2">
              <Label>Max tokens per request</Label>
              <Input
                type="number"
                value={bulkTokens}
                onChange={(e) => setBulkTokens(e.target.value)}
                placeholder="e.g. 4096"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkApply}
              disabled={!bulkRpm && !bulkTokens}
            >
              Apply to all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
