---
name: opspilot-engineering
description: OpsPilot architecture, stack, and coding conventions. Load for any OpsPilot implementation task.
---

# OpsPilot Engineering

## Stack (verified)

```text
Monorepo (apps/*, packages/*)
Turborepo
Bun (1.3.13)
TypeScript
Next.js 16 (App Router) + React 19
Tailwind CSS 4 + shadcn/ui (base-luma / Base UI)
NestJS 12
PostgreSQL (Supabase-hosted in docs)
Drizzle ORM + drizzle-kit
better-auth
TanStack Query (web)
Jest scripts (api; suite empty)
```

Do **not** assume Prisma. `README.md` / `docs/ARCHITECTURE.md` are outdated on this point.

## Repository Architecture

| Path | Role |
|------|------|
| `apps/api` | NestJS HTTP API (port 3000) |
| `apps/web` | Next.js UI (dev port 3001) |
| `packages/ui` | Legacy starter components; **web does not import them** |
| `packages/eslint-config` | Shared ESLint |
| `packages/typescript-config` | Shared TS bases |
| `docs/` | Architecture (stale), specs, reviews |
| `.github/workflows/` | CI, labeler, dependency review |

API owns all DB access. Web talks to API via `NEXT_PUBLIC_API_URL` + cookies.

## Backend Rules

- Controllers stay thin; business logic in `*.service.ts`
- Persistence in `apps/api/src/db/queries/*.ts` (read + write helpers colocated; not GraphQL-style query/mutation split)
- Schema in `apps/api/src/db/schema/*`; barrel `schema/index.ts`
- Validate with class-validator DTOs + global ValidationPipe
- Enforce authorization server-side (membership + role); never trust UI hiding
- Tenant: `organizationId` on business rows; header `x-organization-id`
- Keep HTTP concerns out of query helpers
- Document endpoints with Swagger decorators (`@ApiOperation`, response DTOs, `@ApiSession` / `@AllowAnonymous`)
- Prefer extending existing domain modules over new apps/packages

### Backend layout pattern

```text
apps/api/src/<domain>/
  <domain>.module.ts
  <domain>.controller.ts
  <domain>.service.ts
  dto/
```

## Frontend Rules

- Feature folders under `apps/web/components/<feature>/`
- UI primitives in `apps/web/components/ui/` (shadcn-style)
- API wrappers in `apps/web/lib/api/`; React Query in `apps/web/lib/query/`
- Separate server/session concerns from local UI state
- Required UX states: loading, empty, error, success, permission
- Accessible, responsive layouts; reuse existing list/detail/dialog patterns
- Forms today: controlled `useState` + native form (no react-hook-form in deps)

## API Architecture

- REST over NestJS + Express
- No global route prefix
- Session cookie auth; Better Auth at `/api/auth/*`
- App auth helpers: `POST /auth/signup`, `POST /auth/login`
- OpenAPI at `/docs` and `/docs-json`
- File uploads: multer + local disk storage for job photos

## Dependency Rules

- Check existing stack before adding libraries
- Prefer Bun workspaces / existing packages
- Do not reintroduce Prisma
- Do not add a second auth system
- Shared packages only when ≥2 consumers or a clear boundary need

## Quality Commands

```sh
bun run lint
bun run check-types
bun run build
bun run test          # api Jest (currently empty)
bun run test:e2e      # api e2e config may be incomplete
```

From `apps/api`:

```sh
bun run db:generate
bun run db:migrate
bun run db:studio
```
