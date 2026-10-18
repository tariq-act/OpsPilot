---
name: opspilot-ui-ux
description: OpsPilot frontend design system and UI patterns. Load for web, design, or Figma tasks.
---

# OpsPilot UI / UX

## Design system source

- Tokens + theme: `apps/web/app/globals.css`
- Primitives: `apps/web/components/ui/*`
- Showcase: `/design-system` (`app/design-system/page.tsx`)
- shadcn config: `apps/web/components.json` (`style: base-luma`, CSS variables, baseColor `neutral`)
- No Figma file URLs in the repository; reuse implemented patterns, not a new visual system

## Stack conventions

- Tailwind CSS v4 via `@tailwindcss/postcss` (no separate `tailwind.config`)
- shadcn/ui with **Base UI** primitives (`@base-ui/react`), not Radix
- `cn` helper from `cn` package (`lib/utils.ts`)
- CVA for button variants
- Icons: `lucide-react` (shadcn) and `react-icons/lu` (feature UI)
- Font: **Inter** (`next/font/google`) → `--font-sans`

## Design tokens

Use CSS variables / Tailwind theme mappings already defined:

- Core: `background`, `foreground`, `primary`, `muted`, `card`, `border`, `destructive`, `success`, `warning`, `info`
- Surfaces: `background-subtle`, `surface`, `surface-hover`, `foreground-secondary`
- Sidebar: `--sidebar-*`
- Job/invoice status colors: `status-new`, `status-scheduled`, `status-assigned`, `status-en-route`, `status-in-progress`, `status-completed`, `status-cancelled`, `status-paid`, `status-overdue`, etc.
- Radius scale derived from `--radius`

Prefer existing status tokens over inventing new badge colors.

## Layout & navigation

- Auth: split marketing + form (`lg` breakpoint); marketing column hidden on small screens
- Dashboard: `OrgProvider` → `OrgGuard` → fixed `w-64` sidebar + `main` with `p-6`
- Page chrome: `PageHeader`, `OrgBreadcrumb`
- Sidebar: org switcher, role-filtered nav, sign out
- **Gap:** sidebar is not a mobile drawer yet; do not invent a second nav system—extend the existing sidebar when fixing responsive behavior

## Component conventions

- Prefer `components/ui/*` primitives before adding new ones
- Feature UI lives in `components/<domain>/`
- Cards for interactive/content grouping in lists and dashboards (existing pattern)
- Dialogs for create/edit and confirmations; list `?create=1` opens create dialog; `/new` routes redirect to that pattern
- Tables: shadcn `Table` in list views with filter controls above
- Selects: use Select over nested dialogs where the codebase already does (technician flows)

## Forms

- Controlled inputs + native `<form onSubmit>`
- Manual validation helpers in feature files
- Shared primitives: `Input`, `Label`, `Textarea`, `Checkbox`, `Select`, `DatePicker` (Calendar + Popover + date-fns)
- Show submission progress and server errors via `toUserErrorMessage` / existing error UI

## Data & states

- TanStack Query for server state; invalidate related keys after mutations
- Org header via `lib/api/org-headers.ts`
- Always handle loading (`PageSkeleton` / local spinners), empty, error, and success
- Role-gate actions in UI **and** rely on API enforcement

## Established page patterns (reuse)

| Pattern | Examples |
|---------|----------|
| List + filters + create dialog | customers, jobs, service-requests, technicians |
| Detail + actions | `*-detail.tsx`, job execution |
| Day board | dispatch |
| Technician work | my-work list + execution |

When adding invoices/team/analytics/settings: mirror list/detail/dialog + query-module structure used by customers/jobs.

## Accessibility & responsive

- Semantic controls, labels, focus-visible styles from primitives
- Dialogs use `sm:max-w-*` patterns
- Grids use `sm:` / `lg:` / `xl:` breakpoints
- Do not ship features that only work at desktop width without checking existing responsive classes

## Do not

- Redesign tokens or switch to a new component library
- Import unused `@repo/ui` starter unless deliberately revived
- Add react-hook-form/zod unless a broader form-standardization decision is made
- Create a different CRUD UX per module
