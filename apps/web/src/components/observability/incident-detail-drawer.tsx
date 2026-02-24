"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { CodeBlock } from "@/components/shared/code-block";
import { RelativeTime } from "@/components/shared/relative-time";
import { formatDateTime } from "@/lib/formatters";
import {
  CheckCircle2,
  Eye,
  ShieldOff,
  OctagonX,
  Zap,
  ZapOff,
  Clock,
  User,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface IncidentDetailDrawerProps {
  incident: IncidentRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string, note: string) => void;
  onDisableRoute?: (id: string) => void;
  onDeactivateKillSwitch?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Severity colour map
// ---------------------------------------------------------------------------

const severityClasses: Record<string, string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  low: "bg-blue-50 text-blue-700 border-blue-200",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severityClasses[severity.toLowerCase()] ??
    "bg-neutral-50 text-neutral-600 border-neutral-200";
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium uppercase tracking-wide ${cls}`}
    >
      {severity}
    </Badge>
  );
}

function TimelineStep({
  label,
  timestamp,
  actor,
  completed,
  last = false,
}: {
  label: string;
  timestamp?: string;
  actor?: string;
  completed: boolean;
  last?: boolean;
}) {
  return (
    <div className="flex gap-3">
      {/* Dot + connector line */}
      <div className="flex flex-col items-center">
        <div
          className={`mt-1 size-2.5 shrink-0 rounded-full ${
            completed ? "bg-green-500" : "bg-neutral-300"
          }`}
        />
        {!last && (
          <div className="w-px flex-1 bg-neutral-200" />
        )}
      </div>

      {/* Content */}
      <div className={`pb-5 ${last ? "pb-0" : ""}`}>
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        {completed && timestamp ? (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-neutral-500">
            <Clock className="size-3" />
            <span>{formatDateTime(timestamp)}</span>
            <span className="text-neutral-300">&middot;</span>
            <RelativeTime date={timestamp} />
            {actor && (
              <>
                <span className="text-neutral-300">&middot;</span>
                <User className="size-3" />
                <span>{actor}</span>
              </>
            )}
          </div>
        ) : (
          <p className="mt-0.5 text-xs text-neutral-400">Pending</p>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-sm text-neutral-500">{label}</span>
      <span className="text-right text-sm font-medium text-neutral-900">
        {children}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IncidentDetailDrawer({
  incident,
  open,
  onOpenChange,
  onAcknowledge,
  onResolve,
  onDisableRoute,
  onDeactivateKillSwitch,
}: IncidentDetailDrawerProps) {
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");

  // Reset local state when the drawer closes or incident changes
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setShowResolveForm(false);
      setResolutionNote("");
    }
    onOpenChange(next);
  };

  if (!incident) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="w-[520px] sm:w-[600px] p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Incident Details</SheetTitle>
            <SheetDescription>No incident selected</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const isOpen = incident.status.toLowerCase() === "open";
  const isAcknowledged = incident.status.toLowerCase() === "acknowledged";
  const canAcknowledge = isOpen;
  const canResolve = isOpen || isAcknowledged;

  const handleAcknowledge = () => {
    onAcknowledge?.(incident.id);
  };

  const handleResolve = () => {
    onResolve?.(incident.id, resolutionNote);
    setShowResolveForm(false);
    setResolutionNote("");
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-[520px] sm:w-[600px] flex flex-col p-0 gap-0"
      >
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        <SheetHeader className="space-y-3 border-b border-neutral-200 px-6 py-5">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex-1 space-y-2">
              <SheetTitle className="text-base leading-snug text-neutral-900">
                {incident.title}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Full details for incident {incident.id}
              </SheetDescription>
              <div className="flex items-center gap-2">
                <SeverityBadge severity={incident.severity} />
                <StatusBadge status={incident.status} />
              </div>
            </div>
          </div>
          {incident.description && (
            <p className="text-sm leading-relaxed text-neutral-600">
              {incident.description}
            </p>
          )}
        </SheetHeader>

        {/* ---------------------------------------------------------------- */}
        {/* Scrollable body                                                  */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto">
          {/* Status Timeline -------------------------------------------- */}
          <div className="px-6 py-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Timeline
            </h3>
            <TimelineStep
              label="Incident Created"
              timestamp={incident.created_at}
              completed
            />
            <TimelineStep
              label="Acknowledged"
              timestamp={incident.acknowledged_at}
              actor={incident.acknowledged_by}
              completed={!!incident.acknowledged_at}
            />
            <TimelineStep
              label="Resolved"
              timestamp={incident.resolved_at}
              actor={incident.resolved_by}
              completed={!!incident.resolved_at}
              last
            />
            {incident.resolution_note && (
              <div className="ml-5 mt-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
                <p className="text-xs font-medium text-neutral-500">
                  Resolution Note
                </p>
                <p className="mt-1 text-sm text-neutral-700">
                  {incident.resolution_note}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Details ----------------------------------------------------- */}
          <div className="px-6 py-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Details
            </h3>

            <DetailRow label="Type">{incident.incident_type}</DetailRow>
            {incident.route_id && (
              <DetailRow label="Route">
                <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">
                  {incident.route_id}
                </code>
              </DetailRow>
            )}
            <DetailRow label="Incident ID">
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">
                {incident.id}
              </code>
            </DetailRow>
            <DetailRow label="Last Updated">
              <RelativeTime date={incident.updated_at} />
            </DetailRow>

            {/* Kill-switch indicator */}
            <div className="mt-1 flex items-center justify-between py-2">
              <span className="text-sm text-neutral-500">Kill Switch</span>
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {incident.killswitch_activated ? (
                  <>
                    <Zap className="size-3.5 text-red-500" />
                    <span className="text-red-600">Activated</span>
                  </>
                ) : (
                  <>
                    <ZapOff className="size-3.5 text-neutral-400" />
                    <span className="text-neutral-500">Inactive</span>
                  </>
                )}
              </span>
            </div>
          </div>

          <Separator />

          {/* Trigger Data ----------------------------------------------- */}
          <div className="px-6 py-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Trigger Data
            </h3>
            <CodeBlock
              code={JSON.stringify(incident.trigger_data, null, 2)}
              className="max-h-64 overflow-y-auto"
            />
          </div>

          {/* Resolve form (inline) -------------------------------------- */}
          {showResolveForm && (
            <>
              <Separator />
              <div className="px-6 py-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Resolve Incident
                </h3>
                <Textarea
                  placeholder="Describe how this incident was resolved..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="mb-3 min-h-24"
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleResolve}>
                    <CheckCircle2 className="size-4" />
                    Confirm Resolution
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowResolveForm(false);
                      setResolutionNote("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Sticky footer with action buttons                                */}
        {/* ---------------------------------------------------------------- */}
        <div className="sticky bottom-0 border-t border-neutral-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {canAcknowledge && onAcknowledge && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAcknowledge}
              >
                <Eye className="size-4" />
                Acknowledge
              </Button>
            )}

            {canResolve && onResolve && !showResolveForm && (
              <Button
                size="sm"
                variant="default"
                onClick={() => setShowResolveForm(true)}
              >
                <CheckCircle2 className="size-4" />
                Resolve
              </Button>
            )}

            {onDisableRoute && incident.route_id && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDisableRoute(incident.id)}
              >
                <OctagonX className="size-4" />
                Disable Route
              </Button>
            )}

            {incident.killswitch_activated && onDeactivateKillSwitch && (
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => onDeactivateKillSwitch(incident.id)}
              >
                <ShieldOff className="size-4" />
                Deactivate Kill Switch
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
