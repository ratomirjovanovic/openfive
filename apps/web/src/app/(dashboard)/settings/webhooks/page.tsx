"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/providers/context-provider";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { RelativeTime } from "@/components/shared/relative-time";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Webhook,
  Bell,
  Plus,
  Play,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

// ---------- Types ----------

const EVENT_TYPES = [
  "budget_warning",
  "budget_exceeded",
  "incident_created",
  "incident_resolved",
  "killswitch_activated",
  "cost_spike",
  "error_rate_spike",
] as const;

const CONDITION_TYPES = [
  { value: "budget_threshold", label: "Budget Threshold" },
  { value: "cost_spike", label: "Cost Spike" },
  { value: "error_rate", label: "Error Rate" },
  { value: "latency_p95", label: "Latency P95" },
  { value: "incident_created", label: "Incident Created" },
] as const;

interface WebhookRow {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  headers: Record<string, string>;
  created_at: string;
  updated_at: string;
}

interface DeliveryRow {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  duration_ms: number | null;
  success: boolean;
  attempted_at: string;
}

interface AlertRuleRow {
  id: string;
  organization_id: string;
  environment_id: string | null;
  name: string;
  condition_type: string;
  threshold_value: number | null;
  window_minutes: number;
  channels: string[];
  webhook_id: string | null;
  is_active: boolean;
  last_triggered_at: string | null;
  cooldown_minutes: number;
  created_at: string;
  updated_at: string;
  webhooks: { id: string; name: string; url: string } | null;
}

// ---------- Columns ----------

const webhookColumns: ColumnDef<WebhookRow>[] = [
  { accessorKey: "name", header: "Name" },
  {
    accessorKey: "url",
    header: "URL",
    cell: ({ row }) => (
      <code className="max-w-[200px] truncate rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">
        {row.original.url}
      </code>
    ),
  },
  {
    accessorKey: "events",
    header: "Events",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.events.slice(0, 2).map((e) => (
          <Badge key={e} variant="outline" className="text-xs">
            {e}
          </Badge>
        ))}
        {row.original.events.length > 2 && (
          <Badge variant="outline" className="text-xs text-neutral-500">
            +{row.original.events.length - 2}
          </Badge>
        )}
      </div>
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
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => <RelativeTime date={row.original.created_at} />,
  },
];

