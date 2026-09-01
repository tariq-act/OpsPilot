# OpsPilot

OpsPilot is a Bun + Turborepo monorepo. This document is the local development
guide: a clean checkout should be enough to install dependencies, configure
environment files, and run the web and API apps.

## What's inside

| Path                         | Role                                                   |
| ---------------------------- | ------------------------------------------------------ |
| `apps/web`                   | [Next.js](https://nextjs.org/) product app (port 3001) |
| `apps/api`                   | [NestJS](https://nestjs.com/) API (port 3000)          |
| `packages/ui`                | Shared React component library used by `web`           |
| `packages/eslint-config`     | Shared ESLint configuration                            |
| `packages/typescript-config` | Shared TypeScript configuration                        |

Each package and app is TypeScript.

## Prerequisites

Install these before the first `bun install`:

| Tool                                          | Version                       | Defined in                                 |
| --------------------------------------------- | ----------------------------- | ------------------------------------------ |
| [Node.js](https://nodejs.org/)                | 24 or later                   | `package.json` `engines.node`              |
| [Bun](https://bun.sh/)                        | 1.3.13                        | `package.json` `devEngines.packageManager` |
| [Docker](https://docs.docker.com/get-docker/) | Compose v2 (`docker compose`) | Optional local PostgreSQL (`compose.yaml`) |

Confirm:

```sh
node --version     # v24.x or later
bun --version      # 1.3.13
```

**PostgreSQL** is the application database. Only the NestJS API connects to
it. Next.js must not connect to PostgreSQL or Supabase. **Current development
default is hosted Supabase PostgreSQL.** Local Docker Compose remains in the
repo for later use but is not required right now. Connection settings use
discrete `DATABASE_*` variables (host, port, name, user, password, optional
SSL) — or a single `DATABASE_URL` for Prisma. When `DATABASE_URL` is unset,
the API derives it from `DATABASE_*`.

## Getting started

From the repository root:

```sh
bun install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
bun run dev
```

Fill `DATABASE_*` (or `DATABASE_URL`), `SUPABASE_URL`, and `SUPABASE_ANON_KEY`
in `apps/api/.env` from the Supabase dashboard (see PostgreSQL below). Do not
commit that file.
Do not start Docker Compose for database work right now.

- API: [http://localhost:3000](http://localhost:3000)
- Web: [http://localhost:3001](http://localhost:3001)

`bun run dev` runs each workspace `dev` script through Turborepo. That starts
the API (`nest start --watch` on port 3000) and the web app
(`next dev --port 3001`). The API loads `apps/api/.env` at process start
(`process.loadEnvFile`). Existing process environment variables are not
overridden.

The API listens on port 3000 when `PORT` is unset. Unit and E2E tests do not
require PostgreSQL to pass.

Run a single app:

```sh
bun run dev --filter=api
bun run dev --filter=web
```

## Environment

Application env files are loaded from each app directory, not the repo root.

| File                    | Purpose                                           | Git       |
| ----------------------- | ------------------------------------------------- | --------- |
| `.env.example`          | Workspace convention (this file is comments only) | committed |
| `apps/api/.env.example` | NestJS server variables                           | committed |
| `apps/web/.env.example` | Next.js variables                                 | committed |
| `apps/api/.env`         | Local API secrets / overrides                     | ignored   |
| `apps/web/.env.local`   | Local web overrides (preferred for Next.js)       | ignored   |

**Naming**

- Use `SCREAMING_SNAKE_CASE`.
- Put a variable in the app that reads it.
- **Web, browser-safe:** `NEXT_PUBLIC_*` is inlined into the client bundle.
  Never put secrets here.
- **Web, server-only:** no `NEXT_PUBLIC_` prefix (Server Components, Route
  Handlers, `next.config`).
- **API:** always server-only. Do not use `NEXT_PUBLIC_*`.

**Currently documented variables**

| Variable              | App        | Required                     | Purpose                                                                  | Example                         |
| --------------------- | ---------- | ---------------------------- | ------------------------------------------------------------------------ | ------------------------------- |
| `PORT`                | `apps/api` | Optional                     | HTTP listen port. Default `3000`.                                        | `3000`                          |
| `NODE_ENV`            | all        | Optional                     | Runtime/build environment.                                               | `development`                   |
| `NEXT_PUBLIC_API_URL` | `apps/web` | Optional                     | Browser-safe API origin. Not read yet.                                   | `http://localhost:3000`         |
| `DATABASE_URL`        | `apps/api` | Required for Prisma          | PostgreSQL connection URL (Prisma CLI + ORM). Built from `DATABASE_*` when unset. Never in `apps/web`. | `postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require` |
| `DATABASE_HOST`       | `apps/api` | Required for `/health/ready` | PostgreSQL host (Supabase). Never in `apps/web`.                         | *(from Supabase dashboard)*     |
| `DATABASE_PORT`       | `apps/api` | Required for `/health/ready` | PostgreSQL port (often `5432` for direct).                               | `5432`                          |
| `DATABASE_NAME`       | `apps/api` | Required for `/health/ready` | Database name.                                                           | `postgres`                      |
| `DATABASE_USER`       | `apps/api` | Required for `/health/ready` | Database role.                                                           | *(from Supabase dashboard)*     |
| `DATABASE_PASSWORD`   | `apps/api` | Required for `/health/ready` | Database password. Never commit real secrets.                            | *(from Supabase dashboard)*     |
| `DATABASE_SSL`        | `apps/api` | Recommended for Supabase     | Enable TLS (`true` / `1` / `require`). Default off when unset.           | `true`                          |
| `SUPABASE_URL`        | `apps/api` | Optional today               | Supabase project URL (Settings → API). Server-only.                      | *(from Supabase dashboard)*     |
| `SUPABASE_ANON_KEY`   | `apps/api` | Optional today               | Supabase anon/publishable key. Server-only; never in `apps/web`.         | *(from Supabase dashboard)*     |

**Secrets**

- Never commit `.env`, `.env.local`, `.env.*.local`, credentials, API keys,
  or tokens.
- Never expose secrets through `NEXT_PUBLIC_*`.
- Keep API secrets in `apps/api` only.
- If a secret is committed by mistake, rotate it.

### PostgreSQL

Only `apps/api` connects to PostgreSQL. **Prisma** is the ORM; the database is
hosted **Supabase PostgreSQL**. Connection settings use `DATABASE_URL` (preferred
for Prisma) or discrete `DATABASE_*` variables (host, port, name, user, password,
optional SSL). The API builds `DATABASE_URL` from `DATABASE_*` when the URL is
unset. Next.js must not connect to PostgreSQL or Supabase.

**Current path: hosted Supabase (recommended now)**

Local Docker PostgreSQL is **not** used for day-to-day development right now.
Point the API at your Supabase project instead.

1. In the Supabase dashboard, open **Settings → Database**.
2. Copy host, port, database name, user, and password. Prefer a **direct** or
   **session-mode** connection for this long-lived Nest process (`pg` already
   pools on the client).
3. Put those values in `apps/api/.env` as `DATABASE_HOST`, `DATABASE_PORT`,
   `DATABASE_NAME`, `DATABASE_USER`, and `DATABASE_PASSWORD` — or set
   `DATABASE_URL` directly (see `apps/api/.env.example`).
4. Set `DATABASE_SSL=true` (required for Supabase TLS).
5. Optionally set `SUPABASE_URL` and `SUPABASE_ANON_KEY` from **Settings → API**.
6. Never commit Supabase credentials. Never add them to `apps/web`.

| Concern              | Hosted Supabase (current)                                    | Local Docker Compose (optional later)                         |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| How you run Postgres | Managed by Supabase; no local container                      | `docker compose up -d` from the repo root                     |
| Where config lives   | `DATABASE_URL` and/or `DATABASE_*` in `apps/api/.env` from the dashboard | Same keys with local Compose defaults                         |
| TLS                  | `DATABASE_SSL=true`                                         | Usually unset / `false`                                       |
| Who connects         | NestJS API only                                              | NestJS API only — never `apps/web`                            |

**Verify connectivity**

After configuring `apps/api/.env` and `bun run dev --filter=api`:

- [http://localhost:3000/health](http://localhost:3000/health) — process
  liveness (`{"status":"ok"}`)
- [http://localhost:3000/health/ready](http://localhost:3000/health/ready)
  — `200` when `SELECT 1` succeeds, `503` when PostgreSQL is unreachable or
  any required `DATABASE_*` variable is missing. Responses do not include
  credentials.

### Prisma ORM and migrations

The NestJS API uses [Prisma](https://www.prisma.io/) as the ORM against
Supabase PostgreSQL. Schema and migrations live in `apps/api`:

| Path | Purpose |
| ---- | ------- |
| `apps/api/prisma/schema.prisma` | Prisma schema (no product tables yet) |
| `apps/api/prisma/migrations/` | Committed SQL migrations |
| `apps/api/prisma.config.ts` | Prisma CLI configuration (connection URL) |
| `apps/api/src/generated/prisma/` | Generated Prisma Client (gitignored; run `prisma:generate`) |

**Environment:** set `DATABASE_URL` in `apps/api/.env`, or keep using
`DATABASE_*` — `prisma.config.ts` and the API derive the URL automatically.
Never commit real credentials. Never add database variables to `apps/web`.

**Prerequisites:** a Supabase development database with network access from
your machine. No local PostgreSQL or Docker is required.

From `apps/api` (or the repo root via `bun run --filter=api …`):

```sh
bun run prisma:generate          # generate Prisma Client (also runs before build/check-types)
bun run prisma:migrate           # create/apply a development migration from schema changes
bun run prisma:migrate:deploy    # apply pending migrations (e.g. staging/production)
bun run prisma:migrate:status    # inspect migration history vs the database
```

To reproduce the schema on a clean database, apply committed migrations with
`prisma:migrate:deploy`. Do **not** run `prisma migrate reset` against the
shared Supabase development database.

`PrismaService` (`apps/api/src/database/prisma.service.ts`) connects during
NestJS startup and disconnects on shutdown. `/health/ready` still uses the
existing `pg` pool via `DatabaseService`; domain repositories are not added
yet.

See **[apps/api/docs/PRISMA.md](apps/api/docs/PRISMA.md)** for a full Prisma agent guide and usage reference.

**Optional later: local Docker PostgreSQL**

Compose config remains in `compose.yaml` for when you want a local database
again. It is not part of the current default workflow.

```sh
docker compose up -d          # start PostgreSQL 16 (or bun run db:up)
docker compose ps             # status (or bun run db:status)
docker compose down           # stop; keeps the named volume (or bun run db:down)
docker compose down -v        # stop and delete local data
```

If you switch back, use local defaults in `apps/api/.env` (`localhost` /
`opspilot`) and set `DATABASE_SSL=false` or omit it. If host port 5432 is
already taken, set `POSTGRES_PORT` in a gitignored root `.env` and match
`DATABASE_PORT` in `apps/api/.env`.

## Quality checks

From the repository root:

```sh
bun run lint          # ESLint / oxlint via Turborepo
bun run check-types   # TypeScript checks via Turborepo
bun run format        # Prettier write
bun run format:check  # Prettier check
bun run build         # Production build via Turborepo
```

To reproduce CI's frozen install:

```sh
bun install --frozen-lockfile
```

## Testing

The API uses [Vitest](https://vitest.dev/). The web app does not have a test
suite yet; do not add placeholder web tests.

Run API tests from `apps/api` (CI does the same):

```sh
cd apps/api
bun run test        # unit tests
bun run test:watch  # unit tests in watch mode
bun run test:cov    # unit tests with coverage
bun run test:e2e    # E2E tests
```

No extra secrets are required. GitHub Actions CI does not start PostgreSQL.
Unit and E2E tests still pass without a database. `/health/ready` returns
503 when PostgreSQL is unavailable.

**Conventions (API)**

| Kind        | Location                            | Naming          |
| ----------- | ----------------------------------- | --------------- |
| Unit        | Colocated in `src/`                 | `*.spec.ts`     |
| Integration | `test/integration/` when introduced | `*.spec.ts`     |
| E2E         | `test/`                             | `*.e2e-spec.ts` |

## Continuous integration

GitHub Actions runs on every pull request and on every push to `main`. The
workflow is [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

CI uses Node.js 24 (`engines.node`) and Bun 1.3.13
(`devEngines.packageManager`). Dependencies are installed with
`bun install --frozen-lockfile`. Turborepo remote caching is not enabled.

**What CI validates**

| Check            | Command                           |
| ---------------- | --------------------------------- |
| Lint             | `bun run lint`                    |
| Type checking    | `bun run check-types`             |
| Unit tests       | `cd apps/api && bun run test`     |
| E2E tests        | `cd apps/api && bun run test:e2e` |
| Production build | `bun run build`                   |

CI does not copy `.env` files, does not start PostgreSQL, does not use
production secrets, and does not deploy. Example files under
`.env.example` are documentation only. Unit and E2E tests do not require a
running database.

**Reproduce CI locally**

```sh
bun install --frozen-lockfile
bun run lint
bun run check-types
bun run build
cd apps/api && bun run test && bun run test:e2e
```

**Pull request review**

OpenRabbit runs on non-draft pull requests via
[`.github/workflows/reviewer.yml`](.github/workflows/reviewer.yml) (`pull_request`
for same-repo PRs, `pull_request_target` for forks). It posts a summary and
inline comments using Gemini through Google's OpenAI-compatible API.

**Required secret**

1. Go to **Settings → Secrets and variables → Actions → Secrets**.
2. Create `LLM_API_KEY` with your Google AI Studio API key value.

**Optional model variable**

1. Go to **Settings → Secrets and variables → Actions → Variables**.
2. Create `OPENRABBIT_LLM_MODEL`.
3. Paste **one** model id from the lists below (exact string, no quotes).

If `OPENRABBIT_LLM_MODEL` is unset, the workflow defaults to `gemini-3.7-flash`.

Google AI Pro / Ultra consumer plans are not separate API model names. Paid API
billing mainly affects quotas; you still paste one of the ids below.

**Free / Flash (copy one)**

```text
gemini-3.7-flash
```

```text
gemini-3.6-flash
```

```text
gemini-3.5-flash
```

```text
gemini-3-flash-preview
```

```text
gemini-2.5-flash
```

```text
gemini-3.1-flash-lite
```

```text
gemini-3.5-flash-lite
```

```text
gemini-2.5-flash-lite
```

```text
gemini-flash-latest
```

```text
gemini-flash-lite-latest
```

**Pro (copy one)**

```text
gemini-3.1-pro-preview
```

```text
gemini-3.1-pro-preview-customtools
```

```text
gemini-2.5-pro
```

```text
gemini-pro-latest
```

Image-only models (`gemini-3-pro-image`, `gemini-3.1-flash-image`, and similar)
are not recommended for PR review. If a model returns 404 or 503, switch
`OPENRABBIT_LLM_MODEL` to another id from these lists.

When Gemini returns high demand / 503 / 429, the workflow posts a warning
comment on the PR and **does not fail** the GitHub check. Other errors (missing
or invalid `LLM_API_KEY`, bad config) still fail the job.


## Troubleshooting

### Incorrect Bun or Node.js version

Symptoms: install failures, `engines` warnings, Next.js or Nest CLI errors,
or behavior that differs from CI.

```sh
node --version   # need v24+
bun --version    # need 1.3.13
```

Install Node.js 24 from [nodejs.org](https://nodejs.org/) or a version
manager (`nvm`, `fnm`). Install Bun 1.3.13 from [bun.sh](https://bun.sh/).

### Missing environment files

Symptoms: missing local overrides, or confusion about which file to edit.

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

The apps start without these files today. Copy them so local overrides have
a place to live. Never commit the copied files.

### Dependency installation problems

Symptoms: missing packages, lockfile errors, or a broken `node_modules`.

- Run installs from the **repository root**, not from an app directory.
- Use `bun install`. The lockfile is `bun.lock`.
- `bun install --frozen-lockfile` fails if `package.json` and `bun.lock`
  disagree. If you changed dependencies, run `bun install` and commit the
  updated lockfile.
- To reset: remove `node_modules` (and workspace `node_modules` if present)
  and run `bun install` again from the root.

### Ports already in use

| App        | Default port | Configured by                                 |
| ---------- | ------------ | --------------------------------------------- |
| API        | 3000         | `PORT` in `apps/api/.env`, otherwise `3000`   |
| Web        | 3001         | `apps/web` `next dev --port 3001`             |
| PostgreSQL | 5432         | `POSTGRES_PORT` (Compose, bound to 127.0.0.1) |

If `bun run dev` fails because a port is taken, stop the other process or
set `PORT` in `apps/api/.env`. The web port is set in
`apps/web/package.json`; keep it away from 3000 so it does not collide with
the API.

### PostgreSQL is not reachable

Symptoms: `/health/ready` returns `503` with
`{"status":"not_ready","database":"unavailable"}`. Logs may mention a ping
failure; they must not print the password.

Confirm `apps/api/.env` has Supabase `DATABASE_HOST`, `DATABASE_PORT`,
`DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, and `DATABASE_SSL=true`
(see `apps/api/.env.example`). Values must come from the dashboard and must
not be committed.

Local Docker is optional and unused in the current workflow. If you enable it
later and port 5432 is already in use, set `POSTGRES_PORT` in a root `.env`
and match `DATABASE_PORT` in `apps/api/.env`.

## Useful links

- [Turborepo tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Turborepo filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [NestJS](https://docs.nestjs.com)
- [Next.js](https://nextjs.org/docs)
