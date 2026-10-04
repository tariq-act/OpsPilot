# OpsPilot

OpsPilot is an operations-focused copilot. This repository is a
[Bun](https://bun.sh/) + [Turborepo](https://turborepo.dev/) monorepo with a
Next.js web app and a NestJS API.

The current codebase is the engineering foundation: health checks, Prisma
against hosted Supabase PostgreSQL, and a starter web UI. Product workflows
are not implemented yet.

Architecture detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Repository structure

| Path                         | Role                                              |
| ---------------------------- | ------------------------------------------------- |
| `apps/web`                   | Next.js App Router UI (development port **3001**) |
| `apps/api`                   | NestJS API (port **3000**)                        |
| `packages/ui`                | Shared React components used by `web`             |
| `packages/eslint-config`     | Shared ESLint configuration                       |
| `packages/typescript-config` | Shared TypeScript configuration                   |
| `docs/ARCHITECTURE.md`       | Current architecture and stack                    |
| `.github/workflows/ci.yml`   | GitHub Actions CI (lint, types, build)            |

Each app and package is TypeScript. Workspaces are `apps/*` and `packages/*`.

## Prerequisites

| Tool                           | Version     | Defined in                                 |
| ------------------------------ | ----------- | ------------------------------------------ |
| [Node.js](https://nodejs.org/) | 24 or later | `package.json` `engines.node`              |
| [Bun](https://bun.sh/)         | 1.3.13      | `package.json` `devEngines.packageManager` |

```sh
node --version     # v24.x or later
bun --version      # 1.3.13
```

PostgreSQL is hosted **Supabase**. Only the NestJS API connects to it. You do
not need a local PostgreSQL install or Docker to develop against the current
default. Docker Compose (`compose.yaml`) exists in the repo as an optional
local database later; it is not required now.

## Getting started

From the repository root:

```sh
bun install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
bun run dev
```

Put Supabase database values in `apps/api/.env` (see [Environment](#environment)
and [Database](#database)). Do not commit `.env` or `.env.local`.

- API: [http://localhost:3000](http://localhost:3000)
- Web: [http://localhost:3001](http://localhost:3001)

`bun run dev` runs each workspace `dev` script through Turborepo:

- API: `nest start --watch` on port 3000 (`PORT` overrides this)
- Web: `next dev --port 3001`

The API loads `apps/api/.env` at process start when that file exists
(`process.loadEnvFile`). Existing process environment variables are not
overridden.

The API and its unit/E2E tests start without PostgreSQL. `GET /health/ready`
returns `503` when the database is unreachable or `DATABASE_*` is incomplete.

Run a single app:

```sh
bun run dev --filter=api
bun run dev --filter=web
```

## Environment

Runtime files live next to each app, not at the repo root. **Only committed
`.env.example` files are documentation.** Copy them locally; never commit the
copies. Never put real secrets in examples or in git.

| File                    | Purpose                                     | Git       |
| ----------------------- | ------------------------------------------- | --------- |
| `.env.example`          | Workspace notes (comments only)             | committed |
| `apps/api/.env.example` | NestJS server variables                     | committed |
| `apps/web/.env.example` | Next.js variables                           | committed |
| `apps/api/.env`         | Local API secrets / overrides               | ignored   |
| `apps/web/.env.local`   | Local web overrides (preferred for Next.js) | ignored   |

**Naming**

- Use `SCREAMING_SNAKE_CASE`.
- Put a variable in the app that reads it.
- **Web, browser-safe:** `NEXT_PUBLIC_*` is inlined into the client bundle.
  Never put secrets here.
- **Web, server-only:** no `NEXT_PUBLIC_` prefix.
- **API:** always server-only. Do not use `NEXT_PUBLIC_*`.

**Variables from the example files**

Required/optional below is based on `.env.example` plus whether application
source currently reads the name.

| Variable              | App                  | Required                               | Read by the app today                                           | Purpose                                                       |
| --------------------- | -------------------- | -------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- |
| `PORT`                | `apps/api`           | Optional                               | Yes (`main.ts`). Default `3000`                                 | HTTP listen port                                              |
| `NODE_ENV`            | examples (commented) | Optional                               | Not read by OpsPilot source; listed in `turbo.json` `globalEnv` | Runtime/build environment                                     |
| `DATABASE_URL`        | `apps/api`           | For Prisma when not using `DATABASE_*` | Yes (Prisma URL resolution)                                     | PostgreSQL URL for Prisma CLI and the ORM                     |
| `DATABASE_HOST`       | `apps/api`           | For `/health/ready`                    | Yes (`DatabaseService`)                                         | PostgreSQL host                                               |
| `DATABASE_PORT`       | `apps/api`           | For `/health/ready`                    | Yes                                                             | PostgreSQL port (often `5432`)                                |
| `DATABASE_NAME`       | `apps/api`           | For `/health/ready`                    | Yes                                                             | Database name                                                 |
| `DATABASE_USER`       | `apps/api`           | For `/health/ready`                    | Yes                                                             | Database role                                                 |
| `DATABASE_PASSWORD`   | `apps/api`           | For `/health/ready`                    | Yes                                                             | Database password                                             |
| `DATABASE_SSL`        | `apps/api`           | Recommended for Supabase               | Yes (`true` / `1` / `require`)                                  | TLS for `pg` / URL `sslmode=require`                          |
| `SUPABASE_URL`        | `apps/api`           | Optional                               | **No**                                                          | Documented in `.env.example` only                             |
| `SUPABASE_ANON_KEY`   | `apps/api`           | Optional                               | **No**                                                          | Documented in `.env.example` only                             |
| `NEXT_PUBLIC_API_URL` | `apps/web`           | Optional                               | **No**                                                          | Example API origin for when the client starts calling the API |

`DATABASE_*` and `DATABASE_URL` belong only in `apps/api`. Never add them to
`apps/web`.

When `DATABASE_URL` is unset or empty, Prisma builds a URL from `DATABASE_*`.
`/health/ready` still uses the discrete `DATABASE_*` variables only; setting
`DATABASE_URL` alone does not configure that health check.

Root `.env.example` also comments optional Compose variables (`POSTGRES_DB`,
`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`) for `compose.yaml`.
Those are not API connection settings.

**Secrets**

- Never commit `.env`, `.env.local`, `.env.*.local`, passwords, or API keys.
- Never expose secrets through `NEXT_PUBLIC_*`.
- Keep database and Supabase values in `apps/api` only.
- If a secret is committed by mistake, rotate it.

## Database

The NestJS API uses [Prisma](https://www.prisma.io/) against **hosted Supabase
PostgreSQL**. Next.js must not connect to PostgreSQL or Supabase.

1. In the Supabase dashboard, open **Settings → Database**.
2. Copy host, port, database name, user, and password. Prefer a **direct** or
   **session-mode** connection for this long-lived Nest process.
3. Put those values in `apps/api/.env` as `DATABASE_HOST`, `DATABASE_PORT`,
   `DATABASE_NAME`, `DATABASE_USER`, and `DATABASE_PASSWORD`, or set
   `DATABASE_URL` (see `apps/api/.env.example` for the URL shape).
4. Set `DATABASE_SSL=true`.
5. Never commit credentials.

| Path                             | Purpose                                              |
| -------------------------------- | ---------------------------------------------------- |
| `apps/api/prisma/schema.prisma`  | Prisma schema (no product tables yet)                |
| `apps/api/prisma/migrations/`    | Committed SQL migrations                             |
| `apps/api/prisma.config.ts`      | Prisma CLI configuration                             |
| `apps/api/src/generated/prisma/` | Generated client (gitignored; run `prisma:generate`) |

From `apps/api` (or `bun run --filter=api <script>` from the root):

```sh
bun run prisma:generate          # generate Prisma Client (also runs before build / check-types)
bun run prisma:migrate           # create and apply a development migration
bun run prisma:migrate:deploy    # apply pending migrations
bun run prisma:migrate:status    # compare migration history to the database
```

To reproduce the schema on a clean database, apply committed migrations with
`prisma:migrate:deploy`. Do **not** run `prisma migrate reset` against the
shared Supabase development database.

After `bun run dev --filter=api`:

- [http://localhost:3000/health](http://localhost:3000/health) — liveness
  (`{"status":"ok"}`)
- [http://localhost:3000/health/ready](http://localhost:3000/health/ready) —
  `200` when `SELECT 1` succeeds, `503` otherwise

Full Prisma workflow: [apps/api/docs/PRISMA.md](apps/api/docs/PRISMA.md).

`compose.yaml` and `bun run db:up` / `db:down` / `db:status` wrap an optional
local PostgreSQL 16 container. That is not the current default workflow.

## Quality checks

From the repository root:

```sh
bun run lint          # turbo: oxlint (api), ESLint (web, ui)
bun run check-types   # turbo: TypeScript checks (api generates Prisma Client first)
bun run format        # Prettier write
bun run format:check  # Prettier check
bun run build         # turbo: production build
```

CI does not run Prettier. `bun run format:check` scans the whole tree,
including `.agents/` skill markdown.

CI-style install:

```sh
bun install --frozen-lockfile
```

## Testing

The API uses [Vitest](https://vitest.dev/). The web app has no test suite.

Root scripts run Turbo across workspaces that define the task (today that is
only `apps/api`):

```sh
bun run test          # turbo → apps/api `vitest run`
bun run test:e2e      # turbo → apps/api E2E config
```

Same checks from `apps/api` (this is what CI runs):

```sh
cd apps/api
bun run test          # unit tests (`src/**/*.spec.ts`)
bun run test:watch    # unit tests in watch mode
bun run test:cov      # unit tests with coverage
bun run test:e2e      # E2E tests (`test/**/*.e2e-spec.ts`)
```

No extra secrets are required. GitHub Actions does not start PostgreSQL. Unit
and E2E tests pass without a database. They do need a generated Prisma Client
(`apps/api/src/generated/`, gitignored). CI produces it during `check-types`
before tests. After a fresh clone, run `bun run check-types` or
`bun run --filter=api prisma:generate` first.

## Continuous integration

GitHub Actions runs on every pull request and on every push to `main`.

| Workflow | File | When |
| -------- | ---- | ---- |
| CI | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Every PR and every push to `main` |

### CI checks

CI uses Node.js **24** and Bun **1.3.13**. Dependencies are installed with
`bun install --frozen-lockfile`. Turborepo remote caching is not configured.
`TURBO_TELEMETRY_DISABLED` is set to `1`.

| Check            | Command                           |
| ---------------- | --------------------------------- |
| Lint             | `bun run lint`                    |
| Type checking    | `bun run check-types`             |
| Unit tests       | `cd apps/api && bun run test`     |
| E2E tests        | `cd apps/api && bun run test:e2e` |
| Production build | `bun run build`                   |

CI does not copy `.env` files, does not start PostgreSQL, does not run
Prettier, does not apply Prisma migrations, and does not deploy.

Reproduce CI locally:

```sh
bun install --frozen-lockfile
bun run lint
bun run check-types
cd apps/api && bun run test && bun run test:e2e
bun run build
```

## Troubleshooting

### Incorrect Bun or Node.js version

```sh
node --version   # need v24+
bun --version    # need 1.3.13
```

### Missing environment files

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

The apps start without these files today. Copy them so local overrides have a
place to live. Never commit the copied files.

### Dependency installation problems

- Run installs from the **repository root**.
- Use `bun install`. The lockfile is `bun.lock`.
- `bun install --frozen-lockfile` fails if `package.json` and `bun.lock`
  disagree. After changing dependencies, run `bun install` and commit the
  updated lockfile.

### Ports already in use

| App                                 | Default port | Configured by                               |
| ----------------------------------- | ------------ | ------------------------------------------- |
| API (dev and default listen)        | 3000         | `PORT` in `apps/api/.env`, otherwise `3000` |
| Web (dev)                           | 3001         | `apps/web` script `next dev --port 3001`    |
| Web (`bun run start` in `apps/web`) | 3000         | Next.js default unless you pass a port      |

### PostgreSQL is not reachable

`/health/ready` returns `503` with
`{"status":"not_ready","database":"unavailable"}`. Confirm `apps/api/.env`
has Supabase `DATABASE_*` values and `DATABASE_SSL=true`. Do not commit those
values.

## Related documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API](apps/api/README.md)
- [Web](apps/web/README.md)
- [Prisma](apps/api/docs/PRISMA.md)
