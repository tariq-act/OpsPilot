# Turborepo starter

This Turborepo starter is maintained by the Turborepo core team.

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `web`: the [Next.js](https://nextjs.org/) product app (port 3001)
- `api`: the [NestJS](https://nestjs.com/) API (port 3000)
- `@repo/ui`: a stub React component library used by `web`
- `@repo/eslint-config`: `eslint` configurations (includes `@next/eslint-plugin-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Prerequisites

- [Node.js](https://nodejs.org/) 24 or later
- [Bun](https://bun.sh/) 1.3.13 (see `package.json` `devEngines`)

### Getting started

```sh
bun install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
bun run dev
```

- API: [http://localhost:3000](http://localhost:3000)
- Web: [http://localhost:3001](http://localhost:3001)

No variables are required today. The API listens on port 3000 when `PORT` is unset. Tests do not need secrets.

### Environment

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
- **Web, browser-safe:** `NEXT_PUBLIC_*` is inlined into the client bundle. Never put secrets here.
- **Web, server-only:** no `NEXT_PUBLIC_` prefix (Server Components, Route Handlers, `next.config`).
- **API:** always server-only. Do not use `NEXT_PUBLIC_*`.

**Currently documented variables**

| Variable              | App        | Required | Purpose                                           | Example                 |
| --------------------- | ---------- | -------- | ------------------------------------------------- | ----------------------- |
| `PORT`                | `apps/api` | Optional | HTTP listen port. Default `3000`.                 | `3000`                  |
| `NODE_ENV`            | all        | Optional | Runtime/build environment.                        | `development`           |
| `NEXT_PUBLIC_API_URL` | `apps/web` | Optional | Browser-safe API origin. Not read by the app yet. | `http://localhost:3000` |

**Secrets**

- Never commit `.env`, `.env.local`, `.env.*.local`, credentials, API keys, or tokens.
- Never expose secrets through `NEXT_PUBLIC_*`.
- Keep API secrets in `apps/api` only.
- If a secret is committed by mistake, rotate it.

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting
- [Vitest](https://vitest.dev/) for API unit and E2E tests

### Testing

The API uses Vitest. The web app does not have a test suite yet; do not add placeholder web tests.

No extra environment variables or secrets are required for the current tests.

**Repository**

```sh
bun run test      # unit tests in workspaces that define them (currently api)
bun run test:e2e  # E2E tests in workspaces that define them (currently api)
```

**API (`apps/api`)**

```sh
bun run test        # unit tests
bun run test:watch  # unit tests in watch mode
bun run test:cov    # unit tests with coverage
bun run test:e2e    # E2E tests
```

**Conventions (API)**

| Kind        | Location                            | Naming          |
| ----------- | ----------------------------------- | --------------- |
| Unit        | Colocated in `src/`                 | `*.spec.ts`     |
| Integration | `test/integration/` when introduced | `*.spec.ts`     |
| E2E         | `test/`                             | `*.e2e-spec.ts` |

### Build

To build all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo build
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo build
bun exec turbo build
bun exec turbo build
```

You can build a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo build --filter=web
```

Without global `turbo`:

```sh
npx turbo build --filter=web
bun exec turbo build --filter=web
bun exec turbo build --filter=web
```

### Develop

To develop all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo dev
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo dev
bun exec turbo dev
bun exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo dev --filter=web
```

Without global `turbo`:

```sh
npx turbo dev --filter=web
bun exec turbo dev --filter=web
bun exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo login
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo login
bun exec turbo login
bun exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo link
```

Without global `turbo`:

```sh
npx turbo link
bun exec turbo link
bun exec turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.dev/docs/reference/configuration)
- [CLI Usage](https://turborepo.dev/docs/reference/command-line-reference)
