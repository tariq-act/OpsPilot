# OpsPilot web

Next.js App Router UI for OpsPilot (`apps/web`). Package name: `web`.

Root docs: [README](../../README.md), [ARCHITECTURE](../../docs/ARCHITECTURE.md),
[DEPLOYMENT](../../docs/DEPLOYMENT.md).

## Role

- Talks to the Nest API via `NEXT_PUBLIC_API_URL` (Better Auth client, fetch helpers, middleware session checks).
- Does **not** connect to PostgreSQL. Never put `DATABASE_URL` or auth secrets in this app.
- React Query Devtools render only when `NODE_ENV === "development"`.

## Run

```bash
bun install
cp apps/web/.env.example apps/web/.env.local
bun run dev --filter=web
```

Open [http://localhost:3001](http://localhost:3001).

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_API_URL` | API origin (auth + API calls) |
| `NEXT_PUBLIC_APP_URL` | Canonical web origin (metadata) |

## Scripts

| Script | Command |
| ------ | ------- |
| `dev` | `next dev --port 3001` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `eslint --max-warnings 0` |
| `check-types` | `next typegen && tsc --noEmit` |
