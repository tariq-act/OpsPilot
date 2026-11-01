# OpsPilot

OpsPilot is an operations platform for trade contractors. This repository is a
[Bun](https://bun.sh/) + [Turborepo](https://turborepo.dev/) monorepo with a
Next.js web app and a NestJS API, Drizzle ORM, PostgreSQL (Supabase), and
Better Auth.

Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).  
Production deploy: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Repository structure

| Path | Role |
| ---- | ---- |
| `apps/web` | Next.js App Router UI (development port **3001**) |
| `apps/api` | NestJS API (port **3000**) |
| `packages/ui` | Shared React components used by `web` |
| `packages/eslint-config` | Shared ESLint configuration |
| `packages/typescript-config` | Shared TypeScript configuration |
| `docs/ARCHITECTURE.md` | Current architecture and stack |
| `docs/DEPLOYMENT.md` | Production env, migrations, hosting |
| `.github/workflows/ci.yml` | GitHub Actions CI (lint, types, test, build) |

## Prerequisites

| Tool | Version | Defined in |
| ---- | ------- | ---------- |
| [Node.js](https://nodejs.org/) | 24 or later | `package.json` `engines.node` |
| [Bun](https://bun.sh/) | 1.3.13 | `package.json` `devEngines.packageManager` |

```sh
node --version     # v24.x or later
bun --version      # 1.3.13
```

PostgreSQL is hosted **Supabase** by default. Only the NestJS API connects to
it. Docker Compose (`compose.yaml`) is optional local Postgres.

## Getting started

```sh
bun install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Fill DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, WEB_ORIGIN in apps/api/.env
bun run --filter=api db:migrate
bun run --filter=api db:seed   # optional
bun run dev
```

- API: [http://localhost:3000](http://localhost:3000)
- Web: [http://localhost:3001](http://localhost:3001)
- Health: [http://localhost:3000/health](http://localhost:3000/health)

Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32` (≥32 characters).

## Environment

Runtime files live next to each app. **Only committed `.env.example` files are
documentation.** Never commit secrets. Never put DB credentials or auth secrets
in `NEXT_PUBLIC_*`.

| File | Purpose | Git |
| ---- | ------- | --- |
| `apps/api/.env.example` | NestJS server variables | committed |
| `apps/web/.env.example` | Next.js variables | committed |
| `apps/api/.env` | Local API secrets | ignored |
| `apps/web/.env.local` | Local web overrides | ignored |

| Variable | App | Required | Purpose |
| -------- | --- | -------- | ------- |
| `DATABASE_URL` | api | Yes | Postgres URL for Drizzle |
| `BETTER_AUTH_SECRET` | api | Yes | ≥32 chars; session signing |
| `BETTER_AUTH_URL` | api | Yes (prod) | Public API origin |
| `WEB_ORIGIN` | api | Yes (prod) | Public web origin (CORS + trustedOrigins) |
| `PORT` | api | No | Listen port (default `3000`) |
| `NODE_ENV` | api | Yes (prod) | `production` enables strict URL/cookie rules |
| `NEXT_PUBLIC_API_URL` | web | Yes (prod build) | API origin for auth client / fetch |
| `NEXT_PUBLIC_APP_URL` | web | Recommended | Canonical web origin for metadata |

Full production notes: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Database

The API uses [Drizzle ORM](https://orm.drizzle.team/) against PostgreSQL.

| Path | Purpose |
| ---- | ------- |
| `apps/api/src/db/schema/` | Drizzle schema |
| `apps/api/src/db/migrations/` | Committed SQL migrations |
| `apps/api/drizzle.config.ts` | drizzle-kit config |

```sh
cd apps/api
bun run db:generate   # create migration from schema diff
bun run db:migrate    # apply pending migrations (safe forward-only)
bun run db:studio     # optional GUI
```

Do **not** run destructive reset commands against shared or production
databases. Prefer backups + roll-forward migrations. See
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Quality checks

```sh
bun run lint
bun run check-types
bun run test
bun run build
bun run format:check
```

CI runs lint, typecheck, test, and production build. It does not deploy or
migrate databases.

## Related documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [API](apps/api/README.md)
- [Web](apps/web/README.md)
