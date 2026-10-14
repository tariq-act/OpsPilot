# Review, feat/web-frontend-foundation, 2026-10-14

**Reviewed by**: Gemini 2.5 Pro (author on Gemini)
**Scope**: 20 files, branch vs base (main @ 1566c16)
**Verdict**: Blocked

## Summary

This change implements the web frontend foundation in Next.js (App Router, Tailwind CSS, shadcn/ui) with Better Auth integration, central API client, multi-tenant organization context (`OrgProvider`, `OrgGuard`), onboarding flow, and dashboard layout. The foundation is cleanly structured, with strong component aesthetics and accessible form primitives. However, merge is blocked by a critical routing and auth deadlock on the invitation acceptance page that makes it impossible for any user to accept team invites, alongside major issues in sidebar role-based navigation and an open redirect vulnerability in the login flow.

## Blockers

### 🔴 Invitation acceptance routing deadlock prevents accepting invites, `apps/web/middleware.ts:20,67-69` and `apps/web/app/invitations/accept/page.tsx:25-37`
**Problem**: The invitation acceptance flow fails in two opposing directions:
1. In `apps/web/middleware.ts`, `PUBLIC_PATHS` includes `"/invitations"`, and line 67 redirects any authenticated user visiting a public path to `/dashboard`. When a logged-in user clicks an invitation link (`/invitations/accept?token=...`), the middleware intercepts the request and redirects them to `/dashboard` immediately. The accept page is never reached.
2. In `apps/api/src/organizations/invitations.controller.ts:48-55`, the backend accept endpoint `POST /invitations/:token/accept` requires an active Better Auth session (`@Session() session: UserSession`) and verifies that `session.user.email` matches the invite. If an unauthenticated user opens the link, middleware lets them through, but `apps/web/app/invitations/accept/page.tsx` immediately attempts `api.post('/invitations/${token}/accept')`, which fails with a 401 Unauthorized error. The UI displays "Invitation failed: Unauthorized" with a button to `/login` that lacks a `next` redirect parameter. Even if they log in and re-click the invite link, they hit problem (1) and get redirected to `/dashboard`.
**Why it matters**: It is currently impossible for any teammate—authenticated or unauthenticated—to accept an invitation in production. Team onboarding is completely broken.
**Suggested fix**: Remove `"/invitations"` from `PUBLIC_PATHS` in `middleware.ts`. In `accept/page.tsx`, check the user's authentication state before invoking the API: if unauthenticated, redirect to `/login?next=${encodeURIComponent(pathname + searchParams.toString())}`; once authenticated, execute the accept call and redirect to the dashboard.

## Major

### 🟠 Sidebar navigation role permanently hardcoded to "TECHNICIAN", `apps/web/app/(dashboard)/layout.tsx:48,84` and `apps/web/components/dashboard/sidebar.tsx:88,93-95`
**Problem**: In `apps/web/app/(dashboard)/layout.tsx:48`, `getServerSession()` hardcodes `role: "TECHNICIAN"` (with a comment noting that `OrgProvider` will supply the real role client-side). However, `DashboardLayout` passes this hardcoded role to `DashboardShell`, which passes it as `role={session.role}` to `DashboardSidebar`. In `sidebar.tsx`, `DashboardSidebar` filters navigation links exclusively against this prop (`!item.roles || item.roles.includes(role)`), ignoring the active organization's role from `useOrg().current?.role`.
**Why it matters**: Every user in the application—including organization Owners and Admins—is restricted to the Technician role in the navigation sidebar. Essential management pages ("Team", "Settings", "Invoices", "Analytics", "Technicians") are completely hidden from all users.
**Suggested fix**: Update `DashboardSidebar` to read the active role from the organization context (`useOrg().current?.role ?? role`), or remove the server-side role prop from the sidebar and derive permissions dynamically from the active organization.

