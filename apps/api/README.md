# OpsPilot API

NestJS HTTP API for OpsPilot (`apps/api`). Package name: `api`.

PostgreSQL access uses [Prisma](https://www.prisma.io/) for the ORM and
migrations, and `node-postgres` (`pg`) for `GET /health/ready`. The current
database is hosted Supabase PostgreSQL.

The root [README](../../README.md) is the local development guide. Architecture:
[docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md). Prisma details:
[docs/PRISMA.md](docs/PRISMA.md).

## Current HTTP surface

| Method | Path            | Behavior                                                                                                               |
| ------ | --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/`             | `Hello World!`                                                                                                         |
| `GET`  | `/health`       | `{ "status": "ok" }` (no database)                                                                                     |
| `GET`  | `/health/ready` | `200` `{ "status": "ready", "database": "connected" }` or `503` `{ "status": "not_ready", "database": "unavailable" }` |

There are no authenticated or domain endpoints yet.

## NestJS layout

```text
apps/api/src/
  main.ts                 bootstrap; loads .env; listens on PORT or 3000
  app.module.ts           root module
  app.controller.ts       GET /
  app.service.ts
  health/                 HealthModule + HealthController
  database/
    database.module.ts    global DatabaseModule
    database.service.ts   pg pool (health ping; discrete DATABASE_* only)
    prisma.service.ts     Prisma 7 client (@prisma/adapter-pg)
    database-url.ts       DATABASE_URL or build from DATABASE_*
  generated/prisma/       generated client (gitignored)
```

`AppModule` imports `DatabaseModule` and `HealthModule`.

## Run the API

From the repository root (preferred):

```bash
bun install
cp apps/api/.env.example apps/api/.env
bun run dev --filter=api
```

From this directory after a root `bun install`:

```bash
bun run dev          # nest start --watch (same as start:dev)
bun run start        # nest start (no watch)
bun run start:debug  # nest start --debug --watch
bun run build        # prisma generate && nest build
bun run start:prod   # node dist/main (run build first)
```

Default URL: [http://localhost:3000](http://localhost:3000).

Environment files live in `apps/api`. `PORT` is optional (default `3000`).
Configure `DATABASE_URL` and/or `DATABASE_HOST`, `DATABASE_PORT`,
`DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, and `DATABASE_SSL=true`
from the Supabase dashboard. Do not commit `.env`.

`SUPABASE_URL` and `SUPABASE_ANON_KEY` appear in `.env.example` as optional
server-only placeholders. Application source does not read them yet.

The web app must not use database variables. Local Docker Compose is optional
and unused for the current Supabase default.

## Tests

Vitest. No extra secrets. CI runs these from `apps/api` without PostgreSQL,
after `check-types` has already run `prisma:generate`. After a fresh clone,
generate the client first (`bun run prisma:generate`) if you run tests
without `check-types`.

```bash
bun run test         # unit: src/**/*.spec.ts
bun run test:watch
bun run test:cov
bun run test:e2e     # E2E: test/**/*.e2e-spec.ts (vitest.config.e2e.ts)
```

`GET /health/ready` is `503` when PostgreSQL is unavailable. E2E asserts the
status is `200` or `503` and that the body does not leak connection details.

There is no integration-test directory yet.

## Prisma

| Path                    | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| `prisma/schema.prisma`  | Schema (no product models yet)               |
| `prisma/migrations/`    | Committed migrations                         |
| `prisma.config.ts`      | CLI config; resolves `DATABASE_URL`          |
| `src/generated/prisma/` | Generated client (`bun run prisma:generate`) |

```bash
bun run prisma:generate          # generate client
bun run prisma:migrate           # dev migration from schema changes
bun run prisma:migrate:deploy    # apply migrations
bun run prisma:migrate:status    # migration status
```

`build` and `check-types` run `prisma:generate` first. When database env is
unset, the Prisma CLI uses a local placeholder URL so generate can run in CI.

`PrismaService` is provided by `DatabaseModule` for future repositories. Do
not run `prisma migrate reset` against the shared Supabase development
database.

## Lint and types

```bash
bun run lint           # oxlint src/ test/
bun run check-types    # prisma generate && tsc --noEmit
```

From the repo root, `bun run lint` and `bun run check-types` include this
workspace via Turborepo.

## Notes

- Module system: ESM (`"type": "module"`). Imports use `.js` specifiers for
  TypeScript source.
- `/health/ready` uses `DatabaseService` (`DATABASE_*` parts), not
  `DATABASE_URL` and not `PrismaService`.
- `@supabase/server` is a dependency in `package.json` but is not imported by
  `src/` yet.
