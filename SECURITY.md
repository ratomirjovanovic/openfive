# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in OpenFive, please report it responsibly:

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. Email security concerns to the project maintainers
3. Include detailed steps to reproduce the vulnerability
4. Allow reasonable time for a fix before public disclosure

## Security Architecture

### Secrets Management

- **Provider API keys** are encrypted at rest using AES-256-GCM with PBKDF2 key derivation
- The `MASTER_ENCRYPTION_KEY` environment variable is used for encryption/decryption
- API keys are never returned in API responses or logged
- Webhook signing secrets are stored separately from delivery data

### Authentication & Authorization

- **Supabase Auth** handles user authentication with JWT tokens
- **Row Level Security (RLS)** enforces data access at the database level
- **Role-Based Access Control (RBAC)** with four org roles: owner, admin, member, viewer
- All API endpoints require authentication and authorization checks
- API keys for the gateway use SHA-256 hashing (plaintext never stored)

### Transport Security

- HTTPS enforced via HSTS header (max-age: 1 year)
- Strict Content Security Policy (CSP) headers
- X-Frame-Options: DENY (prevents clickjacking)
- X-Content-Type-Options: nosniff (prevents MIME sniffing)

### Input Validation

- All API request bodies validated with Zod schemas
- UUID parameters validated for format
- SQL injection prevented by Supabase's parameterized queries
- XSS prevented by React's built-in escaping + CSP headers

### What We Never Store in Git

- Environment variables (`.env`, `.env.local`)
- API keys, tokens, or credentials
- Private keys or certificates
- Database connection strings with credentials

## Environment Variables

All secrets must be configured as environment variables. See `.env.example` for the full list.

**Required for production:**
- `MASTER_ENCRYPTION_KEY` - AES encryption key (generate with `openssl rand -hex 32`)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin access
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public key
- `DATABASE_URL` - PostgreSQL connection string

**Optional:**
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` - Billing
- `SENTRY_DSN` - Error tracking
