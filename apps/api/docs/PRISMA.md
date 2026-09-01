# Prisma ORM and migrations — agent guide and usage

This document explains:

1. **How to use and run** the Prisma setup already in OpsPilot.
2. **How to implement the same foundation from scratch** using an AI coding agent (Cursor, Copilot, Claude Code, etc.).

OpsPilot uses **Prisma 7** with **Supabase PostgreSQL**. The NestJS API lives in `apps/api`. There are **no product/business tables yet** — only the ORM and migration infrastructure.

---

## What is already in the repo

| Path | Purpose |
| ---- | ------- |
| `apps/api/prisma/schema.prisma` | Prisma schema (foundation only) |
| `apps/api/prisma/migrations/` | Committed SQL migrations |
| `apps/api/prisma.config.ts` | Prisma CLI configuration |
| `apps/api/src/generated/prisma/` | Generated client (gitignored) |
| `apps/api/src/database/database-url.ts` | Resolves `DATABASE_URL` from env |
| `apps/api/src/database/prisma.service.ts` | NestJS Prisma integration |

---

## Prerequisites

Before running Prisma commands:

1. **Node.js 24+** and **Bun 1.3.13** (see root `README.md`).
2. **Supabase project** with PostgreSQL enabled.
3. **Local env file** for the API (never commit this):

   ```sh
   cp apps/api/.env.example apps/api/.env
   ```

4. Fill database values in `apps/api/.env` from **Supabase → Settings → Database**.

   You can configure **either**:

   - `DATABASE_URL` (single connection string), **or**
   - discrete `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, and `DATABASE_SSL=true`

   When `DATABASE_URL` is unset, the API and Prisma CLI build it from `DATABASE_*`.

5. Install dependencies from the repo root:

   ```sh
   bun install
   ```

**Important:** database variables are **server-only**. Never add them to `apps/web` or any `NEXT_PUBLIC_*` variable.

---

## How to run and use (day-to-day)

All commands below assume you are in `apps/api`, or run from the repo root with `--filter=api`.

### Generate Prisma Client

Required after schema changes or a fresh clone:

```sh
cd apps/api
bun run prisma:generate
```

Also runs automatically before `bun run build` and `bun run check-types`.

### Check schema validity

```sh
cd apps/api
bunx prisma validate
```

### Inspect migration status

Compares committed migrations against the database:

```sh
cd apps/api
bun run prisma:migrate:status
```

- **Up to date** — database matches migration history.
- **Pending migrations** — run deploy (see below).

### Apply migrations (development / shared Supabase)

Use when migrations already exist in Git and you need to apply them:

```sh
cd apps/api
bun run prisma:migrate:deploy
```

Safe for the empty foundation migration. Does **not** drop data.

### Create a new migration (after you add models)

When you change `schema.prisma` and need a new migration:

```sh
cd apps/api
bun run prisma:migrate
```

Prisma will prompt for a migration name, generate SQL, and apply it to your dev database.

### Run the API

```sh
# from repo root
bun run dev --filter=api

# or from apps/api
bun run dev
```

Health checks:

- `GET /health` — process liveness
- `GET /health/ready` — PostgreSQL connectivity (uses existing `pg` pool, not Prisma)

### Run tests (no database required)

```sh
cd apps/api
bun run test
bun run test:e2e
```

Unit tests mock or unset database env. They do not need Supabase.

### Full quality check (matches CI)

```sh
# from repo root
bun run lint
bun run check-types
bun run build
cd apps/api && bun run test && bun run test:e2e
```

---

## Typical workflow when you add a model later

This is **not implemented yet** — documented for when you add business entities.

1. Edit `apps/api/prisma/schema.prisma` — add a model.
2. Create and apply a migration:

   ```sh
   cd apps/api
   bun run prisma:migrate
   ```

3. Regenerate the client (also done by migrate in many setups; explicit is fine):

   ```sh
   bun run prisma:generate
   ```

4. Use `PrismaService` in NestJS:

   ```typescript
   import { PrismaService } from "./database/prisma.service.js";

   @Injectable()
   export class ExampleService {
     constructor(private readonly prisma: PrismaService) {}

     async example() {
       // return this.prisma.prisma.$queryRaw`SELECT 1`;
     }
   }
   ```

5. Commit **both** `schema.prisma` and the new folder under `prisma/migrations/`.

---

## Commands you should avoid

| Command | Why |
| ------- | --- |
| `prisma migrate reset` | Destroys all data — do not run against shared Supabase dev |
| Committing `apps/api/.env` | Contains secrets |
| Putting `DATABASE_*` in `apps/web` | Exposes server credentials to the wrong app |
| Skipping migration files in Git | Breaks reproducible schema for other developers and CI |

---

## Environment variable reference

Documented in `apps/api/.env.example` only. Never commit real values.

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `DATABASE_URL` | Optional* | Full PostgreSQL URL for Prisma |
| `DATABASE_HOST` | Optional* | Host when URL is not set |
| `DATABASE_PORT` | Optional* | Port (often `5432`) |
| `DATABASE_NAME` | Optional* | Database name |
| `DATABASE_USER` | Optional* | Database user |
| `DATABASE_PASSWORD` | Optional* | Database password |
| `DATABASE_SSL` | Recommended | Set `true` for Supabase |

\* Either `DATABASE_URL` **or** the full set of `DATABASE_*` variables must be set for database connectivity.

Example URL shape (replace placeholders):

```text
postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