const alertColumns: ColumnDef<AlertRuleRow>[] = [
  { accessorKey: "name", header: "Name" },
  {
    accessorKey: "condition_type",
    header: "Condition",
    cell: ({ row }) => (
      <span className="text-sm capitalize text-neutral-600">
        {row.original.condition_type.replace(/_/g, " ")}
      </span>
    ),
  },
  {
    accessorKey: "threshold_value",
    header: "Threshold",
    cell: ({ row }) => (
      <span className="text-sm text-neutral-600">
        {row.original.threshold_value != null ? row.original.threshold_value : "--"}
      </span>
    ),
  },
  {
    accessorKey: "channels",
    header: "Channels",
    cell: ({ row }) => (
      <div className="flex gap-1">
        {row.original.channels.map((c) => (
          <Badge key={c} variant="outline" className="text-xs capitalize">
            {c}
          </Badge>
        ))}
      </div>
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
    accessorKey: "last_triggered_at",
    header: "Last Triggered",
    cell: ({ row }) =>
      row.original.last_triggered_at ? (
        <RelativeTime date={row.original.last_triggered_at} />
      ) : (
        <span className="text-sm text-neutral-400">Never</span>
      ),
  },
];

// ---------- Page ----------

export default function WebhooksPage() {
  const { currentOrg } = useAppContext();
  const queryClient = useQueryClient();

  // Webhook state
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    secret: "",
    events: [] as string[],
  });

  // Alert rule state
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [alertForm, setAlertForm] = useState({
    name: "",
    condition_type: "budget_threshold",
    threshold_value: "",
    window_minutes: "5",
    channels: [] as string[],
    webhook_id: "",
    cooldown_minutes: "15",
  });

  // Delivery log drawer
  const [deliveryDrawerOpen, setDeliveryDrawerOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookRow | null>(null);

  const orgId = currentOrg?.id;
  const apiBase = orgId ? `/api/v1/organizations/${orgId}` : null;

  // --- Queries ---

  const { data: webhooks = [], isLoading: loadingWebhooks } = useQuery({
    queryKey: ["webhooks", orgId],
    queryFn: async () => {
      if (!apiBase) return [];
      const res = await fetch(`${apiBase}/webhooks`);
      if (!res.ok) throw new Error("Failed to fetch webhooks");
      return res.json() as Promise<WebhookRow[]>;
    },
    enabled: !!orgId,
  });

  const { data: alertRules = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ["alert-rules", orgId],
    queryFn: async () => {
      if (!apiBase) return [];
      const res = await fetch(`${apiBase}/alerts`);
      if (!res.ok) throw new Error("Failed to fetch alert rules");
      return res.json() as Promise<AlertRuleRow[]>;
    },
    enabled: !!orgId,
  });

  const { data: deliveriesData } = useQuery({
    queryKey: ["webhook-deliveries", selectedWebhook?.id],
    queryFn: async () => {
      if (!apiBase || !selectedWebhook) return { deliveries: [], total: 0 };
      const res = await fetch(
        `${apiBase}/webhooks/${selectedWebhook.id}/deliveries?limit=50`
      );
      if (!res.ok) throw new Error("Failed to fetch deliveries");
      return res.json() as Promise<{ deliveries: DeliveryRow[]; total: number }>;
    },
    enabled: !!selectedWebhook && !!apiBase,
  });

  // --- Mutations ---

  const createWebhookMut = useMutation({
    mutationFn: async (payload: typeof webhookForm) => {
      const res = await fetch(`${apiBase}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Failed to create webhook");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook created");
      setShowCreateWebhook(false);
      resetWebhookForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteWebhookMut = useMutation({
    mutationFn: async (webhookId: string) => {
      const res = await fetch(`${apiBase}/webhooks/${webhookId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete webhook");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook deleted");
    },
    onError: () => toast.error("Failed to delete webhook"),
  });

  const testWebhookMut = useMutation({
    mutationFn: async (webhookId: string) => {
      const res = await fetch(`${apiBase}/webhooks/${webhookId}/test`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to send test");
      return res.json() as Promise<{
        success: boolean;
        response_status: number | null;
        duration_ms: number;
      }>;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Test delivered (${data.response_status}, ${data.duration_ms}ms)`);
      } else {
        toast.error(
          `Test failed${data.response_status ? ` (${data.response_status})` : ""}`
        );
      }
      queryClient.invalidateQueries({ queryKey: ["webhook-deliveries"] });
    },
    onError: () => toast.error("Failed to send test webhook"),
  });

  const createAlertMut = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`${apiBase}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Failed to create alert rule");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      toast.success("Alert rule created");
      setShowCreateAlert(false);
      resetAlertForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteAlertMut = useMutation({
    mutationFn: async (alertId: string) => {
      const res = await fetch(`${apiBase}/alerts/${alertId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete alert rule");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      toast.success("Alert rule deleted");
    },
    onError: () => toast.error("Failed to delete alert rule"),
  });

  // --- Helpers ---

  function resetWebhookForm() {
    setWebhookForm({ name: "", url: "", secret: "", events: [] });
  }

  function resetAlertForm() {
    setAlertForm({
      name: "",
      condition_type: "budget_threshold",
      threshold_value: "",
      window_minutes: "5",
      channels: [],
      webhook_id: "",
      cooldown_minutes: "15",
    });
  }

  function toggleEvent(event: string) {
    setWebhookForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }

  function toggleChannel(channel: string) {
    setAlertForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  }

  const handleWebhookRowClick = useCallback((row: WebhookRow) => {
    setSelectedWebhook(row);
    setDeliveryDrawerOpen(true);
  }, []);

  const handleSubmitWebhook = useCallback(() => {
    createWebhookMut.mutate(webhookForm);
  }, [createWebhookMut, webhookForm]);

  const handleSubmitAlert = useCallback(() => {
    const payload: Record<string, unknown> = {
      name: alertForm.name,
      condition_type: alertForm.condition_type,
      channels: alertForm.channels,
      window_minutes: parseInt(alertForm.window_minutes, 10),
      cooldown_minutes: parseInt(alertForm.cooldown_minutes, 10),
    };
    if (alertForm.threshold_value) {
      payload.threshold_value = parseFloat(alertForm.threshold_value);
    }
    if (alertForm.webhook_id) {
      payload.webhook_id = alertForm.webhook_id;
    }
    createAlertMut.mutate(payload);
  }, [createAlertMut, alertForm]);

  if (!currentOrg) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Webhooks & Alerts"
          description="Configure webhook endpoints and alert rules for your organization."
        />
        <EmptyState
          icon={<Webhook className="h-10 w-10" />}
          title="Select an organization"
          description="Choose an organization from the top bar to manage webhooks and alerts."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks & Alerts"
        description="Configure webhook endpoints and alert rules for your organization."
      />

      <Tabs defaultValue="webhooks">
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="alerts">Alert Rules</TabsTrigger>
        </TabsList>

        {/* --- Webhooks Tab --- */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              {webhooks.length} webhook{webhooks.length !== 1 ? "s" : ""}
            </p>
            <Button
              size="sm"
              onClick={() => setShowCreateWebhook(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add webhook
            </Button>
          </div>

          {loadingWebhooks ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          ) : webhooks.length === 0 ? (
            <EmptyState
              icon={<Webhook className="h-10 w-10" />}
              title="No webhooks configured"
              description="Add a webhook endpoint to receive real-time notifications about events in your organization."
              actionLabel="Add webhook"
              onAction={() => setShowCreateWebhook(true)}
            />
          ) : (
            <DataTable
              columns={[
                ...webhookColumns,
                {
                  id: "actions",
                  header: "",
                  cell: ({ row }) => (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2"
                        disabled={testWebhookMut.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          testWebhookMut.mutate(row.original.id);
                        }}
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteWebhookMut.mutate(row.original.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={webhooks}
              onRowClick={handleWebhookRowClick}
            />
          )}
        </TabsContent>

        {/* --- Alert Rules Tab --- */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              {alertRules.length} rule{alertRules.length !== 1 ? "s" : ""}
            </p>
            <Button
              size="sm"
              onClick={() => setShowCreateAlert(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add alert rule
            </Button>
          </div>

          {loadingAlerts ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          ) : alertRules.length === 0 ? (
            <EmptyState
              icon={<Bell className="h-10 w-10" />}
              title="No alert rules"
              description="Create alert rules to get notified when important events occur, like budget thresholds or error spikes."
              actionLabel="Add alert rule"
              onAction={() => setShowCreateAlert(true)}
            />
          ) : (
            <DataTable
              columns={[
                ...alertColumns,
                {
                  id: "actions",
                  header: "",
                  cell: ({ row }) => (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAlertMut.mutate(row.original.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  ),
                },
              ]}
              data={alertRules}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* --- Create Webhook Dialog --- */}
      <Dialog open={showCreateWebhook} onOpenChange={setShowCreateWebhook}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add webhook</DialogTitle>
            <DialogDescription>
              Configure an endpoint to receive event notifications via HTTP POST.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="Slack Notifications"
                value={webhookForm.name}
                onChange={(e) =>
                  setWebhookForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                placeholder="https://example.com/webhook"
                value={webhookForm.url}
                onChange={(e) =>
                  setWebhookForm((p) => ({ ...p, url: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Signing secret (optional)</Label>
              <Input
                type="password"
                placeholder="whsec_..."
                value={webhookForm.secret}
                onChange={(e) =>
                  setWebhookForm((p) => ({ ...p, secret: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Event types</Label>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map((event) => (
                  <button
                    key={event}
                    type="button"
                    onClick={() => toggleEvent(event)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      webhookForm.events.includes(event)
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {event}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateWebhook(false);
                resetWebhookForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitWebhook}
              disabled={
                !webhookForm.name ||
                !webhookForm.url ||
                webhookForm.events.length === 0 ||
                createWebhookMut.isPending
              }
            >
              {createWebhookMut.isPending ? "Creating..." : "Create webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Create Alert Rule Dialog --- */}
      <Dialog open={showCreateAlert} onOpenChange={setShowCreateAlert}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add alert rule</DialogTitle>
            <DialogDescription>
              Get notified when conditions are met for your infrastructure.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="High error rate alert"
                value={alertForm.name}
                onChange={(e) =>
                  setAlertForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Condition type</Label>
              <Select
                value={alertForm.condition_type}
                onValueChange={(v) =>
                  setAlertForm((p) => ({ ...p, condition_type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_TYPES.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {alertForm.condition_type !== "incident_created" && (
              <div className="space-y-2">
                <Label>Threshold value</Label>
                <Input
                  type="number"
                  placeholder="e.g. 80 for 80%"
                  value={alertForm.threshold_value}
                  onChange={(e) =>
                    setAlertForm((p) => ({ ...p, threshold_value: e.target.value }))
                  }
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Window (minutes)</Label>
                <Input
                  type="number"
                  value={alertForm.window_minutes}
                  onChange={(e) =>
                    setAlertForm((p) => ({ ...p, window_minutes: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Cooldown (minutes)</Label>
                <Input
                  type="number"
                  value={alertForm.cooldown_minutes}
                  onChange={(e) =>
                    setAlertForm((p) => ({ ...p, cooldown_minutes: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notification channels</Label>
              <div className="flex gap-4">
                {(["webhook", "email"] as const).map((ch) => (
                  <label key={ch} className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={alertForm.channels.includes(ch)}
                      onCheckedChange={() => toggleChannel(ch)}
                      size="sm"
                    />
                    <span className="capitalize">{ch}</span>
                  </label>
                ))}
              </div>
            </div>
            {alertForm.channels.includes("webhook") && webhooks.length > 0 && (
              <div className="space-y-2">
                <Label>Webhook endpoint</Label>
                <Select
                  value={alertForm.webhook_id}
                  onValueChange={(v) =>
                    setAlertForm((p) => ({ ...p, webhook_id: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a webhook" />
                  </SelectTrigger>
                  <SelectContent>
                    {webhooks.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateAlert(false);
                resetAlertForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAlert}
              disabled={
                !alertForm.name ||
                alertForm.channels.length === 0 ||
                createAlertMut.isPending
              }
            >
              {createAlertMut.isPending ? "Creating..." : "Create rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Delivery Log Drawer --- */}
      <Sheet open={deliveryDrawerOpen} onOpenChange={setDeliveryDrawerOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              Delivery log{selectedWebhook ? ` - ${selectedWebhook.name}` : ""}
            </SheetTitle>
            <SheetDescription>
              Recent webhook delivery attempts and their responses.
            </SheetDescription>
          </SheetHeader>
          <Separator />
          <ScrollArea className="flex-1 px-4">
            {deliveriesData && deliveriesData.deliveries.length > 0 ? (
              <div className="space-y-3 py-4">
                {deliveriesData.deliveries.map((d) => (
                  <div
                    key={d.id}
                    className="rounded-lg border border-neutral-200 bg-white p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {d.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <Badge variant="outline" className="text-xs">
                          {d.event_type}
                        </Badge>
                        {d.response_status && (
                          <span className="text-xs text-neutral-500">
                            {d.response_status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        {d.duration_ms != null && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {d.duration_ms}ms
                          </span>
                        )}
                        <RelativeTime date={d.attempted_at} />
                      </div>
                    </div>
                    {d.response_body && (
                      <pre className="mt-2 max-h-24 overflow-auto rounded bg-neutral-50 p-2 text-xs text-neutral-600">
                        {d.response_body.slice(0, 500)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="mb-2 h-8 w-8 text-neutral-300" />
                <p className="text-sm text-neutral-500">No deliveries yet</p>
                <p className="mt-1 text-xs text-neutral-400">
                  Send a test event to see delivery logs here.
                </p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
