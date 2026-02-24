# Contributing to OpenFive

Thank you for your interest in contributing. This guide will help you get started.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| pnpm | 9 |
| Go | 1.23 |
| Supabase CLI | latest |
| Docker | latest (optional, for containerised runs) |

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/openfive/openfive.git
   cd openfive
   ```

2. **Install JavaScript dependencies**

   ```bash
   pnpm install
   ```

3. **Start Supabase locally**

   ```bash
   supabase start
   ```

4. **Set up environment variables**

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

   Fill in the values printed by `supabase start` (API URL, anon key, etc.).

5. **Run the web app in development mode**

   ```bash
   pnpm dev
   ```

6. **Run the gateway service**

   ```bash
   cd services/gateway
   go run ./cmd/gateway
   ```

7. **Or run everything via Docker Compose**

   ```bash
   docker compose -f deploy/docker-compose.yml up --build
   ```

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

## Code Style

- **TypeScript / React** -- Follow the ESLint and Prettier configuration included in the repository. Run `pnpm format` before committing.
- **Go** -- Follow standard Go conventions. Run `gofmt` and `go vet` before committing.
- Keep commits focused and write clear commit messages.

## Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/your-feature
   ```
2. Make your changes with clear, atomic commits.
3. Ensure all checks pass locally (`pnpm lint`, `pnpm build`, `go vet ./...`, `go test ./...`).
4. Push your branch and open a pull request against `main`.
5. Fill in the PR template and describe what changed and why.
6. A maintainer will review your PR. Address any feedback, then it will be merged.

## Reporting Issues

Open a GitHub issue with a clear title and description. Include steps to reproduce the problem, expected behaviour, and actual behaviour.
