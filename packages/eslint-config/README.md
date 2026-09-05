# `@repo/eslint-config`

Shared ESLint configurations for OpsPilot workspaces.

| Export                               | Used by           |
| ------------------------------------ | ----------------- |
| `@repo/eslint-config/base`           | Shared base rules |
| `@repo/eslint-config/next-js`        | `apps/web`        |
| `@repo/eslint-config/react-internal` | `packages/ui`     |

`apps/api` does not use this package; it lints with oxlint.
