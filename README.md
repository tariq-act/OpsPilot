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
| [Docker](https://docs.docker.com/get-docker/) | Compose v2 (`docker compose`) | Local PostgreSQL (`compose.yaml`)          |

Confirm:

```sh
node --version     # v24.x or later
bun --version      # 1.3.13
docker compose version
```

**PostgreSQL** is the application database. Only the NestJS API connects to
it. Next.js must not connect to PostgreSQL or Supabase. Local development
uses PostgreSQL 16 via Docker Compose. Hosted/staging uses Supabase
PostgreSQL through the same `DATABASE_URL` connection string.

## Getting started

From the repository root:

```sh
bun install
docker compose up -d
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
bun run dev
```

- API: [http://localhost:3000](http://localhost:3000)
- Web: [http://localhost:3001](http://localhost:3001)

`bun run dev` runs each workspace `dev` script through Turborepo. That starts
the API (`nest start --watch` on port 3000) and the web app
(`next dev --port 3001`). The API loads `apps/api/.env` at process start
(`process.loadEnvFile`). Existing process environment variables are not
overridden.

No extra secrets are required for local Docker PostgreSQL. The API listens
on port 3000 when `PORT` is unset. Copy `apps/api/.env.example` so
`DATABASE_URL` points at the Compose database. Unit and E2E tests do not
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

| Variable              | App        | Required                     | Purpose                                                                            | Example                                                  |
| --------------------- | ---------- | ---------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `PORT`                | `apps/api` | Optional                     | HTTP listen port. Default `3000`.                                                  | `3000`                                                   |
| `NODE_ENV`            | all        | Optional                     | Runtime/build environment.                                                         | `development`                                            |
| `NEXT_PUBLIC_API_URL` | `apps/web` | Optional                     | Browser-safe API origin. Not read yet.                                             | `http://localhost:3000`                                  |
| `DATABASE_URL`        | `apps/api` | Required for `/health/ready` | PostgreSQL URI. Local default below; Supabase URI for hosted. Never in `apps/web`. | `postgresql://opspilot:opspilot@127.0.0.1:5432/opspilot` |

**Secrets**

- Never commit `.env`, `.env.local`, `.env.*.local`, credentials, API keys,
  or tokens.
- Never expose secrets through `NEXT_PUBLIC_*`.
- Keep API secrets in `apps/api` only.
- If a secret is committed by mistake, rotate it.

### PostgreSQL

Only `apps/api` connects to PostgreSQL, using `node-postgres` (`pg`) and a
standard connection URI. There is no ORM and no Supabase JavaScript client.

**Local (Docker Compose)**

From the repository root:

```sh
docker compose up -d          # start PostgreSQL 16 (or bun run db:up)
docker compose ps             # status (or bun run db:status)
docker compose down           # stop; keeps the named volume
docker compose down -v        # stop and delete local data
```

Local defaults (not production secrets):

| Compose variable    | Default    | Purpose                        |
| ------------------- | ---------- | ------------------------------ |
| `POSTGRES_DB`       | `opspilot` | Database name                  |
| `POSTGRES_USER`     | `opspilot` | Role                           |
| `POSTGRES_PASSWORD` | `opspilot` | Local-only password            |
| `POSTGRES_PORT`     | `5432`     | Host port (bound to 127.0.0.1) |

Override them with a gitignored root `.env` if you need to. Data lives in
the named Docker volume `postgres_data`.

The API URI that matches those defaults:

```
DATABASE_URL=postgresql://opspilot:opspilot@127.0.0.1:5432/opspilot
```

**Hosted/staging (Supabase PostgreSQL)**

1. In the Supabase dashboard, copy a PostgreSQL URI (Settings → Database).
2. Prefer a **direct** or **session-mode** URI for this long-lived Nest
   process (client-side pooling is already handled by `pg`).
3. Put that URI in `apps/api/.env` as `DATABASE_URL`. Include
   `sslmode=require` when the provider requires TLS.
4. Never commit the Supabase URI. Never add it to `apps/web`.

The application does not hard-code Supabase hostnames, project refs, or
clients. Any standard PostgreSQL URI works.

**Verify connectivity**

After `docker compose up -d` and `bun run dev --filter=api`:

- [http://localhost:3000/health](http://localhost:3000/health) — process
  liveness (`{"status":"ok"}`)
- [http://localhost:3000/health/ready](http://localhost:3000/health/ready)
  — `200` when `SELECT 1` succeeds, `503` when PostgreSQL is down or
  `DATABASE_URL` is unset. Responses do not include credentials.

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
inline comments using Gemini (`gemini-2.5-flash`) through Google's
OpenAI-compatible API. Add a **GitHub Actions** repository secret named
`LLM_API_KEY` whose value is the Google AI Studio key (not the name of the
key). Naming a key `LLM_API_KEY` in AI Studio does not create the GitHub
secret. Reviews fail until that GitHub secret exists.

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

### PostgreSQL is not running

Symptoms: `/health/ready` returns `503` with
`{"status":"not_ready","database":"unavailable"}`. Logs may mention a ping
failure; they must not print the password.

```sh
docker compose ps
docker compose up -d
```

Confirm `apps/api/.env` has `DATABASE_URL` matching the Compose defaults
(see `apps/api/.env.example`). For Supabase, confirm you used the dashboard
URI in `apps/api/.env` only, and that the string is not committed.

If port 5432 is already in use, set `POSTGRES_PORT` in a root `.env` and
update `DATABASE_URL` to the same port.

## Useful links

- [Turborepo tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Turborepo filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [NestJS](https://docs.nestjs.com)
- [Next.js](https://nextjs.org/docs)
