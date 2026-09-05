# OpsPilot architecture

This describes the **current** repository. It does not propose a future product
architecture.

OpsPilot is an operations-focused copilot. The codebase today is the
engineering foundation: a web app, an API, shared packages, and a Prisma
schema with no product tables yet.

## Monorepo

The repository is a [Turborepo](https://turborepo.dev/) workspace. The package
manager is [Bun](https://bun.sh/) (`1.3.13`). Workspaces are defined in the
root `package.json`:

```text
apps/*        applications
packages/*    shared libraries and config
```

Root scripts (`dev`, `build`, `lint`, `check-types`, `test`, `test:e2e`) call
`turbo run <task>`. Turbo runs that script in every workspace that defines it.
Task graph and cache inputs live in `turbo.json`.

Filter a single workspace by its `package.json` `name`:

```sh
bun run dev --filter=web
bun run dev --filter=api
```

## Applications and packages

| Path                         | Package name              | Role today                                                                   |
| ---------------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| `apps/web`                   | `web`                     | [Next.js](https://nextjs.org/) App Router UI on port **3001** in development |
| `apps/api`                   | `api`                     | [NestJS](https://nestjs.com/) HTTP API on port **3000**                      |
| `packages/ui`                | `@repo/ui`                | Shared React components (`button`, `card`, `code`) imported by `web`         |
| `packages/eslint-config`     | `@repo/eslint-config`     | Shared ESLint configs for Next.js and React packages                         |
| `packages/typescript-config` | `@repo/typescript-config` | Shared TypeScript `tsconfig` bases                                           |

`apps/web` depends on `@repo/ui`, `@repo/eslint-config`, and
`@repo/typescript-config`. `apps/api` does not use those packages; it has its
own TypeScript config and lints with oxlint.

There is no mobile app, no separate worker process, and no additional `apps/*`
workspace.

## How the pieces fit

```text
Developer machine
  bun run dev  (Turborepo)
    ├── apps/web   Next.js  http://localhost:3001
    └── apps/api   NestJS   http://localhost:3000
                      │
                      ├── Prisma Client  (ORM / migrations)
                      └── pg Pool        (/health/ready)
                      │
                      └── Supabase PostgreSQL
```

The web app does **not** call the API yet. `apps/web/.env.example` documents
`NEXT_PUBLIC_API_URL`, but no web source file reads it.

Only `apps/api` connects to PostgreSQL. The web app must not receive
`DATABASE_*`, `DATABASE_URL`, or Supabase server credentials.

## API (NestJS)

Entry point: `apps/api/src/main.ts`. If `apps/api/.env` exists, it is loaded
with `process.loadEnvFile` before the app starts. Existing process environment
variables are not overridden. The HTTP port is `process.env.PORT` or `3000`.

Root module: `AppModule` (`apps/api/src/app.module.ts`).

| Module / file                  | Responsibility                               |
| ------------------------------ | -------------------------------------------- |
| `AppController` / `AppService` | `GET /` returns `Hello World!`               |
| `HealthModule`                 | `GET /health`, `GET /health/ready`           |
| `DatabaseModule` (global)      | `DatabaseService` (`pg`) and `PrismaService` |

`GET /health` is process liveness and does not touch the database.

`GET /health/ready` pings PostgreSQL through `DatabaseService` (`SELECT 1` on
a `pg` pool). That pool is configured from discrete `DATABASE_HOST`,
`DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, and `DATABASE_PASSWORD`.
It does **not** read `DATABASE_URL`. A `200` body is
`{ "status": "ready", "database": "connected" }`; a `503` body is
`{ "status": "not_ready", "database": "unavailable" }`. Responses do not
include credentials.

`PrismaService` is the Prisma 7 client (`@prisma/adapter-pg` + `pg` pool). It
prefers `DATABASE_URL`, or builds a URL from the same `DATABASE_*` variables.
`PrismaService` is wired for future repositories; no domain models exist yet.

## Web (Next.js)

- App Router under `apps/web/app/`
- Development: `next dev --port 3001` (avoids colliding with the API)
- Production start script: `next start` (Next.js default port **3000** unless
  you pass a port)
- Styling: CSS modules + `app/globals.css`
- Fonts: local Geist files via `next/font/local` in `app/layout.tsx`
- Current UI: Turborepo starter page in `app/page.tsx` using `@repo/ui/button`

There is no web test suite, no data-fetching layer, and no auth UI.

## Database

- Hosted **Supabase PostgreSQL** is the current development database.
- **Prisma 7** is the ORM and migration tool (`apps/api/prisma/`).
- The committed schema has **no product models**. The initial migration is a
  comment-only foundation SQL file.
- Generated Prisma Client is written to `apps/api/src/generated/prisma/` and
  is gitignored. `prisma:generate` runs before `build` and `check-types` in
  `apps/api`. CI runs `check-types` before unit and E2E tests so the client
  exists. Running tests alone after a clone requires `prisma:generate` first.

`compose.yaml` defines an optional local PostgreSQL 16 service. Root scripts
`db:up`, `db:down`, and `db:status` wrap Docker Compose. That path is in the
repo but is not the current development default.

Details: [apps/api/docs/PRISMA.md](../apps/api/docs/PRISMA.md) and the root
[README](../README.md).

## Tooling that already exists

| Concern               | What the repo uses                                                       |
| --------------------- | ------------------------------------------------------------------------ |
| JS runtime / installs | Bun 1.3.13, lockfile `bun.lock`                                          |
| Node                  | `engines.node`: `>=24` (CI uses 24)                                      |
| Orchestration         | Turborepo 2                                                              |
| Language              | TypeScript (strict)                                                      |
| API lint              | oxlint in `apps/api`                                                     |
| Web / UI lint         | ESLint via `@repo/eslint-config`                                         |
| Format                | Prettier at the repo root (`format`, `format:check`)                     |
| API unit / E2E tests  | Vitest + Supertest in `apps/api`                                         |
| Web tests             | None                                                                     |
| CI                    | GitHub Actions [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |

## Technical choices (observed)

These are stack facts from the repository, not product ADRs.

1. **Turborepo monorepo** — `apps/*` and `packages/*` workspaces, `turbo.json`
   task graph.
2. **Bun** — `devEngines.packageManager` pins Bun `1.3.13`; installs use
   `bun.lock`.
3. **NestJS** — HTTP API in `apps/api` (Nest 12, Express platform).
4. **Next.js** — product UI in `apps/web` (Next 16, React 19, App Router).
5. **Prisma** — ORM and SQL migrations in `apps/api` (Prisma 7, PostgreSQL).
6. **Supabase PostgreSQL** — documented development database; API connects
   with `pg` and Prisma. `@supabase/server` is listed in `apps/api`
   dependencies but is not imported by application source.
7. **Quality gates** — oxlint/ESLint, `tsc --noEmit` / `next typegen`, Vitest
   unit and E2E tests on the API, Prettier, and `turbo run build`. CI runs
   lint, typecheck, API unit tests, API E2E tests, and production build.

## What is not in the repo yet

Do not assume these exist:

- Authenticated APIs or a session model
- Product domain tables or repositories
- Web → API client calls
- Web unit or E2E tests
- A deployment workflow (CI does not deploy)
- A second GitHub Actions workflow besides `ci.yml`
