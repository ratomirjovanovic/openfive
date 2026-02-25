"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { CodeBlock } from "@/components/shared/code-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Book,
  Key,
  Route,
  Send,
  BarChart3,
  ChevronRight,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  MessageSquare,
  Server,
  Shield,
  Zap,
} from "lucide-react";
import spec from "../../../../public/openapi.json";

// ---------------------------------------------------------------------------
// Types extracted from the spec
// ---------------------------------------------------------------------------
interface SchemaProperty {
  type?: string;
  description?: string;
  enum?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  examples?: unknown[];
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  oneOf?: SchemaProperty[];
  $ref?: string;
}

interface ParameterDef {
  name: string;
  in: string;
  description?: string;
  schema?: SchemaProperty;
  required?: boolean;
}

interface EndpointDef {
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterDef[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: SchemaProperty; examples?: Record<string, { summary?: string; value: unknown }> }>;
  };
  responses?: Record<string, { description?: string; content?: Record<string, { schema?: SchemaProperty }> }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveRef(ref: string): SchemaProperty | null {
  const parts = ref.replace("#/", "").split("/");
  let current: unknown = spec;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }
  return current as SchemaProperty;
}

function getSchemaProperties(schema: SchemaProperty): Record<string, SchemaProperty> {
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref);
    return resolved?.properties || {};
  }
  return schema.properties || {};
}

function getRequiredFields(schema: SchemaProperty): string[] {
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref);
    return resolved?.required || [];
  }
  return schema.required || [];
}

function flattenEndpoints(): EndpointDef[] {
  const endpoints: EndpointDef[] = [];
  const paths = spec.paths as Record<string, Record<string, unknown>>;
  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, def] of Object.entries(methods)) {
      if (["get", "post", "put", "patch", "delete"].includes(method)) {
        endpoints.push({ method: method.toUpperCase(), path, ...(def as Omit<EndpointDef, "method" | "path">) });
      }
    }
  }
  return endpoints;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-800 border-emerald-200",
  POST: "bg-blue-100 text-blue-800 border-blue-200",
  PUT: "bg-amber-100 text-amber-800 border-amber-200",
  PATCH: "bg-orange-100 text-orange-800 border-orange-200",
  DELETE: "bg-red-100 text-red-800 border-red-200",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${METHOD_COLORS[method] || "bg-neutral-100 text-neutral-700"}`}
    >
      {method}
    </span>
  );
}

function PropertyRow({
  name,
  prop,
  required,
  depth = 0,
}: {
  name: string;
  prop: SchemaProperty;
  required: boolean;
  depth?: number;
}) {
  const resolved = prop.$ref ? resolveRef(prop.$ref) : prop;
  if (!resolved) return null;

  const typeLabel = resolved.enum
    ? resolved.enum.map((e) => `"${e}"`).join(" | ")
    : resolved.type || "any";

  return (
    <div
      className="flex items-start gap-3 border-b border-neutral-100 py-3 last:border-0"
      style={{ paddingLeft: depth * 16 }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <code className="text-sm font-semibold text-neutral-900">{name}</code>
          <span className="text-xs text-neutral-400">{typeLabel}</span>
          {required && (
            <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
              required
            </span>
          )}
          {resolved.default !== undefined && (
            <span className="text-xs text-neutral-400">
              default: {JSON.stringify(resolved.default)}
            </span>
          )}
        </div>
        {resolved.description && (
          <p className="mt-0.5 text-xs text-neutral-500 leading-relaxed">{resolved.description}</p>
        )}
      </div>
    </div>
  );
}

function SchemaPanel({ schema, title }: { schema: SchemaProperty; title: string }) {
  const properties = getSchemaProperties(schema);
  const required = getRequiredFields(schema);

  if (Object.keys(properties).length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{title}</h4>
      <div className="rounded-lg border border-neutral-200 bg-white">
        {Object.entries(properties).map(([name, prop]) => (
          <PropertyRow key={name} name={name} prop={prop} required={required.includes(name)} />
        ))}
      </div>
    </div>
  );
}

function ExampleCodes({ baseUrl }: { baseUrl: string }) {
  const curlCode = `curl -X POST ${baseUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "auto",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ]
  }'`;

  const pythonCode = `from openai import OpenAI

client = OpenAI(
    base_url="${baseUrl}/v1",
    api_key="YOUR_API_KEY",
)

response = client.chat.completions.create(
    model="auto",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello!"},
    ],
)

print(response.choices[0].message.content)`;

  const tsCode = `import OpenFive from "@openfive/sdk";

const client = new OpenFive({
  apiKey: "YOUR_API_KEY",
  baseUrl: "${baseUrl}",
});

const response = await client.chat.completions.create({
  model: "auto",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello!" },
  ],
});

console.log(response.choices[0].message.content);`;

  return (
    <Tabs defaultValue="curl">
      <TabsList>
        <TabsTrigger value="curl">curl</TabsTrigger>
        <TabsTrigger value="python">Python</TabsTrigger>
        <TabsTrigger value="typescript">TypeScript</TabsTrigger>
      </TabsList>
      <TabsContent value="curl">
        <CodeBlock code={curlCode} language="bash" />
      </TabsContent>
      <TabsContent value="python">
        <CodeBlock code={pythonCode} language="python" />
      </TabsContent>
      <TabsContent value="typescript">
        <CodeBlock code={tsCode} language="typescript" />
      </TabsContent>
    </Tabs>
  );
}

