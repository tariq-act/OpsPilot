# Review, feat/team-invitations, 2026-09-23

**Reviewed by**: Claude Opus 4.6 (subagent reviewer, author on separate model)
**Scope**: 12 files, branch vs base (main @ 2d8216a)
**Verdict**: Changes requested

## Summary

This PR adds team invitation and member-management endpoints to the Organizations module: create invitation, accept invitation (token-based), list/update/remove members, with OWNER/ADMIN authorization gates and OWNER-protection throughout. The overall design is clean, follows existing project patterns well (Drizzle schema with RLS, query helpers, class-validator DTOs, NestJS HTTP exceptions), and the DB schema is well-thought-out (partial unique index on pending invitations, cascading FKs). One major issue exists in how the `acceptInvitation` transaction error path is surfaced to clients, and several minor gaps deserve attention before merge.

## Major

### 🟠 Race-to-500 in `acceptInvitation` transaction error path, `apps/api/src/db/queries/members.ts:259` + `apps/api/src/organizations/organizations.service.ts:385-398`
**Problem**: The `acceptInvitation` DB function inserts the membership row and *then* updates the invitation with a `WHERE status = 'PENDING' AND expires_at > now()` guard. If the invitation became non-pending between the service-level checks (lines 308-360) and the transaction (a concurrent accept, admin revocation, or expiry), `invitation` is `undefined`, and the function throws `Error('Invitation is no longer pending')`. Back in the service, the generic `catch` block does not recognise this error—it is not a unique-violation—so it falls through to `throw new InternalServerErrorException(...)` (500). The client sees "Unable to accept invitation" instead of a meaningful 409 "Invitation is no longer pending".

**Why it matters**: The race window is small, but when it fires (especially under automated email-link clicking) the 500 hides the real cause, triggers error-alerting, and makes debugging difficult. Data is safe (transaction rolls back), but the HTTP contract is wrong.

**Suggested fix**: Either (a) catch the specific `Error('Invitation is no longer pending')` in the service and map it to a 409 ConflictException, or (b) reverse the operation order in the transaction—update the invitation first (acquiring a row lock), then insert membership—so the status guard runs before any insert attempt.

## Minor

### 🟡 Missing self-modification guard in `updateMember`, `apps/api/src/organizations/organizations.service.ts:200-256`
**Problem**: `removeMember` correctly prevents `target.userId === actorUserId`, but `updateMember` has no equivalent check. An ADMIN can suspend or demote *themselves* via `PATCH /organizations/:orgId/members/:memberId`, locking themselves out of management. The OWNER can fix it, but it's an unnecessary footgun.

**Suggested fix**: Add the same self-check: if the target's `userId` equals `actorUserId`, reject with a 400 "Cannot modify your own membership".

### 🟡 `findMemberEmailCollision` fetches all members for a single email check, `apps/api/src/organizations/organizations.service.ts:430-437`
**Problem**: The method calls `listMembersForOrganization` (full join + fetch) then does an in-memory `Array.some` for the email. For a 5-person org this is fine; for larger orgs it pulls unnecessary data over the wire.

**Suggested fix**: Add a targeted query in `members.ts`, e.g. `findMemberByOrgAndEmail(organizationId, email)` that joins `organization_member` with `user` filtering on `lower(user.email) = lower(?)` and returns at most one row.

### 🟡 Duplicate role-guard logic: `isSafeInviteRole` vs `isInvitableRole`, `apps/api/src/organizations/organizations.service.ts:401-403` vs `apps/api/src/db/queries/members.ts:28-30`
**Problem**: The service defines a private `isSafeInviteRole` that hard-codes the same three roles as `isInvitableRole` already exported from `members.ts`. Two copies means they can drift silently.

**Suggested fix**: Delete `isSafeInviteRole` and import `isInvitableRole` (already imported in the barrel but unused in the service).

### 🟡 No endpoints to list or revoke invitations, `apps/api/src/organizations/invitations.controller.ts`
**Problem**: The schema supports `REVOKED` status, but there is no `GET /organizations/:orgId/invitations` to see pending invitations or `DELETE`/`PATCH` to revoke one. An OWNER/ADMIN cannot review or cancel outstanding invitations, which the spec implies ("invitations email+role with expiration/status").

**Suggested fix**: Add `listInvitations` (filtered to org, OWNER/ADMIN-gated) and `revokeInvitation` endpoints in a follow-up, or document this as intentionally deferred.

### 🟡 `listMembersForOrganization` returns unbounded results, `apps/api/src/db/queries/members.ts:63-81`
**Problem**: No pagination on the member list. For field-service organisations this is likely fine near-term, but it diverges from typical API best practice and will need retrofitting.

**Suggested fix**: Accept optional `limit`/`offset` (or cursor) params and surface them in the controller. Can be deferred if orgs stay small.

## Nits

- ⚪ `apps/api/src/organizations/organizations.service.ts:35`, `INVITATION_TTL_MS` is a bare magic number. A short comment or named constant in a config/constants file would aid discoverability.
- ⚪ `apps/api/src/db/queries/members.ts:116`, `updateMemberInOrganization` could defensively add `ne(organizationMember.role, 'OWNER')` to the WHERE clause as defense-in-depth, since the service already guards this.
- ⚪ `apps/api/src/organizations/organizations.service.ts:171`, the `createInvitation` response includes `token`. This is expected (the inviter needs it for the email link), but consider documenting or flagging it so future logging middleware doesn't inadvertently log the secret.

## Strengths

- **Excellent DB schema design**: the partial unique index `organization_invitation_org_email_pending_uidx` elegantly prevents duplicate pending invitations at the DB level without blocking re-invitation after expiry/revocation. RLS is enabled on the new table. FK cascades are correct.
- **Clean authorization model**: `requireManager` / `requireActiveMember` guards are well-factored, OWNER protection is consistent across update and remove paths, and the `InvitableRole` type prevents OWNER role assignment at compile time and runtime.
- **Atomic invitation acceptance**: the `acceptInvitation` transaction ensures membership creation and invitation status update are all-or-nothing, with a WHERE guard that prevents double-accept.
- **Strong DTO validation**: `CreateInvitationDto` normalizes email case and validates against the shared `INVITABLE_ROLES` constant; `UpdateMemberDto` restricts status to `ACTIVE | SUSPENDED`. The global `ValidationPipe` with `whitelist + forbidNonWhitelisted` blocks extra fields.
- **Consistent patterns**: the new code follows existing conventions (query helpers under `db/queries/`, schema under `db/schema/`, NestJS module/controller/service split, `@Session()` decorator for auth).

## Test coverage

**TESTS = none-yet.** There is no test runner configured in this project. This branch adds significant branching logic (authorization gates, invitation state machine, race-condition handlers, role constraints) that has no automated coverage. The absence of tests is noted as a project-level gap; it amplifies the risk of the findings above—particularly the Major error-path issue—since there is no safety net to catch regressions.
