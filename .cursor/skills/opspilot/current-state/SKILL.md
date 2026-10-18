---
name: opspilot-current-state
description: Latest OpsPilot implementation status. Source of truth for progress. Update after meaningful implementation work.
---

# OpsPilot Current State

## Current Phase

Phase 6–7 transition: core ops APIs and primary web workflows exist; billing UI and several linked nav modules are incomplete.

## Current Milestone

Close the web gap for modules that already have backend APIs (invoices/payments, team, analytics, automation UI, settings) while keeping tenant/RBAC intact.

## Completed

- Monorepo (Bun + Turborepo), NestJS API, Next.js web, CI (lint/types/build)
- Better Auth email/password + session cookies
- Organizations, memberships, invitations (API + accept UI + onboarding)
- Customers, service requests, jobs, technicians APIs
- Job scheduling, assignment, execution (notes, photos, activity, progress, complete)
- Invoices, payments, notifications, follow-ups APIs
- Automation engine API + in-process workers
- Analytics query APIs
- Audit logging API + interceptor
- Web: auth, dashboard shell, customers, service requests, jobs, dispatch, technicians, My Work

## In Progress

- None verified as actively WIP on `main` (last merged: technician My Work, PR #104)

## Blocked

- None verified

## Remaining (high priority, verified gaps)

- Web invoices / payments screens (sidebar link exists; no routes)
- Web team / invitations management UI (API exists; invite accept page only)
- Web analytics / reports pages (API exists; sidebar link only)
- Web automation / follow-up management UI (API exists)
- Web settings page (sidebar link only)
- Dedicated audit log viewer (partial embed on some pages)
- Automated tests (Jest configured; no `*.spec.ts` / e2e suite present)
- Docs: README + `docs/ARCHITECTURE.md` still describe Prisma / foundation-only (issue #82)
- Production readiness, provider integrations, inventory, AI, customer portal (see roadmap)

## Backend

### Completed

- Domains: auth, organizations, customers, service-requests, jobs, technicians, invoices, payments, notifications, automation, analytics, audit, storage, health
- Drizzle schema + 15 migrations (auth through audit)
- `src/db/queries/*` persistence helpers; thin controllers + service RBAC
- Swagger at `/docs`

### In Progress

- None verified

### Remaining

- Online payment provider + webhooks (issue #75)
- Inventory / parts APIs (issues #59, #70)
- Global search API (issues #58, #68)
- AI intake/assistant API (issues #56, #64)
- Production notification providers (issue #48)
- Seed data (`db:seed` is a stub)
- Test coverage for auth, RBAC, and domain flows

## Frontend

### Completed

- Auth (login/signup), middleware session gate, org onboarding, invite accept
- Dashboard overview (KPIs; invoice pending count via API)
- Customers, service requests, jobs, technicians (list/detail/create dialogs)
- Dispatch day board + schedule/assign flows
- Technician My Work + job execution UI
- Design-system showcase at `/design-system`
- TanStack Query + `lib/api` client with org headers

### In Progress

- None verified

### Remaining

- Routes: `/dashboard/invoices`, `/analytics`, `/team`, `/settings` (nav only)
- Invoice/payment management UI (issue #47)
- Team/member management UI (issue #74)
- Analytics dashboard UI (issue #67)
- Automation/follow-up UI (issue #63)
- Audit viewer UI (issue #73)
- Mobile-responsive sidebar (fixed `w-64`; no drawer)
- Google OAuth button is disabled (“Coming soon”)
- Web tests: none

## Authentication

- better-auth + `@thallesp/nestjs-better-auth`
- App routes: `POST /auth/signup`, `POST /auth/login`; native `/api/auth/*`
- Web: `better-auth/react` client; cookie sessions; `credentials: "include"`

## Authorization

- Server-side membership + role checks in services
- Roles: `OWNER`, `ADMIN`, `DISPATCHER`, `TECHNICIAN`
- Org scope via `x-organization-id`
- Technician-scoped list visibility for some resources

## Database

- Hosted PostgreSQL (Supabase documented); Drizzle ORM + drizzle-kit
- RLS enabled on business tables with no policies (API uses privileged URL)
- Product tables present (see engineering skill)

## API

- NestJS REST; no global prefix
- ValidationPipe (whitelist / forbidNonWhitelisted)
- OpenAPI generated from DTOs

## Infrastructure

- GitHub Actions: CI (lint, check-types, build); PR labeler; dependency review
- API unit/e2e CI steps currently commented out
- Optional local Postgres via `compose.yaml` (not required default)

## Testing

- API: Jest scripts present; **no implemented test files found**
- Web: no test suite
- Spec verify docs exist under `docs/specs/*/verify.md` (manual)

## Current Ticket

Unknown / Needs verification against the live project board. Recent merge: #104 technician My Work. Open issue most aligned with next product gap: **#47 Build invoice and payment management web screens**.

## Current Task

Context skills system creation (this file). No product feature in flight from this chat.

## Next Recommended Task

Build web invoices (+ payments) screens against existing invoice/payment APIs (`#47`), or sync stale open issues `#40`–`#46` with repo evidence via project-board update.

## Last Updated

2026-10-18

## Board hygiene note

Several older open issues (#40–#46, #41) describe work that appears shipped in `apps/web`. Do not treat open status as incomplete without re-checking code; run the project-board skill before bulk status changes.