function TryItPanel({ endpoint }: { endpoint: EndpointDef }) {
  const [apiKey, setApiKey] = useState("");
  const [body, setBody] = useState(() => {
    const examples =
      endpoint.requestBody?.content?.["application/json"]?.examples;
    if (examples) {
      const first = Object.values(examples)[0];
      return JSON.stringify(first?.value, null, 2);
    }
    return "{}";
  });
  const [baseUrl, setBaseUrl] = useState(spec.servers[0]?.url || "http://localhost:8787");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);

  const handleSend = useCallback(async () => {
    setLoading(true);
    setResponse(null);
    setStatus(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const url = `${baseUrl}${endpoint.path}`;
      const fetchOpts: RequestInit = {
        method: endpoint.method,
        headers,
      };
      if (endpoint.method !== "GET") {
        fetchOpts.body = body;
      }

      const res = await fetch(url, fetchOpts);
      setStatus(res.status);
      const text = await res.text();
      try {
        setResponse(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResponse(text);
      }
    } catch (err) {
      setResponse(`Error: ${err instanceof Error ? err.message : "Request failed"}`);
      setStatus(0);
    } finally {
      setLoading(false);
    }
  }, [apiKey, body, baseUrl, endpoint]);

  return (
    <Card className="border-neutral-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Play className="h-4 w-4" />
          Try it out
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Base URL</Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="font-mono text-xs"
              placeholder="http://localhost:8787"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">API Key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono text-xs"
              placeholder="sk-..."
            />
          </div>
        </div>

        {endpoint.method !== "GET" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Request Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[160px] font-mono text-xs"
            />
          </div>
        )}

        <Button onClick={handleSend} disabled={loading} size="sm" className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-3 w-3" />
              Send Request
            </>
          )}
        </Button>

        {response !== null && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Response</Label>
              {status !== null && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    status >= 200 && status < 300
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {status >= 200 && status < 300 ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {status === 0 ? "Network Error" : status}
                </span>
              )}
            </div>
            <CodeBlock code={response} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EndpointDetail({ endpoint }: { endpoint: EndpointDef }) {
  const reqSchema =
    endpoint.requestBody?.content?.["application/json"]?.schema;
  const successRes = endpoint.responses?.["200"];
  const resSchema =
    successRes?.content?.["application/json"]?.schema;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <MethodBadge method={endpoint.method} />
          <code className="text-lg font-semibold text-neutral-900">{endpoint.path}</code>
        </div>
        <h2 className="mt-2 text-xl font-semibold text-neutral-900">{endpoint.summary}</h2>
        {endpoint.description && (
          <p className="mt-2 text-sm text-neutral-600 leading-relaxed max-w-2xl whitespace-pre-line">
            {endpoint.description}
          </p>
        )}
      </div>

      {/* Custom Headers */}
      {endpoint.parameters && endpoint.parameters.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Custom Headers
          </h4>
          <div className="rounded-lg border border-neutral-200 bg-white">
            {endpoint.parameters.map((param) => (
              <div key={param.name} className="flex items-start gap-3 border-b border-neutral-100 py-3 px-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-semibold text-neutral-900">{param.name}</code>
                    <span className="text-xs text-neutral-400">{param.schema?.type || "string"}</span>
                    <span className="text-xs text-neutral-400">({param.in})</span>
                  </div>
                  {param.description && (
                    <p className="mt-0.5 text-xs text-neutral-500">{param.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Body */}
      {reqSchema && <SchemaPanel schema={reqSchema} title="Request Body" />}

      {/* Response */}
      {resSchema && <SchemaPanel schema={resSchema} title="Response (200)" />}

      {/* Error Responses */}
      {endpoint.responses && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Error Responses
          </h4>
          <div className="rounded-lg border border-neutral-200 bg-white">
            {Object.entries(endpoint.responses)
              .filter(([code]) => code !== "200")
              .map(([code, res]) => (
                <div key={code} className="flex items-center gap-3 border-b border-neutral-100 px-3 py-2.5 last:border-0">
                  <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">{code}</span>
                  <span className="text-sm text-neutral-600">{res.description}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Code Examples */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Code Examples
        </h4>
        <ExampleCodes baseUrl={spec.servers[0]?.url || "http://localhost:8787"} />
      </div>

      {/* Try It */}
      <TryItPanel endpoint={endpoint} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function DocSidebar({
  endpoints,
  activeId,
  onSelect,
  activeSection,
  onSectionSelect,
}: {
  endpoints: EndpointDef[];
  activeId: string | null;
  onSelect: (id: string) => void;
  activeSection: string;
  onSectionSelect: (section: string) => void;
}) {
  return (
    <nav className="space-y-6">
      <div className="space-y-1">
        <h3 className="px-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          Getting Started
        </h3>
        <button
          onClick={() => onSectionSelect("quickstart")}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
            activeSection === "quickstart"
              ? "bg-neutral-100 font-medium text-neutral-900"
              : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          Quick Start
        </button>
        <button
          onClick={() => onSectionSelect("authentication")}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
            activeSection === "authentication"
              ? "bg-neutral-100 font-medium text-neutral-900"
              : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          Authentication
        </button>
      </div>

      <div className="space-y-1">
        <h3 className="px-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          Endpoints
        </h3>
        {endpoints.map((ep) => {
          const id = `${ep.method}-${ep.path}`;
          return (
            <button
              key={id}
              onClick={() => {
                onSelect(id);
                onSectionSelect("endpoint");
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                activeId === id && activeSection === "endpoint"
                  ? "bg-neutral-100 font-medium text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              <MethodBadge method={ep.method} />
              <span className="truncate font-mono text-xs">{ep.path}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
        <h3 className="px-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          Schemas
        </h3>
        {Object.keys(spec.components.schemas).map((name) => (
          <button
            key={name}
            onClick={() => {
              onSelect(name);
              onSectionSelect("schema");
            }}
            className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
              activeId === name && activeSection === "schema"
                ? "bg-neutral-100 font-medium text-neutral-900"
                : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
            <span className="truncate">{name}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Quick Start Section
// ---------------------------------------------------------------------------

function QuickStartSection() {
  const steps = [
    {
      num: 1,
      icon: Key,
      title: "Create an API key",
      description:
        'Navigate to Settings > API Keys in the dashboard and create a new key. Choose the environment and (optionally) restrict it to specific routes.',
    },
    {
      num: 2,
      icon: Route,
      title: "Configure a route",
      description:
        "Routes define how requests are handled -- which models to use, cost/latency weights, budget limits, and guardrails. Create a route in the Routes page.",
    },
    {
      num: 3,
      icon: Send,
      title: "Send your first request",
      description:
        'Use the OpenAI-compatible endpoint with your API key. Set the model to "auto" to let the gateway choose the optimal model, or specify one directly.',
    },
    {
      num: 4,
      icon: BarChart3,
      title: "View results in dashboard",
      description:
        "Every request is logged with cost, latency, model used, and token counts. View real-time analytics in the Overview and Requests pages.",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900">Quick Start Guide</h2>
        <p className="mt-2 text-sm text-neutral-600 leading-relaxed max-w-2xl">
          Get up and running with OpenFive in four simple steps. The gateway acts as a drop-in
          replacement for the OpenAI API, so you can use any existing OpenAI SDK or tool.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((step) => (
          <Card key={step.num} className="relative overflow-hidden border-neutral-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-sm font-bold text-white">
                  {step.num}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-neutral-900">{step.title}</h3>
                  <p className="mt-1 text-xs text-neutral-500 leading-relaxed">{step.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900">Your first request</h3>
        <p className="text-sm text-neutral-600">
          The gateway is fully compatible with the OpenAI Chat Completions API. Simply point your SDK at the
          gateway URL and use your OpenFive API key.
        </p>
        <ExampleCodes baseUrl={spec.servers[0]?.url || "http://localhost:8787"} />
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900">Custom Headers</h3>
        <p className="text-sm text-neutral-600">
          OpenFive extends the standard API with custom headers for routing, cost control, and tracing.
        </p>
        <div className="rounded-lg border border-neutral-200 bg-white">
          {[
            { name: "x-route-id", desc: "Override the default route for this request" },
            { name: "x-agent-id", desc: "Identify the calling agent or service for analytics" },
            { name: "x-max-cost-cents", desc: "Maximum cost in cents allowed for this request" },
            { name: "x-trace-id", desc: "Custom trace ID for distributed tracing" },
          ].map((h) => (
            <div key={h.name} className="flex items-start gap-3 border-b border-neutral-100 px-4 py-3 last:border-0">
              <code className="text-sm font-semibold text-neutral-900">{h.name}</code>
              <span className="text-sm text-neutral-500">{h.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Authentication Section
// ---------------------------------------------------------------------------

function AuthenticationSection() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900">Authentication</h2>
        <p className="mt-2 text-sm text-neutral-600 leading-relaxed max-w-2xl">
          All API requests require a valid API key passed via the <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">Authorization</code> header
          using the Bearer scheme.
        </p>
      </div>

      <Card className="border-neutral-200">
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Header Format</h3>
            <CodeBlock code="Authorization: Bearer YOUR_API_KEY" />
          </div>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900">API Key Properties</h3>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span><strong>Environment-scoped:</strong> Each key belongs to a specific environment (development, staging, production).</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span><strong>Route-restricted:</strong> Keys can optionally be restricted to specific routes.</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span><strong>Expirable:</strong> Keys can have an expiration date for automatic rotation.</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span><strong>Rate-limited:</strong> Each key has an optional rate limit in requests per minute.</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span><strong>Rotatable:</strong> Keys support graceful rotation with a configurable grace period.</span>
              </li>
            </ul>
          </div>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Error Response</h3>
            <p className="mt-1 text-xs text-neutral-500">
              If the API key is missing or invalid, the gateway returns a 401 error:
            </p>
            <CodeBlock
              code={JSON.stringify(
                {
                  error: {
                    message: "Invalid or missing API key",
                    type: "authentication_error",
                    code: "invalid_api_key",
                  },
                },
                null,
                2
              )}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schema Detail
// ---------------------------------------------------------------------------

function SchemaDetail({ name }: { name: string }) {
  const schemas = spec.components.schemas as Record<string, SchemaProperty>;
  const schema = schemas[name];
  if (!schema) return null;

  const properties = schema.properties || {};
  const required = schema.required || [];

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline" className="mb-2">
          Schema
        </Badge>
        <h2 className="text-xl font-semibold text-neutral-900">{name}</h2>
        {schema.description && (
          <p className="mt-1 text-sm text-neutral-600">{schema.description}</p>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        {Object.entries(properties).map(([propName, prop]) => (
          <PropertyRow
            key={propName}
            name={propName}
            prop={prop as SchemaProperty}
            required={required.includes(propName)}
          />
        ))}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          JSON Example
        </h4>
        <CodeBlock
          code={JSON.stringify(
            buildExample(schema),
            null,
            2
          )}
        />
      </div>
    </div>
  );
}

function buildExample(schema: SchemaProperty): unknown {
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref);
    if (resolved) return buildExample(resolved);
    return {};
  }
  if (schema.examples && schema.examples.length > 0) return schema.examples[0];
  if (schema.enum) return schema.enum[0];
  if (schema.type === "array") {
    return schema.items ? [buildExample(schema.items)] : [];
  }
  if (schema.type === "string") return "string";
  if (schema.type === "number" || schema.type === "integer") return 0;
  if (schema.type === "boolean") return false;
  if (schema.properties) {
    const obj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(schema.properties)) {
      obj[key] = buildExample(val as SchemaProperty);
    }
    return obj;
  }
  if (schema.oneOf && schema.oneOf.length > 0) {
    return buildExample(schema.oneOf[0]);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function DocsPage() {
  const endpoints = flattenEndpoints();
  const [activeId, setActiveId] = useState<string | null>(
    endpoints.length > 0 ? `${endpoints[0].method}-${endpoints[0].path}` : null
  );
  const [activeSection, setActiveSection] = useState<string>("quickstart");

  const activeEndpoint =
    activeSection === "endpoint"
      ? endpoints.find((ep) => `${ep.method}-${ep.path}` === activeId) || null
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Documentation"
        description="Complete reference for the OpenFive Gateway API. OpenAI-compatible with intelligent routing, cost optimization, and observability."
      />

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-4">
            <ScrollArea className="h-[calc(100vh-180px)]">
              <DocSidebar
                endpoints={endpoints}
                activeId={activeId}
                onSelect={setActiveId}
                activeSection={activeSection}
                onSectionSelect={setActiveSection}
              />
            </ScrollArea>
          </div>
        </aside>

        {/* Mobile nav */}
        <div className="mb-4 w-full lg:hidden">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeSection === "quickstart" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSection("quickstart")}
            >
              Quick Start
            </Button>
            <Button
              variant={activeSection === "authentication" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSection("authentication")}
            >
              Auth
            </Button>
            {endpoints.map((ep) => {
              const id = `${ep.method}-${ep.path}`;
              return (
                <Button
                  key={id}
                  variant={activeId === id && activeSection === "endpoint" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setActiveId(id);
                    setActiveSection("endpoint");
                  }}
                >
                  <MethodBadge method={ep.method} />
                  <span className="ml-1 font-mono text-xs">{ep.path}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <main className="min-w-0 flex-1">
          {activeSection === "quickstart" && <QuickStartSection />}
          {activeSection === "authentication" && <AuthenticationSection />}
          {activeSection === "endpoint" && activeEndpoint && (
            <EndpointDetail endpoint={activeEndpoint} />
          )}
          {activeSection === "schema" && activeId && <SchemaDetail name={activeId} />}
        </main>
      </div>
    </div>
  );
}
