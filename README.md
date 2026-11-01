# OpsPilot

OpsPilot is a multi-tenant operations platform for small field-service businesses
(HVAC, plumbing, electrical, appliance repair, and similar trades). It helps
office staff and technicians run the full job lifecycle in one place:

```text
Customer → Service request → Job → Schedule / assign → Field work →
Invoice → Payment → Follow-up
```

This repository is a [Bun](https://bun.sh/) + [Turborepo](https://turborepo.dev/)
monorepo: a Next.js web app and a NestJS API backed by PostgreSQL (typically
Supabase) via Drizzle ORM and Better Auth.

**Related docs:** [Architecture](docs/ARCHITECTURE.md) ·
[Production deployment](docs/DEPLOYMENT.md)

---

## Table of contents

1. [Overview](#overview)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Installation](#installation)
5. [User roles](#user-roles)
6. [Usage guide](#usage-guide)
7. [Commands](#commands)
8. [Backend and database](#backend-and-database)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### Problems it solves

- Dispatch and technicians working from scattered spreadsheets and texts
- No clear ownership of service requests, schedules, and job status
- Invoice and payment tracking disconnected from completed jobs
- Weak audit trail for who changed what inside the business

### Key features (implemented)

| Area | What you can do |
| ---- | ---------------- |
| Auth & orgs | Email/password signup and login, create an organization, accept invitations, switch orgs |
| Customers | Create and manage customer records (technicians see customers linked to their jobs) |
| Service requests | Intake, update, accept/cancel requests |
| Jobs & dispatch | Create jobs from accepted requests, schedule, assign technicians, day board |
| Field execution | My Work for technicians: progress, notes, photos, complete jobs |
| Technicians | Profiles linked to `TECHNICIAN` members (create/edit: owners & admins) |
| Invoices & payments | Create/send/void invoices; record manual payments; refunds (owners & admins) |
| Notifications | View customer notification history; retry failed deliveries |
| Follow-ups | Feedback / maintenance follow-ups after jobs |
| Automation | Rules that react to domain events (in-process workers) |
| Analytics | Operational summaries for managers |
| Audit logs | Organization audit trail (owners & admins) |

**Not implemented yet (do not expect them):** customer self-service portal,
Google OAuth (UI shows “Coming soon”), online payment providers, inventory,
AI intake, team/settings screens in the web app, and populated `db:seed` data.

---

## Tech stack

| Layer | Choice |
| ----- | ------ |
| Runtime / packages | Bun **1.3.13**, Node.js **≥ 24** |
| Monorepo | Turborepo 2 |
| Web | Next.js 16 (App Router), React 19, TanStack Query, Tailwind CSS |
| API | NestJS 12, class-validator, Swagger (`/docs` in non-production) |
| Auth | Better Auth + `@thallesp/nestjs-better-auth` (cookie sessions) |
| ORM | Drizzle ORM + `drizzle-kit` + `postgres.js` |
| Database | PostgreSQL 16 (hosted Supabase by default; optional Docker Compose) |
| Lint / format | oxlint (API), ESLint (web/ui), Prettier |
| Tests | Jest on `apps/api` (`passWithNoTests` until suites exist); no web tests |
| CI | GitHub Actions: lint, typecheck, test, production build |

---

## Architecture

```text
Browser (apps/web :3001)
  └── NEXT_PUBLIC_API_URL
        └── NestJS API (apps/api :3000)
              ├── Better Auth  /api/auth/*
              ├── REST modules (session cookie + x-organization-id)
              └── Drizzle → PostgreSQL
```

| Path | Package | Responsibility |
| ---- | ------- | -------------- |
| `apps/web` | `web` | Product UI, auth pages, dashboard, middleware session gate |
| `apps/api` | `api` | HTTP API, auth, RBAC, persistence, automation workers, health |
| `packages/ui` | `@repo/ui` | Shared React primitives |
| `packages/eslint-config` | `@repo/eslint-config` | Shared ESLint configs |
| `packages/typescript-config` | `@repo/typescript-config` | Shared TypeScript bases |

Only the API connects to the database. Never put `DATABASE_URL`,
`BETTER_AUTH_SECRET`, or Supabase service-role keys in the web app.

Org-scoped API calls use:

1. Better Auth **session cookie**
2. Header **`x-organization-id`** (must be an org the user belongs to)

---

## Installation

### Prerequisites

```sh
node --version   # v24.x or later
bun --version    # 1.3.13
```

You also need a PostgreSQL database. Options:

- **Recommended:** Hosted Supabase → Dashboard → Settings → Database → connection string
- **Optional local:** Docker via `compose.yaml` (`bun run db:up`)

### Clone and install

```sh
git clone <your-fork-or-remote-url>
cd OpsPilot
bun install
```

### Environment variables

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Generate an auth secret:

```sh
openssl rand -base64 32
```

#### `apps/api/.env` (server only)

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `DATABASE_URL` | Yes | Postgres URL for Drizzle (use `sslmode=require` on Supabase) |
| `BETTER_AUTH_SECRET` | Yes | ≥ 32 characters; signs sessions |
| `BETTER_AUTH_URL` | Dev default OK | Public API origin (`http://localhost:3000`) |
| `WEB_ORIGIN` | Dev default OK | Web origin for CORS + trusted origins (`http://localhost:3001`) |
| `PORT` | No | Listen port (default `3000`) |
| `SWAGGER_ENABLED` | No | Force OpenAPI UI on/off |
| `UPLOAD_DIR` | No | Local job photo storage (default `./uploads`) |
| `NODE_ENV` | Prod | Set `production` on deploy (enforces https origins) |

Example:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require
BETTER_AUTH_SECRET=paste-output-of-openssl-here
BETTER_AUTH_URL=http://localhost:3000
WEB_ORIGIN=http://localhost:3001
```

#### `apps/web/.env.local`

| Variable | Required | Purpose |
| -------- | -------- | ------- |
| `NEXT_PUBLIC_API_URL` | Yes for real API calls | API origin (must match `BETTER_AUTH_URL`) |
| `NEXT_PUBLIC_APP_URL` | Recommended | Canonical web origin for metadata |

Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Database setup

```sh
# Optional: start local Postgres
bun run db:up

# Apply committed Drizzle migrations (forward-only)
bun run db:migrate
```

`bun run --filter=api db:seed` currently logs that no seed data is configured.
Create your first user through the signup UI instead.

### Run locally

```sh
bun run dev
```

| App | URL |
| --- | --- |
| Web | http://localhost:3001 |
| API | http://localhost:3000 |
| Health | http://localhost:3000/health |
| Ready | http://localhost:3000/health/ready |
| Swagger | http://localhost:3000/docs (when not production) |

Single app:

```sh
bun run dev --filter=api
bun run dev --filter=web
```

---

## User roles

Internal membership roles (schema enum). Customers are **records**, not login
roles—there is no customer portal yet.

Member statuses: `ACTIVE`, `INVITED`, `SUSPENDED`.

| Role | Responsibilities | Notable permissions |
| ---- | ---------------- | ------------------- |
| **OWNER** | Owns the org; full operational + team control | Everything managers can do; invite/manage members; create technician profiles; refunds; audit logs |
| **ADMIN** | Organization manager | Same operational scope as OWNER for most modules; team management; refunds; audit logs |
| **DISPATCHER** | Day-to-day ops | Customers, requests, jobs, dispatch, invoices, payments (record), notifications, follow-ups, automation, analytics; **view** technicians; **cannot** manage team, refund, or view audit logs |
| **TECHNICIAN** | Field work | **My Work** and assigned jobs only; scoped customer visibility; notes/photos/progress/complete on assigned jobs; **no** dispatch/invoices/analytics nav |

Invitations may assign `ADMIN`, `DISPATCHER`, or `TECHNICIAN` (never `OWNER`).
The first user who creates an organization becomes its **OWNER**.

### Web navigation by role

| Screen | OWNER | ADMIN | DISPATCHER | TECHNICIAN |
| ------ | :---: | :---: | :--------: | :--------: |
| My Work | | | | ✓ |
| Jobs | ✓ | ✓ | ✓ | ✓ (assigned) |
| Dispatch | ✓ | ✓ | ✓ | |
| Service requests | ✓ | ✓ | ✓ | ✓ |
| Customers | ✓ | ✓ | ✓ | ✓ (scoped) |
| Technicians | ✓ | ✓ | ✓ | |
| Invoices | ✓ | ✓ | ✓ | |
| Notifications | ✓ | ✓ | ✓ | |
| Follow-ups | ✓ | ✓ | ✓ | |
| Automation | ✓ | ✓ | ✓ | |
| Analytics | ✓ | ✓ | ✓ | |
| Audit logs | ✓ | ✓ | | |

Team and Settings routes are **not** in the web UI today (API support for
organizations/members/invitations still exists).

---

## Usage guide

### All roles — first-time setup

1. Open http://localhost:3001/signup and create an account (email + password).
2. Complete **onboarding**: create an organization (name, slug, timezone, currency).
3. You land on `/dashboard` as **OWNER**.
4. Sign out / sign in later via `/login`.

Accept an invite (non-owners): open the invite link → `/invitations/accept`.

### OWNER / ADMIN

1. **Customers** → create customers you will bill and schedule.
2. **Technicians** → create technician profiles linked to members with role `TECHNICIAN` (invite those users first via API if needed).
3. **Service requests** → create intake; move to **ACCEPTED** when ready for a job.
4. **Jobs** / **Dispatch** → create a job from an accepted request, set schedule, assign a technician.
5. After field completion → **Invoices** → create from the job, send, record payments; refunds if needed (OWNER/ADMIN).
6. Use **Notifications**, **Follow-ups**, **Automation**, and **Analytics** for post-job ops.
7. **Audit logs** → review sensitive changes (OWNER/ADMIN only).

### DISPATCHER

1. Manage **Customers**, **Service requests**, **Jobs**, and **Dispatch** the same way as managers.
2. View **Technicians** and assign them to jobs (profile create/edit is OWNER/ADMIN).
3. Create and send **Invoices**; record **payments** (no refunds).
4. Use **Notifications**, **Follow-ups**, **Automation**, and **Analytics**.
5. You will not see **Audit logs** or team-management UI.

### TECHNICIAN

1. Open **My Work** (`/dashboard/my-work`) for jobs assigned to you.
2. Open a job → update progress (`EN_ROUTE` → `ARRIVED` → `IN_PROGRESS`), add notes, upload photos, mark **COMPLETED**.
3. Use **Jobs**, **Service requests**, and **Customers** only for records you are allowed to see (assignment-scoped).
4. You will not see Dispatch, Invoices, Notifications, Follow-ups, Automation, Analytics, or Audit logs in the sidebar.

### Typical happy path (example)

```text
1. OWNER signs up → creates “Acme HVAC”
2. OWNER invites a DISPATCHER and a TECHNICIAN (API / invite flow)
3. DISPATCHER adds Customer “Jane Doe”
4. DISPATCHER opens Service request “No heat” → ACCEPTED
5. DISPATCHER creates Job, schedules tomorrow 9:00, assigns TECHNICIAN
6. TECHNICIAN opens My Work → arrives → completes job + photos
7. DISPATCHER creates Invoice → sends → records cash/card payment
8. Follow-up / notification rows appear for office follow-through
```

---

## Commands

From the **repository root** unless noted.

### Development

| Command | Description |
| ------- | ----------- |
| `bun install` | Install workspace dependencies |
| `bun run dev` | Start API + web via Turborepo |
| `bun run dev --filter=api` | API only (`nest start --watch`, port 3000) |
| `bun run dev --filter=web` | Web only (`next dev --port 3001`) |

### Quality and build

| Command | Description |
| ------- | ----------- |
| `bun run lint` | oxlint (api) + ESLint (web, ui) |
| `bun run check-types` | TypeScript checks |
| `bun run test` | API Jest (`passWithNoTests` if empty) |
| `bun run test:e2e` | API e2e script (requires e2e config/tests) |
| `bun run build` | Production builds for workspaces |
| `bun run format` / `format:check` | Prettier write / check |

### Database

| Command | Description |
| ------- | ----------- |
| `bun run db:up` | Start optional local Postgres (Compose) |
| `bun run db:down` | Stop Compose Postgres |
| `bun run db:status` | Compose status |
| `bun run db:migrate` | Apply pending Drizzle migrations |
| `bun run db:generate` | Generate migration from schema diff |
| `bun run --filter=api db:studio` | Drizzle Studio |
| `bun run --filter=api db:seed` | Seed stub (no data yet) |

### API production start (after `bun run build`)

```sh
cd apps/api
NODE_ENV=production bun run start:prod   # node dist/main
```

---

## Backend and database

### API layout

Nest modules under `apps/api/src/` include: `auth`, `organizations`,
`customers`, `service-requests`, `jobs`, `technicians`, `invoices`, `payments`,
`notifications` (notifications + follow-ups), `automation`, `analytics`,
`audit`, `storage`, `health`.

Representative routes (no global prefix; session required unless noted):

| Prefix | Purpose |
| ------ | ------- |
| `GET /health`, `GET /health/ready` | Liveness / DB readiness (anonymous) |
| `/api/auth/*` | Better Auth handlers |
| `POST /auth/signup`, `POST /auth/login` | App auth helpers |
| `/organizations`, `/invitations` | Orgs, members, invites |
| `/customers`, `/service-requests`, `/jobs`, `/technicians` | Core ops |
| `/invoices`, `/payments`, `/invoices/:id/payments` | Billing |
| `/notifications`, `/follow-ups` | Customer comms / follow-ups |
| `/automation/rules` | Automation rules |
| `/analytics`, `/audit-logs` | Reporting / audit |

OpenAPI: http://localhost:3000/docs when Swagger is enabled.

Global behavior:

- `ValidationPipe` (whitelist + forbid non-whitelisted)
- CORS limited to `WEB_ORIGIN`
- Rate limiting (`@nestjs/throttler`; health endpoints skipped)
- Graceful shutdown closes the Postgres pool

### Schema and migrations

- Schema: `apps/api/src/db/schema/` (`auth`, `organization`, `invitation`,
  `customer`, `service-request`, `job` + assignments/notes/photos/activity,
  `technician`, `invoice`, `payment`, notifications, follow-ups, automation,
  audit-log)
- Migrations: `apps/api/src/db/migrations/` (Drizzle)
- Config: `apps/api/drizzle.config.ts` (reads `DATABASE_URL`)

Business tables enable **RLS** in migrations. The Nest process uses a
privileged `DATABASE_URL`; **application code** enforces tenant isolation and
roles. Do not expose that URL to the browser.

Job statuses: `DRAFT` → `CONFIRMED` → `EN_ROUTE` → `ARRIVED` → `IN_PROGRESS` →
`COMPLETED` (or `CANCELLED`).

### Configuration reminders

- Prefer a **direct or session-mode** Supabase connection for the Nest process.
- Job photos default to local disk (`UPLOAD_DIR`); not multi-instance ready.
- Production env rules and hosting: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Troubleshooting

### `BETTER_AUTH_SECRET must be set…`

Set a secret of at least 32 characters in `apps/api/.env`:

```sh
openssl rand -base64 32
```

### `DATABASE_URL is required` / `/health/ready` returns 503

- Confirm `apps/api/.env` has a reachable `DATABASE_URL`.
- For Supabase, include `sslmode=require`.
- Run `bun run db:migrate` against that database.
- If using Compose: `bun run db:up` then point `DATABASE_URL` at
  `postgresql://opspilot:opspilot@127.0.0.1:5432/opspilot`.

### CORS / login cookie failures

- `WEB_ORIGIN` must match the web origin exactly (e.g. `http://localhost:3001`).
- `NEXT_PUBLIC_API_URL` must match `BETTER_AUTH_URL`.
- Never use `*` for CORS. Restart API after changing env.

### Web cannot reach API

- API on 3000, web on 3001.
- Check `NEXT_PUBLIC_API_URL=http://localhost:3000` in `.env.local`.
- `NEXT_PUBLIC_*` values are baked in at **build** time; restart `next dev`
  after edits.

### Port already in use

```sh
# API default 3000 — override with PORT in apps/api/.env
# Web dev is fixed to 3001 in package scripts
```

### Bun / Node version mismatch

Align with `package.json` (`engines.node` ≥ 24, Bun 1.3.13). Reinstall with:

```sh
bun install --frozen-lockfile
```

### Migrations out of date

```sh
bun run db:migrate
```

Do **not** run destructive reset commands against shared or production
databases. Prefer backup + roll-forward. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Swagger missing in production

Expected. Set `SWAGGER_ENABLED=true` only if you intentionally want `/docs`
exposed.

### Tests exit with “No tests found”

Expected until suites are added; root `bun run test` is configured to pass with
zero tests.

---

## License

Private / `UNLICENSED` (see `apps/api/package.json`).
