"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppContext } from "@/providers/context-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Send,
  Loader2,
  Bot,
  User,
  DollarSign,
  Clock,
  Hash,
  Trash2,
  History,
  RotateCcw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ---------- Types ----------

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ResponseMeta {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
}

interface PlaygroundSession {
  id: string;
  model: string;
  messages: ChatMessage[];
  meta: ResponseMeta | null;
  timestamp: number;
}

interface ModelRow {
  id: string;
  model_id: string;
  display_name: string;
  context_window: number;
  input_price_per_token: number;
  output_price_per_token: number;
  providers: {
    id: string;
    name: string;
    display_name: string;
    provider_type: string;
  };
}

interface RouteRow {
  id: string;
  name: string;
  slug: string;
  allowed_models: string[];
}

// ---------- Helpers ----------

function estimateTokens(text: string): number {
  // Rough estimation: ~4 chars per token for English text
  return Math.ceil(text.length / 4);
}

function estimateCost(
  promptTokens: number,
  maxCompletionTokens: number,
  inputPrice: number,
  outputPrice: number
): number {
  return promptTokens * inputPrice + maxCompletionTokens * outputPrice;
}

function formatCost(cost: number): string {
  if (cost < 0.001) return "<$0.001";
  return `$${cost.toFixed(4)}`;
}

