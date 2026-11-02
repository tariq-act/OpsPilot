# OpsPilot production deployment

This document describes how to deploy OpsPilot safely. It does **not** deploy
anything for you. Do not run migrations or ship releases without an explicit
approval for that environment.

## Recommended hosting architecture

| Piece | Recommendation | Notes |
| ----- | -------------- | ----- |
| Web (`apps/web`) | Vercel, Netlify, or any Node host that runs `next start` | Set `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_APP_URL` at **build** time |
| API (`apps/api`) | Railway, Fly.io, Render, or similar long-lived Node process | Needs persistent process for sessions, uploads, automation timers |
| Database | Hosted Supabase PostgreSQL (or managed Postgres) | API uses `DATABASE_URL` only; never expose DB to the browser |
| Object storage | Local disk is **not** production-ready for multi-instance | Plan cloud object storage before horizontal scale |
| TLS | Terminate TLS at the platform / reverse proxy | Public `BETTER_AUTH_URL` and `WEB_ORIGIN` must be `https://` |

There is **no** application Docker image in this repository today.
`compose.yaml` is optional local Postgres only.

```text
Browser
  └── https://app.example.com     (Next.js)
          │  cookies + fetch
          └── https://api.example.com   (NestJS)
                  │
                  └── PostgreSQL (Supabase)
```

CORS allows only `WEB_ORIGIN`. Better Auth `trustedOrigins` matches that same
origin. Session cookies are `httpOnly`, `SameSite=Lax`, and `Secure` in
production.

## Prerequisites

1. Bun **1.3.13** and Node.js **24+** for builds (see root `package.json`).
2. A Postgres database reachable from the API host.
3. Secrets generated offline (never commit them):
   - `openssl rand -base64 32` → `BETTER_AUTH_SECRET`
4. Approved production hostnames for web and API.

## Environment variables

### `apps/api` (server only)

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `DATABASE_URL` | Yes | Postgres URL for Drizzle (`sslmode=require` on Supabase) |
| `BETTER_AUTH_SECRET` | Yes | ≥32 characters; signs sessions |
| `BETTER_AUTH_URL` | Yes in production | Public API origin (`https://api…`) |
| `WEB_ORIGIN` | Yes in production | Public web origin (`https://app…`) |
| `NODE_ENV` | Yes in production | Must be `production` |
| `PORT` | Optional | Listen port (default `3000`) |
| `SWAGGER_ENABLED` | Optional | Force OpenAPI UI on/off (`true`/`false`) |
| `UPLOAD_DIR` | Optional | Local upload path (default `./uploads`) |

Never set `NEXT_PUBLIC_*` on the API. Never put a Supabase **service role**
key in this app — use a Postgres connection string only.

### `apps/web`

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `NEXT_PUBLIC_API_URL` | Yes in production | API origin baked into the client bundle |
| `NEXT_PUBLIC_APP_URL` | Recommended | Canonical web origin for metadata |

These values are inlined at **build** time. Rebuild the web app after changing
them.

Examples: `apps/api/.env.example`, `apps/web/.env.example`.

## Database migrations

Migrations live in `apps/api/src/db/migrations/` (Drizzle).

### Safe apply (production)

From a machine that can reach production Postgres, with production
`DATABASE_URL` set:

```sh
cd apps/api
bun run db:migrate
```

This runs `drizzle-kit migrate` and applies **pending** forward migrations
only. It does not drop the database.

### Rules

- **Never** auto-run migrations as part of `start:prod` or a web deploy hook
  without an explicit ops approval for that release.
- **Never** run destructive reset / drop commands against production.
- There is no automated rollback script. Roll forward with a new migration, or
  restore from a database backup taken **before** the migration.
- Review each new SQL file for `DROP`, `TRUNCATE`, or irreversible column
  changes before applying.

### Rollback procedure

1. Stop or freeze writers if data integrity is at risk.
2. Restore the latest pre-migration backup from Supabase (or your host).
3. Redeploy the previous API/web artifacts that match that schema.
4. File a follow-up migration that corrects the schema going forward.

### Indexes, constraints, RLS

Committed migrations enable **ROW LEVEL SECURITY** on tenant tables and add
organization-scoped indexes. The Nest API connects with a privileged Postgres
role (bypasses RLS); **application code** enforces org membership via
`x-organization-id` + `findActiveMembership` (and role checks) on every
domain path. Do not grant the API connection string to the browser.

## Build and run

### API

```sh
cd apps/api
# with production env injected by the platform
bun run build
NODE_ENV=production bun run start:prod
# equivalent: node dist/main
```

Health probes:

- Liveness: `GET /health` → `{ "status": "ok" }`
- Readiness: `GET /health/ready` → `200` when `SELECT 1` works, else `503`

Swagger (`/docs`) is **off** when `NODE_ENV=production` unless
`SWAGGER_ENABLED=true`.

### Web

```sh
cd apps/web
# NEXT_PUBLIC_* must be set for this build
bun run build
bun run start
# set PORT / -p for the platform’s expected listen port
```

## Deploy checklist

1. [ ] Secrets created; not in git
2. [ ] `DATABASE_URL`, `BETTER_AUTH_*`, `WEB_ORIGIN`, `NODE_ENV=production` on API
3. [ ] `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_APP_URL` set for web **build**
4. [ ] Backup database
5. [ ] Apply migrations (`bun run db:migrate`) with approval
6. [ ] Deploy API; confirm `/health` and `/health/ready`
7. [ ] Deploy web; confirm login → dashboard cookie flow cross-origin
8. [ ] Confirm CORS rejects unknown origins
9. [ ] Confirm Swagger is disabled (unless intentionally enabled)

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every PR and push to
`main`:

- `bun run lint`
- `bun run check-types`
- `bun run test` (API Jest; passes with no tests until suites exist)
- `bun run build`

CI does **not** deploy, does **not** apply migrations, and does **not** use
production secrets.

## Security notes

- Org isolation is enforced in API services; always send `x-organization-id`
  for tenant routes.
- Rate limiting: global ThrottlerGuard (120 req / 60s / IP); `/health*` skipped.
- Graceful shutdown: Nest `enableShutdownHooks` + postgres.js pool `end`.
- Do not commit `.env`, PEM keys, or service-account JSON (see `.gitignore`).
