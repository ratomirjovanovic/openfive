# OpenFive

**Open-source LLM Margin Gateway**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

OpenFive is an open-source gateway that sits between your AI agents and model providers. It gives engineering teams a single control plane for routing, budgets, anomaly detection, schema validation, and cost metering across every LLM call their applications make.

---

## What is OpenFive

Modern AI applications often call multiple model providers, each with different pricing, latency profiles, and capabilities. As usage scales, teams lose visibility into costs, encounter runaway loops, and struggle to enforce budgets or quality standards across agents and environments.

OpenFive solves this by acting as a transparent proxy layer between your applications and providers like OpenRouter and Ollama. Every request flows through a high-performance Go gateway that applies intelligent routing (based on cost, latency, and reliability weights), enforces budget guardrails, detects anomalies, validates output schemas, and meters every token. The gateway exposes an OpenAI-compatible API, so any existing SDK or tool that speaks the OpenAI protocol works out of the box -- no code changes required.

A companion Next.js control plane provides a dashboard for managing organizations, projects, environments, routes, API keys, provider credentials, and incidents. Together, the gateway and control plane give teams full operational control over their LLM spend and reliability, whether running a single agent or hundreds across multiple tenants.

---

## Architecture

```
                         +---------------------+
                         |   Agent / App       |
                         |  (OpenAI SDK, etc.) |
                         +----------+----------+
                                    |
                              OpenAI-compatible API
                                    |
                         +----------v----------+
                         |   OpenFive Gateway   |
                         |       (Go)           |
                         |  :8787               |
                         +----+------------+----+
                              |            |
                    +---------v--+    +----v--------+
                    | OpenRouter |    |   Ollama    |
                    +------------+    +-------------+

                         +----------+-----------+
                         |   Control Plane       |
                         |     (Next.js)         |
                         |  Dashboard + REST API |
                         +----------+-----------+
                                    |
                         +----------v----------+
                         |     Supabase         |
                         |    (Postgres)         |
                         +---------------------+
```

The **Gateway** is the data plane: it authenticates requests, resolves routes, selects providers, enforces budgets, detects anomalies and loops, validates schemas, and writes metering records.

The **Control Plane** is the management layer: it provides the dashboard UI, REST APIs for configuration, and serves as the admin interface backed by Supabase for authentication, storage, and row-level security.

---

## Key Features

- **Intelligent routing** -- select models based on configurable cost, latency, and reliability weights with fallback chains
- **Budget guardrails** -- soft limits (downgrade model or throttle) and hard limits (block requests outright)
- **Anomaly detection** -- statistical monitoring with automatic kill switch to halt runaway spend
- **Schema validation and auto-repair** -- validate LLM output against JSON schemas and attempt automatic correction
- **Loop detection** -- identify and break repetitive agent call patterns
- **Full cost metering** -- per-request token counting, cost calculation, and historical logging
- **Multi-tenant with RBAC** -- organizations, projects, environments, and role-based access control
- **OpenAI-compatible proxy** -- drop-in replacement; any OpenAI SDK client works without modification
- **Dashboard UI** -- Stripe-like interface for managing routes, viewing request logs, tracking spend, and handling incidents

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| pnpm | 9+ |
| Go | 1.23+ |
| Supabase CLI | latest |
| Docker | latest (optional) |

### 1. Clone and install

```bash
git clone https://github.com/openfive/openfive.git
cd openfive
pnpm install
```

### 2. Start Supabase

For local development, use the Supabase CLI:

```bash
supabase start
```

This starts a local Supabase instance with Postgres, Auth, and all required services. Note the API URL, anon key, and service role key printed to the console.

### 3. Configure environment variables

```bash
cp .env.example apps/web/.env.local
```

Edit `apps/web/.env.local` and fill in the values from `supabase start`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

GATEWAY_PORT=8787
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

MASTER_ENCRYPTION_KEY=<your-32-byte-hex-key>
LOG_LEVEL=info
```

### 4. Run the development servers

Start all apps via Turborepo:

```bash
pnpm dev
```

In a separate terminal, start the Go gateway:

```bash
cd services/gateway
go run ./cmd/gateway
```

The dashboard will be available at `http://localhost:3000` and the gateway at `http://localhost:8787`.

### 5. Docker (alternative)

To run the gateway in a container:

```bash
docker compose -f deploy/docker-compose.yml up --build
```

---

## SDK Usage

The `@openfive/sdk` package wraps the standard OpenAI SDK, injecting gateway-specific headers on every request. All standard OpenAI methods (`chat.completions`, `embeddings`, etc.) work directly on the client.

```ts
import { OpenFiveClient } from '@openfive/sdk'

const client = new OpenFiveClient({
  apiKey: 'sk-of_...',
  baseURL: 'http://localhost:8787',
  routeId: 'support-summarize',
})

const res = await client.chat.completions.create({
  messages: [{ role: 'user', content: 'Summarize this ticket...' }],
})

console.log(res.choices[0].message.content)
```

### Switching routes or agents

The client provides convenience methods for deriving new instances with different configurations:

```ts
// Create a client targeting a different route
const billingClient = client.withRoute('billing-classify')

// Create a client with a different agent identifier for tracing
const tracedClient = client.withAgent('billing-agent')
```

### SDK options

| Option | Type | Description |
|--------|------|-------------|
| `apiKey` | `string` | OpenFive API key (`sk-of_...`). Required. |
| `baseURL` | `string` | Gateway URL. Defaults to `http://localhost:8787`. |
| `routeId` | `string` | Route ID selecting which model/config the gateway uses. |
| `agentId` | `string` | Agent identifier for tracing and analytics. |
| `orgId` | `string` | Organization ID for multi-tenant isolation. |
| `maxCostCents` | `number` | Per-request cost cap in cents. |
| `timeout` | `number` | Request timeout in milliseconds. |

---

## Project Structure

```
openfive/
├── apps/web/              # Next.js dashboard + control plane API
├── services/gateway/      # Go data plane proxy
│   ├── cmd/gateway/       #   Application entry point
│   ├── internal/anomaly/  #   Anomaly detection + kill switch
│   ├── internal/auth/     #   API key validation
│   ├── internal/budget/   #   Budget enforcement + token bucket
│   ├── internal/config/   #   Environment-based configuration
│   ├── internal/db/       #   Database connection pool + queries
│   ├── internal/loop/     #   Loop detection
│   ├── internal/meter/    #   Cost metering writer
│   ├── internal/model/    #   Shared types
│   ├── internal/provider/ #   Provider adapters (OpenRouter, Ollama, generic)
│   ├── internal/router/   #   Routing engine
│   ├── internal/schema/   #   Schema validation + auto-repair
│   └── internal/token/    #   Token estimation
├── packages/shared/       # Shared TypeScript types
├── packages/sdk/          # TypeScript SDK (@openfive/sdk)
├── infra/supabase/        # Database migrations + seed data
│   ├── migrations/        #   SQL migration files
│   ├── seed.sql           #   Development seed data
│   └── config.toml        #   Supabase local config
└── deploy/                # Docker + Compose configs
```

---

## API Reference

### Gateway endpoints (data plane)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/chat/completions` | OpenAI-compatible chat completions proxy |
| `GET` | `/v1/models` | List available virtual models |
| `GET` | `/internal/health` | Health check |

### Control plane endpoints

All control plane endpoints are served from the Next.js app under `/api/v1`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/organizations` | List organizations for the authenticated user |
| `POST` | `/api/v1/organizations` | Create a new organization |
| `GET` | `/api/v1/organizations/:orgId` | Get organization details |
| `GET` | `/api/v1/organizations/:orgId/members` | List organization members |
| `GET` | `/api/v1/organizations/:orgId/providers` | List configured providers |
| `POST` | `/api/v1/organizations/:orgId/providers` | Add a provider |
| `GET` | `/api/v1/organizations/:orgId/models` | List models |
| `GET` | `/api/v1/organizations/:orgId/audit-log` | View audit log |
| `GET` | `/api/v1/organizations/:orgId/projects` | List projects |
| `POST` | `/api/v1/organizations/:orgId/projects` | Create a project |
| `GET` | `.../:envId/routes` | List routes for an environment |
| `POST` | `.../:envId/routes` | Create a route |
| `GET` | `.../:envId/api-keys` | List API keys |
| `GET` | `.../:envId/requests` | Query request logs |
| `GET` | `.../:envId/incidents` | List incidents |

---

## Configuration

### Gateway environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GATEWAY_PORT` | `8787` | Port the gateway listens on |
| `DATABASE_URL` | -- | PostgreSQL connection string |
| `SUPABASE_SERVICE_ROLE_KEY` | -- | Supabase service role key for server-side operations |
| `MASTER_ENCRYPTION_KEY` | -- | 32-byte hex key for encrypting provider credentials |
| `GATEWAY_READ_TIMEOUT_SEC` | `30` | HTTP read timeout in seconds |
| `GATEWAY_WRITE_TIMEOUT_SEC` | `120` | HTTP write timeout in seconds |
| `GATEWAY_SHUTDOWN_TIMEOUT_SEC` | `15` | Graceful shutdown timeout in seconds |
| `METER_BATCH_SIZE` | `100` | Metering batch size before flush |
| `METER_FLUSH_MS` | `5000` | Metering flush interval in milliseconds |
| `LOG_LEVEL` | `info` | Log level (`debug`, `info`, `warn`, `error`) |
| `LOG_JSON` | `true` | Emit structured JSON logs |

### Web app environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | -- | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | -- | Supabase anonymous key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | -- | Supabase service role key (server-side) |

---

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode (via Turborepo) |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all apps |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm format` | Format code with Prettier |
| `go test ./...` | Run Go tests (from `services/gateway`) |
| `go vet ./...` | Vet Go code (from `services/gateway`) |

---

## Contributing

We welcome contributions of all kinds. Please read our [Contributing Guide](CONTRIBUTING.md) for details on the development workflow, code style expectations, and pull request process.

---

## License

OpenFive is licensed under the [Apache License 2.0](LICENSE).

```
Copyright 2025 OpenFive Contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
