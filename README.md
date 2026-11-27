# OpsPilot

OpsPilot is an operations-focused copilot. This repository is a
[Bun](https://bun.sh/) + [Turborepo](https://turborepo.dev/) monorepo with a
Next.js web app and a NestJS API.

The API uses Drizzle ORM with PostgreSQL. You can run PostgreSQL locally
with Docker Compose or connect the API to a hosted database.

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

For the local database, install and start Docker Desktop (or a Docker Engine
with Docker Compose). Only the NestJS API connects to PostgreSQL.
`compose.yaml` runs PostgreSQL 16 at `127.0.0.1:5433` with persistent storage.
You can also use a hosted PostgreSQL database by setting the API connection URL.

## Getting started

For a fresh checkout, from the repository root (keep existing environment files):

```sh
bun install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
bun run db:up
bun run --filter=api db:migrate
bun run dev
```

Set `BETTER_AUTH_SECRET` in `apps/api/.env` before starting the API. You can
generate one with `openssl rand -base64 32`. The API example already contains
the local database URL. If an existing API environment file points to a hosted
database, follow [Database](#database) to select the local connection before
running migrations. Do not commit `.env` or `.env.local`.

- API: [http://localhost:3000](http://localhost:3000)
- Web: [http://localhost:3001](http://localhost:3001)

`bun run dev` runs each workspace `dev` script through Turborepo:

- API: `nest start --watch` on port 3000 (`PORT` overrides this)
- Web: `next dev --port 3001`

The API loads `apps/api/.env` at process start when that file exists
(`process.loadEnvFile`). Existing process environment variables are not
overridden.

The API requires `DATABASE_URL`. `GET /health/ready` returns `503` when that
database is unreachable. The search tests use an isolated database and do not
connect to your development database.

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
| `.env.example`          | Local Docker Compose defaults               | committed |
| `.env`                  | Optional local Docker Compose overrides     | ignored   |
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

| Variable              | Used by             | Purpose                                                                    |
| --------------------- | ------------------- | -------------------------------------------------------------------------- |
| `POSTGRES_DB`         | Docker Compose      | Database name, default `opspilot`                                          |
| `POSTGRES_USER`       | Docker Compose      | Local database user, default `opspilot`                                    |
| `POSTGRES_PASSWORD`   | Docker Compose      | Local development password, default `opspilot`                             |
| `POSTGRES_PORT`       | Docker Compose      | Host port, default `5433`                                                  |
| `DATABASE_URL`        | API and Drizzle CLI | PostgreSQL connection URL, required                                        |
| `PORT`                | API                 | HTTP port, default `3000`                                                  |
| `BETTER_AUTH_SECRET`  | API                 | Private authentication secret                                              |
| `BETTER_AUTH_URL`     | API                 | API origin serving authentication, default example `http://localhost:3000` |
| `WEB_ORIGIN`          | API                 | Browser origin allowed to call the API with credentials                    |
| `NEXT_PUBLIC_API_URL` | Web                 | API origin, default `http://localhost:3000`                                |

`POSTGRES_*` values belong in the optional root `.env`. Application values
belong in the app environment files. Drizzle and the readiness endpoint both
use `DATABASE_URL`; separate `DATABASE_HOST`, `DATABASE_SSL`, and similar
variables are not read by the current API. Keep the URL in sync with any
Compose overrides. URL encode special characters in credentials.

**Secrets**

- Never commit `.env`, `.env.local`, `.env.*.local`, passwords, or API keys.
- Never expose secrets through `NEXT_PUBLIC_*`.
- Keep application database URLs and hosted credentials in `apps/api` only.
- If a secret is committed by mistake, rotate it.

## Database

The API uses [Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL.
Next.js calls the API and does not connect to PostgreSQL directly.

### Local Docker database

```sh
bun run db:up       # start PostgreSQL and wait up to 60 seconds for health
bun run db:status   # inspect container health and published port
bun run db:logs     # follow PostgreSQL logs
bun run db:shell    # open psql in the container
bun run db:down     # stop the container, retaining database data
```

The default connection for `apps/api/.env` is:

```dotenv
DATABASE_URL=postgresql://opspilot:opspilot@127.0.0.1:5433/opspilot
```

Port `5433` avoids conflicting with a PostgreSQL installation using `5432`.
The container listens on `5432` internally and publishes only to `127.0.0.1`.
Local PostgreSQL does not require SSL. To customize the database name, user,
password, or host port, copy `.env.example` to a root `.env` and update both
the `POSTGRES_*` values and the API URL.

Apply the committed migrations to the local database from the repository root:

```sh
DATABASE_URL=postgresql://opspilot:opspilot@127.0.0.1:5433/opspilot bun run --filter=api db:migrate
```

This explicit URL selects the local database even if `apps/api/.env` still
contains a hosted connection. Use your customized URL if you changed the
Compose defaults. To make the running API use this database too, set its
`DATABASE_URL` in `apps/api/.env` and restart the API.

| Path                          | Purpose                                                |
| ----------------------------- | ------------------------------------------------------ |
| `compose.yaml`                | PostgreSQL service, health check and persistent volume |
| `apps/api/drizzle.config.ts`  | Drizzle CLI configuration                              |
| `apps/api/src/db/schema/`     | TypeScript database schema                             |
| `apps/api/src/db/migrations/` | Committed SQL migrations                               |
| `apps/api/src/db/index.ts`    | API database connection                                |

Data persists in the `opspilot_postgres_data` volume across restarts and
`db:down`. Changing `POSTGRES_USER`, `POSTGRES_PASSWORD`, or `POSTGRES_DB`
does not change an already initialized database. Avoid `docker compose down -v`
unless you intend to delete the local database. Migrations are explicit and
are not run automatically by container startup.

### Local demo data

After applying the migrations, optionally populate a local development database
with fictional OpsPilot data:

```sh
bun run db:up
bun run --filter=api db:migrate
DEMO_SEED_PASSWORD='OpsPilotDemo123!' bun run --filter=api db:seed
bun run dev
```

Set `DATABASE_URL` in `apps/api/.env` to the local PostgreSQL instance and
configure `BETTER_AUTH_SECRET` before running the seed. Choose a password of
12–128 characters; the one above is an example for local development only.
All new demo accounts use the supplied password and are created via Better Auth.

| Sign-in email                    | Role                                |
| -------------------------------- | ----------------------------------- |
| `seed.owner@opspilot.test`       | Northstar owner                     |
| `seed.admin@opspilot.test`       | Northstar admin / Harbor dispatcher |
| `seed.dispatcher@opspilot.test`  | Northstar dispatcher                |
| `seed.technician@opspilot.test`  | Northstar technician                |
| `seed.technician2@opspilot.test` | Northstar technician                |
| `seed.other-owner@opspilot.test` | Harbor owner                        |

The seed creates two organizations for role and organization-isolation testing,
along with customers, service requests, jobs, assignments, invoices, payments,
invitation history, follow-ups, sample notification history, disabled automation
rules and audit events. No real messages are sent or payment requests made.
Harbor has no invoices, so its owner can test the currency setting.

The seed only runs against loopback PostgreSQL connections outside production.
Running it again leaves the existing demo organizations and their data
unchanged, including any passwords or roles you have edited. It does not reset
the database. Jobs and other dated fixtures are relative to the initial seed run.

### Hosted PostgreSQL

You can keep using a hosted database such as Supabase by setting its private
connection URL in `apps/api/.env`. Prefer a direct or session mode connection
for the API and enable SSL when required by the provider. Docker is only
needed for the local database. Never commit hosted credentials.

### Readiness

After starting the API, [http://localhost:3000/health/ready](http://localhost:3000/health/ready)
returns `200` when `SELECT 1` succeeds, or `503` when the configured database
is unavailable. [http://localhost:3000/health](http://localhost:3000/health)
checks process liveness.

## Quality checks

From the repository root:

```sh
bun run lint          # turbo: oxlint (api), ESLint (web, ui)
bun run check-types   # turbo: TypeScript checks
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

The API needs a database URL and authentication settings. Keep existing
environment files when copying examples. Never commit the copied files.

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
contains the intended `DATABASE_URL`. For the local database, run
`bun run db:up`, check `bun run db:status`, and confirm the URL uses the
published port (default `5433`). Do not commit private connection values.

## Related documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API](apps/api/README.md)
- [Web](apps/web/README.md)
- [Prisma](apps/api/docs/PRISMA.md)
