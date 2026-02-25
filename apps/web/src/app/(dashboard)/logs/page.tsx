"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppContext } from "@/providers/context-provider";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TruncatedId } from "@/components/shared/truncated-id";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Radio,
  Search,
  Pause,
  Play,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { formatCurrency, formatLatency } from "@/lib/formatters";

interface LogEntry {
  id: string;
  request_id: string;
  model_identifier: string;
  total_cost_usd: number;
  duration_ms: number | null;
  status: string;
  created_at: string;
}

const MAX_ENTRIES = 200;

export default function LogsPage() {
  const { currentOrg, currentProject, currentEnv } = useAppContext();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const hasEnv = !!(currentOrg && currentProject && currentEnv);

  const connectSSE = useCallback(() => {
    if (!currentOrg || !currentProject || !currentEnv) return;

    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);

    const url = `/api/v1/organizations/${currentOrg.id}/projects/${currentProject.id}/environments/${currentEnv.id}/logs/stream?${params}`;

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === "request") {
          setEntries((prev) => {
            const next = [parsed.data as LogEntry, ...prev];
            return next.slice(0, MAX_ENTRIES);
          });
        }
      } catch {
        // Ignore malformed events
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Attempt reconnect after 5 seconds
      setTimeout(() => {
        if (isStreaming) {
          connectSSE();
        }
      }, 5000);
    };
  }, [currentOrg, currentProject, currentEnv, statusFilter, isStreaming]);

  // Connect/disconnect based on streaming state
  useEffect(() => {
    if (isStreaming && hasEnv) {
      connectSSE();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setConnected(false);
      }
    };
  }, [isStreaming, hasEnv, connectSSE]);

  // Auto-scroll to top when new entries arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [entries.length, autoScroll]);

  const toggleStreaming = () => {
    if (isStreaming) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setConnected(false);
      }
    }
    setIsStreaming((prev) => !prev);
  };

  const filteredEntries = entries.filter((entry) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !entry.request_id.toLowerCase().includes(q) &&
        !entry.model_identifier.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const formatTimestamp = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Logs"
        description="Real-time streaming view of inference requests."
        action={
          hasEnv ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    connected
                      ? "bg-green-500 animate-pulse"
                      : "bg-neutral-300"
                  }`}
                />
                <span className="text-xs text-neutral-500">
                  {connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoScroll((prev) => !prev)}
                className="gap-2"
              >
                {autoScroll ? (
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                ) : (
                  <ArrowUpFromLine className="h-3.5 w-3.5" />
                )}
                {autoScroll ? "Auto-scroll on" : "Auto-scroll off"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleStreaming}
                className="gap-2"
              >
                {isStreaming ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {isStreaming ? "Pause" : "Resume"}
              </Button>
            </div>
          ) : undefined
        }
      />

      {!hasEnv ? (
        <EmptyState
          icon={<Radio className="h-10 w-10" />}
          title="Select an environment"
          description="Choose an organization, project, and environment from the top bar to stream live logs."
        />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder="Search by trace ID or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setEntries([]);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="timeout">Timeout</SelectItem>
                <SelectItem value="budget_blocked">Budget blocked</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-neutral-500">
              {filteredEntries.length} entries
            </span>
          </div>

          {filteredEntries.length === 0 ? (
            <EmptyState
              icon={<Radio className="h-10 w-10" />}
              title="Waiting for requests..."
              description="Live log entries will appear here as inference requests flow through the gateway."
            />
          ) : (
            <div
              ref={scrollRef}
              className="max-h-[calc(100vh-280px)] overflow-y-auto rounded-lg border border-neutral-200 bg-white"
            >
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Time
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Trace ID
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Model
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Cost
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Latency
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-neutral-50 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-sm font-mono text-neutral-600">
                        {formatTimestamp(entry.created_at)}
                      </td>
                      <td className="px-4 py-2.5">
                        <TruncatedId id={entry.request_id} />
                      </td>
                      <td className="px-4 py-2.5 text-sm font-medium text-neutral-900">
                        {entry.model_identifier}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm font-medium text-neutral-900">
                        {formatCurrency(entry.total_cost_usd, { decimals: 6 })}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-neutral-600">
                        {entry.duration_ms
                          ? formatLatency(entry.duration_ms)
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={entry.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
