"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatLatency, formatTokens } from "@/lib/formatters";
import {
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Minus,
  Clock,
  DollarSign,
  Hash,
  Cpu,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReplayComparisonData {
  original: {
    id: string;
    request_id: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    total_cost_usd: number;
    duration_ms: number;
    status: string;
    response_content: string | null;
  };
  replay: {
    id: string;
    request_id: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    total_cost_usd: number;
    duration_ms: number;
    status: string;
    response_content: string | null;
  };
  deltas: {
    cost_usd: number;
    duration_ms: number;
    input_tokens: number;
    output_tokens: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DeltaDirection = "improvement" | "regression" | "neutral";

function getDeltaDirection(
  value: number,
  lowerIsBetter: boolean
): DeltaDirection {
  if (value === 0) return "neutral";
  if (lowerIsBetter) return value < 0 ? "improvement" : "regression";
  return value > 0 ? "improvement" : "regression";
}

function DeltaIndicator({
  value,
  formatted,
  lowerIsBetter,
}: {
  value: number;
  formatted: string;
  lowerIsBetter: boolean;
}) {
  const direction = getDeltaDirection(value, lowerIsBetter);

  const colorClass =
    direction === "improvement"
      ? "text-green-600"
      : direction === "regression"
        ? "text-red-600"
        : "text-neutral-400";

  const Icon =
    direction === "improvement"
      ? ArrowDown
      : direction === "regression"
        ? ArrowUp
        : Minus;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${colorClass}`}>
      <Icon className="size-3" />
      {formatted}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Metric Row
// ---------------------------------------------------------------------------

function MetricRow({
  icon: Icon,
  label,
  originalValue,
  replayValue,
  delta,
}: {
  icon: React.ElementType;
  label: string;
  originalValue: React.ReactNode;
  replayValue: React.ReactNode;
  delta: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 py-2.5">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 shrink-0 text-neutral-400" />
        <div>
          <p className="text-xs text-neutral-500">{label}</p>
          <p className="text-sm font-semibold text-neutral-900">
            {originalValue}
          </p>
        </div>
      </div>

      <ArrowRight className="size-3.5 text-neutral-300" />

      <div>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-sm font-semibold text-neutral-900">{replayValue}</p>
      </div>

      <div className="text-right">{delta}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ReplayComparisonProps {
  comparison: ReplayComparisonData;
}

export function ReplayComparison({ comparison }: ReplayComparisonProps) {
  const { original, replay, deltas } = comparison;

  return (
    <div className="space-y-4">
      {/* Header badges */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="text-center">
          <Badge variant="outline" className="text-xs">
            Original
          </Badge>
        </div>
        <div />
        <div className="text-center">
          <Badge variant="secondary" className="text-xs">
            Replay
          </Badge>
        </div>
      </div>

      {/* Metric comparison card */}
      <Card className="py-0">
        <CardHeader className="pb-0 pt-4">
          <CardTitle className="text-sm">Comparison Metrics</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="divide-y divide-neutral-100">
            {/* Model */}
            <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 py-2.5">
              <div className="flex items-center gap-2">
                <Cpu className="size-3.5 shrink-0 text-neutral-400" />
                <div>
                  <p className="text-xs text-neutral-500">Model</p>
                  <p className="text-sm font-semibold text-neutral-900">
                    {original.model}
                  </p>
                </div>
              </div>
              <ArrowRight className="size-3.5 text-neutral-300" />
              <div>
                <p className="text-xs text-neutral-500">Model</p>
                <p className="text-sm font-semibold text-neutral-900">
                  {replay.model}
                </p>
              </div>
              <div className="text-right">
                {original.model === replay.model ? (
                  <span className="text-xs text-neutral-400">Same</span>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Changed
                  </Badge>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="size-3.5" />
                <div>
                  <p className="text-xs text-neutral-500">Status</p>
                  <StatusBadge status={original.status} />
                </div>
              </div>
              <ArrowRight className="size-3.5 text-neutral-300" />
              <div>
                <p className="text-xs text-neutral-500">Status</p>
                <StatusBadge status={replay.status} />
              </div>
              <div />
            </div>

            {/* Cost */}
            <MetricRow
              icon={DollarSign}
              label="Cost"
              originalValue={formatCurrency(original.total_cost_usd, {
                decimals: 6,
              })}
              replayValue={formatCurrency(replay.total_cost_usd, {
                decimals: 6,
              })}
              delta={
                <DeltaIndicator
                  value={deltas.cost_usd}
                  formatted={formatCurrency(Math.abs(deltas.cost_usd), {
                    decimals: 6,
                  })}
                  lowerIsBetter
                />
              }
            />

            {/* Latency */}
            <MetricRow
              icon={Clock}
              label="Latency"
              originalValue={formatLatency(original.duration_ms)}
              replayValue={formatLatency(replay.duration_ms)}
              delta={
                <DeltaIndicator
                  value={deltas.duration_ms}
                  formatted={formatLatency(Math.abs(deltas.duration_ms))}
                  lowerIsBetter
                />
              }
            />

            {/* Input tokens */}
            <MetricRow
              icon={Hash}
              label="Input tokens"
              originalValue={formatTokens(original.input_tokens)}
              replayValue={formatTokens(replay.input_tokens)}
              delta={
                <DeltaIndicator
                  value={deltas.input_tokens}
                  formatted={formatTokens(Math.abs(deltas.input_tokens))}
                  lowerIsBetter
                />
              }
            />

            {/* Output tokens */}
            <MetricRow
              icon={Hash}
              label="Output tokens"
              originalValue={formatTokens(original.output_tokens)}
              replayValue={formatTokens(replay.output_tokens)}
              delta={
                <DeltaIndicator
                  value={deltas.output_tokens}
                  formatted={formatTokens(Math.abs(deltas.output_tokens))}
                  lowerIsBetter={false}
                />
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Response content diff */}
      {(original.response_content || replay.response_content) && (
        <Card className="py-0">
          <CardHeader className="pb-0 pt-4">
            <CardTitle className="text-sm">Response Content</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Original response */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-neutral-500">
                  Original
                </p>
                <ScrollArea className="h-48 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                  <pre className="whitespace-pre-wrap text-xs text-neutral-700">
                    {original.response_content || "(no content)"}
                  </pre>
                </ScrollArea>
              </div>

              {/* Replay response */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-neutral-500">
                  Replay
                </p>
                <ScrollArea className="h-48 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                  <pre className="whitespace-pre-wrap text-xs text-neutral-700">
                    {replay.response_content || "(no content)"}
                  </pre>
                </ScrollArea>
              </div>
            </div>

            {/* Content match indicator */}
            {original.response_content &&
              replay.response_content && (
                <div className="mt-3 flex items-center gap-2">
                  {original.response_content === replay.response_content ? (
                    <Badge
                      variant="outline"
                      className="border-green-200 bg-green-50 text-green-700"
                    >
                      Responses match
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-200 bg-amber-50 text-amber-700"
                    >
                      Responses differ
                    </Badge>
                  )}
                </div>
              )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