### 🟠 Open redirect vulnerability in login form, `apps/web/components/auth/login-form.tsx:27,53`
**Problem**: `LoginForm` reads `const nextUrl = searchParams.get("next") ?? "/dashboard"` and executes `router.push(nextUrl)` upon successful authentication without verifying that `nextUrl` points to a relative internal path.
**Why it matters**: An attacker can distribute links such as `https://app.opspilot.com/login?next=https://attacker-phishing.com` or `//attacker-phishing.com`. Victims who authenticate will be silently redirected to an external domain, exposing them to credential phishing and session exploitation (CWE-601).
**Suggested fix**: Validate `nextUrl` before calling `router.push`. Ensure it begins with a single `/` and does not begin with `//` or `/\` (e.g. `const safeNextUrl = nextUrl.startsWith("/") && !nextUrl.startsWith("//") ? nextUrl : "/dashboard"`).

## Minor

### 🟡 Query parameters stripped on unauthenticated redirect, `apps/web/middleware.ts:74-75`
**Problem**: When redirecting unauthenticated visitors to `/login`, `middleware.ts` sets `loginUrl.searchParams.set("next", pathname)`. This discards `request.nextUrl.search`.
**Why it matters**: Any protected deep links containing query parameters (such as filters, search terms, or invite tokens) lose their query parameters after the user logs in.
**Suggested fix**: Preserve the full URL path and search query: `const next = `${pathname}${request.nextUrl.search}`; loginUrl.searchParams.set("next", next);`.

### 🟡 Signup form allows submission with unmet password rules and empty confirmation, `apps/web/components/auth/signup-form.tsx:61-68,230`
**Problem**: `SignupForm` checks password rules for UI chips, but neither `handleSubmit` nor the submit button's `disabled` condition verify that all requirements in `passwordChecks` are met. Additionally, `confirmError` only checks `confirmPassword.length > 0 && confirmPassword !== password`, allowing an empty confirmation password to pass JS validation.
**Why it matters**: Weak passwords or unconfirmed passwords can be submitted directly, relying on backend failure rather than client-side validation, creating a confusing user experience.
**Suggested fix**: Require `passwordChecks.every(c => c.met) && password === confirmPassword` before allowing form submission.

### 🟡 API client error body typing does not account for validation error arrays, `apps/web/lib/types.ts:102-106` and `apps/web/lib/api.ts:22,80-92`
**Problem**: In `types.ts`, `ApiErrorBody.message` is typed strictly as `string`. However, NestJS `ValidationPipe` returns `message: string[]` when validation constraints fail (e.g., in `CreateOrganizationDto`). In `ApiError`, `super(body.message)` relies on implicit array coercion.
**Why it matters**: Consumers expecting `error.body.message` to be a string may encounter runtime typing bugs when trying to invoke string methods or format messages.
**Suggested fix**: Update `ApiErrorBody.message` to `string | string[]` and normalize the error message inside the `ApiError` constructor (e.g., `Array.isArray(body.message) ? body.message.join(", ") : body.message`).

### 🟡 Dashboard sidebar lacks responsive mobile hiding, `apps/web/components/dashboard/sidebar.tsx:103` vs `apps/web/components/ui/page-skeleton.tsx:9`
**Problem**: `page-skeleton.tsx` hides the sidebar on smaller screens using `hidden ... lg:flex`, but `DashboardSidebar` in `sidebar.tsx` renders `flex w-64 shrink-0` unconditionally on all screen sizes.
**Why it matters**: On mobile and tablet screens (< 1024px), the desktop sidebar occupies 256px of horizontal space without a drawer or hamburger toggle, severely squeezing or breaking main dashboard views.
**Suggested fix**: Add responsive hiding classes (e.g. `hidden lg:flex`) to the sidebar and plan for a mobile sheet/drawer navigation in the UI slice.

## Nits

- ⚪ `apps/web/middleware.ts:18`, `apps/web/lib/api.ts:11`, `apps/web/lib/auth-client.ts:4`, `apps/web/app/(dashboard)/layout.tsx:10`: The fallback API URL `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"` is duplicated across 4 files instead of imported from a shared config.
- ⚪ `apps/web/app/(dashboard)/dashboard/page.tsx:9-15`: The dashboard page manually marks up header text instead of using the newly added `<PageHeader />` component from `components/dashboard/page-header.tsx`.
- ⚪ `apps/web/components/dashboard/sidebar.tsx:127`: The organization switcher uses an unstyled native HTML `<select>` rather than the design system's Radix/Base UI `Select` component.
- ⚪ `apps/web/lib/types.ts`: Missing `AcceptInvitationResponse` TypeScript definition to mirror `AcceptInvitationResponseDto` from the NestJS backend.

## Strengths

- **Clean modern architecture**: Seamless setup of Next.js App Router with Better Auth, custom fetch wrapper with credential propagation, and typed organization resource helpers.
- **Robust multi-tenant state guard**: `OrgProvider` and `OrgGuard` cleanly manage organization state, sessionStorage persistence across page navigations, and automatic redirection to onboarding when a user has no active organizations.
- **Accessible form and feedback components**: `PasswordField` provides proper `aria-invalid`, `aria-describedby`, and visibility toggle controls; `LoginForm` wraps query param access in `<Suspense>` to prevent route de-optimization; `PageSkeleton` accurately matches the dashboard shell structure.

## Test coverage

- **Test signal**: `none-yet`. There is currently no test runner configured for the `apps/web` workspace (`TEST_SIGNAL = none-yet`).
- While TypeScript static checks pass (`tsc --noEmit`), the absence of unit or end-to-end integration tests allowed the invitation acceptance deadlock and the sidebar role hardcoding to slip through unnoticed. A testing suite covering middleware route protection, auth flows, and role-based navigation is strongly recommended for the web package.
