"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/status-badge";
import { TruncatedId } from "@/components/shared/truncated-id";
import { CodeBlock } from "@/components/shared/code-block";
import { formatCurrency, formatTokens, formatLatency } from "@/lib/formatters";
import {
  Clock,
  Zap,
  DollarSign,
  Hash,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Cpu,
  Shield,
  Wrench,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestRow {
  id: string;
  request_id: string;
  model_identifier: string;
  provider_id?: string;
  input_tokens: number;
  output_tokens: number;
  total_cost_usd: number;
  input_cost_usd: number;
  output_cost_usd: number;
  duration_ms: number;
  status: string;
  action_taken: string;
  is_streaming: boolean;
  attempt_number: number;
  fallback_reason?: string;
  schema_valid?: boolean;
  schema_repair_attempts: number;
  tool_call_count: number;
  estimated_tokens: boolean;
  error_code?: string;
  error_message?: string;
  prompt_hash?: string;
  metadata: Record<string, unknown>;
  started_at: string;
  completed_at?: string;
  created_at: string;
}

interface RequestDetailDrawerProps {
  request: RequestRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFullDateTime(iso: string): string {
  const d = new Date(iso);
  const base = d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${base}.${ms}`;
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    none: "None",
    downgrade: "Downgrade",
    throttle: "Throttle",
    block: "Block",
    fallback: "Fallback",
    repair: "Repair",
  };
  return labels[action] ?? action;
}

function actionVariant(
  action: string
): "secondary" | "outline" | "destructive" {
  switch (action) {
    case "block":
      return "destructive";
    case "fallback":
    case "downgrade":
    case "throttle":
    case "repair":
      return "outline";
    default:
      return "secondary";
  }
}

// ---------------------------------------------------------------------------
// Sub-components: Section label row
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
      {children}
    </h3>
  );
}

// ---------------------------------------------------------------------------
// Sub-components: Key-value field
// ---------------------------------------------------------------------------

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="shrink-0 text-sm text-neutral-500">{label}</span>
      <span className="text-right text-sm font-medium text-neutral-900">
        {children}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components: Summary cards
// ---------------------------------------------------------------------------

function SummaryItem({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-neutral-200 bg-neutral-50/50 px-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-neutral-400" />
      <div className="min-w-0">
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="truncate text-sm font-semibold text-neutral-900">
          {value}
        </p>
        {sub && (
          <p className="truncate text-xs text-neutral-400">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components: Timeline
// ---------------------------------------------------------------------------

interface TimelineEvent {
  label: string;
  time: string | null;
  icon: React.ElementType;
  status: "done" | "active" | "pending";
}

function buildTimeline(req: RequestRow): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    label: "Request started",
    time: req.started_at,
    icon: Zap,
    status: "done",
  });

  if (req.attempt_number > 1 && req.fallback_reason) {
    events.push({
      label: `Fallback (attempt ${req.attempt_number})`,
      time: null,
      icon: AlertTriangle,
      status: "done",
    });
  }

  events.push({
    label: `Provider call${req.provider_id ? ` (${req.provider_id})` : ""}`,
    time: null,
    icon: Cpu,
    status: "done",
  });

  if (req.schema_valid !== undefined && req.schema_valid !== null) {
    events.push({
      label: req.schema_valid
        ? "Schema validated"
        : `Schema repair (${req.schema_repair_attempts} attempt${req.schema_repair_attempts !== 1 ? "s" : ""})`,
      time: null,
      icon: Shield,
      status: "done",
    });
  }

  if (req.status === "error") {
    events.push({
      label: `Error: ${req.error_code ?? "unknown"}`,
      time: null,
      icon: XCircle,
      status: "done",
    });
  }

  events.push({
    label: req.completed_at ? "Completed" : "In progress",
    time: req.completed_at ?? null,
    icon: req.completed_at ? CheckCircle2 : Clock,
    status: req.completed_at ? "done" : "active",
  });

  return events;
}

function TimelineView({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="relative pl-5">
      {/* vertical line */}
      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-neutral-200" />

      <div className="space-y-4">
        {events.map((evt, i) => {
          const Icon = evt.icon;
          return (
            <div key={i} className="relative flex items-start gap-3">
              <div className="absolute -left-5 flex size-4 items-center justify-center rounded-full bg-white">
                <Icon
                  className={`size-3.5 ${
                    evt.status === "done"
                      ? "text-neutral-500"
                      : evt.status === "active"
                        ? "text-blue-500"
                        : "text-neutral-300"
                  }`}
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-neutral-700">{evt.label}</p>
                {evt.time && (
                  <p className="text-xs text-neutral-400">
                    {formatFullDateTime(evt.time)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Overview
// ---------------------------------------------------------------------------

function OverviewTab({ request }: { request: RequestRow }) {
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Request</SectionLabel>
        <div className="mt-2 space-y-0.5">
          <Field label="Trace ID">
            <TruncatedId id={request.request_id} />
          </Field>
          <Field label="Internal ID">
            <TruncatedId id={request.id} />
          </Field>
          <Field label="Status">
            <StatusBadge status={request.status} />
          </Field>
          <Field label="Streaming">
            {request.is_streaming ? "Yes" : "No"}
          </Field>
          <Field label="Started">
            {formatFullDateTime(request.started_at)}
          </Field>
          {request.completed_at && (
            <Field label="Completed">
              {formatFullDateTime(request.completed_at)}
            </Field>
          )}
          <Field label="Duration">{formatLatency(request.duration_ms)}</Field>
        </div>
      </div>

      <Separator />

      <div>
        <SectionLabel>Model</SectionLabel>
        <div className="mt-2 space-y-0.5">
          <Field label="Model">{request.model_identifier}</Field>
          {request.provider_id && (
            <Field label="Provider">{request.provider_id}</Field>
          )}
          {request.prompt_hash && (
            <Field label="Prompt hash">
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-600">
                {request.prompt_hash}
              </code>
            </Field>
          )}
        </div>
      </div>

      <Separator />

      <div>
        <SectionLabel>Tokens &amp; Cost</SectionLabel>
        <div className="mt-2 space-y-0.5">
          <Field label="Input tokens">
            {formatTokens(request.input_tokens)}
            {request.estimated_tokens && (
              <span className="ml-1 text-xs text-neutral-400">(est.)</span>
            )}
          </Field>
          <Field label="Output tokens">
            {formatTokens(request.output_tokens)}
          </Field>
          <Field label="Tool calls">{request.tool_call_count}</Field>
          <Field label="Input cost">
            {formatCurrency(request.input_cost_usd, { decimals: 6 })}
          </Field>
          <Field label="Output cost">
            {formatCurrency(request.output_cost_usd, { decimals: 6 })}
          </Field>
          <Field label="Total cost">
            <span className="font-semibold">
              {formatCurrency(request.total_cost_usd, { decimals: 6 })}
            </span>
          </Field>
        </div>
      </div>

      {Object.keys(request.metadata).length > 0 && (
        <>
          <Separator />
          <div>
            <SectionLabel>Metadata</SectionLabel>
            <div className="mt-2">
              <CodeBlock
                code={JSON.stringify(request.metadata, null, 2)}
                className="max-h-60 overflow-y-auto"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Routing
// ---------------------------------------------------------------------------

function RoutingTab({ request }: { request: RequestRow }) {
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Routing Details</SectionLabel>
        <div className="mt-2 space-y-0.5">
          <Field label="Attempt number">{request.attempt_number}</Field>
          <Field label="Action taken">
            <Badge variant={actionVariant(request.action_taken)}>
              {actionLabel(request.action_taken)}
            </Badge>
          </Field>
          {request.fallback_reason && (
            <Field label="Fallback reason">
              <span className="text-amber-700">{request.fallback_reason}</span>
            </Field>
          )}
        </div>
      </div>

      <Separator />

      <div>
        <SectionLabel>Provider</SectionLabel>
        <div className="mt-2 space-y-0.5">
          <Field label="Provider">{request.provider_id ?? "N/A"}</Field>
          <Field label="Model">{request.model_identifier}</Field>
          <Field label="Streaming">
            {request.is_streaming ? "Yes" : "No"}
          </Field>
        </div>
      </div>

      {request.attempt_number > 1 && (
        <>
          <Separator />
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
              <AlertTriangle className="size-4" />
              Fallback activated
            </div>
            <p className="mt-1 text-xs text-amber-600">
              This request was retried after the initial attempt failed.
              {request.fallback_reason && (
                <>
                  {" "}
                  Reason:{" "}
                  <span className="font-medium">{request.fallback_reason}</span>
                </>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Schema
// ---------------------------------------------------------------------------

function SchemaTab({ request }: { request: RequestRow }) {
  const hasSchemaInfo =
    request.schema_valid !== undefined && request.schema_valid !== null;

  if (!hasSchemaInfo) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Shield className="size-8 text-neutral-300" />
        <p className="text-sm text-neutral-500">
          No schema validation was performed for this request.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Validation</SectionLabel>
        <div className="mt-2 space-y-0.5">
          <Field label="Schema valid">
            {request.schema_valid ? (
              <span className="inline-flex items-center gap-1 text-green-700">
                <CheckCircle2 className="size-3.5" />
                Valid
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red-700">
                <XCircle className="size-3.5" />
                Invalid
              </span>
            )}
          </Field>
          <Field label="Repair attempts">
            {request.schema_repair_attempts}
          </Field>
        </div>
      </div>

      {request.schema_repair_attempts > 0 && (
        <>
          <Separator />
          <div
            className={`rounded-lg border p-3 ${
              request.schema_valid
                ? "border-green-200 bg-green-50/50"
                : "border-red-200 bg-red-50/50"
            }`}
          >
            <div
              className={`flex items-center gap-2 text-sm font-medium ${
                request.schema_valid ? "text-green-800" : "text-red-800"
              }`}
            >
              <Wrench className="size-4" />
              {request.schema_valid
                ? "Schema repaired successfully"
                : "Schema repair failed"}
            </div>
            <p
              className={`mt-1 text-xs ${
                request.schema_valid ? "text-green-600" : "text-red-600"
              }`}
            >
              {request.schema_repair_attempts} repair attempt
              {request.schema_repair_attempts !== 1 ? "s" : ""} were made
              {request.schema_valid
                ? " and the output was corrected."
                : " but the output could not be corrected."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Errors
// ---------------------------------------------------------------------------

function ErrorsTab({ request }: { request: RequestRow }) {
  const hasError = request.error_code || request.error_message;

  if (!hasError) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <CheckCircle2 className="size-8 text-green-300" />
        <p className="text-sm text-neutral-500">
          No errors were recorded for this request.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Error Details</SectionLabel>
        <div className="mt-2 space-y-0.5">
          {request.error_code && (
            <Field label="Error code">
              <code className="rounded bg-red-50 px-1.5 py-0.5 font-mono text-xs text-red-700">
                {request.error_code}
              </code>
            </Field>
          )}
          {request.status && (
            <Field label="Status">
              <StatusBadge status={request.status} />
            </Field>
          )}
        </div>
      </div>

      {request.error_message && (
        <>
          <Separator />
          <div>
            <SectionLabel>Error Message</SectionLabel>
            <div className="mt-2">
              <CodeBlock
                code={request.error_message}
                className="max-h-60 overflow-y-auto"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Drawer
// ---------------------------------------------------------------------------

export function RequestDetailDrawer({
  request,
  open,
  onOpenChange,
}: RequestDetailDrawerProps) {
  if (!request) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[520px] sm:w-[600px]">
          <SheetHeader>
            <SheetTitle>Request Details</SheetTitle>
            <SheetDescription className="sr-only">
              Detailed trace information for a single inference request
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-neutral-400">No request selected.</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const timeline = buildTimeline(request);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[520px] flex-col overflow-hidden sm:w-[600px]"
      >
        {/* ---- Header ---- */}
        <SheetHeader className="shrink-0 space-y-1.5 border-b border-neutral-200 pb-4">
          <div className="flex items-center gap-3 pr-8">
            <SheetTitle className="text-base">Request Trace</SheetTitle>
            <StatusBadge status={request.status} />
          </div>
          <SheetDescription className="sr-only">
            Detailed trace information for request {request.request_id}
          </SheetDescription>
          <div className="flex items-center gap-2">
            <TruncatedId id={request.request_id} length={12} />
            {request.is_streaming && (
              <Badge variant="secondary" className="text-[10px]">
                Streaming
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* ---- Scrollable body ---- */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {/* Summary grid */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <SummaryItem
              icon={Cpu}
              label="Model"
              value={request.model_identifier}
              sub={request.provider_id}
            />
            <SummaryItem
              icon={Clock}
              label="Duration"
              value={formatLatency(request.duration_ms)}
            />
            <SummaryItem
              icon={DollarSign}
              label="Cost"
              value={formatCurrency(request.total_cost_usd, { decimals: 6 })}
            />
            <SummaryItem
              icon={Hash}
              label="Tokens"
              value={`${formatTokens(request.input_tokens)} ${String.fromCharCode(8594)} ${formatTokens(request.output_tokens)}`}
              sub={`${formatTokens(request.input_tokens + request.output_tokens)} total`}
            />
          </div>

          {/* Timeline */}
          <div className="mt-6">
            <SectionLabel>Timeline</SectionLabel>
            <div className="mt-3">
              <TimelineView events={timeline} />
            </div>
          </div>

          <Separator className="my-6" />

          {/* Detail tabs */}
          <Tabs defaultValue="overview">
            <TabsList variant="line" className="w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="routing">
                Routing
                {request.attempt_number > 1 && (
                  <span className="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-700">
                    {request.attempt_number}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="schema">Schema</TabsTrigger>
              <TabsTrigger value="errors">
                Errors
                {(request.error_code || request.error_message) && (
                  <span className="ml-1 inline-flex size-1.5 rounded-full bg-red-500" />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <OverviewTab request={request} />
            </TabsContent>

            <TabsContent value="routing" className="mt-4">
              <RoutingTab request={request} />
            </TabsContent>

            <TabsContent value="schema" className="mt-4">
              <SchemaTab request={request} />
            </TabsContent>

            <TabsContent value="errors" className="mt-4">
              <ErrorsTab request={request} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
