# OpsPilot

OpsPilot is a Bun + Turborepo monorepo. This document is the local development
guide: a clean checkout should be enough to install dependencies, configure
environment files, and run the web and API apps.

## What's inside

| Path                         | Role                                                   |
| ---------------------------- | ------------------------------------------------------ |
| `apps/web`                   | [Next.js](https://nextjs.org/) product app (port 3001) |
| `apps/api`                   | [NestJS](https://nestjs.com/) API (port 3000)          |
| `packages/ui`                | Shared React component library used by `web`           |
| `packages/eslint-config`     | Shared ESLint configuration                            |
| `packages/typescript-config` | Shared TypeScript configuration                        |

Each package and app is TypeScript.

## Prerequisites

Install these before the first `bun install`:

| Tool                           | Version     | Defined in                                 |
| ------------------------------ | ----------- | ------------------------------------------ |
| [Node.js](https://nodejs.org/) | 24 or later | `package.json` `engines.node`              |
| [Bun](https://bun.sh/)         | 1.3.13      | `package.json` `devEngines.packageManager` |

Confirm:

```sh
node --version   # v24.x or later
bun --version    # 1.3.13
```

**PostgreSQL** is the application database. It is required for
database-backed development. Local PostgreSQL provisioning is not in this
repository yet (that is the next infrastructure step). Current lint, type
checks, tests, production builds, and `bun run dev` do not connect to a
database.

This repository does not use Docker yet. Do not add Compose or containers
for this setup.

## Getting started

From the repository root:

```sh
bun install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
bun run dev
```

- API: [http://localhost:3000](http://localhost:3000)
- Web: [http://localhost:3001](http://localhost:3001)

`bun run dev` runs each workspace `dev` script through Turborepo. That starts
the API (`nest start --watch` on port 3000) and the web app
(`next dev --port 3001`).

No environment variables are required today. The API listens on port 3000
when `PORT` is unset. Tests do not need secrets.

Run a single app:

```sh
bun run dev --filter=api
bun run dev --filter=web
```

## Environment

Application env files are loaded from each app directory, not the repo root.

| File                    | Purpose                                           | Git       |
| ----------------------- | ------------------------------------------------- | --------- |
| `.env.example`          | Workspace convention (this file is comments only) | committed |
| `apps/api/.env.example` | NestJS server variables                           | committed |
| `apps/web/.env.example` | Next.js variables                                 | committed |
| `apps/api/.env`         | Local API secrets / overrides                     | ignored   |
| `apps/web/.env.local`   | Local web overrides (preferred for Next.js)       | ignored   |

**Naming**

- Use `SCREAMING_SNAKE_CASE`.
- Put a variable in the app that reads it.
- **Web, browser-safe:** `NEXT_PUBLIC_*` is inlined into the client bundle.
  Never put secrets here.
- **Web, server-only:** no `NEXT_PUBLIC_` prefix (Server Components, Route
  Handlers, `next.config`).
- **API:** always server-only. Do not use `NEXT_PUBLIC_*`.

**Currently documented variables**

| Variable              | App        | Required | Purpose                                           | Example                 |
| --------------------- | ---------- | -------- | ------------------------------------------------- | ----------------------- |
| `PORT`                | `apps/api` | Optional | HTTP listen port. Default `3000`.                 | `3000`                  |
| `NODE_ENV`            | all        | Optional | Runtime/build environment.                        | `development`           |
| `NEXT_PUBLIC_API_URL` | `apps/web` | Optional | Browser-safe API origin. Not read by the app yet. | `http://localhost:3000` |

**Secrets**

- Never commit `.env`, `.env.local`, `.env.*.local`, credentials, API keys,
  or tokens.
- Never expose secrets through `NEXT_PUBLIC_*`.
- Keep API secrets in `apps/api` only.
- If a secret is committed by mistake, rotate it.

### PostgreSQL

PostgreSQL will be the API's database. When that work lands, expect a
connection setting (such as `DATABASE_URL`) in `apps/api/.env`, documented
in `apps/api/.env.example`. Until then:

- Do not add a database URL just to start the apps.
- Current unit and E2E tests do not need PostgreSQL.
- If a later change fails with a connection error, PostgreSQL is not
  running or not configured. See [Troubleshooting](#troubleshooting).

## Quality checks

From the repository root:

```sh
bun run lint          # ESLint / oxlint via Turborepo
bun run check-types   # TypeScript checks via Turborepo
bun run format        # Prettier write
bun run format:check  # Prettier check
bun run build         # Production build via Turborepo
```

To reproduce CI's frozen install:

```sh
bun install --frozen-lockfile
```

## Testing

The API uses [Vitest](https://vitest.dev/). The web app does not have a test
suite yet; do not add placeholder web tests.

Run API tests from `apps/api` (CI does the same):

```sh
cd apps/api
bun run test        # unit tests
bun run test:watch  # unit tests in watch mode
bun run test:cov    # unit tests with coverage
bun run test:e2e    # E2E tests
```

No extra environment variables, secrets, Docker, or PostgreSQL are required
for the current tests. E2E tests boot Nest in-process.

**Conventions (API)**

| Kind        | Location                            | Naming          |
| ----------- | ----------------------------------- | --------------- |
| Unit        | Colocated in `src/`                 | `*.spec.ts`     |
| Integration | `test/integration/` when introduced | `*.spec.ts`     |
| E2E         | `test/`                             | `*.e2e-spec.ts` |

## Continuous integration

GitHub Actions runs on every pull request and on every push to `main`. The
workflow is [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

CI uses Node.js 24 (`engines.node`) and Bun 1.3.13
(`devEngines.packageManager`). Dependencies are installed with
`bun install --frozen-lockfile`. Turborepo remote caching is not enabled.

**What CI validates**

| Check            | Command                           |
| ---------------- | --------------------------------- |
| Lint             | `bun run lint`                    |
| Type checking    | `bun run check-types`             |
| Unit tests       | `cd apps/api && bun run test`     |
| E2E tests        | `cd apps/api && bun run test:e2e` |
| Production build | `bun run build`                   |

CI does not copy `.env` files, does not use production secrets, and does not
deploy. Example files under `.env.example` are documentation only.

**Reproduce CI locally**

```sh
bun install --frozen-lockfile
bun run lint
bun run check-types
bun run build
cd apps/api && bun run test && bun run test:e2e
```

## Troubleshooting

### Incorrect Bun or Node.js version

Symptoms: install failures, `engines` warnings, Next.js or Nest CLI errors,
or behavior that differs from CI.

```sh
node --version   # need v24+
bun --version    # need 1.3.13
```

Install Node.js 24 from [nodejs.org](https://nodejs.org/) or a version
manager (`nvm`, `fnm`). Install Bun 1.3.13 from [bun.sh](https://bun.sh/).

### Missing environment files

Symptoms: missing local overrides, or confusion about which file to edit.

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

The apps start without these files today. Copy them so local overrides have
a place to live. Never commit the copied files.

### Dependency installation problems

Symptoms: missing packages, lockfile errors, or a broken `node_modules`.

- Run installs from the **repository root**, not from an app directory.
- Use `bun install`. The lockfile is `bun.lock`.
- `bun install --frozen-lockfile` fails if `package.json` and `bun.lock`
  disagree. If you changed dependencies, run `bun install` and commit the
  updated lockfile.
- To reset: remove `node_modules` (and workspace `node_modules` if present)
  and run `bun install` again from the root.

### Ports already in use

| App | Default port | Configured by                               |
| --- | ------------ | ------------------------------------------- |
| API | 3000         | `PORT` in `apps/api/.env`, otherwise `3000` |
| Web | 3001         | `apps/web` `next dev --port 3001`           |

If `bun run dev` fails because a port is taken, stop the other process or
set `PORT` in `apps/api/.env`. The web port is set in
`apps/web/package.json`; keep it away from 3000 so it does not collide with
the API.

### PostgreSQL is not running

The apps and current tests do not connect to PostgreSQL yet. When
database-backed work is added, connection errors usually mean PostgreSQL is
not running or `apps/api/.env` is missing the documented connection
variable. Local PostgreSQL setup will be documented with that
infrastructure. Do not add Docker or a database URL for the current
foundation.

## Useful links

- [Turborepo tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Turborepo filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [NestJS](https://docs.nestjs.com)
- [Next.js](https://nextjs.org/docs)