---

## Implement from scratch with an AI agent

Use this section if you start a **new NestJS + Supabase project** and want an agent to add the same Prisma foundation OpsPilot has.

### Step 1 — Give the agent context

Tell the agent to read these first (adjust paths for your repo):

- `apps/api/package.json`
- `apps/api/tsconfig.json`
- `apps/api/src/` and `apps/api/test/`
- Root `package.json`, `turbo.json`
- `apps/api/.env.example` (only example env files — never real `.env`)
- Any existing database-related code

### Step 2 — Copy this agent prompt

Paste and adapt the block below into your agent chat:

```markdown
Implement the ORM and database migration infrastructure for this project.

SCOPE (strict):
- Implement ONLY Prisma ORM + migration foundation.
- Do NOT add business/domain entities (no Customer, User, Job, etc.).
- Do NOT refactor unrelated code.
- Preserve existing working configuration (health checks, env conventions).

STACK:
- Monorepo: Bun + Turborepo
- Backend: NestJS in apps/api
- Database: PostgreSQL on Supabase (no local Docker required)
- ORM: Prisma 7

ENV RULES:
- NEVER read, modify, or print real .env files.
- Only update .env.example for documentation.
- Use DATABASE_URL for Prisma; support building it from DATABASE_* when unset.
- Never expose database credentials to the Next.js/browser bundle.

PRISMA 7 REQUIREMENTS:
- prisma/schema.prisma with generator output to src/generated/prisma
- prisma.config.ts at apps/api root for CLI datasource URL
- @prisma/client, prisma, @prisma/adapter-pg dependencies
- Initial empty migration committed to prisma/migrations/
- Scripts: prisma:generate, prisma:migrate, prisma:migrate:deploy, prisma:migrate:status
- build and check-types must run prisma:generate first

NESTJS:
- PrismaService with OnModuleInit/OnModuleDestroy
- Use @prisma/adapter-pg with pg pool
- Single client via DI in DatabaseModule
- Unit tests with mocked/unset env (no real Supabase in unit tests)

VALIDATION:
Run lint, check-types, build, test, test:e2e, prisma validate, prisma generate.
Do not run prisma migrate reset against Supabase.

DOCUMENTATION:
Add a markdown guide explaining agent setup and day-to-day usage.
```

### Step 3 — Review the agent’s output

Check that the agent:

- [ ] Added only Prisma-related dependencies
- [ ] Created `prisma/schema.prisma` without business models
- [ ] Created `prisma.config.ts` (Prisma 7 — URL not in schema file)
- [ ] Added `@prisma/adapter-pg` and wired `PrismaService` correctly
- [ ] Committed an initial migration under `prisma/migrations/`
- [ ] Gitignored `src/generated/prisma/`
- [ ] Updated only `.env.example`, not real env files
- [ ] Added tests that pass without a live database
- [ ] Did not run `prisma migrate reset` on a shared database

### Step 4 — Configure and verify locally

```sh
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with Supabase credentials (do not commit)

cd apps/api
bun run prisma:generate
bunx prisma validate
bun run prisma:migrate:status
bun run prisma:migrate:deploy   # apply pending migrations
bun run test
```

---

## Troubleshooting

### `Prisma client is not configured`

`DATABASE_URL` and `DATABASE_*` are missing or incomplete in `apps/api/.env`. Copy from `.env.example` and fill Supabase values.

### `Can't reach database server`

- Confirm Supabase project is running.
- Use a **direct** or **session-mode** connection string for Nest/Prisma (not pooler-only if it causes issues).
- Set `DATABASE_SSL=true` for Supabase.

### `Following migration have not yet been applied`

Run:

```sh
cd apps/api
bun run prisma:migrate:deploy
```

### Type errors after clone

Generated client is not in Git. Run:

```sh
cd apps/api
bun run prisma:generate
```

### CI fails on build but local dev works

Ensure `prisma:generate` runs before `nest build` and that CI does not need a real database for unit tests.

---

## Related docs

- Root local development guide: [`README.md`](../../../README.md)
- API overview: [`../README.md`](../README.md)
- Environment template: [`../.env.example`](../.env.example)
