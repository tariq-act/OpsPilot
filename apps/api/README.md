# OpsPilot API

NestJS HTTP API (`apps/api`). Package name: `api`.

Root docs: [README](../../README.md), [ARCHITECTURE](../../docs/ARCHITECTURE.md),
[DEPLOYMENT](../../docs/DEPLOYMENT.md).

## Stack

- NestJS 12 + Better Auth
- Drizzle ORM + postgres.js
- PostgreSQL (Supabase)
- Global validation, CORS (`WEB_ORIGIN`), rate limiting, graceful DB shutdown
- Health: `GET /health`, `GET /health/ready`

## Setup

```bash
cp apps/api/.env.example apps/api/.env
# set DATABASE_URL, BETTER_AUTH_SECRET (≥32 chars), BETTER_AUTH_URL, WEB_ORIGIN
bun run db:migrate
bun run dev
```

From the repo root: `bun run dev --filter=api`.

## Scripts

| Script | Purpose |
| ------ | ------- |
| `dev` / `start:dev` | Watch mode |
| `build` | `nest build` → `dist/` |
| `start:prod` | `node dist/main` |
| `check-types` | `tsc --noEmit -p tsconfig.build.json` |
| `lint` | oxlint |
| `db:generate` | Create Drizzle migration from schema |
| `db:migrate` | Apply pending migrations (forward-only) |
| `db:seed` | Seed data |
| `test` | Jest (`passWithNoTests` until suites exist) |

## API docs

Swagger UI: [http://localhost:3000/docs](http://localhost:3000/docs) when not in
production (or when `SWAGGER_ENABLED=true`).

## Production

Do not invent host credentials here. Follow [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md).
Never auto-run destructive migrations. Never expose `DATABASE_URL` or
`BETTER_AUTH_SECRET` to the web app.
