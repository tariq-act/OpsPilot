---
name: opspilot-roadmap
description: OpsPilot product phases and planned features. Load for planning. Not implementation status.
---

# OpsPilot Roadmap

Roadmap ≠ implementation. Verify against `current-state` and the repository before treating a phase as done.

Statuses below: **Done** / **Partial** / **Not started** / **Unknown** relative to repo evidence as of 2026-10-18.

## Phase 1 — Foundation

**Purpose:** Runnable monorepo, tooling, DB access, CI.

**Major features:** Turborepo/Bun, NestJS + Next.js apps, PostgreSQL + ORM, health checks, CI.

**Dependencies:** None.

**Status:** Done (Drizzle/Better Auth era; docs still stale).

## Phase 2 — Identity & Organization

**Purpose:** Auth, org tenancy, roles, invitations.

**Major features:** Signup/login, sessions, organizations, memberships, roles, invites, onboarding UI.

**Dependencies:** Phase 1.

**Status:** Partial — API + auth/onboarding/accept UI done; dedicated Team management UI incomplete (#74).

## Phase 3 — Core CRM

**Purpose:** Customer records as the CRM root.

**Major features:** Customer CRUD, org scoping, soft deactivate, related audit surfaces.

**Dependencies:** Phase 2.

**Status:** Partial — API + web list/detail/create done; polish/search later.

## Phase 4 — Job Management

**Purpose:** Service requests → jobs operational core.

**Major features:** Service requests, jobs, status lifecycle, notes/photos/activity, cancellation.

**Dependencies:** Phase 3.

**Status:** Partial — API + web for requests/jobs largely done.

## Phase 5 — Scheduling

**Purpose:** Schedule and assign field work.

**Major features:** Job schedule, assignments/reassign, dispatch day board, conflict/workload views.

**Dependencies:** Phase 4 + technicians.

**Status:** Partial — API + web dispatch board done; advanced calendar/optimization not started.

## Phase 6 — Technician Workflow

**Purpose:** Field execution for assigned jobs.

**Major features:** My Work, progress/complete, notes/photos; future mobile-native experience.

**Dependencies:** Phases 4–5.

**Status:** Partial — web My Work/execution done; dedicated mobile app / richer field UX not started (#46 still open historically).

## Phase 7 — Billing

**Purpose:** Invoice and collect payment.

**Major features:** Invoices/items, send/void, payments/refunds; hosted checkout later.

**Dependencies:** Jobs completion (typical).

**Status:** Partial — APIs done; web invoices/payments UI missing (#47); payment provider (#75/#76) not started.

## Phase 8 — Customer Experience

**Purpose:** Customer-facing request/status/payment flows.

**Major features:** Customer portal, request intake, appointment updates.

**Dependencies:** Phases 3–7 (varies by slice).

**Status:** Not started (#55).

## Phase 9 — Notifications

**Purpose:** Reliable customer/ops communications and follow-ups.

**Major features:** Notification records, retries, follow-ups; production email/SMS/WhatsApp providers.

**Dependencies:** Core domain events.

**Status:** Partial — notification/follow-up APIs + automation hooks; production providers not started (#48); management UI incomplete (#63).

## Phase 10 — Reporting

**Purpose:** Operational and revenue visibility.

**Major features:** Analytics endpoints, reports UI, owner dashboard KPIs.

**Dependencies:** Jobs/billing data.

**Status:** Partial — analytics APIs + basic dashboard overview; reports UI missing (#57/#67).

## Phase 11 — Production Readiness

**Purpose:** Harden for real tenants.

**Major features:** Security review, secrets validation, tests/e2e, observability, deploy, doc alignment, RLS policy strategy if needed.

**Dependencies:** Core product slices chosen for launch.

**Status:** Not started / early (#61, #82); test suite empty; README/architecture stale.

## Adjacent / later (from product doc & issues)

- Automation UI (#63) — engine API exists
- Audit viewer (#73) — API + partial embeds exist
- Inventory/parts (#59/#70/#71)
- Global search (#58/#68/#69)
- AI intake/assistant (#56/#64/#65)
- Online payments (#75/#76)

Canonical long-form vision: `OPSPILOT_FEATURES.md` (MVP / Phase 2 / Phase 3 sections there are product planning language, not repo status).
