---
name: opspilot-decisions
description: OpsPilot architectural decision log. Load when changing architecture or revisiting established choices.
---

# OpsPilot Architecture Decisions

Only decisions evidenced by the repository or review notes. Add new ADRs when a lasting choice is made.

## ADR-001 — Monorepo (Turborepo + Bun)

**Decision:** Single repo with `apps/*` and `packages/*`, orchestrated by Turborepo, packaged with Bun.

**Context:** Need shared TypeScript workspace for web + API without polyrepo overhead.

**Reason:** Simple local DX, shared lint/TS config, unified CI.

**Consequences:** Cross-app changes land in one PR; keep package boundaries intentional.

## ADR-002 — Next.js frontend

**Decision:** Product UI in `apps/web` with Next.js App Router.

**Context:** Need a modern React web client for ops workflows.

**Reason:** App Router, middleware for session gates, strong TypeScript ecosystem.

**Consequences:** Client-heavy data loading via TanStack Query is acceptable; avoid putting DB credentials in the web app.

## ADR-003 — NestJS backend

**Decision:** HTTP API in `apps/api` with NestJS modules/controllers/services.

**Context:** Need structured server for multi-tenant domain logic.

**Reason:** Clear module boundaries, DI, validation/Swagger integration.

**Consequences:** Domain modules grow under `src/<domain>`; controllers stay thin.

## ADR-004 — PostgreSQL

**Decision:** PostgreSQL as the system of record (Supabase-hosted in current docs).

**Context:** Relational multi-tenant data with strong consistency needs.

**Reason:** Fits org-scoped relational models, migrations, and future RLS.

**Consequences:** Only the API connects to the database.

## ADR-005 — Drizzle ORM

**Decision:** Use Drizzle ORM + drizzle-kit (not Prisma).

**Context:** Migrated from an early Prisma foundation (see `docs/reviews/2026-09-20-main.md`).

**Reason:** Schema-as-code colocated with the API; fits Better Auth drizzle adapter.

**Consequences:** Migrations live under `apps/api/src/db/migrations`; do not reintroduce Prisma.

## ADR-006 — Organization-based multi-tenancy

**Decision:** `organization` is the tenant root; business rows carry `organizationId`.

**Context:** Multiple field-service businesses must be isolated.

**Reason:** Clear tenancy boundary for membership, data access, and future RLS policies.

**Consequences:** API requires active membership for org-scoped routes (`x-organization-id`); never trust client org claims alone.

## ADR-007 — Internal roles

**Decision:** Membership roles enum: `OWNER`, `ADMIN`, `DISPATCHER`, `TECHNICIAN`.

**Context:** Different internal personas need different operational permissions.

**Reason:** Matches product roles; services encode role allow-lists per action.

**Consequences:** UI may hide actions by role, but server RBAC is authoritative. `ADMIN` is a first-class role alongside `OWNER`.

## ADR-008 — Customer separated from membership

**Decision:** `customer` records are org-scoped CRM entities, not organization members.

**Context:** Customers are external to the internal team model.

**Reason:** Prevents conflating login identity, staff roles, and service recipients.

**Consequences:** Customer portal identity (if added) needs an explicit future ADR; do not reuse `organization_member` for customers.

## ADR-009 — Better Auth for authentication

**Decision:** better-auth (+ NestJS integration) with email/password and cookie sessions.

**Context:** Needed session auth for web ↔ API without building a custom auth stack.

**Reason:** Drizzle adapter, Nest integration, `/api/auth/*` session endpoints.

**Consequences:** Web uses `better-auth/react` and cookie credentials; protect routes with session checks; do not add a second auth system.

## ADR-010 — Persistence helpers in `db/queries`

**Decision:** Domain services call `src/db/queries/*` helpers rather than embedding SQL in controllers.

**Context:** Keep HTTP and business layers free of raw query sprawl.

**Reason:** Reuse, testability, clearer boundaries.

**Consequences:** Query modules may contain both reads and writes; there is no separate mutations tree.

## ADR-011 — Web UI primitives live in `apps/web`

**Decision:** shadcn/Base UI components under `apps/web/components/ui`; `@repo/ui` starter is unused by web.

**Context:** Product UI needed a full design-token system beyond the Turborepo demo package.

**Reason:** Colocate tokens (`globals.css`) with the app that uses them.

**Consequences:** Prefer extending `components/ui` over reviving `@repo/ui` unless sharing across multiple apps becomes real.