function generateSessionId(): string {
  return `pg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Page ----------

export default function PlaygroundPage() {
  const { currentOrg } = useAppContext();

  // Config state
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [topP, setTopP] = useState(1.0);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [responseMeta, setResponseMeta] = useState<ResponseMeta | null>(null);

  // Session history
  const [sessions, setSessions] = useState<PlaygroundSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Load sessions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("openfive_playground_sessions");
      if (stored) setSessions(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // --- Queries ---

  const orgId = currentOrg?.id;

  const { data: models = [] } = useQuery({
    queryKey: ["models", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const res = await fetch(`/api/v1/organizations/${orgId}/models`);
      if (!res.ok) return [];
      return res.json() as Promise<ModelRow[]>;
    },
    enabled: !!orgId,
  });

  const { data: routes = [] } = useQuery({
    queryKey: ["routes", orgId],
    queryFn: async () => {
      // Routes require env context, but for playground we just list all org routes
      // In a real scenario this would be scoped to env
      return [] as RouteRow[];
    },
    enabled: !!orgId,
  });

  // --- Derived values ---

  const currentModel = models.find((m) => m.model_id === selectedModel);
  const totalPromptTokens = estimateTokens(
    systemPrompt +
      messages.map((m) => m.content).join("") +
      input
  );

  const estimatedCost = currentModel
    ? estimateCost(
        totalPromptTokens,
        maxTokens,
        currentModel.input_price_per_token || 0,
        currentModel.output_price_per_token || 0
      )
    : 0;

  // --- Handlers ---

  const saveSession = useCallback(
    (msgs: ChatMessage[], meta: ResponseMeta | null) => {
      const session: PlaygroundSession = {
        id: generateSessionId(),
        model: selectedModel,
        messages: msgs,
        meta,
        timestamp: Date.now(),
      };
      const updated = [session, ...sessions].slice(0, 20);
      setSessions(updated);
      try {
        localStorage.setItem(
          "openfive_playground_sessions",
          JSON.stringify(updated)
        );
      } catch {
        // ignore quota errors
      }
    },
    [selectedModel, sessions]
  );

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;
    if (!selectedModel) {
      toast.error("Please select a model first");
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const allMessages: ChatMessage[] = [];

    if (systemPrompt.trim()) {
      allMessages.push({ role: "system", content: systemPrompt.trim() });
    }
    allMessages.push(...messages, userMessage);

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");
    setResponseMeta(null);

    const abortController = new AbortController();
    abortRef.current = abortController;

    const startTime = Date.now();

    try {
      const res = await fetch("/api/v1/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: allMessages,
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
          stream: true,
          ...(selectedRoute ? { route_id: selectedRoute } : {}),
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: "Request failed" } }));
        throw new Error(err?.error?.message || `Error ${res.status}`);
      }

      if (!res.body) {
        throw new Error("No response body");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let metaModel = selectedModel;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);

          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);

            // Meta event from our proxy
            if (parsed.type === "meta") {
              metaModel = parsed.model || selectedModel;
              continue;
            }

            // Standard OpenAI SSE chunk
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              accumulated += delta.content;
              setStreamingContent(accumulated);
            }

            // Check for usage info in the final chunk
            if (parsed.usage) {
              const latencyMs = Date.now() - startTime;
              const promptTok = parsed.usage.prompt_tokens || 0;
              const completionTok = parsed.usage.completion_tokens || 0;
              const totalTok = parsed.usage.total_tokens || promptTok + completionTok;
              const cost = currentModel
                ? promptTok * (currentModel.input_price_per_token || 0) +
                  completionTok * (currentModel.output_price_per_token || 0)
                : 0;

              setResponseMeta({
                model: metaModel,
                promptTokens: promptTok,
                completionTokens: completionTok,
                totalTokens: totalTok,
                cost,
                latencyMs,
              });
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }

      // Finalize
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: accumulated,
      };
      const finalMessages = [...messages, userMessage, assistantMessage];
      setMessages(finalMessages);
      setStreamingContent("");

      // Build response meta if not received from usage
      const latencyMs = Date.now() - startTime;
      const estimatedPromptTok = estimateTokens(
        allMessages.map((m) => m.content).join("")
      );
      const estimatedCompletionTok = estimateTokens(accumulated);

      const meta: ResponseMeta = responseMeta || {
        model: metaModel,
        promptTokens: estimatedPromptTok,
        completionTokens: estimatedCompletionTok,
        totalTokens: estimatedPromptTok + estimatedCompletionTok,
        cost: currentModel
          ? estimatedPromptTok * (currentModel.input_price_per_token || 0) +
            estimatedCompletionTok * (currentModel.output_price_per_token || 0)
          : 0,
        latencyMs,
      };

      setResponseMeta(meta);
      saveSession(finalMessages, meta);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // User cancelled
        if (streamingContent) {
          const assistantMessage: ChatMessage = {
            role: "assistant",
            content: streamingContent + " [cancelled]",
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } else {
        toast.error((err as Error).message || "Failed to get response");
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [
    input,
    isStreaming,
    selectedModel,
    selectedRoute,
    systemPrompt,
    messages,
    temperature,
    maxTokens,
    topP,
    currentModel,
    responseMeta,
    streamingContent,
    saveSession,
  ]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setStreamingContent("");
    setResponseMeta(null);
  }, []);

  const handleLoadSession = useCallback(
    (session: PlaygroundSession) => {
      setSelectedModel(session.model);
      setMessages(session.messages.filter((m) => m.role !== "system"));
      const sysMsg = session.messages.find((m) => m.role === "system");
      if (sysMsg) setSystemPrompt(sysMsg.content);
      setResponseMeta(session.meta);
      setShowHistory(false);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex-none px-6 pt-6">
        <PageHeader
          title="Playground"
          description="Test models and routes with an interactive chat interface."
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(true)}
              >
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
              {messages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearChat}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* --- Left Panel: Configuration --- */}
        <div className="flex w-80 flex-none flex-col border-r border-neutral-200 bg-neutral-50/50">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-5">
              {/* Model selector */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Model
                </Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.model_id} value={m.model_id}>
                        <div className="flex flex-col">
                          <span>{m.display_name}</span>
                          <span className="text-xs text-neutral-400">
                            {m.providers?.display_name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    {models.length === 0 && (
                      <SelectItem value="_none" disabled>
                        No models available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Route selector (optional) */}
              {routes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Route (optional)
                  </Label>
                  <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                    <SelectTrigger>
                      <SelectValue placeholder="No route" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No route</SelectItem>
                      {routes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              {/* System prompt */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  System Prompt
                </Label>
                <Textarea
                  placeholder="You are a helpful assistant..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                  className="resize-none text-sm"
                />
              </div>

              <Separator />

              {/* Temperature */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Temperature
                  </Label>
                  <span className="text-xs font-mono text-neutral-600">
                    {temperature.toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={[temperature]}
                  onValueChange={([v]) => setTemperature(v)}
                  min={0}
                  max={2}
                  step={0.01}
                />
              </div>

              {/* Max tokens */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Max Tokens
                  </Label>
                  <span className="text-xs font-mono text-neutral-600">
                    {maxTokens}
                  </span>
                </div>
                <Slider
                  value={[maxTokens]}
                  onValueChange={([v]) => setMaxTokens(v)}
                  min={1}
                  max={16384}
                  step={1}
                />
                <Input
                  type="number"
                  value={maxTokens}
                  onChange={(e) =>
                    setMaxTokens(
                      Math.min(128000, Math.max(1, parseInt(e.target.value, 10) || 1))
                    )
                  }
                  className="h-7 text-xs"
                />
              </div>

              {/* Top P */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Top P
                  </Label>
                  <span className="text-xs font-mono text-neutral-600">
                    {topP.toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={[topP]}
                  onValueChange={([v]) => setTopP(v)}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </div>

              <Separator />

              {/* Pre-send estimates */}
              <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Estimates
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-neutral-500">
                      <Hash className="h-3 w-3" />
                      Prompt tokens
                    </span>
                    <span className="font-mono text-neutral-700">
                      ~{totalPromptTokens}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-neutral-500">
                      <DollarSign className="h-3 w-3" />
                      Est. cost
                    </span>
                    <span className="font-mono text-neutral-700">
                      {estimatedCost > 0 ? formatCost(estimatedCost) : "--"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* --- Right Panel: Chat --- */}
        <div className="flex flex-1 flex-col">
          {/* Messages area */}
          <ScrollArea className="flex-1">
            <div className="mx-auto max-w-3xl space-y-4 p-6">
              {messages.length === 0 && !isStreaming && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 rounded-full bg-neutral-100 p-4">
                    <Zap className="h-8 w-8 text-neutral-400" />
                  </div>
                  <h3 className="text-sm font-medium text-neutral-900">
                    Start a conversation
                  </h3>
                  <p className="mt-1 max-w-sm text-sm text-neutral-500">
                    Select a model from the left panel and type a message to begin.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${
                    msg.role === "assistant" ? "" : "flex-row-reverse"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${
                      msg.role === "assistant"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Bot className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "assistant"
                        ? "bg-white border border-neutral-200 text-neutral-800"
                        : "bg-neutral-900 text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {/* Streaming message */}
              {isStreaming && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="max-w-[80%] rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm leading-relaxed text-neutral-800">
                    {streamingContent ? (
                      <p className="whitespace-pre-wrap">
                        {streamingContent}
                        <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-blue-500" />
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 text-neutral-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Response meta bar */}
          {responseMeta && (
            <div className="flex items-center gap-4 border-t border-neutral-200 bg-neutral-50 px-6 py-2 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <Bot className="h-3 w-3" />
                {responseMeta.model}
              </span>
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {responseMeta.promptTokens} + {responseMeta.completionTokens} ={" "}
                {responseMeta.totalTokens} tokens
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatCost(responseMeta.cost)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {responseMeta.latencyMs}ms
              </span>
            </div>
          )}

          {/* Input area */}
          <div className="border-t border-neutral-200 bg-white p-4">
            <div className="mx-auto flex max-w-3xl gap-2">
              <Textarea
                ref={inputRef}
                placeholder={
                  selectedModel
                    ? "Type your message... (Shift+Enter for new line)"
                    : "Select a model to start..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!selectedModel || isStreaming}
                rows={2}
                className="min-h-[2.5rem] resize-none text-sm"
              />
              {isStreaming ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-auto self-end px-3"
                  onClick={handleStop}
                >
                  Stop
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-auto self-end px-3"
                  disabled={!input.trim() || !selectedModel}
                  onClick={handleSend}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- History Sidebar --- */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Session History</SheetTitle>
            <SheetDescription>
              Recent playground sessions stored locally in your browser.
            </SheetDescription>
          </SheetHeader>
          <Separator />
          <ScrollArea className="flex-1 px-4">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <History className="mb-2 h-8 w-8 text-neutral-300" />
                <p className="text-sm text-neutral-500">No sessions yet</p>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                {sessions.map((session) => {
                  const lastUserMsg = [...session.messages]
                    .reverse()
                    .find((m) => m.role === "user");
                  return (
                    <Card
                      key={session.id}
                      className="cursor-pointer transition-colors hover:bg-neutral-50"
                      onClick={() => handleLoadSession(session)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-neutral-800">
                              {lastUserMsg?.content.slice(0, 60) || "Empty session"}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="text-xs"
                              >
                                {session.model}
                              </Badge>
                              <span className="text-xs text-neutral-400">
                                {new Date(session.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {session.meta && (
                              <div className="mt-1 flex gap-3 text-xs text-neutral-400">
                                <span>{session.meta.totalTokens} tokens</span>
                                <span>{formatCost(session.meta.cost)}</span>
                                <span>{session.meta.latencyMs}ms</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {sessions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => {
                      setSessions([]);
                      localStorage.removeItem("openfive_playground_sessions");
                      toast.success("History cleared");
                    }}
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Clear all history
                  </Button>
                )}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
