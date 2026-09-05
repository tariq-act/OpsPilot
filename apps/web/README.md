# OpsPilot web

Next.js App Router UI for OpsPilot (`apps/web`). Package name: `web`.

The root [README](../../README.md) covers prerequisites, env files, and
monorepo commands. Architecture: [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md).

## Role in the monorepo

- Depends on `@repo/ui` for shared React components.
- Lints with `@repo/eslint-config/next-js`.
- Extends `@repo/typescript-config/nextjs.json`.
- Does **not** connect to PostgreSQL or Supabase. Database variables belong
  only in `apps/api`.
- Does **not** call the API yet. `NEXT_PUBLIC_API_URL` is documented in
  `.env.example` and is not read by source.

Current UI is the Turborepo starter page in `app/page.tsx`.

## Run

From the repository root:

```bash
bun install
cp apps/web/.env.example apps/web/.env.local
bun run dev --filter=web
```

`bun run dev` from the root starts **web and API** together. From this
directory after a root install:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001). Development is pinned to
port **3001** so it does not collide with the API on 3000.

No environment variables are required to render the UI. Copy `.env.example` to
`.env.local` for local overrides. `NEXT_PUBLIC_*` values are exposed to the
browser; never put secrets in them.

## Scripts

| Script        | Command                        | Notes                                                                                                                 |
| ------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `dev`         | `next dev --port 3001`         | Hot reload on 3001                                                                                                    |
| `build`       | `next build`                   | Production build                                                                                                      |
| `start`       | `next start`                   | Serves the production build. Next.js defaults to port **3000** unless you pass a port — that can collide with the API |
| `lint`        | `eslint --max-warnings 0`      | Shared Next.js ESLint config                                                                                          |
| `check-types` | `next typegen && tsc --noEmit` | Typecheck                                                                                                             |

From the repo root, `bun run lint`, `bun run check-types`, `bun run build`,
and `bun run dev` include this workspace via Turborepo.

There is no `test` or `test:e2e` script in this package.

## Layout

```text
apps/web/app/
  layout.tsx       root layout (local Geist fonts via next/font/local)
  page.tsx         home page
  globals.css
  page.module.css
```
