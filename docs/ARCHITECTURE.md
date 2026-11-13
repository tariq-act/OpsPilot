# OpsPilot architecture

This describes the **current** repository. It is not a future product proposal.

OpsPilot is an operations platform for trade contractors: jobs, dispatch,
customers, invoices, payments, notifications, automation, analytics, and audit
logging. The monorepo ships a Next.js web app and a NestJS API on Bun +
Turborepo.

## Monorepo

Package manager: [Bun](https://bun.sh/) (`1.3.13`). Workspaces: `apps/*`,
`packages/*`. Root scripts call `turbo run <task>`.

```sh
bun run dev --filter=web
bun run dev --filter=api
```

## Applications and packages

| Path | Package | Role |
| ---- | ------- | ---- |
| `apps/web` | `web` | Next.js App Router UI (dev port **3001**) |
| `apps/api` | `api` | NestJS HTTP API (port **3000**) |
| `packages/ui` | `@repo/ui` | Shared React primitives |
| `packages/eslint-config` | `@repo/eslint-config` | Shared ESLint configs |
| `packages/typescript-config` | `@repo/typescript-config` | Shared TSConfig bases |

## How the pieces fit

```text
Browser (apps/web)
  └── NEXT_PUBLIC_API_URL
        └── NestJS API (apps/api)
              ├── Better Auth (/api/auth/*)
              ├── Domain REST modules
              ├── Drizzle ORM + postgres.js
              └── Supabase / PostgreSQL
```

Only the API connects to PostgreSQL. The web app must never receive
`DATABASE_URL`, `BETTER_AUTH_SECRET`, or Supabase service-role credentials.

## API (NestJS)

Entry: `apps/api/src/main.ts` loads `apps/api/.env` when present, validates
env (`loadApiEnv`), enables CORS for `WEB_ORIGIN`, global `ValidationPipe`,
shutdown hooks, and optional Swagger.

| Concern | Implementation |
| ------- | -------------- |
| Auth | Better Auth + `@thallesp/nestjs-better-auth` |
| ORM | Drizzle (`apps/api/src/db`) |
| Migrations | `apps/api/src/db/migrations` via `drizzle-kit migrate` |
| Health | `GET /health`, `GET /health/ready` |
| Rate limit | `@nestjs/throttler` global guard |
| Tenant context | `x-organization-id` + membership checks in services |

## Web (Next.js)

- App Router under `apps/web/app/`
- Better Auth client (`apps/web/lib/auth-client.ts`)
- Middleware session gate for `/dashboard` and `/onboarding`
- TanStack Query for server data
- React Query Devtools only when `NODE_ENV=development`

## Database

- Hosted **Supabase PostgreSQL** (or compatible Postgres)
- **Drizzle ORM** + `drizzle-kit` (not Prisma)
- RLS enabled on tenant tables in migrations; API uses a privileged DB role
  and enforces org isolation in application code
- Optional local Postgres: root `compose.yaml` (`bun run db:up`)

## Tooling

| Concern | Tool |
| ------- | ---- |
| Installs | Bun + `bun.lock` |
| Node | `>=24` |
| Orchestration | Turborepo 2 |
| API lint | oxlint |
| Web / UI lint | ESLint |
| Format | Prettier |
| API tests | Jest (`passWithNoTests` until suites land) |
| CI | `.github/workflows/ci.yml` — lint, types, test, build |

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md). CI does not deploy and does not apply
migrations.
