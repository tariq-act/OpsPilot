# Prisma ORM and migrations

OpsPilot uses **Prisma 7** with **Supabase PostgreSQL**. The NestJS API lives
in `apps/api`. There are **no product tables yet** — only the ORM and
migration infrastructure.

## What is in the repo

| Path                                                           | Purpose                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------ |
| `apps/api/prisma/schema.prisma`                                | Prisma schema (generator + PostgreSQL datasource; no models) |
| `apps/api/prisma/migrations/`                                  | Committed SQL migrations                                     |
| `apps/api/prisma/migrations/20260901120000_init/migration.sql` | Foundation migration (comment only)                          |
| `apps/api/prisma.config.ts`                                    | Prisma CLI configuration                                     |
| `apps/api/src/generated/prisma/`                               | Generated client (gitignored)                                |
| `apps/api/src/database/database-url.ts`                        | Resolves `DATABASE_URL` from env                             |
| `apps/api/src/database/prisma.service.ts`                      | NestJS Prisma client (`@prisma/adapter-pg`)                  |

Package scripts (from `apps/api/package.json`):

| Script                  | Command                 |
| ----------------------- | ----------------------- |
| `prisma:generate`       | `prisma generate`       |
| `prisma:migrate`        | `prisma migrate dev`    |
| `prisma:migrate:deploy` | `prisma migrate deploy` |
| `prisma:migrate:status` | `prisma migrate status` |

`build` and `check-types` run `prisma:generate` first.

## Prerequisites

1. Node.js 24+ and Bun 1.3.13 (root `README.md`).
2. A Supabase project with PostgreSQL.
3. Local API env (never commit this):

   ```sh
   cp apps/api/.env.example apps/api/.env
   ```

4. Fill values from **Supabase → Settings → Database**. Either:

   - `DATABASE_URL`, or
   - `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`,
     `DATABASE_PASSWORD`, and `DATABASE_SSL=true`

   When `DATABASE_URL` is unset or empty, Prisma CLI and the API build the URL
   from `DATABASE_*`.

5. Install from the repo root: `bun install`.

Database variables are **server-only**. Never add them to `apps/web` or any
`NEXT_PUBLIC_*` variable.

No local PostgreSQL or Docker is required for this workflow.

## Day-to-day commands

Run from `apps/api`, or from the repo root with `bun run --filter=api …`.

### Generate Prisma Client

Required after schema changes or a fresh clone (generated output is not in
git):

```sh
cd apps/api
bun run prisma:generate
```

Also runs automatically before `bun run build` and `bun run check-types`.
If database env is missing, `prisma.config.ts` uses a placeholder URL so
generate can run in CI.

### Validate schema

```sh
cd apps/api
bunx prisma validate
```

### Migration status

```sh
cd apps/api
bun run prisma:migrate:status
```

Compares committed migrations to the connected database.

### Apply existing migrations

```sh
cd apps/api
bun run prisma:migrate:deploy
```

Does not drop data. Safe for the empty foundation migration.

### Create a migration after schema changes

```sh
cd apps/api
bun run prisma:migrate
```

Prisma prompts for a name, writes SQL under `prisma/migrations/`, and applies
it to the configured database. Commit `schema.prisma` and the new migration
folder together.

### Run the API

```sh
bun run dev --filter=api
```

- `GET /health` — process liveness
- `GET /health/ready` — PostgreSQL ping via the existing `pg` pool
  (`DatabaseService`), not Prisma

### Tests (no database required)

Generate the client first if `src/generated/prisma/` is missing (CI does this
during `check-types` before tests):

```sh
cd apps/api
bun run prisma:generate
bun run test
bun run test:e2e
```

## Adding a model later

This is **not implemented**. When you add a business entity:

1. Edit `apps/api/prisma/schema.prisma`.
2. Run `bun run prisma:migrate` from `apps/api`.
3. Run `bun run prisma:generate` if the client was not already regenerated.
4. Import `DatabaseModule` in the feature module (it is not global) and inject
   `PrismaService`. Use `prismaService.prisma`.
5. Commit schema and migration files. Do not commit `src/generated/`.

## Commands to avoid

| Command                            | Why                                             |
| ---------------------------------- | ----------------------------------------------- |
| `prisma migrate reset`             | Drops data — do not run against shared Supabase |
| Committing `apps/api/.env`         | Contains secrets                                |
| Putting `DATABASE_*` in `apps/web` | Wrong app; risk of leaking server credentials   |
| Skipping migration files in git    | Breaks a reproducible schema                    |

## Environment (from `apps/api/.env.example` only)

Never commit real values.

| Variable            | Required                             | Purpose                        |
| ------------------- | ------------------------------------ | ------------------------------ |
| `DATABASE_URL`      | Optional if `DATABASE_*` is complete | Full PostgreSQL URL for Prisma |
| `DATABASE_HOST`     | Optional if `DATABASE_URL` is set    | Host when URL is not set       |
| `DATABASE_PORT`     | Optional if `DATABASE_URL` is set    | Port (example default `5432`)  |
| `DATABASE_NAME`     | Optional if `DATABASE_URL` is set    | Database name                  |
| `DATABASE_USER`     | Optional if `DATABASE_URL` is set    | Database user                  |
| `DATABASE_PASSWORD` | Optional if `DATABASE_URL` is set    | Database password              |
| `DATABASE_SSL`      | Recommended for Supabase             | Example sets `true`            |

For Prisma connectivity, set **either** `DATABASE_URL` **or** the full
`DATABASE_*` set. `/health/ready` still requires the discrete `DATABASE_*`
variables because `DatabaseService` does not read `DATABASE_URL`.

URL shape (placeholders only):

```text
postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

## Troubleshooting

### `Prisma client is not configured`

`DATABASE_URL` and `DATABASE_*` are missing or incomplete in `apps/api/.env`.

### `Can't reach database server`

- Confirm the Supabase project is running.
- Use a **direct** or **session-mode** connection for Nest/Prisma.
- Set `DATABASE_SSL=true`.

### Pending migrations

```sh
cd apps/api
bun run prisma:migrate:deploy
```

### Type errors after clone

Generated client is not in git:

```sh
cd apps/api
bun run prisma:generate
```

## Related docs

- Root guide: [README.md](../../../README.md)
- API: [README.md](../README.md)
- Architecture: [ARCHITECTURE.md](../../../docs/ARCHITECTURE.md)
- Example env: [`.env.example`](../.env.example)
